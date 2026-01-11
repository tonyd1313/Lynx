/**
 * LYNX UI Hotfix
 * - Inject LYNX OPS widget (Dark / Ping API / Wipe / Force Refresh)
 * - Show backend status + pin count
 * - Redirect legacy /api/entities -> /api/pins
 */

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || "/api";

// --- 0) Redirect legacy endpoints at runtime ---
const _fetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    if (typeof input === "string") input = input.replace("/api/entities", "/api/pins");
    else if (input instanceof Request) {
      const u = input.url.replace("/api/entities", "/api/pins");
      if (u !== input.url) input = new Request(u, input);
    }
  } catch {}
  return _fetch(input as any, init);
};

function $(sel: string) { return document.querySelector(sel) as HTMLElement | null; }

function ensureOpsPanel() {
  let wrap = document.getElementById("lynx-ops");
  if (wrap) return wrap;

  wrap = document.createElement("div");
  wrap.id = "lynx-ops";
  wrap.innerHTML = `
    <div class="lynx-ops__title">LYNX OPS</div>
    <div class="lynx-ops__grid">
      <button class="lynx-ops__btn" id="lynx-ops-dark" type="button">Dark</button>
      <button class="lynx-ops__btn" id="lynx-ops-ping" type="button">Ping API</button>
      <button class="lynx-ops__btn" id="lynx-ops-wipe" type="button">Wipe</button>
      <button class="lynx-ops__btn" id="lynx-ops-refresh" type="button">Force Refresh</button>
    </div>
    <div class="lynx-ops__meta">
      <div>Backend via: <span class="lynx-ops__mono" id="lynx-ops-base"></span></div>
      <div>Status: <span class="lynx-ops__mono" id="lynx-ops-status">unknown</span></div>
      <div>Pins: <span class="lynx-ops__mono" id="lynx-ops-pins">—</span></div>
    </div>
  `;
  document.body.appendChild(wrap);
  return wrap;
}

function setText(id: string, v: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

async function pingHealth() {
  try {
    const r = await fetch(`${API_BASE}/health`, { method: "GET" });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json().catch(() => ({}));
    setText("lynx-ops-status", j?.status ? String(j.status) : "ok");
    return true;
  } catch {
    setText("lynx-ops-status", "down");
    return false;
  }
}

async function fetchPinsCount() {
  try {
    const r = await fetch(`${API_BASE}/pins`, { method: "GET" });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const n = Array.isArray(j) ? j.length : (typeof j?.count === "number" ? j.count : NaN);
    if (!Number.isNaN(n)) setText("lynx-ops-pins", String(n));
  } catch {
    // leave as-is
  }
}

/**
 * Wipe pins (tries multiple common endpoints so you don’t have to remember which one exists)
 * You can standardize this later in backend; this keeps UI usable NOW.
 */
async function wipePins() {
  const attempts: Array<{url: string; method: string}> = [
    { url: `${API_BASE}/pins`, method: "DELETE" },
    { url: `${API_BASE}/pins/wipe`, method: "POST" },
    { url: `${API_BASE}/pins/reset`, method: "POST" },
    { url: `${API_BASE}/wipe`, method: "POST" },
  ];

  for (const a of attempts) {
    try {
      const r = await fetch(a.url, { method: a.method });
      if (r.ok) return true;
    } catch {}
  }
  return false;
}

function toggleDark() {
  const root = document.documentElement;
  const on = root.classList.toggle("lynx-dark");
  try { localStorage.setItem("lynx_dark", on ? "1" : "0"); } catch {}
}

function restoreDark() {
  try {
    const v = localStorage.getItem("lynx_dark");
    if (v === "1") document.documentElement.classList.add("lynx-dark");
  } catch {}
}

function wireButtons() {
  $("#lynx-ops-dark")?.addEventListener("click", () => toggleDark());
  $("#lynx-ops-ping")?.addEventListener("click", async () => { await pingHealth(); await fetchPinsCount(); });

  $("#lynx-ops-wipe")?.addEventListener("click", async () => {
    setText("lynx-ops-status", "wiping…");
    const ok = await wipePins();
    setText("lynx-ops-status", ok ? "wiped" : "wipe-failed");
    await fetchPinsCount();
    window.dispatchEvent(new Event("lynx:refresh"));
  });

  $("#lynx-ops-refresh")?.addEventListener("click", async () => {
    window.dispatchEvent(new Event("lynx:refresh"));
    window.dispatchEvent(new Event("lynx:force-refresh"));
    await fetchPinsCount();
  });
}

function boot() {
  restoreDark();
  ensureOpsPanel();
  setText("lynx-ops-base", API_BASE);
  wireButtons();

  // initial + polling
  pingHealth();
  fetchPinsCount();
  setInterval(() => { pingHealth(); fetchPinsCount(); }, 5000);
}

boot();
