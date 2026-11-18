"""Build the Windows LAN distribution from the runtime image allowlist."""
import argparse
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import subprocess
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parents[2]
EXTRA_FILES = {
    "run.bat", "compose.lan.yml", ".dockerignore",
    "deploy/lan/Dockerfile", "deploy/lan/Dockerfile.dockerignore", "deploy/lan/gateway.conf",
    "docs/ENTRIP_RUN_GUIDE.md", "docs/PRODUCTION_V2_RUNTIME.md",
    "apps/api-legacy/src/crawler/Dockerfile.simple", "apps/api-legacy/src/crawler/simple_api.py",
    "apps/api-legacy/src/crawler/korean_flight_schedules.json",
    "apps/fx-free/Dockerfile", "apps/fx-free/server.js", "apps/fx-free/package-lock.json",
}
START_GUIDE = """Entrip · Windows LAN

1. ZIP 파일을 호스트 PC의 로컬 폴더에 모두 풉니다.
2. run.bat을 더블클릭합니다. 최초 설치에는 인터넷과 Linux 컨테이너용 Docker Desktop이 필요합니다.
   Windows가 다시 시작하라고 안내하면 재시작 후 run.bat을 다시 엽니다.
3. 관리자 계정은 .entrip-lan\\first-login.txt에서 확인합니다. 로그인 후 설정에서 직원을 등록합니다.
4. 같은 네트워크에 있는 직원은 실행 창에 표시된 LAN 주소를 자신의 브라우저에서 엽니다.

데이터는 호스트의 .entrip-lan\\data\\entrip.sqlite에 저장됩니다. 백업 목록 및 복원 명령은 run.bat help에서 확인하세요.
기존 설치 업그레이드는 docs\\ENTRIP_RUN_GUIDE.md를 먼저 읽고 진행하세요.
"""


def source_files():
    raw = subprocess.check_output(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"])
    files = {path for path in raw.decode().split("\0") if path and Path(path).is_file()}
    include = set()
    rules = Path("deploy/lan/Dockerfile.dockerignore").read_text().splitlines()
    if next(line for line in rules if line and not line.startswith("#")) != "**":
        raise ValueError("The runtime build must use a deny-by-default allowlist")
    for rule in rules:
        if not rule or rule.startswith("#"):
            continue
        allow = rule.startswith("!")
        pattern = rule.removeprefix("!")
        matches = {name for name in files if fnmatch.fnmatchcase(name, pattern)}
        if allow:
            include.update(matches)
        else:
            include.difference_update(matches)
            include = {name for name in include if not any(
                fnmatch.fnmatchcase(parent.as_posix(), pattern) for parent in Path(name).parents
            )}
    include.update(EXTRA_FILES)
    include.update(name for name in files if fnmatch.fnmatchcase(name, "scripts/windows/*.ps1"))
    for name in include:
        path = Path(name)
        if (path.is_symlink() or path.name.startswith(".env") or
                {"node_modules", ".entrip-lan", "__pycache__"}.intersection(path.parts)
                or any(part.startswith("entrip.sqlite") for part in path.parts)
                or path.suffix in {".sqlite", ".sqlite3", ".db", ".pyc", ".pem", ".key"}):
            raise ValueError(f"Unexpected distribution file {name}")
    return sorted(include)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="destination ZIP file")
    args = parser.parse_args()
    output = args.output.resolve()
    os.chdir(ROOT)
    files = source_files()
    entries = {name: Path(name).read_bytes() for name in files}
    entries["시작안내.txt"] = START_GUIDE.replace("\n", "\r\n").encode("utf-8-sig")
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_name(output.name + ".tmp")
    try:
        with ZipFile(temp, "w", compression=ZIP_DEFLATED) as archive:
            for name, data in sorted(entries.items()):
                info = ZipInfo(name)
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                archive.writestr(info, data, compress_type=ZIP_DEFLATED, compresslevel=7)
        with ZipFile(temp) as archive:
            if set(archive.namelist()) != set(entries) or any(
                    archive.read(name) != source for name, source in entries.items()):
                raise ValueError("ZIP contents differ from the source")
        temp.replace(output)
    finally:
        temp.unlink(missing_ok=True)
    print(json.dumps({"files": len(entries), "bytes": output.stat().st_size,
                      "sha256": hashlib.sha256(output.read_bytes()).hexdigest()}))


if __name__ == "__main__":
    main()
