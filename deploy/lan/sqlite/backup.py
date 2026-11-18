"""Entrip's host-local SQLite online backups and offline restore commands."""

import argparse
import contextlib
import datetime as dt
import fcntl
import json
import os
import re
import signal
import sqlite3
import sys
import tempfile
import time
import uuid
import zipfile
from pathlib import Path

KST = dt.timezone(dt.timedelta(hours=9), "KST")
SLOTS = (8, 12, 18)
RETENTION = dt.timedelta(days=30)
NAME = re.compile(r"entrip-(auto|manual|before-restore|damaged)-(\d{8}T\d{6})(?:-(?:[a-f0-9]{12}|[a-f0-9]{32}))?\.(sqlite3|zip)")
COMPANIONS = ("-wal", "-shm", "-journal")


def latest_slot(now):
    local = now.astimezone(KST)
    for hour in reversed(SLOTS):
        candidate = local.replace(hour=hour, minute=0, second=0, microsecond=0)
        if candidate <= local:
            return candidate
    return (local - dt.timedelta(days=1)).replace(hour=SLOTS[-1], minute=0, second=0, microsecond=0)


def filename(kind, now, stream=None):
    stamp = now.astimezone(KST).strftime("%Y%m%dT%H%M%S")
    suffix = "-" + (uuid.UUID(stream).hex if stream else uuid.uuid4().hex[:12])
    return f"entrip-{kind}-{stamp}{suffix}." + ("zip" if kind == "damaged" else "sqlite3")


def owned_entry(path):
    match = NAME.fullmatch(path.name)
    if not match or path.is_symlink() or not path.is_file():
        return None
    kind, stamp, extension = match.groups()
    if (kind == "damaged") != (extension == "zip"):
        return None
    try:
        created = dt.datetime.strptime(stamp, "%Y%m%dT%H%M%S").replace(tzinfo=KST)
    except ValueError:
        return None
    return kind, created


def sync_dir(directory):
    fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def sync_file(path):
    with path.open("rb") as handle:
        os.fsync(handle.fileno())


@contextlib.contextmanager
def temporary_file(parent, prefix):
    fd, name = tempfile.mkstemp(prefix=prefix, dir=parent)
    os.close(fd)
    path = Path(name)
    try:
        yield path
    finally:
        for item in (path, *(Path(name + ext) for ext in COMPANIONS)):
            item.unlink(missing_ok=True)


