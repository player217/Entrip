"""One-time, loss-checked Entrip v2 PostgreSQL to local SQLite conversion."""
import argparse
import contextlib
import datetime as dt
import decimal
import errno
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import uuid

BASELINE = '202611170002_complete_v2_schema'
SQLITE_BASELINE = '20261118000000_initial'
SCHEMA = (Path(__file__).resolve().parents[3] / 'packages/api/prisma/sqlite/migrations'
          / SQLITE_BASELINE / 'migration.sql')
EPOCH = dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc)
PG_SCHEMAS = ['public', 'entrip_legacy_20261117']
LIST_COLUMNS = {('Flight', 'seatNumbers'), ('SystemMessage', 'targetAudience')}

METADATA = """
CREATE TABLE _entrip_pg_source (
    id INTEGER PRIMARY KEY CHECK (id = 1), database_name TEXT NOT NULL,
    pg_baseline TEXT NOT NULL, completed_at TEXT NOT NULL,
    business_tables INTEGER NOT NULL, business_rows INTEGER NOT NULL, archived_rows INTEGER NOT NULL
);
CREATE TABLE _entrip_pg_tables (
    namespace TEXT NOT NULL, name TEXT NOT NULL, columns_json TEXT NOT NULL,
    source_rows INTEGER NOT NULL, business_rows INTEGER NOT NULL, archived_rows INTEGER NOT NULL,
    PRIMARY KEY(namespace, name)
);
CREATE TABLE _entrip_pg_extra (
    namespace TEXT NOT NULL, table_name TEXT NOT NULL, row_no INTEGER NOT NULL,
    business_id TEXT, values_json TEXT NOT NULL, PRIMARY KEY(namespace, table_name, row_no)
);
CREATE TABLE _entrip_pg_sequences (
    namespace TEXT NOT NULL, name TEXT NOT NULL, last_value TEXT NOT NULL, is_called INTEGER NOT NULL,
    PRIMARY KEY(namespace, name)
);
CREATE TABLE _prisma_migrations (
    id TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL, finished_at DATETIME, migration_name TEXT NOT NULL,
    logs TEXT, rolled_back_at DATETIME, started_at DATETIME NOT NULL DEFAULT current_timestamp,
    applied_steps_count INTEGER UNSIGNED NOT NULL DEFAULT 0
);
"""

class MigrationError(Exception):
    pass


def ident(name):
    return '"' + name.replace('"', '""') + '"'


def compact(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':'), allow_nan=False)


def timestamp_ms(value):
    stamp = dt.datetime.fromisoformat(value)
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=dt.timezone.utc)
    if stamp.microsecond % 1000:
        raise MigrationError('timestamp has finer precision than the application model')
    delta = stamp - EPOCH
    return (delta.days * 86400 + delta.seconds) * 1000 + delta.microseconds // 1000


def sqlite_value(table, column, target_type, raw):
    if raw is None:
        if (table, column) in LIST_COLUMNS:  # Prisma represents a NULL PostgreSQL list as [].
            return '[]'
        return None
    if target_type == 'BOOLEAN':
        if raw not in ('true', 'false'):
            raise MigrationError('unexpected boolean')
        return int(raw == 'true')
    if target_type == 'DATETIME':
        return timestamp_ms(raw)
    if target_type == 'INTEGER':
        return int(raw)
    if target_type == 'DECIMAL':
        if not decimal.Decimal(raw).is_finite():
            raise MigrationError('non-finite amount')
        return raw
    if target_type == 'JSONB':
        json.loads(raw, parse_float=decimal.Decimal)
    return raw


def same_value(target_type, expected, stored):
    if expected is None:
        return stored is None
    if stored is None:
        return False
    if target_type == 'DECIMAL':
        return decimal.Decimal(str(expected)) == decimal.Decimal(str(stored))
    if target_type == 'JSONB':
        # Only SQLite numeric affinity can change the text of a JSON scalar.
        if expected == stored:
            return True
        value = json.loads(expected, parse_float=decimal.Decimal)
        return type(stored) in (int, float) and type(value) in (int, decimal.Decimal) and (
            decimal.Decimal(str(stored)) == decimal.Decimal(str(value)))
    return expected == stored


def check_sqlite(db):
    if db.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
        raise MigrationError('SQLite integrity check failed')
    violation = db.execute('PRAGMA foreign_key_check').fetchone()
    if violation:
        raise MigrationError(f'Foreign key mismatch in {violation[0]} referencing {violation[2]}')


def read_existing(path):
    if not path.is_file():
        raise MigrationError('Target does not exist')
    with contextlib.closing(sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True)) as db:
        check_sqlite(db)
        marker = db.execute('SELECT pg_baseline,business_tables FROM _entrip_pg_source WHERE id=1').fetchone()
        baseline = db.execute('SELECT 1 FROM _prisma_migrations WHERE migration_name=? '
                              'AND finished_at IS NOT NULL AND rolled_back_at IS NULL', (SQLITE_BASELINE,)).fetchone()
        if not marker or marker[0] != BASELINE or marker[1] <= 0 or baseline is None:
            raise MigrationError('Existing file is not a completed Entrip PostgreSQL conversion')
    return {'status': 'already-imported', 'businessTables': marker[1]}


