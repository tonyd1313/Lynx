import { toggleSatellite } from "./lynx_bootstrap";

function apiBase(): string {
  const fromLS = localStorage.getItem("LYNX_API_BASE") || localStorage.getItem("LYNX_API");
  const host = window.location.hostname || "127.0.0.1";
  return (fromLS || `http://${host}:8000`).toString().replace(/\/+$/, "");
}
async function post(url: string) {
  const res = await fetch(url, { method: "POST" });
  const t = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}${t ? `: ${t}` : ""}`);
  return t;
}
function mkBtn(label: string) {
  const b = document.createElement("button");
  b.textContent = label;
  b.style.cssText = [
    "width:100%",
    "padding:10px 12px",
    "border-radius:10px",
    "border:1px solid rgba(255,255,255,0.15)",
    "background: rgba(15,20,30,0.85)",
    "color: rgba(255,255,255,0.92)",
    "font: 700 13px system-ui, -apple-system, Segoe UI, Roboto, Arial",
    "cursor:pointer",
    "outline:none"
  ].join(";");
  return b;
}
function mount() {
  if (document.getElementById("lynx-ops-wrap")) return;

  const wrap = document.createElement("div");
  wrap.id = "lynx-ops-wrap";
  wrap.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:16px",
    "z-index:999999",
    "width:220px",
    "padding:12px",
    "border-radius:14px",
    "background: rgba(10,14,22,0.62)",
    "backdrop-filter: blur(10px)",
    "border: 1px solid rgba(255,255,255,0.10)",
    "box-shadow: 0 12px 40px rgba(0,0,0,0.35)"
  ].join(";");

  const title = document.createElement("div");
  title.textContent = "LYNX OPS";
  title.style.cssText = "font: 900 14px system-ui; letter-spacing: 0.12em; color: rgba(255,255,255,0.92); margin-bottom:10px;";

  const status = document.createElement("div");
  status.textContent = "ready";
  status.style.cssText = "margin-top:10px; font: 700 12px system-ui; color: rgba(255,255,255,0.75);";

  const satBtn = mkBtn("Satellite");
  const wipeBtn = mkBtn("Wipe");
  const reloadBtn = mkBtn("Reload UI");

  const stack = document.createElement("div");
  stack.style.cssText = "display:flex; flex-direction:column; gap:10px;";
  stack.appendChild(satBtn);
  stack.appendChild(wipeBtn);
  stack.appendChild(reloadBtn);

  satBtn.onclick = () => {
    const mode = toggleSatellite();
    status.textContent = mode === "sat" ? "satellite" : "dark";
  };
  wipeBtn.onclick = async () => {
    if (!confirm("Wipe ALL pins + attachments for a fresh investigation?")) return;
    try {
      status.textContent = "wiping…";
      await post(`${apiBase()}/api/wipe`);
      status.textContent = "wiped ✓";
      setTimeout(() => window.location.reload(), 200);
    } catch (e: any) {
      status.textContent = "wipe failed";
      alert(String(e?.message || e));
    }
  };
  reloadBtn.onclick = () => window.location.reload();

  wrap.appendChild(title);
  wrap.appendChild(stack);
  wrap.appendChild(status);
  document.body.appendChild(wrap);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
else mount();
