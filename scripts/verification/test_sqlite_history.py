"""Run with python3 scripts/verification/test_sqlite_history.py."""
import json
import sqlite3
import sys
import tempfile
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "deploy/lan/sqlite"))
import history

INITIAL = ROOT / "packages/api/prisma/sqlite/migrations/20261118000000_initial/migration.sql"


class AgencyJournal(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "entrip.sqlite"
        self.db = sqlite3.connect(self.path, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.addCleanup(self.db.close)
        self.db.executescript(INITIAL.read_text())
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("PRAGMA journal_mode=WAL")

    def employee(self, key, company):
        self.db.execute(
            'INSERT INTO User(id,email,name,password,companyCode,updatedAt) VALUES(?,?,?, ?,?,CURRENT_TIMESTAMP)',
            (key, key + "@example.test", key, "private-hash", company),
        )

    def booking(self, key, company, user=None, deleted=None):
        self.db.execute(
            """INSERT INTO Booking(id,bookingNumber,teamName,type,origin,destination,
            startDate,endDate,coordinator,companyCode,userId,updatedAt,deletedAt,flightInfo)
            VALUES(?,?,?,'FIT','부산','제주',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'담당',?,?,
            CURRENT_TIMESTAMP,?,'[{"편명":"QA012"}]')""",
            (key, "B-" + key, key, company, user, deleted),
        )

    def events(self, model, key):
        return self.db.execute(
            """SELECT c.* FROM EntripSyncChange c JOIN EntripSyncEntity e USING(entityUuid)
               WHERE e.entityType=? AND e.localId=? ORDER BY c.seq""", (model, key)
        ).fetchall()

    def test_import_startup_and_reconnect(self):
        self.employee("기존사원", "부산")
        self.booking("legacy-cuid", "부산", "기존사원", "2026-07-09 03:14:15")
        history.install(self.db)
        user, = self.events("User", "기존사원")
        booking, = self.events("Booking", "legacy-cuid")
        self.assertEqual(booking["operation"], "snapshot")
        self.assertEqual(booking["deletedAt"], "2026-07-09T03:14:15.000Z")
        self.assertEqual(json.loads(booking["linkedUuids"])["userId"], user["entityUuid"])
        self.assertEqual(json.loads(booking["payload"])["flightInfo"], [{"편명": "QA012"}])
        self.assertNotIn("private-hash", user["payload"])
        self.assertNotIn("password", json.loads(user["payload"]))
        for col in ["agencyId", "entityUuid", "deviceId", "changeId"]:
            self.assertEqual(uuid.UUID(booking[col]).version, 4)
        with sqlite3.connect(self.path) as second:
            history.install(second)
            self.assertEqual(second.execute("SELECT count(*) FROM EntripSyncChange").fetchone()[0], 2)
            self.assertEqual(second.execute("SELECT deviceId FROM EntripSyncDevice").fetchone()[0], booking["deviceId"])
            self.assertEqual(second.execute("SELECT count(*) FROM sqlite_schema WHERE type='trigger' AND name GLOB 'EntripSync_*'").fetchone()[0], 3 * len(history.TRACKED))
            second.execute("UPDATE Booking SET teamName='수정', deletedAt=NULL WHERE id='legacy-cuid'")
        after = self.events("Booking", "legacy-cuid")[-1]
        self.assertEqual((after["operation"], after["baseChangeId"], after["baseRevision"]), ("restore", booking["changeId"], 1))
        self.assertEqual(after["entityUuid"], booking["entityUuid"])

    def test_agency_links_stable_keys_and_cascades(self):
        history.install(self.db)
        key = str(uuid.uuid4())
        self.employee("alice", "A")
        self.employee("bob", "B")
        self.booking(key, "A", "alice")
        self.booking("b-other", "B", "bob")
        a, = self.events("Booking", key)
        b, = self.events("Booking", "b-other")
        self.assertEqual(a["entityUuid"], key)
        self.assertNotEqual(a["agencyId"], b["agencyId"])
        with self.assertRaisesRegex(sqlite3.IntegrityError, "agency link"):
            self.booking("uncommitted", "A", "bob")
        self.assertEqual(self.events("Booking", "uncommitted"), [])
        with self.assertRaisesRegex(sqlite3.IntegrityError, "move a tracked"):
            self.db.execute("UPDATE Booking SET companyCode='B' WHERE id=?", (key,))
        self.db.execute("""INSERT INTO Settlement(id,bookingId,type,currency,amount,updatedAt)
                        VALUES('part',?,'INCOME','USD',124.5,CURRENT_TIMESTAMP)""", (key,))
        part, = self.events("Settlement", "part")
        self.assertEqual(part["agencyId"], a["agencyId"])
        self.assertEqual(json.loads(part["linkedUuids"]), {"bookingId": a["entityUuid"]})
        self.db.execute("DELETE FROM Booking WHERE id=?", (key,))
        self.assertIsNone(self.db.execute("SELECT id FROM Settlement WHERE id='part'").fetchone())
        child_delete = self.events("Settlement", "part")[-1]
        self.assertEqual((child_delete["operation"], child_delete["baseChangeId"]), ("delete", part["changeId"]))
        self.assertEqual(json.loads(child_delete["linkedUuids"])["bookingId"], key)
        self.assertTrue(child_delete["deletedAt"])
        self.booking(key, "A")
        self.assertEqual([s["operation"] for s in self.events("Booking", key)], ["create", "delete", "restore"])
        self.assertEqual(len(self.events("Booking", "b-other")), 1)

    def test_legacy_cross_company_booking_is_withheld_until_explicit_repair(self):
        a = str(uuid.uuid4())
        self.booking(a, "A")
        self.booking("local-b", "B")
        self.db.execute("""INSERT INTO Flight(id,bookingId,flightNumber,airline,origin,destination,
            departureTime,arrivalTime,companyCode,notes,updatedAt)
            VALUES('legacy-flight',?,'PRIVATE-A','a','ICN','KIX',0,1,'B','private A itinerary',0)""", (a,))
        history.install(self.db)
        masked, = self.events("Flight", "legacy-flight")
        self.assertEqual(masked["operation"], "withheld")
        self.assertIsNone(masked["payload"])
        self.assertEqual(json.loads(masked["linkedUuids"]), {})
        self.assertEqual(json.loads(masked["heldLinks"]), ["bookingId"])
        self.assertNotIn(a, str(dict(masked)))
        self.assertNotIn("PRIVATE-A", str(dict(masked)))
        self.assertNotIn("private A itinerary", str(dict(masked)))
        self.assertEqual(self.db.execute("SELECT bookingId,notes FROM Flight").fetchone()[:], (a, "private A itinerary"))
        self.db.execute("UPDATE Flight SET notes='locally revised' WHERE id='legacy-flight'")
        self.assertIsNone(self.events("Flight", "legacy-flight")[-1]["payload"])
        self.db.execute("DELETE FROM Booking WHERE id=?", (a,))
        self.assertIsNone(self.db.execute("SELECT bookingId FROM Flight").fetchone()[0])
        self.assertEqual(self.events("Flight", "legacy-flight")[-1]["operation"], "withheld")
        self.db.execute("UPDATE Flight SET bookingId='local-b', flightNumber='B-120' WHERE id='legacy-flight'")
        repaired = self.events("Flight", "legacy-flight")[-1]
        self.assertEqual(repaired["operation"], "snapshot")
        self.assertEqual(json.loads(repaired["payload"])["flightNumber"], "B-120")
        self.assertEqual(json.loads(repaired["linkedUuids"])["bookingId"], self.events("Booking", "local-b")[0]["entityUuid"])
        self.assertNotIn(a, str(dict(repaired)))

    def test_bulk_atomicity_concurrent_read_and_stale_base(self):
        history.install(self.db)
        self.booking("one", "A")
        self.booking("two", "A")
        self.db.execute("BEGIN IMMEDIATE")
        self.db.execute("UPDATE Booking SET notes='draft'")
        with sqlite3.connect(self.path) as reader:
            self.assertEqual(reader.execute("SELECT count(*) FROM EntripSyncChange").fetchone()[0], 2)
            self.assertIsNone(reader.execute("SELECT notes FROM Booking WHERE id='one'").fetchone()[0])
        self.db.rollback()
        self.assertEqual(len(self.events("Booking", "one")), 1)
        self.db.execute("UPDATE Booking SET notes='final'")
        self.db.execute("UPDATE Booking SET notes='final'")
        for key in ["one", "two"]:
            create, updated = self.events("Booking", key)
            self.assertEqual(updated["baseChangeId"], create["changeId"])
            self.assertEqual((updated["revision"], json.loads(updated["payload"])["notes"]), (2, "final"))
        with self.assertRaisesRegex(sqlite3.IntegrityError, "revision or agency conflict"):
            self.db.execute("""INSERT INTO EntripSyncChange(changeId,agencyId,entityUuid,deviceId,baseRevision,revision,
                baseChangeId,operation,changedAt,payload,linkedUuids)
                SELECT ?,agencyId,entityUuid,deviceId,revision,revision+1,baseChangeId,'update',changedAt,payload,'{}'
                FROM EntripSyncChange WHERE changeId=?""", (str(uuid.uuid4()), updated["changeId"]))
        with self.assertRaisesRegex(sqlite3.IntegrityError, "append only"):
            self.db.execute("DELETE FROM EntripSyncChange")
        with self.assertRaisesRegex(sqlite3.IntegrityError, "append only"):
            self.db.execute("UPDATE EntripSyncChange SET operation='delete'")
        with self.assertRaisesRegex(sqlite3.IntegrityError, "rekey"):
            self.db.execute("UPDATE Booking SET id='new-one' WHERE id='one'")

    def test_device_and_agency_ids_are_separate_between_unrelated_hubs(self):
        history.install(self.db)
        self.employee("a", "entrip")
        a, = self.events("User", "a")
        with sqlite3.connect(":memory:") as other:
            other.executescript(INITIAL.read_text())
            history.install(other)
            other.execute("""INSERT INTO User(id,email,name,password,updatedAt) VALUES('a','a@example.test','A','secret',CURRENT_TIMESTAMP)""")
            agency, entity, device = other.execute("SELECT agencyId,entityUuid,deviceId FROM EntripSyncChange").fetchone()
            self.assertNotEqual(a["agencyId"], agency)
            self.assertNotEqual(a["deviceId"], device)
            self.assertNotEqual(a["entityUuid"], entity)


if __name__ == "__main__":
    unittest.main()