def catalog(pg):
    with pg.cursor() as cur:
        cur.execute("""
            SELECT n.nspname, c.relname, a.attname, format_type(a.atttypid,a.atttypmod),
                   t.typcategory = 'A', a.attnotnull
            FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_attribute a ON a.attrelid = c.oid
            JOIN pg_type t ON t.oid = a.atttypid
            WHERE n.nspname = ANY(%s) AND c.relkind IN ('r','p')
              AND NOT c.relispartition AND a.attnum > 0 AND NOT a.attisdropped
            ORDER BY n.nspname,c.relname,a.attnum
        """, (PG_SCHEMAS,))
        tables = {}
        for namespace, table, name, pg_type, array, required in cur:
            tables.setdefault((namespace, table), {})[name] = {
                'type': pg_type, 'array': array, 'notNull': required}
        return tables


def verify_pg(pg, business, tables):
    missing = sorted(t for t in business if ('public', t) not in tables)
    if missing:
        raise MigrationError('Missing PostgreSQL business tables: ' + ', '.join(missing))
    if ('public', '_prisma_migrations') not in tables:
        raise MigrationError('PostgreSQL migration ledger is missing')
    with pg.cursor() as cur:
        cur.execute('SELECT migration_name,finished_at,rolled_back_at FROM public._prisma_migrations')
        rows = cur.fetchall()
        if any(finished is None and rolled is None for _, finished, rolled in rows):
            raise MigrationError('Unfinished PostgreSQL migration')
        current = sorted(name for name, finished, rolled in rows if finished and not rolled)
        if not current or current[-1] != BASELINE:
            raise MigrationError('Unsupported PostgreSQL schema version; source data was preserved')
        cur.execute('SELECT current_database()')
        return cur.fetchone()[0]


def copy_table(pg, db, namespace, name, columns, target):
    source = ident(namespace) + '.' + ident(name)
    # ::text avoids conversion of JSON null, decimals, and sub-millisecond stamps by the driver.
    is_business = target is not None
    select = ','.join(
        'to_json(' + ident(column) + ')::text'
        if is_business and (name, column) in LIST_COLUMNS else ident(column) + '::text'
        for column in columns
    )
    if is_business:
        missing = set(target).difference(columns)
        if missing:
            raise MigrationError('Missing PostgreSQL columns in ' + name + ': ' + ', '.join(sorted(missing)))
        keys = list(target)
        names = ','.join(map(ident, keys))
        insert = f'INSERT INTO {ident(name)} ({names}) VALUES ({",".join("?" for _ in keys)})'
        read = f'SELECT {names} FROM {ident(name)} WHERE id=?'
    with pg.cursor() as count_cur:
        count_cur.execute('SELECT count(*) FROM ' + source)
        expected_count = count_cur.fetchone()[0]
    count = archived = 0
    with pg.cursor(name='entrip_import_rows') as rows:
        rows.itersize = 256
        rows.execute('SELECT ' + select + ' FROM ' + source)
        for count, row in enumerate(rows, start=1):
            data = dict(zip(columns, row))
            if is_business:
                values = []
                for column in keys:
                    try:
                        values.append(sqlite_value(name, column, target[column], data[column]))
                    except (ValueError, OverflowError, decimal.InvalidOperation, MigrationError) as exc:
                        raise MigrationError(f'Unsupported value at {name}.{column}, row {count}') from exc
                try:
                    db.execute(insert, values)
                except (sqlite3.Error, OverflowError) as exc:
                    raise MigrationError(f'Invalid business row in {name} at row {count}: {exc}') from exc
                stored = db.execute(read, (data['id'],)).fetchone()
                if stored is None:
                    raise MigrationError(f'Missing SQLite row in {name} at row {count}')
                for column, value, actual in zip(keys, values, stored):
                    if not same_value(target[column], value, actual):
                        raise MigrationError(f'Loss of precision or value at {name}.{column}, row {count}')
                extra = {key: value for key, value in data.items()
                         if key not in target or ((name, key) in LIST_COLUMNS and value is None)}
            else:
                extra = data
            if extra or not is_business:
                encoded = compact(extra)
                row_key = (namespace, name, count)
                db.execute('INSERT INTO _entrip_pg_extra VALUES(?,?,?,?,?)',
                           (*row_key, data.get('id') if is_business else None, encoded))
                saved = db.execute('SELECT values_json FROM _entrip_pg_extra '
                                   'WHERE namespace=? AND table_name=? AND row_no=?', row_key).fetchone()
                if saved != (encoded,):
                    raise MigrationError(f'Archived data mismatch in {namespace}.{name}')
                archived += 1
    if count != expected_count or (is_business and db.execute(
            'SELECT count(*) FROM ' + ident(name)).fetchone()[0] != expected_count):
        raise MigrationError(f'Row count mismatch in {namespace}.{name}')
    db.execute('INSERT INTO _entrip_pg_tables VALUES(?,?,?,?,?,?)',
               (namespace, name, compact(columns), count, count if is_business else 0, archived))
    return count if is_business else 0, archived


