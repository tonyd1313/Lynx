/* LYNX_TOOLBAR_V2 */
(() => {
  const w = window as any;
  if (w.__LYNX_TOOLBAR__) return;
  w.__LYNX_TOOLBAR__ = true;

  const onReady = (fn: () => void) => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  };

  onReady(() => {
    const style = document.createElement("style");
    style.textContent = `
      .lynx-toolbar{
        position:fixed !important; right:14px !important; bottom:14px !important; z-index:2147483647 !important;
        display:flex; flex-direction:column; gap:8px;
        background:rgba(10,10,12,.76); border:1px solid rgba(255,255,255,.14);
        backdrop-filter: blur(10px);
        padding:10px; border-radius:12px; width:190px;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
        color: rgba(255,255,255,.92);
        box-shadow: 0 10px 30px rgba(0,0,0,.45);
      }
      .lynx-toolbar .t{font-size:12px; opacity:.85; letter-spacing:.08em; text-transform:uppercase;}
      .lynx-toolbar button{
        all:unset; cursor:pointer; padding:10px 10px; border-radius:10px;
        border:1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.08);
        font-size:13px; text-align:center;
      }
      .lynx-toolbar button:hover{ background: rgba(255,255,255,.14); }
      .lynx-toolbar .row{ display:flex; gap:8px; }
      .lynx-toolbar .row button{ flex:1; }
      .lynx-toolbar .status{ font-size:12px; opacity:.85; }
    `;
    document.head.appendChild(style);

    const el = document.createElement("div");
    el.className = "lynx-toolbar";
    el.innerHTML = `
      <div class="t">LYNX Ops</div>
      <div class="row">
        <button id="lynx-seed">Seed</button>
        <button id="lynx-wipe">Wipe</button>
      </div>
      <button id="lynx-reload">Reload UI</button>
      <div class="status" id="lynx-status">ready</div>
    `;
    document.body.appendChild(el);

    const status = (msg:string) => {
      const s = document.getElementById("lynx-status");
      if (s) s.textContent = msg;
    };

    async function call(method:string, url:string){
      const r = await fetch(url, { method });
      const txt = await r.text().catch(() => "");
      return { ok: r.ok, txt };
    }

    document.getElementById("lynx-seed")?.addEventListener("click", async () => {
      status("seeding...");
      try {
        const r = await call("POST", "/api/seed");
        status(r.ok ? "seeded ✓" : "seed failed");
        setTimeout(() => location.reload(), 200);
      } catch {
        status("seed error");
      }
    });

    document.getElementById("lynx-wipe")?.addEventListener("click", async () => {
      status("wiping...");
      try {
        const r = await call("DELETE", "/api/pins");
        status(r.ok ? "wiped ✓" : "wipe failed");
        setTimeout(() => location.reload(), 200);
      } catch {
        status("wipe error");
      }
    });

    document.getElementById("lynx-reload")?.addEventListener("click", () => location.reload());
  });
})();