@contextlib.contextmanager
def lock(path, mode):
    with path.open("a+b") as handle:
        try:
            fcntl.flock(handle, mode | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("다른 작업이 진행 중입니다. 복구하려면 API와 자동 백업을 먼저 중지하세요.") from None
        yield handle


@contextlib.contextmanager
def connection(path, readonly=False):
    uri = path.absolute().as_uri() + ("?mode=ro" if readonly else "?mode=rw")
    conn = sqlite3.connect(uri, uri=True, timeout=5)
    try:
        yield conn
    finally:
        conn.close()


class DamagedDatabase(ValueError):
    pass


def check_db(conn):
    row = conn.execute("PRAGMA integrity_check").fetchone()
    if row != ("ok",):
        raise DamagedDatabase("SQLite 무결성 검사 실패")
    if conn.execute("PRAGMA foreign_key_check").fetchone():
        raise DamagedDatabase("SQLite 외래 키 검사 실패")
    required = {"User", "Booking", "EntripSyncAgency", "EntripSyncDevice", "EntripSyncEntity", "EntripSyncChange"}
    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_schema WHERE type='table'")}
    if not required.issubset(tables):
        raise ValueError("Entrip 예약·사용자·동기화 메타데이터가 없습니다.")
    devices = conn.execute('SELECT deviceId,databaseId,streamId FROM EntripSyncDevice WHERE singleton=1').fetchall()
    if len(devices) != 1 or not all(devices[0]):
        raise ValueError("Entrip DB 식별자가 없습니다.")
    return devices[0]


def backup_between(source, destination):
    deadline = time.monotonic() + 600
    best_remaining = None

    def progress(status, remaining, total):
        nonlocal deadline, best_remaining
        if status == sqlite3.SQLITE_DONE:
            return
        if status == sqlite3.SQLITE_OK and (best_remaining is None or remaining < best_remaining):
            best_remaining = remaining
            deadline = time.monotonic() + 600
        elif time.monotonic() > deadline:
            raise TimeoutError("SQLite 스냅샷이 10분 동안 진행되지 않았습니다. 다시 시도하세요.")

    source.backup(destination, pages=256, progress=progress, sleep=0.1)


def make_snapshot(source, target):
    with connection(source, readonly=True) as src, connection(target) as dst:
        backup_between(src, dst)
        # All pages, including committed WAL frames, now belong to this single file.
        dst.execute("PRAGMA journal_mode=DELETE")
        identity = check_db(dst)
    sync_file(target)
    return identity


class Backups:
    def __init__(self, database, directory):
        self.database = Path(database).absolute()
        self.directory = Path(directory).absolute()
        self.host_lock = self.database.with_name("." + self.database.name + ".host.lock")
        self.write_lock = self.database.with_name("." + self.database.name + ".backup.lock")
        self.pending = self.database.with_name("." + self.database.name + ".restore-pending.json")
        self.ready = self.database.with_name("." + self.database.name + ".restore-ready")

    def entries(self):
        if not self.directory.exists():
            return []
        rows = []
        for path in self.directory.iterdir():
            info = owned_entry(path)
            if info:
                kind, slot = info
                try:
                    stat = path.stat()
                except FileNotFoundError:
                    continue
                created = dt.datetime.fromtimestamp(stat.st_mtime, KST)
                entry = dict(name=path.name, kind=kind, timeKst=created.isoformat(),
                             bytes=stat.st_size, restorable=kind != "damaged")
                if kind == "auto":
                    entry["slotKst"] = slot.isoformat()
                rows.append(entry)
        return sorted(rows, key=lambda row: (row["timeKst"], row["name"]), reverse=True)

    def prune(self, now):
        removed = []
        for path in self.directory.iterdir():
            info = owned_entry(path)
            if info and dt.datetime.fromtimestamp(path.stat().st_mtime, KST) <= now.astimezone(KST) - RETENTION:
                path.unlink()
                removed.append(path.name)
        if removed:
            sync_dir(self.directory)
        return removed

    def create(self, kind, now, *, final=None):
        self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        final = final or self.directory / filename(kind, now)
        with temporary_file(self.directory, ".entrip-copy-") as tmp:
            identity = make_snapshot(self.database, tmp)
            os.utime(tmp, (now.timestamp(), now.timestamp()))
            sync_file(tmp)
            os.replace(tmp, final)
            sync_dir(self.directory)
        return final, identity

    def save(self, now, slot=None):
        with lock(self.write_lock, fcntl.LOCK_EX):
            final = None
            if slot:
                with connection(self.database, readonly=True) as current:
                    row = current.execute("SELECT streamId FROM EntripSyncDevice WHERE singleton=1").fetchone()
                if not row:
                    raise ValueError("현재 데이터베이스를 초기화하는 중입니다.")
                final = self.directory / filename("auto", slot, row[0])
                if final.is_file() and not final.is_symlink():
                    try:
                        with connection(final, readonly=True) as snapshot:
                            check_db(snapshot)
                        return dict(name=final.name, existing=True, removed=self.prune(now))
                    except (sqlite3.DatabaseError, ValueError):
                        pass
            final, _ = self.create("auto" if slot else "manual", now, final=final)
            return dict(name=final.name, existing=False, removed=self.prune(now))

    def capture_damaged(self, now):
        final = self.directory / filename("damaged", now)
        with temporary_file(self.directory, ".entrip-rescue-") as tmp:
            with zipfile.ZipFile(tmp, "w") as archive:
                for suffix in ("", *COMPANIONS):
                    path = Path(str(self.database) + suffix)
                    if path.exists():
                        archive.write(path, self.database.name + suffix)
            with zipfile.ZipFile(tmp) as archive:
                if archive.testzip():
                    raise RuntimeError("손상 원본 구조 파일 보존에 실패했습니다.")
            sync_file(tmp)
            os.replace(tmp, final)
            sync_dir(self.directory)
        return final

    def finish_pending(self):
        # Only a missing/corrupt destination needs file replacement. A durable intent
        # lets the next host startup finish a power-interrupted WAL/file replacement.
        if not self.pending.exists():
            return
        intent = json.loads(self.pending.read_text())
        stream = intent["streamId"]
        if self.ready.exists():
            with connection(self.ready, readonly=True) as candidate:
                if check_db(candidate)[2] != stream:
                    raise ValueError("복구 대기 파일의 식별자가 일치하지 않습니다.")
            for suffix in COMPANIONS:
                Path(str(self.database) + suffix).unlink(missing_ok=True)
            os.replace(self.ready, self.database)
            sync_dir(self.database.parent)
        with connection(self.database, readonly=True) as installed:
            if check_db(installed)[2] != stream:
                raise ValueError("복구 대상 DB를 확인하지 못했습니다.")
        self.pending.unlink()
        sync_dir(self.database.parent)

    @contextlib.contextmanager
    def online(self):
        if self.pending.exists():
            with lock(self.host_lock, fcntl.LOCK_EX):
                self.finish_pending()
        with lock(self.host_lock, fcntl.LOCK_SH) as host:
            if self.pending.exists():
                raise RuntimeError("중단된 복구가 있습니다. 재시작하여 복구를 마치세요.")
            yield host

    def replace_damaged(self, candidate, stream):
        os.replace(candidate, self.ready)
        sync_dir(self.database.parent)
        with temporary_file(self.database.parent, ".entrip-intent-") as intent:
            intent.write_text(json.dumps(dict(streamId=stream)))
            sync_file(intent)
            os.replace(intent, self.pending)
            sync_dir(self.database.parent)
        self.finish_pending()

    def restore(self, name, now, replace_installation=False):
        if not NAME.fullmatch(name) or Path(name).name != name:
            raise ValueError("목록에 표시된 백업 파일 이름을 선택하세요.")
        source = self.directory / name
        info = owned_entry(source)
        if not info or info[0] == "damaged":
            raise ValueError("복구 가능한 백업 파일이 없습니다.")
        with lock(self.host_lock, fcntl.LOCK_EX), lock(self.write_lock, fcntl.LOCK_EX):
            self.finish_pending()
            with temporary_file(self.database.parent, ".entrip-restore-") as candidate:
                identity = make_snapshot(source, candidate)
                old = None
                safety = None
                if self.database.exists():
                    try:
                        with connection(self.database, readonly=True) as current:
                            old = check_db(current)
                    except (sqlite3.DatabaseError, DamagedDatabase) as exc:
                        # Rescue only an unreadable source. Busy, permissions and disk
                        # I/O errors must stop restore rather than override a live DB.
                        code = getattr(exc, "sqlite_errorcode", 0) & 0xff
                        if isinstance(exc, sqlite3.DatabaseError) and code not in (
                            sqlite3.SQLITE_CORRUPT, sqlite3.SQLITE_NOTADB
                        ):
                            raise
                        safety = self.capture_damaged(now)
                    if old:
                        if old[1] != identity[1] and not replace_installation:
                            raise ValueError("현재 DB와 백업의 databaseId가 다릅니다.")
                        safety, _ = self.create("before-restore", now)
                elif any(Path(str(self.database) + suffix).exists() for suffix in COMPANIONS):
                    safety = self.capture_damaged(now)
                device = identity[0]
                if old:
                    device = old[0]
                elif replace_installation:
                    device = str(uuid.uuid4())
                stream = str(uuid.uuid4())
                with connection(candidate) as dst:
                    dst.execute("UPDATE EntripSyncDevice SET deviceId=?,streamId=? WHERE singleton=1",
                                (device, stream))
                    dst.commit()
                    check_db(dst)
                sync_file(candidate)
                if old:
                    # SQLite owns the write transaction: abrupt termination leaves
                    # the previous image or the complete restored image, even in WAL.
                    installed = False
                    with connection(self.database) as current:
                        current.execute("PRAGMA synchronous=FULL")
                        try:
                            with connection(candidate, readonly=True) as src:
                                backup_between(src, current)
                            installed = True
                            if check_db(current)[2] != stream:
                                raise RuntimeError("복구 후 DB 검증에 실패했습니다.")
                        except Exception:
                            if installed:
                                with connection(safety, readonly=True) as previous:
                                    backup_between(previous, current)
                                check_db(current)
                            raise
                else:
                    self.replace_damaged(candidate, stream)
        return dict(name=name, previous=safety.name if safety else None, streamId=stream)

    def daemon(self):
        last = None
        stopped = False

        def stop(signum, frame):
            nonlocal stopped
            stopped = True

        signal.signal(signal.SIGTERM, stop)
        signal.signal(signal.SIGINT, stop)
        with self.online():
            while not stopped:
                now = dt.datetime.now(KST)
                slot = latest_slot(now)
                if slot != last:
                    try:
                        result = self.save(now, slot)
                        emit(dict(status="ok", slotKst=slot.isoformat(), **result))
                        last = slot
                    except (OSError, RuntimeError, ValueError, sqlite3.DatabaseError) as exc:
                        emit(dict(status="error", slotKst=slot.isoformat(), error=str(exc)), sys.stderr)
                for _ in range(30):
                    if stopped:
                        break
                    time.sleep(1)


def emit(record, stream=sys.stdout):
    print(json.dumps(record, ensure_ascii=False), file=stream, flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="action", required=True)
    for command in ("daemon", "backup", "list", "restore", "guard"):
        sub = commands.add_parser(command)
        sub.add_argument("--database", default=os.environ.get("ENTRIP_SQLITE_PATH", "/data/entrip.sqlite"))
        sub.add_argument("--backups", default=os.environ.get("ENTRIP_BACKUP_DIR", "/backups"))
        if command == "restore":
            sub.add_argument("--name", required=True)
            sub.add_argument("--replace-installation", action="store_true",
                             help="Replace a separately initialized installation with this backup")
        if command == "guard":
            sub.add_argument("program", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    ops = Backups(args.database, args.backups)
    now = dt.datetime.now(KST)
    if args.action == "guard":
        program = args.program[1:] if args.program[:1] == ["--"] else args.program
        if not program:
            parser.error("guard requires a program")
        with ops.online() as host:
            os.set_inheritable(host.fileno(), True)
            os.execvp(program[0], program)
    if args.action == "daemon":
        ops.daemon()
        return
    if args.action == "list":
        result = dict(backups=ops.entries())
    elif args.action == "restore":
        result = ops.restore(args.name, now, args.replace_installation)
    else:
        with ops.online():
            result = ops.save(now)
    emit(dict(status="ok", **result))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, sqlite3.Error, zipfile.BadZipFile) as failure:
        emit(dict(status="error", error=str(failure)), sys.stderr)
        sys.exit(1)
