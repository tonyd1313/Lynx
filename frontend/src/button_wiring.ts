let armed = false;

function toast(msg: string, err = false) {
  let el = document.getElementById("lynx-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "lynx-toast";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "18px";
    el.style.transform = "translateX(-50%)";
    el.style.padding = "10px 14px";
    el.style.borderRadius = "12px";
    el.style.fontSize = "13px";
    el.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    el.style.zIndex = "999999";
    el.style.backdropFilter = "blur(12px)";
    el.style["webkitBackdropFilter"] = "blur(12px)";
    el.style.border = "1px solid rgba(255,255,255,0.12)";
    el.style.color = "white";
    el.style.pointerEvents = "none";
    document.body.appendChild(el);
  }
  el.style.background = err ? "rgba(120,0,0,0.55)" : "rgba(0,0,0,0.55)";
  el.textContent = msg;
  setTimeout(() => el?.remove(), 1800);
}

async function api(path: string, init?: RequestInit) {
  const p = path.startsWith("/") ? path : `/${path}`;
  // Use Vite proxy first (same-origin /api/*)
  return fetch(p.startsWith("/api") ? p : `/api${p}`, init);
}

function norm(s: string) { return (s || "").trim().toLowerCase(); }

function isButton(el: Element | null): el is HTMLButtonElement {
  return !!el && el.tagName === "BUTTON";
}

function panelToggleCSS(on: boolean) {
  const id = "lynx-panel-css";
  let st = document.getElementById(id) as HTMLStyleElement | null;
  if (!st) {
    st = document.createElement("style");
    st.id = id;
    document.head.appendChild(st);
  }
  st.textContent = on ? `
/* Hide the left feed panel without breaking map clicks */
[data-lynx-panel="main"] { transform: translateX(-110%); opacity: 0; pointer-events: none; }
` : `
/* Show the panel */
[data-lynx-panel="main"] { transform: translateX(0); opacity: 1; pointer-events: auto; }
`;
}

function findPanelRoot(): HTMLElement | null {
  // Best-effort: pick the largest “panel-like” element on left that contains the "PINS" header
  const candidates = Array.from(document.querySelectorAll("div,aside,section")) as HTMLElement[];
  const hits = candidates.filter(x => (x.textContent || "").includes("PINS") && x.getBoundingClientRect().left < 60);
  hits.sort((a,b) => (b.getBoundingClientRect().width*b.getBoundingClientRect().height) - (a.getBoundingClientRect().width*a.getBoundingClientRect().height));
  return hits[0] || null;
}

function ensureFilePicker(): HTMLInputElement {
  let inp = document.getElementById("lynx-seed-picker") as HTMLInputElement | null;
  if (!inp) {
    inp = document.createElement("input");
    inp.id = "lynx-seed-picker";
    inp.type = "file";
    (inp as any).multiple = true;
    inp.style.display = "none";
    document.body.appendChild(inp);
  }
  return inp;
}

// Capture clicks on the EXISTING top buttons and force working behavior
document.addEventListener("click", async (e) => {
  const t = e.target as Element | null;
  const btn = t?.closest("button") as HTMLButtonElement | null;
  if (!btn) return;

  const label = norm(btn.textContent || "");
  if (!label) return;

  // Refresh
  if (label === "refresh") {
    e.preventDefault();
    e.stopPropagation();
    const r = await api("/api/pins");
    if (r.ok) {
      toast("Refreshed");
      // simplest guaranteed UI update: reload
      setTimeout(() => location.reload(), 250);
    } else {
      toast(`Refresh failed (${r.status})`, true);
    }
    return;
  }

  // Hide Panel / Show Panel
  if (label === "hide panel" || label === "show panel") {
    e.preventDefault();
    e.stopPropagation();

    const panel = findPanelRoot();
    if (panel) {
      panel.setAttribute("data-lynx-panel", "main");
      const hidden = panel.getAttribute("data-lynx-hidden") === "1";
      panel.setAttribute("data-lynx-hidden", hidden ? "0" : "1");
      panel.style.transition = "transform 180ms ease, opacity 180ms ease";
      panelToggleCSS(!hidden);
      btn.textContent = hidden ? "Hide Panel" : "Show Panel";
      toast(hidden ? "Panel shown" : "Panel hidden");
    } else {
      toast("Panel not found", true);
    }
    return;
  }

  // Add Pin -> arm map click -> POST /api/pins
  if (label === "add pin") {
    e.preventDefault();
    e.stopPropagation();
    armed = true;
    (document.body.style as any).cursor = "crosshair";
    toast("Add Pin armed — tap the map");
    return;
  }

  // Local Seed -> file picker -> POST /api/ingest -> reload
  if (label === "local seed") {
    e.preventDefault();
    e.stopPropagation();
    const inp = ensureFilePicker();
    inp.onchange = async () => {
      const files = Array.from(inp.files || []);
      if (!files.length) return;

      toast(`Uploading ${files.length}…`);
      const fd = new FormData();
      for (const f of files) fd.append("files", f);

      const urlsRaw = prompt("Optional: paste URLs (one per line). Cancel to skip.") || "";
      const urls = urlsRaw.split("\n").map(s => s.trim()).filter(Boolean);
      if (urls.length) {
        fd.append("urls", urls.join("\n"));
        fd.append("urls_json", JSON.stringify(urls));
      }

      const r = await api("/api/ingest", { method: "POST", body: fd });
      if (r.ok) {
        toast("Local Seed ingested");
        setTimeout(() => location.reload(), 350);
      } else {
        toast(`Seed failed (${r.status})`, true);
        console.error("seed error", r.status, await r.text().catch(()=> ""));
      }
      inp.value = "";
    };
    inp.click();
    return;
  }
}, true);

// Map click handler (requires LynxMapHooks injected into MapContainer)
window.addEventListener("lynx:mapclick", async (ev: any) => {
  if (!armed) return;
  armed = false;
  (document.body.style as any).cursor = "";

  const lat = Number(ev?.detail?.lat);
  const lng = Number(ev?.detail?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    toast("No coords from map click", true);
    return;
  }

  const kind = (prompt("Type (person, location, device, vehicle, org, incident, evidence, article, note):", "note") || "note").trim();
  const title = (prompt("Title:", `${kind.toUpperCase()}: `) || "").trim();
  if (!title) { toast("Cancelled", true); return; }
  const notes = (prompt("Notes (optional):", "") || "").trim();

  const payload: any = { kind, title, notes, lat, lng, type: kind, name: title };
  toast("Posting pin…");

  const r = await api("/api/pins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (r.ok) {
    toast("Pin created");
    setTimeout(() => location.reload(), 350);
  } else {
    toast(`Create failed (${r.status})`, true);
    console.error("create pin error", r.status, await r.text().catch(()=>""), payload);
  }
});
