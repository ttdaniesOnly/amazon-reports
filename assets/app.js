// minibus report site — renders data.json into month cards and previews CSVs.
const MAX_PREVIEW_ROWS = 50;
const MAX_PREVIEW_COLS = 12;

function fmtSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function render(data) {
  const monthsEl = document.getElementById("months");
  const emptyEl = document.getElementById("empty");
  document.getElementById("generated").textContent = data.generated ? "updated " + data.generated : "no data yet";

  monthsEl.querySelectorAll(".month-card").forEach(n => n.remove());

  const months = Object.keys(data.months || {}).sort().reverse();
  if (months.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  for (const m of months) {
    const files = data.months[m];
    const card = document.createElement("div");
    card.className = "month-card";
    const head = document.createElement("div");
    head.className = "month-head";
    head.innerHTML = `<h2 class="month-title">${esc(m)}</h2><span class="month-count">${files.length} file(s)</span>`;
    card.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "file-grid";
    for (const f of files) {
      const isCsv = f.name.toLowerCase().endsWith(".csv");
      const typeClass = (f.type === "Other") ? "badge other" : "badge";
      const meta = [fmtSize(f.size), f.rows != null ? (f.rows + " rows") : null].filter(Boolean).join(" · ");
      const actions = `<a class="btn btn-primary" href="${esc(f.path)}" download>Download</a>` +
        (isCsv ? `<button class="btn" data-preview="${esc(f.path)}">Preview</button>` : "");
      const item = document.createElement("div");
      item.className = "file";
      item.innerHTML =
        `<div class="file-top"><span class="${typeClass}">${esc(f.type)}</span>` +
        `<span class="file-name">${esc(f.name)}</span></div>` +
        `<div class="file-meta">${esc(meta)}</div>` +
        `<div class="file-actions">${actions}</div>`;
      grid.appendChild(item);
    }
    card.appendChild(grid);
    monthsEl.appendChild(card);
  }

  monthsEl.querySelectorAll("[data-preview]").forEach(btn => {
    btn.addEventListener("click", () => openPreview(btn.getAttribute("data-preview")));
  });
}

async function openPreview(path) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modal-body");
  const title = document.getElementById("modal-title");
  title.textContent = "Loading…";
  body.innerHTML = "";
  modal.hidden = false;

  try {
    const res = await fetch(path);
    const text = await res.text();
    const rows = parseCSV(text);
    if (rows.length === 0) { body.innerHTML = "<p class='preview-note'>Empty file.</p>"; return; }
    const header = rows[0];
    const shownCols = Math.min(header.length, MAX_PREVIEW_COLS);
    const shownRows = rows.slice(0, MAX_PREVIEW_ROWS + 1);
    let html = `<p class="preview-note">First ${Math.min(shownRows.length - 1, MAX_PREVIEW_ROWS)} rows` +
      (header.length > shownCols ? `, first ${shownCols} of ${header.length} columns` : "") + ` · ${esc(path)}</p>`;
    html += "<table class='preview'><thead><tr>";
    for (let c = 0; c < shownCols; c++) html += `<th>${esc(header[c] || "")}</th>`;
    html += "</tr></thead><tbody>";
    for (let r = 1; r < shownRows.length; r++) {
      html += "<tr>";
      for (let c = 0; c < shownCols; c++) html += `<td>${esc(shownRows[r][c] || "")}</td>`;
      html += "</tr>";
    }
    html += "</tbody></table>";
    title.textContent = path.split("/").pop();
    body.innerHTML = html;
  } catch (e) {
    body.innerHTML = `<p class="preview-note">Could not load preview: ${esc(e.message)}</p>`;
  }
}

function closeModal() { document.getElementById("modal").hidden = true; }
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

fetch("data.json").then(r => r.json()).then(render).catch(err => {
  document.getElementById("generated").textContent = "failed to load data.json";
  console.error(err);
});
