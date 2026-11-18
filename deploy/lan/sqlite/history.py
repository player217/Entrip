"""Install the local hub's transaction-bound, agency-scoped change journal."""
import argparse
import sqlite3
from pathlib import Path

# Application tables with their own tenant. Client credentials live in the base
# database and its backups; they must never be copied into a peer change payload.
DIRECT = (
    "User", "Account", "Booking", "BankAccount", "CalendarEvent", "FinanceRecord",
    "Approval", "Conversation", "BookingHistory", "Flight", "Vehicle", "Hotel",
    "SystemMessage", "Notification", "NotificationPreference",
)
# Every other tracked record derives its agency from one required business FK.
# Parent entries precede children when registering identities for an old database.
OWNERS = {
    "ApprovalStep": ("Approval", "approvalId"),
    "ConversationParticipant": ("Conversation", "conversationId"),
    "ConversationSettings": ("Conversation", "conversationId"),
    "Message": ("Conversation", "conversationId"),
    "MessageRead": ("Message", "messageId"),
    "MessageReaction": ("Message", "messageId"),
    "MessageAttachment": ("Message", "messageId"),
    "Settlement": ("Booking", "bookingId"),
    "Transaction": ("Account", "accountId"),
    "Document": ("User", "uploadedBy"),
}
TRACKED = (*DIRECT, *OWNERS)
OMIT = {"User": {"password", "lastLoginAt"}, "Account": {"passwordHash", "lastLoginAt"}}
NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')"
UUID4 = """(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) ||
    '-4' || substr(lower(hex(randomblob(2))),2) || '-' ||
    substr('89ab',1+(random() & 3),1) || substr(lower(hex(randomblob(2))),2) ||
    '-' || lower(hex(randomblob(6))))"""


def quote(name):
    return '"' + name.replace('"', '""') + '"'


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def owner_id(table, row):
    if table in OWNERS:
        parent, field = OWNERS[table]
        return f"(SELECT agencyId FROM EntripSyncEntity WHERE entityType={literal(parent)} AND localId={row}.{quote(field)})"
    return f"(SELECT agencyId FROM EntripSyncAgency WHERE companyCode={row}.companyCode)"


def identity_for(row):
    # Most new rows already have a UUID. Imported CUIDs remain valid local keys.
    key = f"{row}.id"
    compact = f"replace({key}, '-', '')"
    valid = (
        f"length({key})=36 AND length({compact})=32 "
        f"AND {key} GLOB '????????-????-????-????-????????????' "
        f"AND lower({compact}) NOT GLOB '*[^0-9a-f]*'"
    )
    return f"CASE WHEN {valid} AND NOT EXISTS (SELECT 1 FROM EntripSyncEntity WHERE entityUuid=lower({key})) THEN lower({key}) ELSE {UUID4} END"


def register_entity(table, row, from_clause=""):
    return f"""INSERT INTO EntripSyncEntity(entityType, localId, entityUuid, agencyId, revision, updatedAt)
        SELECT {literal(table)}, {row}.id, {identity_for(row)}, {owner_id(table, row)}, 0, {NOW}
        {from_clause} WHERE NOT EXISTS (
            SELECT 1 FROM EntripSyncEntity WHERE entityType={literal(table)} AND localId={row}.id
        );"""


def json_row(columns, table, row):
    pairs = []
    for field, datatype in columns:
        if field in OMIT.get(table, ()):
            continue
        value = f"{row}.{quote(field)}"
        if datatype.upper() in {"JSON", "JSONB"}:
            # Older system sqlite3 may not decode newer binary JSONB. Keep the
            # exact bytes tagged rather than dropping a value during migration.
            value = (f"CASE WHEN typeof({value})='blob' THEN json_object('$sqliteBlobHex',hex({value})) "
                     f"WHEN json_valid({value}) THEN json({value}) ELSE {value} END")
        pairs.extend((literal(field), value))
    return "json_object(" + ", ".join(pairs) + ")"


def linked_uuids(foreign_keys, row):
    pairs = []
    for field, parent in foreign_keys:
        pairs.extend((literal(field), f"""(SELECT entityUuid FROM EntripSyncEntity p
            WHERE p.entityType={literal(parent)} AND p.localId={row}.{quote(field)} AND p.agencyId=e.agencyId)"""))
    return "json_object(" + ", ".join(pairs) + ")"


