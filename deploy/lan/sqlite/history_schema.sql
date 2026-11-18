CREATE TABLE IF NOT EXISTS EntripSyncDevice (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    deviceId TEXT NOT NULL UNIQUE,
    databaseId TEXT NOT NULL UNIQUE,
    streamId TEXT NOT NULL UNIQUE,
    installedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS EntripSyncAgency (
    agencyId TEXT PRIMARY KEY NOT NULL,
    companyCode TEXT NOT NULL UNIQUE CHECK (length(trim(companyCode)) > 0)
);

CREATE TABLE IF NOT EXISTS EntripSyncEntity (
    entityType TEXT NOT NULL,
    localId TEXT NOT NULL,
    entityUuid TEXT NOT NULL UNIQUE,
    agencyId TEXT NOT NULL REFERENCES EntripSyncAgency(agencyId),
    revision INTEGER NOT NULL CHECK (revision >= 0),
    updatedAt TEXT NOT NULL,
    deletedAt TEXT,
    headChangeId TEXT,
    PRIMARY KEY (entityType, localId)
);
CREATE INDEX IF NOT EXISTS EntripSyncEntity_byAgency ON EntripSyncEntity(agencyId, entityType);

CREATE TABLE IF NOT EXISTS EntripSyncChange (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    changeId TEXT NOT NULL UNIQUE,
    agencyId TEXT NOT NULL REFERENCES EntripSyncAgency(agencyId),
    entityUuid TEXT NOT NULL REFERENCES EntripSyncEntity(entityUuid),
    deviceId TEXT NOT NULL,
    baseRevision INTEGER NOT NULL CHECK (baseRevision >= 0),
    revision INTEGER NOT NULL CHECK (revision = baseRevision + 1),
    baseChangeId TEXT REFERENCES EntripSyncChange(changeId),
    operation TEXT NOT NULL CHECK (operation IN ('snapshot', 'create', 'update', 'delete', 'restore', 'withheld')),
    changedAt TEXT NOT NULL,
    deletedAt TEXT,
    payload TEXT CHECK (payload IS NULL OR json_valid(payload)),
    linkedUuids TEXT NOT NULL CHECK (json_valid(linkedUuids)),
    heldLinks TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(heldLinks)),
    UNIQUE (entityUuid, revision)
);
CREATE INDEX IF NOT EXISTS EntripSyncChange_byAgency ON EntripSyncChange(agencyId, seq);

CREATE TRIGGER IF NOT EXISTS EntripSyncChange_validate
BEFORE INSERT ON EntripSyncChange
WHEN NOT EXISTS (
    SELECT 1 FROM EntripSyncEntity
    WHERE entityUuid = NEW.entityUuid AND agencyId = NEW.agencyId
      AND revision = NEW.baseRevision AND headChangeId IS NEW.baseChangeId
)
BEGIN
    SELECT RAISE(ABORT, 'Entrip sync revision or agency conflict');
END;

CREATE TRIGGER IF NOT EXISTS EntripSyncChange_advance
AFTER INSERT ON EntripSyncChange
BEGIN
    UPDATE EntripSyncEntity SET revision = NEW.revision, updatedAt = NEW.changedAt,
        deletedAt = NEW.deletedAt, headChangeId = NEW.changeId
    WHERE entityUuid = NEW.entityUuid;
END;

CREATE TRIGGER IF NOT EXISTS EntripSyncChange_noUpdate BEFORE UPDATE ON EntripSyncChange
BEGIN
    SELECT RAISE(ABORT, 'Entrip change history is append only');
END;

CREATE TRIGGER IF NOT EXISTS EntripSyncChange_noDelete BEFORE DELETE ON EntripSyncChange
BEGIN
    SELECT RAISE(ABORT, 'Entrip change history is append only');
END;
