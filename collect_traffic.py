import json
import os
import pathlib
import urllib.request
from datetime import datetime, timezone

key = os.environ.get("LTA_ACCOUNT_KEY", "").strip()
if not key:
    raise SystemExit("Missing LTA_ACCOUNT_KEY")
base = "https://datamall2.mytransport.sg/ltaodataservice/"
folder = pathlib.Path("data")
folder.mkdir(exist_ok=True)

def collect(endpoint, filename, fields):
    req = urllib.request.Request(base + endpoint, headers={"AccountKey": key, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as response:
        rows = json.load(response).get("value", [])
    clean = [{field: row.get(field) for field in fields} for row in rows]
    payload = {"updated_at": datetime.now(timezone.utc).isoformat(), "items": clean}
    (folder / filename).write_text(json.dumps(payload), encoding="utf-8")
    print(filename, len(clean))

collect("TrafficIncidents", "incidents.json", ["Type", "Latitude", "Longitude", "Message"])
collect("v3/TrafficSpeedBands", "speed-bands.json", ["RoadName", "SpeedBand", "MinimumSpeed", "MaximumSpeed", "StartLat", "StartLon", "EndLat", "EndLon"])