def write_event(table, columns, foreign_keys, mode):
    row = {"snapshot": "b", "delete": "OLD"}.get(mode, "NEW")
    soft = "deletedAt" in dict(columns)
    dead = f"{row}.deletedAt IS NOT NULL" if soft else "0"
    deleted = "NULL"
    if soft:
        timestamp = f"{row}.deletedAt"
        iso = f"""CASE WHEN typeof({timestamp}) IN ('integer','real')
            THEN strftime('%Y-%m-%dT%H:%M:%fZ',{timestamp}/1000.0,'unixepoch')
            ELSE strftime('%Y-%m-%dT%H:%M:%fZ',{timestamp}) END"""
        deleted = f"CASE WHEN {dead} THEN coalesce({iso}, e.deletedAt, {NOW}) END"
    data = json_row(columns, table, row)
    links = linked_uuids(foreign_keys, row)
    if mode == "snapshot":
        operation = "'snapshot'"
        query = f'FROM {quote(table)} b JOIN EntripSyncEntity e ON e.localId=b.id WHERE e.entityType={literal(table)} AND e.revision=0'
    else:
        query = f"FROM EntripSyncEntity e WHERE e.entityType={literal(table)} AND e.localId={row}.id"
        if mode == "delete":
            operation, deleted, data = "'delete'", f"coalesce(e.deletedAt,{NOW})", "NULL"
        else:
            operation = (f"CASE WHEN e.revision=0 THEN 'create' WHEN e.deletedAt IS NULL AND {dead} THEN 'delete' "
                         f"WHEN e.deletedAt IS NOT NULL AND NOT ({dead}) THEN 'restore' ELSE 'update' END")
    held = "'[]'"
    if foreign_keys:
        restrictions = []
        for field, parent in foreign_keys:
            value = f"{row}.{quote(field)}"
            parent_is_local = f"""EXISTS (
                SELECT 1 FROM EntripSyncEntity p
                WHERE p.entityType={literal(parent)} AND p.localId={value} AND p.agencyId=e.agencyId
                AND NOT EXISTS (SELECT 1 FROM EntripSyncChange pc WHERE pc.changeId=p.headChangeId AND pc.operation='withheld')
            )"""
            # An ON DELETE SET NULL from the other agency cannot release private
            # data. Each held reference requires a valid same-agency replacement.
            prior_hold = f"""EXISTS (
                SELECT 1 FROM EntripSyncChange prev,json_each(prev.heldLinks) h
                WHERE prev.changeId=e.headChangeId AND h.value={literal(field)}
            )"""
            restrictions.append(f"""SELECT {literal(field)} AS field WHERE
                ({value} IS NOT NULL AND NOT {parent_is_local}) OR ({value} IS NULL AND {prior_hold})""")
        held = "(SELECT json_group_array(field) FROM (" + " UNION ALL ".join(restrictions) + "))"
        # A legacy row with a foreign tenant FK may contain copied private text
        # as well as the foreign ID. Keep the original in the local database but
        # emit neither its body nor any links until all relationships are repaired.
        if mode != "delete":
            was_withheld = "(SELECT operation FROM EntripSyncChange WHERE changeId=e.headChangeId)='withheld'"
            operation = f"CASE WHEN {held}!='[]' THEN 'withheld' WHEN {was_withheld} THEN 'snapshot' ELSE {operation} END"
            data = f"CASE WHEN {held}!='[]' THEN NULL ELSE {data} END"
        links = f"CASE WHEN {held}!='[]' THEN '{{}}' ELSE {links} END"
    return f"""INSERT INTO EntripSyncChange(changeId,agencyId,entityUuid,deviceId,baseRevision,revision,
            baseChangeId,operation,changedAt,deletedAt,payload,linkedUuids,heldLinks)
        SELECT {UUID4}, e.agencyId, e.entityUuid, (SELECT deviceId FROM EntripSyncDevice WHERE singleton=1),
            e.revision, e.revision+1, e.headChangeId, {operation}, {NOW}, {deleted}, {data}, {links}, {held} {query};"""


