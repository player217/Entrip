"""Regression checks for Entrip's live backups, recovery and KST scheduling."""

import datetime as dt
import json
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
import uuid
import zipfile
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "deploy/lan/sqlite"))
import backup


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name)
        self.db = self.home / "entrip.sqlite"
        self.dir = self.home / "backups"
        self.ops = backup.Backups(self.db, self.dir)
        self.now = dt.datetime(2026, 11, 18, 12, 1, tzinfo=backup.KST)
        self.conn = sqlite3.connect(self.db)
        self.addCleanup(self.conn.close)
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA wal_autocheckpoint=0")
        self.conn.executescript("""
            CREATE TABLE User(id TEXT PRIMARY KEY, name TEXT);
            CREATE TABLE Booking(id TEXT PRIMARY KEY, userId TEXT REFERENCES User(id));
            CREATE TABLE EntripSyncDevice(singleton INTEGER PRIMARY KEY,deviceId TEXT,databaseId TEXT,streamId TEXT);
            CREATE TABLE EntripSyncAgency(agencyId TEXT PRIMARY KEY);
            CREATE TABLE EntripSyncEntity(entityUuid TEXT PRIMARY KEY);
            CREATE TABLE EntripSyncChange(seq INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT);
            INSERT INTO User VALUES('u1','예약 담당');
            INSERT INTO Booking VALUES('b1','u1');
            INSERT INTO EntripSyncChange(value) VALUES ('예약 작성');
        """)
        self.device, self.lineage, self.stream = [str(uuid.uuid4()) for _ in range(3)]
        self.conn.execute("INSERT INTO EntripSyncDevice VALUES (1,?,?,?)", (self.device,self.lineage,self.stream))
        self.conn.commit()

    def test_slot_boundaries_including_restart(self):
        for clock, day, expected in [
            ((7,59),17,18), ((8,0),18,8), ((11,59),18,8), ((12,0),18,12),
            ((17,59),18,12), ((18,0),18,18), ((23,59),18,18), ((0,0),17,18)
        ]:
            local = self.now.replace(hour=clock[0], minute=clock[1])
            slot = backup.latest_slot(local.astimezone(dt.timezone.utc))
            self.assertEqual((slot.day,slot.hour,slot.minute), (day,expected,0))
        first = self.ops.save(self.now, backup.latest_slot(self.now))
        repeated = backup.Backups(self.db,self.dir).save(self.now,backup.latest_slot(self.now))
        self.assertFalse(first["existing"])
        self.assertEqual(repeated["name"], first["name"])
        self.assertTrue(repeated["existing"])
        self.assertEqual(len(self.ops.entries()), 1)

    def test_live_snapshot_includes_committed_wal_and_excludes_open_transaction(self):
        self.conn.execute("UPDATE User SET name='WAL에 저장'")
        self.conn.execute("INSERT INTO EntripSyncChange(value) VALUES('수정')")
        self.conn.commit()
        self.assertGreater(Path(str(self.db)+"-wal").stat().st_size, 0)
        self.conn.execute("UPDATE User SET name='미커밋'")
        name = self.ops.save(self.now)["name"]
        self.conn.rollback()
        with backup.connection(self.dir/name, readonly=True) as snap:
            self.assertEqual(snap.execute("SELECT name FROM User").fetchone()[0], "WAL에 저장")
            self.assertEqual(snap.execute("SELECT value FROM EntripSyncChange ORDER BY seq DESC LIMIT 1").fetchone()[0], "수정")
            self.assertEqual(backup.check_db(snap), (self.device,self.lineage,self.stream))
        self.assertFalse(Path(str(self.dir/name)+"-wal").exists())

    def test_restore_rewinds_rows_rotates_cursor_and_keeps_prior_version(self):
        name = self.ops.save(self.now)["name"]
        self.conn.execute("UPDATE User SET name='나중 이름'")
        self.conn.execute("INSERT INTO EntripSyncChange(value) VALUES('다른 변경')")
        self.conn.commit()
        self.conn.close()
        result = self.ops.restore(name,self.now)
        with backup.connection(self.db, readonly=True) as restored:
            self.assertEqual(backup.check_db(restored), (self.device,self.lineage,result["streamId"]))
            self.assertNotEqual(result["streamId"],self.stream)
            self.assertEqual(restored.execute("SELECT name FROM User").fetchone()[0],"예약 담당")
            self.assertEqual(restored.execute("SELECT count(*) FROM EntripSyncChange").fetchone()[0],1)
        with backup.connection(self.dir/result["previous"], readonly=True) as preserved:
            self.assertEqual(preserved.execute("SELECT name FROM User").fetchone()[0],"나중 이름")
            self.assertEqual(backup.check_db(preserved)[2],self.stream)

    def test_restore_is_blocked_while_host_is_running(self):
        name = self.ops.save(self.now)["name"]
        ready = self.home / "ready"
        child = subprocess.Popen([
            sys.executable,str(ROOT / "deploy/lan/sqlite/backup.py"),"guard","--database",str(self.db),
            "--",sys.executable,"-c","import pathlib,sys,time; pathlib.Path(sys.argv[1]).touch(); time.sleep(20)",str(ready)
        ])
        try:
            for _ in range(100):
                if ready.exists(): break
                time.sleep(.02)
            self.assertTrue(ready.exists())
            with self.assertRaisesRegex(RuntimeError,"API"):
                self.ops.restore(name,self.now)
        finally:
            child.terminate()
            child.wait(timeout=5)
        self.assertEqual(len(self.ops.entries()),1)

    def test_missing_database_and_corruption_recover_with_original_bytes(self):
        name = self.ops.save(self.now)["name"]
        self.conn.close()
        self.db.unlink()
        self.assertIsNone(self.ops.restore(name,self.now)["previous"])
        self.db.write_bytes(b"This damaged SQLite file must be kept.")
        result = self.ops.restore(name,self.now)
        with zipfile.ZipFile(self.dir/result["previous"]) as rescue:
            self.assertEqual(rescue.read(self.db.name),b"This damaged SQLite file must be kept.")
        with backup.connection(self.db,readonly=True) as restored:
            self.assertEqual(restored.execute("SELECT count(*) FROM Booking").fetchone(),(1,))
        self.assertFalse(self.ops.pending.exists())

    def test_restore_to_uninitialized_or_damaged_installation_assigns_the_right_device(self):
        name = self.ops.save(self.now)["name"]
        self.conn.close()
        assigned = set()
        for damaged in (False, True):
            for replacement in (False, True):
                with self.subTest(damaged=damaged, replacement=replacement):
                    self.db.unlink(missing_ok=True)
                    if damaged:
                        self.db.write_bytes(b"unreadable database without a device ID")
                    self.ops.restore(name, self.now, replace_installation=replacement)
                    with backup.connection(self.db, readonly=True) as conn:
                        device, lineage, stream = backup.check_db(conn)
                    self.assertEqual(lineage, self.lineage)
                    self.assertNotEqual(stream, self.stream)
                    if replacement:
                        self.assertEqual(uuid.UUID(device).version, 4)
                        self.assertNotIn(device, assigned | {self.device})
                        assigned.add(device)
                    else:
                        self.assertEqual(device, self.device)

    def test_reject_bad_candidates_and_isolate_installations(self):
        name = self.ops.save(self.now)["name"]
        destination_device = str(uuid.uuid4())
        self.conn.execute("UPDATE EntripSyncDevice SET databaseId='other-installation',deviceId=?", (destination_device,))
        self.conn.commit()
        self.conn.close()
        for bad in ("../"+name, "missing.sqlite", "entrip-manual-20261118T080000-aabbccddaabb.sqlite3"):
            with self.assertRaises(ValueError):
                self.ops.restore(bad,self.now)
        with self.assertRaisesRegex(ValueError,"databaseId"):
            self.ops.restore(name,self.now)
        with backup.connection(self.db,readonly=True) as local:
            self.assertEqual(backup.check_db(local)[1], "other-installation")
        result = self.ops.restore(name,self.now,replace_installation=True)
        with backup.connection(self.dir/result["previous"],readonly=True) as local:
            self.assertEqual(backup.check_db(local)[1], "other-installation")
        with backup.connection(self.db,readonly=True) as restored:
            self.assertEqual(backup.check_db(restored)[:2], (destination_device, self.lineage))
        (self.dir/name).write_bytes(b"broken")
        with self.assertRaises(sqlite3.DatabaseError):
            self.ops.restore(name,self.now)
        with backup.connection(self.db,readonly=True) as restored:
            self.assertEqual(restored.execute("SELECT count(*) FROM Booking").fetchone(),(1,))

    def test_thirty_days_from_capture_and_no_deletion_after_backup_failure(self):
        old = self.now - dt.timedelta(days=30)
        expiring = self.ops.save(old,backup.latest_slot(old))["name"]
        retained = self.ops.save(old+dt.timedelta(seconds=1))["name"]
        extra = self.dir/"customer-notes.txt"
        extra.write_text("keep")
        previous = self.dir/expiring
        with patch.object(self.ops,"create",side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                self.ops.save(self.now)
        self.assertTrue(previous.exists())
        result = self.ops.save(self.now)
        self.assertEqual(result["removed"],[expiring])
        self.assertTrue((self.dir/retained).is_file())
        self.assertEqual(extra.read_text(),"keep")
        self.assertTrue(all(not p.name.startswith(".entrip-copy") for p in self.dir.iterdir()))

    def test_post_copy_validation_failure_reinstates_prior_image(self):
        name = self.ops.save(self.now)["name"]
        self.conn.execute("UPDATE User SET name='보존 대상'")
        self.conn.commit()
        self.conn.close()
        original = backup.check_db
        failed = False

        def fail_after_write(connection):
            nonlocal failed
            database_file = connection.execute("pragma database_list").fetchone()[2]
            identity = original(connection)
            if Path(database_file)==self.db and identity[2]!=self.stream and not failed:
                failed = True
                raise RuntimeError("post-install verification failed")
            return identity

        with patch.object(backup, "check_db", side_effect=fail_after_write):
            with self.assertRaisesRegex(RuntimeError, "post-install"):
                self.ops.restore(name,self.now)
        with backup.connection(self.db,readonly=True) as current:
            self.assertEqual(current.execute("SELECT name FROM User").fetchone()[0],"보존 대상")
            self.assertEqual(backup.check_db(current)[2],self.stream)

    def test_interrupted_cold_replacement_resumes_before_host_opens(self):
        name = self.ops.save(self.now)["name"]
        self.conn.close()
        self.db.unlink()
        original = self.ops.finish_pending
        def cut_power():
            if self.ops.pending.exists():
                raise RuntimeError("power cut")
            original()
        with patch.object(self.ops, "finish_pending", side_effect=cut_power):
            with self.assertRaisesRegex(RuntimeError, "power cut"):
                self.ops.restore(name,self.now)
        self.assertTrue(self.ops.ready.exists())
        self.assertTrue(self.ops.pending.exists())
        with self.ops.online():
            self.assertFalse(self.ops.pending.exists())
            with backup.connection(self.db,readonly=True) as restored:
                self.assertEqual(backup.check_db(restored)[1],self.lineage)


class ProductionSchemaTests(unittest.TestCase):
    def test_actual_lan_schema_daemon_and_restore_commands(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / "entrip.sqlite"
            backups = Path(directory) / "snapshots"
            edits = []
            env_args = ["--database", str(db), "--backups", str(backups)]
            tool = [sys.executable, str(ROOT / "deploy/lan/sqlite/backup.py")]

            def cli(command, *args):
                return json.loads(subprocess.check_output([*tool, command, *env_args, *args], text=True))

            with sqlite3.connect(db) as conn:
                for migration in sorted((ROOT / "packages/api/prisma/sqlite/migrations").glob("*/migration.sql")):
                    conn.executescript(migration.read_text())
            subprocess.run([sys.executable, str(ROOT / "deploy/lan/sqlite/history.py"), str(db)],
                           capture_output=True, check=True)
            with backup.connection(db) as live:
                live.execute("PRAGMA journal_mode=WAL")
                live.execute("PRAGMA foreign_keys=ON")
                live.execute("""INSERT INTO User (id,email,name,password,updatedAt)
                                VALUES('owner','hub@example.test','담당자','fixture',CURRENT_TIMESTAMP)""")
                live.execute("""INSERT INTO Booking (id,bookingNumber,teamName,type,origin,destination,startDate,
                    endDate,coordinator,userId,updatedAt) VALUES('test-cuid','EX123','예전 예약','PACKAGE','부산','일본',
                    '2026-12-01','2026-12-06','담당자','owner',CURRENT_TIMESTAMP)""")
                live.commit()
                edits = live.execute("SELECT seq,changeId,revision,deviceId FROM EntripSyncChange ORDER BY seq").fetchall()
                old_identity = live.execute("SELECT entityUuid FROM EntripSyncEntity WHERE localId='test-cuid'").fetchone()
                saved = cli("backup")["name"]
                daemon = subprocess.Popen([*tool, "daemon", *env_args], stdout=subprocess.PIPE, text=True)
                try:
                    import select
                    self.assertTrue(select.select([daemon.stdout], [], [], 8)[0])
                    self.assertEqual(json.loads(daemon.stdout.readline())["status"], "ok")
                finally:
                    daemon.terminate()
                    daemon.wait(timeout=5)
                    daemon.stdout.close()
                self.assertEqual(len(cli("list")["backups"]),2)
                live.execute("DELETE FROM Booking WHERE id='test-cuid'")
                live.commit()
            result = cli("restore","--name",saved)
            self.assertTrue(result["previous"])
            with backup.connection(db,readonly=True) as restored:
                self.assertEqual(restored.execute("SELECT teamName FROM Booking").fetchone(),("예전 예약",))
                self.assertEqual(restored.execute("SELECT entityUuid FROM EntripSyncEntity WHERE localId='test-cuid'").fetchone(),old_identity)
                self.assertEqual(restored.execute("SELECT seq,changeId,revision,deviceId FROM EntripSyncChange ORDER BY seq").fetchall(),edits)
            target = Path(directory) / "new-pc.sqlite"
            copy = backup.Backups(target, backups)
            copy.restore(saved, dt.datetime.now(backup.KST), replace_installation=True)
            with backup.connection(target) as restored:
                new_device = backup.check_db(restored)[0]
                self.assertEqual(restored.execute("SELECT seq,changeId,revision,deviceId FROM EntripSyncChange ORDER BY seq").fetchall(), edits)
                self.assertNotIn(new_device, {row[3] for row in edits})
                restored.execute("UPDATE Booking SET teamName='새 PC에서 수정' WHERE id='test-cuid'")
                restored.commit()
                self.assertEqual(restored.execute("SELECT deviceId FROM EntripSyncChange ORDER BY seq DESC LIMIT 1").fetchone(), (new_device,))


if __name__ == "__main__":
    unittest.main(verbosity=2)
