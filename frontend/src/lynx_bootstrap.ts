type AnyWin = Window & {
  __LYNX_BOOT__?: boolean;
  __LYNX_ADD_MODE__?: boolean;
};

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function hostBackendFallback(path: string) {
  const h = window.location.hostname || "127.0.0.1";
  return `http://${h}:8000${path.startsWith("/") ? path : `/${path}`}`;
}

/** Use Vite proxy first (/api/*). If proxy fails, fall back to http://<host>:8000 */
async function api(path: string, init?: RequestInit): Promise<Response> {
  const p = path.startsWith("/") ? path : `/${path}`;
  try {
    const r = await fetch(p, init);
    if (r.ok) return r;
    // If it returns non-OK, still return it (caller decides)
    return r;
  } catch {
    return fetch(hostBackendFallback(p), init);
  }
}

function toast(msg: string, isErr = false) {
  let el = document.getElementById("lynx-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "lynx-toast";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "20px";
    el.style.transform = "translateX(-50%)";
    el.style.padding = "10px 14px";
    el.style.borderRadius = "12px";
    el.style.fontSize = "13px";
    el.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    el.style.zIndex = "999999";
    el.style.backdropFilter = "blur(10px)";
    el.style["webkitBackdropFilter"] = "blur(10px)";
    el.style.border = "1px solid rgba(255,255,255,0.12)";
    el.style.background = "rgba(0,0,0,0.55)";
    el.style.color = "white";
    el.style.pointerEvents = "none";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  (el as any).style.background = isErr ? "rgba(120,0,0,0.55)" : "rgba(0,0,0,0.55)";
  setTimeout(() => { el && el.remove(); }, 2200);
}

function findButtonByText(substr: string): HTMLButtonElement | null {
  const all = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[];
  const s = substr.toLowerCase();
  return all.find(b => (b.textContent || "").toLowerCase().includes(s)) || null;
}

function buildOpsUI() {
  // Remove any old instance
  document.getElementById("lynx-ops-overlay")?.remove();

  const wrap = document.createElement("div");
  wrap.id = "lynx-ops-overlay";
  wrap.style.position = "fixed";
  wrap.style.right = "14px";
  wrap.style.bottom = "14px";
  wrap.style.zIndex = "999999";
  wrap.style.pointerEvents = "none";

  const card = document.createElement("div");
  card.style.pointerEvents = "auto";
  card.style.width = "340px";
  card.style.maxWidth = "92vw";
  card.style.borderRadius = "16px";
  card.style.padding = "12px";
  card.style.background = "rgba(10,10,12,0.62)";
  card.style.border = "1px solid rgba(255,255,255,0.12)";
  card.style.backdropFilter = "blur(14px)";
  card.style["webkitBackdropFilter"] = "blur(14px)";
  card.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
  card.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  card.style.color = "rgba(255,255,255,0.92)";

  const title = document.createElement("div");
  title.textContent = "LYNX OPS";
  title.style.fontSize = "12px";
  title.style.letterSpacing = "0.18em";
  title.style.opacity = "0.85";
  title.style.marginBottom = "10px";

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  grid.style.gap = "8px";

  const mkBtn = (label: string) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.padding = "10px 10px";
    b.style.borderRadius = "12px";
    b.style.border = "1px solid rgba(255,255,255,0.14)";
    b.style.background = "rgba(255,255,255,0.08)";
    b.style.color = "rgba(255,255,255,0.92)";
    b.style.fontSize = "13px";
    b.style.cursor = "pointer";
    b.onmouseenter = () => (b.style.background = "rgba(255,255,255,0.12)");
    b.onmouseleave = () => (b.style.background = "rgba(255,255,255,0.08)");
    return b;
  };

  const refreshBtn = mkBtn("Refresh");
  const addBtn = mkBtn("Add Pin");
  const ingestBtn = mkBtn("Local Seed");
  const wipeBtn = mkBtn("Wipe");
  const hideBtn = mkBtn("Hide Panel");
  const pingBtn = mkBtn("Ping API");

  // Hidden file picker for Local Seed
  const file = document.createElement("input");
  file.type = "file";
  (file as any).multiple = true;
  file.style.display = "none";

  refreshBtn.onclick = async () => {
    toast("Refreshing pins…");
    // If React has a Refresh button, click it; otherwise just hit GET /api/pins
    const b = findButtonByText("refresh");
    if (b) b.click();
    const r = await api("/api/pins");
    toast(r.ok ? "Pins refreshed" : `Refresh failed (${r.status})`, !r.ok);
  };

  pingBtn.onclick = async () => {
    const r = await api("/api/pins");
    toast(r.ok ? "API OK" : `API down (${r.status})`, !r.ok);
  };

  hideBtn.onclick = () => {
    // Drive the existing React "Hide Panel / Show Panel" button if present
    const b = findButtonByText("hide panel") || findButtonByText("show panel");
    if (b) {
      b.click();
      // Update our label after React toggles
      setTimeout(() => {
        const txt = (b.textContent || "").toLowerCase();
        hideBtn.textContent = txt.includes("show") ? "Show Panel" : "Hide Panel";
      }, 80);
    } else {
      toast("Panel toggle button not found", true);
    }
  };

  addBtn.onclick = () => {
    (window as AnyWin).__LYNX_ADD_MODE__ = true;
    document.body.style.cursor = "crosshair";
    toast("Add Pin armed — tap the map");
  };

  // Local Seed -> /api/ingest (file upload) with best-effort form keys
  ingestBtn.onclick = async () => {
    file.click();
  };

  file.onchange = async () => {
    const files = Array.from(file.files || []);
    if (!files.length) return;

    toast(`Uploading ${files.length} file(s)…`);
    const fd = new FormData();

    // Try common field names first (backend patch often uses "files")
    for (const f of files) fd.append("files", f);

    // Optional URL list prompt
    const urlsRaw = prompt("Optional: paste URLs (one per line) to ingest too, or Cancel to skip:") || "";
    const urls = urlsRaw.split("\n").map(s => s.trim()).filter(Boolean);
    if (urls.length) {
      // Try two common patterns: "urls" as newline string, and "urls_json" as JSON list
      fd.append("urls", urls.join("\n"));
      fd.append("urls_json", JSON.stringify(urls));
    }

    // Endpoint: prefer Vite proxy (/api/ingest), fallback to host backend
    const r = await api("/api/ingest", { method: "POST", body: fd });
    if (r.ok) {
      toast("Local Seed ingested");
      await sleep(150);
      refreshBtn.click();
    } else {
      const t = await r.text().catch(() => "");
      toast(`Ingest failed (${r.status})`, true);
      console.error("Ingest error:", r.status, t);
    }
    file.value = "";
  };

  wipeBtn.onclick = async () => {
    if (!confirm("Wipe ALL pins + attachments?")) return;
    toast("Wiping…");
    const r = await api("/api/wipe", { method: "POST" });
    if (r.ok) {
      toast("Wiped");
      await sleep(150);
      refreshBtn.click();
    } else {
      toast(`Wipe failed (${r.status})`, true);
      console.error("Wipe error:", await r.text().catch(() => ""));
    }
  };

  grid.appendChild(refreshBtn);
  grid.appendChild(addBtn);
  grid.appendChild(ingestBtn);
  grid.appendChild(wipeBtn);
  grid.appendChild(hideBtn);
  grid.appendChild(pingBtn);

  card.appendChild(title);
  card.appendChild(grid);
  card.appendChild(file);
  wrap.appendChild(card);
  document.body.appendChild(wrap);

  // Handle map click -> POST /api/pins
  window.addEventListener("lynx:mapclick", async (ev: any) => {
    const w = window as AnyWin;
    if (!w.__LYNX_ADD_MODE__) return;

    w.__LYNX_ADD_MODE__ = false;
    document.body.style.cursor = "";

    const lat = Number(ev?.detail?.lat);
    const lng = Number(ev?.detail?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast("Map click missing coords", true);
      return;
    }

    const kind = (prompt("Pin type (person, location, device, vehicle, org, incident, evidence, article, note):", "note") || "note").trim();
    const titleText = (prompt("Title:", `${kind.toUpperCase()}: `) || "").trim();
    if (!titleText) { toast("Cancelled", true); return; }
    const notes = (prompt("Notes (optional):", "") || "").trim();

    const payload: any = { kind, title: titleText, notes, lat, lng };

    // Some backends use "type" instead of "kind", or "name" instead of "title"
    // We send a couple of compat fields (harmless if ignored).
    payload.type = kind;
    payload.name = titleText;

    toast("Creating pin…");
    const r = await api("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (r.ok) {
      toast("Pin created");
      await sleep(120);
      refreshBtn.click();
    } else {
      const t = await r.text().catch(() => "");
      toast(`Create failed (${r.status})`, true);
      console.error("Create pin error:", r.status, t, payload);
    }
  });
}

function boot() {
  const w = window as AnyWin;
  if (w.__LYNX_BOOT__) return;
  w.__LYNX_BOOT__ = true;

  // Wait until React has mounted
  const tick = setInterval(() => {
    const root = document.getElementById("root");
    if (!root) return;
    clearInterval(tick);
    buildOpsUI();
    toast("LYNX OPS online");
  }, 80);
}

boot();
