"""Read-only snapshot regressions; requires the crawler's FastAPI dependency."""
import asyncio
import sys
sys.dont_write_bytecode = True
import importlib.util
import json
from pathlib import Path
from unittest.mock import patch
from fastapi import HTTPException

root = Path(__file__).resolve().parents[2]
path = root / "apps/api-legacy/src/crawler/simple_api.py"
spec = importlib.util.spec_from_file_location("entrip_snapshot", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

schedule = asyncio.run(module.get_schedule("PUS"))
assert schedule["flights"], "Stored PUS schedule should be readable"
assert schedule["stale"] is True
assert "not live" in schedule["source"]
expected_timestamp = json.loads(path.with_name("korean_flight_schedules.json").read_text())["PUS"]["crawledAt"]
assert schedule["crawledAt"] == expected_timestamp, "Do not relabel the stored snapshot as a new crawl"
health = asyncio.run(module.health())
assert health["crawl_status"]["last_live_crawl"] is None
assert health["crawl_status"]["last_live_status"] == "not_configured"
with patch.object(Path, "open", side_effect=FileNotFoundError):
    try:
        module.load_flight_data()
    except HTTPException as error:
        assert error.status_code == 503
    else:
        raise AssertionError("Missing snapshot must not generate substitute flight times")
print("Snapshot verification passed: original timestamp, stale/source labels, no fake live health, missing file 503")
