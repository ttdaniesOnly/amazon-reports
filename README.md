# minibus · Amazon Ads Reports (static site)

A zero-server, public dashboard for the `amcreport` automation. It displays the
monthly Amazon Sponsored Products reports (Search term / Targeting / Placement)
that `amcreport` downloads, published as a GitHub Pages site.

> **Privacy note:** this repo is public and contains only rendered report files.
> The `amcreport/` workspace (with `config.json` / 紫鸟 credentials) stays
> private and is **never** pushed here.

## How it works

```
amcreport  ──downloads──▶  amcreport/reports/YYYY-MM/*.csv
                                      │
                          build_site.py  (copies + writes data.json)
                                      ▼
                       this repo  ──git push──▶  GitHub Pages
```

- `index.html` + `assets/` — the static UI (reads `data.json`).
- `data.json` — generated metadata (months, files, sizes, row counts).
- `data/YYYY-MM/` — the actual report files, copied here so Pages can serve them.
- `build_site.py` — regenerates `data.json` + `data/` from a reports folder.

## Local workflow

```bash
# 1) make sure amcreport has downloaded the latest reports
# 2) build the site (auto-detects the reports folder, or pass a path)
python build_site.py
python build_site.py "C:/path/to/amcreport/reports"   # explicit

# 3) commit + push
git add -A
git commit -m "reports: $(date +%Y-%m)"
git push
```

GitHub Pages picks up the push automatically (Settings → Pages → branch `main`,
folder `/root`).

## Custom domain (later)

When you're ready to point `minibus.work` here, add a `CNAME` file containing
`minibus.work` and set the same in Pages settings, then point DNS to GitHub
(records shown in Pages settings). This is independent of the eventual move to
your own server.
