#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Fetch LTA DataMall CarParkAvailabilityv2 in pages (skip=0..2500 step 500),
extract CarParkID and Location (lat lon), and save to CSV.

Usage:
    python fetch_carpark_locations.py --account-key YOUR_KEY --out carparks.csv
"""

import csv
import time
from typing import Dict, Tuple, Optional
import requests

BASE_URL = "https://datamall2.mytransport.sg/ltaodataservice/CarParkAvailabilityv2"
MAX_SKIP = 2500
STEP = 500
TIMEOUT = 15  # seconds
RETRIES = 3
RETRY_BACKOFF = 1.5  # exponential backoff factor


def parse_location(loc: str) -> Optional[Tuple[float, float]]:
    """
    Location string looks like: "1.4247403589254135 103.85173152023572"
    Returns (lat, lon) as floats or None if invalid.
    """
    if not loc:
        return None
    parts = loc.strip().split()
    if len(parts) != 2:
        return None
    try:
        lat = float(parts[0])
        lon = float(parts[1])
        return lat, lon
    except ValueError:
        return None


def fetch_page(account_key: str, skip: int) -> Dict:
    """
    Fetch one page with given skip. Raises requests.HTTPError on non-2xx after retries.
    """
    headers = {
        "AccountKey": account_key,
        "accept": "application/json",
    }
    params = {"$skip": skip}
    last_exc = None
    for attempt in range(1, RETRIES + 1):
        try:
            resp = requests.get(BASE_URL, headers=headers, params=params, timeout=TIMEOUT)
            # Raise for status (4xx/5xx)
            resp.raise_for_status()
            return resp.json()
        except (requests.RequestException, ValueError) as e:
            last_exc = e
            # backoff
            if attempt < RETRIES:
                sleep_s = RETRY_BACKOFF ** (attempt - 1)
                time.sleep(sleep_s)
            else:
                raise
    # Should not reach here
    if last_exc:
        raise last_exc
    return {}


def collect_locations(account_key: str) -> Dict[str, Tuple[float, float]]:
    """
    Iterate pages, return dict: {CarParkID: (lat, lon)}
    """
    result: Dict[str, Tuple[float, float]] = {}
    for skip in range(0, MAX_SKIP + 1, STEP):
        data = fetch_page(account_key, skip)
        values = data.get("value", [])
        if not values:
            # No more data; break early
            break

        for row in values:
            carpark_id = row.get("CarParkID")
            loc = row.get("Location")
            if not carpark_id or not loc:
                continue
            if carpark_id in result:
                # already captured; keep first occurrence
                continue
            parsed = parse_location(loc)
            if parsed is None:
                continue
            result[carpark_id] = parsed

        # 礼貌性限速，避免触发平台限流（可按需调整/删除）
        time.sleep(0.2)

    return result


def write_csv(mapping: Dict[str, Tuple[float, float]], out_path: str) -> None:
    """
    Write to CSV: CarParkID, latitude, longitude
    """
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["CarParkID", "latitude", "longitude"])
        # 排序输出更稳定（按 CarParkID）
        for carpark_id in sorted(mapping.keys()):
            lat, lon = mapping[carpark_id]
            writer.writerow([carpark_id, f"{lat:.10f}", f"{lon:.10f}"])


def main():
    ACCOUNT_KEY = "YqeURVRfTH2gLJXMFRq7wQ=="  # 直接写死在代码里
    OUT_FILE = "carpark_locations.csv"

    locations = collect_locations(ACCOUNT_KEY)
    if not locations:
        print("No locations collected. Check your AccountKey or API availability.")
        return

    write_csv(locations, OUT_FILE)
    print(f"Done. Wrote {len(locations)} records to {OUT_FILE}")


if __name__ == "__main__":
    main()
