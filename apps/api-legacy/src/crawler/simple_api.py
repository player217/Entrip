"""Serve the checked-in schedule snapshot without pretending to crawl live data."""
from datetime import datetime, timezone
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException

app = FastAPI()


def load_flight_data():
    path = Path(__file__).parent / "korean_flight_schedules.json"
    try:
        with path.open(encoding="utf-8") as handle:
            data = json.load(handle)
        if not isinstance(data, dict) or not data:
            raise ValueError("empty snapshot")
        return data
    except (OSError, ValueError):
        raise HTTPException(status_code=503, detail="Flight snapshot is unavailable")


@app.get("/health")
async def health():
    data = load_flight_data()
    dates = [item.get("crawledAt") for item in data.values() if item.get("crawledAt")]
    return {
        "status": "snapshot",
        "source": "repository snapshot (not live)",
        "crawl_status": {
            "last_schedule_crawl": max(dates) if dates else None,
            "last_live_crawl": None,
            "last_schedule_status": "snapshot",
            "last_live_status": "not_configured",
            "failed_airports": [],
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/schedule/{airport_code}")
async def get_schedule(airport_code: str):
    data = load_flight_data()
    airport_code = airport_code.upper()
    if airport_code not in data:
        raise HTTPException(status_code=404, detail=f"Airport {airport_code} not found")
    return {**data[airport_code], "source": "repository snapshot (not live)", "stale": True}


@app.get("/api/airports")
async def get_airports():
    data = load_flight_data()
    airports = [{"code": code, "name": item.get("airportName", code), "totalFlights": len(item.get("flights", []))} for code, item in data.items()]
    return {"airports": airports, "total": len(airports)}


@app.get("/api/schedule/{airport_code}/destinations")
async def get_destinations(airport_code: str):
    schedule = await get_schedule(airport_code)
    destinations = sorted({row["destination"] for row in schedule.get("flights", []) if row.get("destination")})
    return {"airport": airport_code.upper(), "destinations": destinations, "total": len(destinations)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
