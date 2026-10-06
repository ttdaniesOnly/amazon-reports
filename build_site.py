#!/usr/bin/env python3
"""
build_site.py — turn amcreport's monthly SP reports into the GitHub Pages site.

What it does:
  1. Scans a reports/YYYY-MM/ folder for CSV/XLSX files.
  2. Copies them into ./data/YYYY-MM/ (so GitHub Pages can serve them).
  3. Writes ./data.json with metadata (month -> files, size, row count).
  index.html + assets/app.js read data.json and render the page.

Usage:
  python build_site.py [path/to/reports]
  (default: auto-detects common amcreport locations; falls back to an empty site)

Run this after `amcreport` downloads new reports, then:
  git add -A && git commit -m "reports: YYYY-MM" && git push
"""
import os
import sys
import csv
import json
import shutil
import datetime

SITE_DIR = os.path.dirname(os.path.abspath(__file__))

DEFAULT_REPORT_DIRS = [
    os.path.join(SITE_DIR, "..", "amcreport", "reports"),
    r"C:\Users\Wang-Chao\WorkBuddy\2026-10-05-19-33-25\amcreport\reports",
    r"C:\Users\Wang-Chao\WorkBuddy\2026-10-05-18-13-53\amcreport\reports",
]

REPORT_TYPES = ["Search term", "Targeting", "Placement"]
SUPPORTED_EXT = (".csv", ".xlsx", ".txt")


def classify(name: str) -> str:
    n = name.lower()
    for t in REPORT_TYPES:
        if t.lower() in n:
            return t
    return "Other"


def count_csv_rows(path: str):
    try:
        with open(path, encoding="utf-8-sig", errors="ignore", newline="") as f:
            return max(sum(1 for _ in f) - 1, 0)
    except Exception:
        return None


def find_reports_dir() -> str | None:
    for d in DEFAULT_REPORT_DIRS:
        if os.path.isdir(d):
            return os.path.abspath(d)
    return None


def main() -> None:
    if len(sys.argv) > 1:
        reports_dir = os.path.abspath(sys.argv[1])
        if not os.path.isdir(reports_dir):
            print(f"[!] reports dir not found: {reports_dir}")
            sys.exit(1)
    else:
        reports_dir = find_reports_dir()

    data_root = os.path.join(SITE_DIR, "data")
    if os.path.isdir(data_root):
        shutil.rmtree(data_root)
    os.makedirs(data_root, exist_ok=True)

    months: dict[str, list] = {}

    if reports_dir:
        print(f"[i] scanning: {reports_dir}")
        for month in sorted(os.listdir(reports_dir)):
            mdir = os.path.join(reports_dir, month)
            if not os.path.isdir(mdir):
                continue
            files = []
            for fn in sorted(os.listdir(mdir)):
                if not fn.lower().endswith(SUPPORTED_EXT):
                    continue
                src = os.path.join(mdir, fn)
                dest_dir = os.path.join(data_root, month)
                os.makedirs(dest_dir, exist_ok=True)
                shutil.copy2(src, os.path.join(dest_dir, fn))
                size = os.path.getsize(src)
                rows = count_csv_rows(src) if fn.lower().endswith(".csv") else None
                files.append({
                    "name": fn,
                    "type": classify(fn),
                    "size": size,
                    "rows": rows,
                    "path": f"data/{month}/{fn}",
                })
            if files:
                months[month] = files
                print(f"    {month}: {len(files)} file(s)")
    else:
        print("[i] no reports dir found — building empty site (shows the 'no reports yet' state).")

    site_data = {
        "generated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "months": months,
    }

    with open(os.path.join(SITE_DIR, "data.json"), "w", encoding="utf-8") as f:
        json.dump(site_data, f, ensure_ascii=False, indent=2)

    total = sum(len(v) for v in months.values())
    print(f"[ok] built site — {len(months)} month(s), {total} file(s). data.json written.")


if __name__ == "__main__":
    main()