def protect_scope(table, foreign_keys, updating=False):
    owner = owner_id(table, "NEW")
    check = f"""SELECT CASE WHEN {owner} IS NOT (
        SELECT agencyId FROM EntripSyncEntity WHERE entityType={literal(table)} AND localId=NEW.id
    ) THEN RAISE(ABORT, 'Cannot move a tracked record across agencies') END;"""
    # Check links at the same write boundary that captures their UUID. A parent
    # mapping survives its row, so cascades can still identify the original owner.
    for field, parent in foreign_keys:
        changed = f"NEW.{quote(field)} IS NOT OLD.{quote(field)} AND " if updating else ""
        check += f"""
        SELECT CASE WHEN {changed}NEW.{quote(field)} IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM EntripSyncEntity WHERE entityType={literal(parent)}
            AND localId=NEW.{quote(field)} AND agencyId={owner}
        ) THEN RAISE(ABORT, 'Invalid agency link: {table}.{field}') END;"""
    return check


def install_trigger(db, table, action, statements, condition=""):
    name = quote(f"EntripSync_{table}_{action}")
    sql = f"CREATE TRIGGER {name} AFTER {action} ON {quote(table)} {condition} BEGIN\n{statements}\nEND"
    existing = db.execute("SELECT sql FROM sqlite_master WHERE type='trigger' AND name=?", (f"EntripSync_{table}_{action}",)).fetchone()
    if not existing or existing[0] != sql:
        db.execute(f"DROP TRIGGER IF EXISTS {name}")
        db.execute(sql)


def install(db):
    """Install after Prisma migrations/import, before serving writers."""
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("BEGIN IMMEDIATE")
    try:
        # executescript implicitly commits an open transaction in Python sqlite3.
        statement = ""
        for line in Path(__file__).with_name("history_schema.sql").read_text(encoding="utf-8").splitlines(True):
            statement += line
            if sqlite3.complete_statement(statement):
                db.execute(statement)
                statement = ""
        if statement.strip():
            raise ValueError("Unterminated history DDL")
        db.execute(f"""INSERT INTO EntripSyncDevice(singleton,deviceId,databaseId,streamId,installedAt)
            SELECT 1,{UUID4},{UUID4},{UUID4},{NOW} WHERE NOT EXISTS (SELECT 1 FROM EntripSyncDevice)""")
        for table in DIRECT:
            db.execute(f"""INSERT INTO EntripSyncAgency(agencyId,companyCode)
                SELECT {UUID4},companyCode FROM (SELECT DISTINCT companyCode FROM {quote(table)}) t
                WHERE NOT EXISTS (SELECT 1 FROM EntripSyncAgency a WHERE a.companyCode=t.companyCode)""")
        for table in TRACKED:
            db.execute(register_entity(table, "b", f"FROM {quote(table)} b"))
        for table in TRACKED:
            columns = [(r[1], r[2]) for r in db.execute(f"PRAGMA table_info({quote(table)})")]
            keys = [(r[3], r[2]) for r in db.execute(f"PRAGMA foreign_key_list({quote(table)})") if r[2] in TRACKED]
            db.execute(write_event(table, columns, keys, "snapshot"))
            registration = ""
            if table in DIRECT:
                registration = f"""INSERT INTO EntripSyncAgency(agencyId,companyCode)
                    SELECT {UUID4},NEW.companyCode WHERE NOT EXISTS (
                        SELECT 1 FROM EntripSyncAgency WHERE companyCode=NEW.companyCode);"""
            scope = protect_scope(table, keys)
            install_trigger(db, table, "INSERT", registration + register_entity(table, "NEW") + scope + write_event(table, columns, keys, "insert"))
            updated = (f"SELECT CASE WHEN OLD.id IS NOT NEW.id THEN RAISE(ABORT,'Cannot rekey a tracked record') END;"
                       + protect_scope(table, keys, updating=True) + write_event(table, columns, keys, "update"))
            modified = [f"OLD.{quote(k)} IS NOT NEW.{quote(k)}" for k, _ in columns if k not in OMIT.get(table, ())]
            install_trigger(db, table, "UPDATE", updated, "WHEN " + " OR ".join(modified))
            install_trigger(db, table, "DELETE", write_event(table, columns, keys, "delete"))
        db.commit()
    except BaseException:
        db.rollback()
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path)
    args = parser.parse_args()
    with sqlite3.connect(args.database.resolve().as_uri() + "?mode=rw", uri=True, timeout=30) as db:
        install(db)
    print("SQLite agency change journal ready.")


if __name__ == "__main__":
    main()