def copy_sequences(pg, db):
    with pg.cursor() as cur:
        cur.execute('SELECT schemaname,sequencename FROM pg_sequences WHERE schemaname=ANY(%s)', (PG_SCHEMAS,))
        for namespace, name in cur.fetchall():
            cur.execute('SELECT last_value::text,is_called FROM ' + ident(namespace) + '.' + ident(name))
            last_value, called = cur.fetchone()
            db.execute('INSERT INTO _entrip_pg_sequences VALUES(?,?,?,?)', (namespace, name, last_value, called))


def populate(pg, dest, migration):
    sql_bytes = migration.read_bytes()
    with contextlib.closing(sqlite3.connect(dest)) as db, db:
        db.execute('PRAGMA foreign_keys=ON')
        db.execute('PRAGMA synchronous=FULL')
        db.executescript(sql_bytes.decode('utf-8'))
        names = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*'")]
        business = {name: {r[1]: r[2].upper() for r in db.execute(f'PRAGMA table_info({ident(name)})')}
                    for name in names}
        if not {'User','Booking','BookingHistory','Message','Settlement'}.issubset(business):
            raise MigrationError('SQLite business migration is incomplete')
        tables = catalog(pg)
        source_db = verify_pg(pg, business, tables)
        db.executescript(METADATA)
        db.execute('BEGIN')
        db.execute('PRAGMA defer_foreign_keys=ON')
        total = archived = 0
        for (namespace, name), columns in tables.items():
            count, extras = copy_table(pg, db, namespace, name, columns,
                                       business.get(name) if namespace == 'public' else None)
            total += count
            archived += extras
        copy_sequences(pg, db)
        now = dt.datetime.now(dt.timezone.utc)
        millis = timestamp_ms(now.replace(microsecond=now.microsecond // 1000 * 1000).isoformat())
        # The SQLite initial migration is already installed. Prisma verifies this checksum on deploy.
        db.execute('INSERT INTO _prisma_migrations '
                   '(id, checksum, finished_at, migration_name, started_at, applied_steps_count) VALUES(?,?,?,?,?,1)',
                   (str(uuid.uuid4()), hashlib.sha256(sql_bytes).hexdigest(), millis, SQLITE_BASELINE, millis))
        db.execute('INSERT INTO _entrip_pg_source VALUES(1,?,?,?,?,?,?)',
                   (source_db, BASELINE, now.isoformat(), len(business), total, archived))
        check_sqlite(db)
        db.commit()
    read_existing(dest)
    return {'status':'imported', 'businessTables':len(business), 'businessRows':total, 'archivedRows':archived}



def publish_database(stage, target):
    # No-replace rename also works on some local mounts that do not implement hard links.
    if os.name == 'nt':
        os.rename(stage, target)
        return
    try:
        os.link(stage, target)
    except OSError as exc:
        if exc.errno not in {errno.EPERM, errno.EOPNOTSUPP, errno.ENOSYS} or not sys.platform.startswith('linux'):
            raise
        import ctypes
        libc = ctypes.CDLL(None, use_errno=True)
        if not hasattr(libc, 'renameat2'):
            raise MigrationError('Target filesystem cannot atomically publish the new database') from exc
        if libc.renameat2(-100, os.fsencode(stage), -100, os.fsencode(target), 1) != 0:
            number = ctypes.get_errno()
            raise OSError(number, os.strerror(number)) from exc
    directory = os.open(target.parent, os.O_RDONLY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)


def migrate(target, migration=SCHEMA):
    import psycopg2
    if target.exists() or target.is_symlink():
        raise MigrationError('Destination exists; PostgreSQL migration never overwrites a SQLite file')
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix='.entrip-pg-import-', suffix='.sqlite', dir=target.parent)
    os.close(fd)
    stage = Path(temp)
    try:
        with contextlib.closing(psycopg2.connect(connect_timeout=15, application_name='Entrip read-only migration')) as pg:
            pg.set_session(isolation_level='REPEATABLE READ', readonly=True)
            with pg.cursor() as cur:
                # An insufficiently privileged migration role must not silently omit rows covered by RLS.
                cur.execute("SET LOCAL row_security=off")
                cur.execute("SET LOCAL search_path=pg_catalog")
                cur.execute("SET LOCAL TIME ZONE 'UTC'")
                cur.execute("SET LOCAL DateStyle TO 'ISO, YMD'")
            result = populate(pg, stage, migration)
            pg.commit()
        publish_database(stage, target)
        return result
    finally:
        stage.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', required=True, type=Path)
    parser.add_argument('--check-existing', action='store_true', help='Verify a completed import without contacting PostgreSQL')
    options = parser.parse_args()
    try:
        result = read_existing(options.database) if options.check_existing else migrate(options.database)
        print(json.dumps(result))
    except Exception as exc:
        print(f'PostgreSQL migration stopped: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
