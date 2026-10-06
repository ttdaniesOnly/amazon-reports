// minibus report site — reads aggregate views from Supabase (PostgREST) and renders them.
// No build step, no server: the page is static, the data is fetched at runtime.
// The publishable key below can only see the two aggregate views — detail tables are locked down.

const CFG = window.MINIBUS_CONFIG || {};
const SUPA = (CFG.supabaseUrl || "").replace(/\/+$/, "");
const KEY = CFG.supabaseKey || "";

const CHART_DAYS = 30;

// ---------------------------------------------------------------- helpers
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const n0 = v => Number(v || 0);
const int = v => n0(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
const usd = v => "$" + n0(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdShort = v => {
  const x = n0(v);
  if (x >= 1e6) return "$" + (x / 1e6).toFixed(1) + "M";
  if (x >= 1e3) return "$" + (x / 1e3).toFixed(1) + "k";
  return "$" + x.toFixed(0);
};
const pct = v => (v == null ? "—" : Number(v).toFixed(2) + "%");

function weightedAcos(spend, sales) {
  return sales > 0 ? (spend / sales) * 100 : null;
}

async function sbGet(path) {
  const res = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, Accept: "application/json" }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} ${body.slice(0, 160)}`);
  }
  return res.json();
}

// ---------------------------------------------------------------- rendering
function setStatus(text, cls) {
  const el = document.getElementById("generated");
  el.textContent = text;
  el.className = "pill" + (cls ? " " + cls : "");
}

function showEmpty(msg) {
  const empty = document.getElementById("empty");
  empty.hidden = false;
  if (msg) {
    const p = document.createElement("p");
    p.className = "hint";
    p.innerHTML = msg;
    empty.appendChild(p);
  }
  ["kpis", "monthly-wrap", "daily-wrap"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
}

function renderKpis(rows) {
  const t = rows.reduce((a, r) => ({
    impressions: a.impressions + n0(r.impressions),
    clicks: a.clicks + n0(r.clicks),
    spend: a.spend + n0(r.spend),
    sales: a.sales + n0(r.sales),
    orders: a.orders + n0(r.orders),
    units: a.units + n0(r.units),
    ntb_orders: a.ntb_orders + n0(r.ntb_orders),
  }), { impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0, units: 0, ntb_orders: 0 });

  const acos = weightedAcos(t.spend, t.sales);
  const ctr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : null;
  const cvr = t.clicks > 0 ? (t.orders / t.clicks) * 100 : null;

  const cards = [
    { label: "Ad spend", value: usd(t.spend), sub: `${rows.length} month(s)` },
    { label: "Ad sales", value: usd(t.sales), sub: `${int(t.units)} units` },
    { label: "ACOS", value: pct(acos), sub: acos == null ? "no sales yet" : "spend / sales" },
    { label: "Orders", value: int(t.orders), sub: `${int(t.ntb_orders)} new-to-brand` },
    { label: "Impressions", value: int(t.impressions), sub: `${int(t.clicks)} clicks` },
    { label: "CTR", value: pct(ctr), sub: "clicks / impressions" },
  ];

  document.getElementById("kpis").innerHTML = cards.map(c => `
    <div class="kpi">
      <div class="kpi-label">${esc(c.label)}</div>
      <div class="kpi-value">${esc(c.value)}</div>
      <div class="kpi-sub">${esc(c.sub)}</div>
    </div>`).join("");
}

function renderMonthly(rows) {
  document.getElementById("monthly-body").innerHTML = rows.map(r => {
    const acos = r.acos == null ? weightedAcos(r.spend, r.sales) : r.acos;
    return `<tr>
      <td class="strong">${esc(r.month)}</td>
      <td>${esc(r.market || "—")}</td>
      <td class="num">${int(r.impressions)}</td>
      <td class="num">${int(r.clicks)}</td>
      <td class="num">${usd(r.spend)}</td>
      <td class="num">${usd(r.sales)}</td>
      <td class="num">${int(r.orders)}</td>
      <td class="num ${acos != null && Number(acos) > 100 ? "warn" : ""}">${pct(acos)}</td>
      <td class="num">${int(r.days)}</td>
    </tr>`;
  }).join("");
}

function renderChart(daily) {
  const rows = daily.slice().sort((a, b) => String(a.report_date).localeCompare(String(b.report_date))).slice(-CHART_DAYS);
  const wrap = document.getElementById("chart");
  if (rows.length < 2) { wrap.innerHTML = `<p class="hint">Need at least 2 days of data for a trend.</p>`; return; }

  const W = 900, H = 260, PADL = 52, PADR = 16, PADT = 16, PADB = 34;
  const iw = W - PADL - PADR, ih = H - PADT - PADB;
  const maxV = Math.max(...rows.flatMap(r => [n0(r.spend), n0(r.sales)]), 1);
  const step = rows.length > 1 ? iw / (rows.length - 1) : 0;
  const x = i => PADL + i * step;
  const y = v => PADT + ih - (v / maxV) * ih;

  const line = key => rows.map((r, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(n0(r[key])).toFixed(1)}`).join(" ");
  const area = key => `${line(key)} L${x(rows.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;

  const grid = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const v = maxV * f, yy = y(v);
    return `<line class="grid" x1="${PADL}" y1="${yy.toFixed(1)}" x2="${W - PADR}" y2="${yy.toFixed(1)}"/>
            <text class="axis" x="${PADL - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${esc(usdShort(v))}</text>`;
  }).join("");

  const ticks = rows.map((r, i) => (i % Math.ceil(rows.length / 8) === 0 || i === rows.length - 1)
    ? `<text class="axis" x="${x(i).toFixed(1)}" y="${H - 12}" text-anchor="middle">${esc(String(r.report_date).slice(5))}</text>`
    : "").join("");

  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily spend and sales trend" preserveAspectRatio="none">
      ${grid}
      <path class="area sales" d="${area("sales")}"/>
      <path class="area spend" d="${area("spend")}"/>
      <path class="line sales" d="${line("sales")}"/>
      <path class="line spend" d="${line("spend")}"/>
      ${ticks}
    </svg>
    <div class="legend">
      <span><i class="sw spend"></i>Ad spend</span>
      <span><i class="sw sales"></i>Ad sales</span>
    </div>`;
}

function renderDaily(daily) {
  const rows = daily.slice().sort((a, b) => String(b.report_date).localeCompare(String(a.report_date))).slice(0, 14);
  document.getElementById("daily-body").innerHTML = rows.map(r => {
    const acos = r.acos == null ? weightedAcos(r.spend, r.sales) : r.acos;
    return `<tr>
      <td class="strong">${esc(r.report_date)}</td>
      <td>${esc(r.market || "—")}</td>
      <td class="num">${int(r.impressions)}</td>
      <td class="num">${int(r.clicks)}</td>
      <td class="num">${usd(r.spend)}</td>
      <td class="num">${usd(r.sales)}</td>
      <td class="num">${int(r.orders)}</td>
      <td class="num">${pct(acos)}</td>
    </tr>`;
  }).join("");
}

async function main() {
  if (!SUPA || !KEY) {
    setStatus("config missing", "err");
    showEmpty("assets/config.js is missing <code>supabaseUrl</code> / <code>supabaseKey</code>.");
    return;
  }
  setStatus("loading…");

  let monthly, daily;
  try {
    [monthly, daily] = await Promise.all([
      sbGet("public_monthly_summary?select=*&order=month.desc"),
      sbGet(`public_daily_summary?select=*&order=report_date.desc&limit=${CHART_DAYS * 3}`),
    ]);
  } catch (e) {
    console.error(e);
    setStatus("load failed", "err");
    showEmpty(`Could not reach Supabase: <code>${esc(e.message)}</code><br>Check assets/config.js and that the project is not paused.`);
    return;
  }

  if (!monthly.length) {
    setStatus("no data yet");
    showEmpty();
    return;
  }

  document.getElementById("empty").hidden = true;
  ["kpis", "monthly-wrap", "daily-wrap"].forEach(id => { document.getElementById(id).hidden = false; });

  renderKpis(monthly);
  renderMonthly(monthly);
  if (daily.length) { renderChart(daily); renderDaily(daily); }

  setStatus("updated " + new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }));
}

main();
