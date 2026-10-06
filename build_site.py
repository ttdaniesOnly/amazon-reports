#!/usr/bin/env python3
"""
build_site.py — DEPRECATED.

The site no longer ships data with the HTML. It is a static shell that reads
two aggregate views from Supabase at runtime (see assets/config.js + assets/app.js),
so there is nothing to build locally any more.

Why this matters (read before re-enabling):
    amcreport-site is a PUBLIC GitHub repository. Copying real Amazon Ads CSVs
    into ./data/ and publishing them would expose your store's raw performance
    data — customer search terms, campaign names, spend — to the whole world.
    That is exactly what the Supabase layer exists to prevent.

If you really want to publish raw files locally (e.g. for a one-off share),
pass --local-files explicitly and accept the risk:

    python build_site.py --local-files [path/to/reports]
"""
import os
import sys

SITE_DIR = os.path.dirname(os.path.abspath(__file__))


def main() -> None:
    if "--local-files" not in sys.argv:
        print("[i] Nothing to build — the site reads Supabase at runtime.")
        print("[i] Ingestion: python supabase/ingest_pg.py --dir <reports> --self-check")
        print("[!] Refusing to copy report files into this public repo. See this file's docstring.")
        return
    print("[!] --local-files passed: copying raw reports into the PUBLIC repo.")
    print("[!] Make sure they contain no real store data.")
    raise SystemExit("not implemented anymore — intentionally removed to avoid data leaks")


if __name__ == "__main__":
    _ = SITE_DIR
    main()
