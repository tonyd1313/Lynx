import "./lynx_hotfix";
import "./lynx_hotfix.css";
import "./styles/app.css";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./ErrorBoundary";

// Leaflet CSS (safe even if you don’t use Leaflet on every page)
import "leaflet/dist/leaflet.css";

function Boot() {
  const [Comp, setComp] = useState<React.ComponentType | null>(null);
  const [err, setErr] = useState<Error | null>(null);

  useEffect(() => {
    // Dynamically load App so we can catch load failures cleanly
    import("./App")
      .then((m: any) => {
        const C = m.default || m.App;
        if (!C) throw new Error("App module loaded but no default export found.");
        setComp(() => C);
      })
      .catch((e: any) => {
        console.error("[LYNX] Failed to load App:", e);
        setErr(e instanceof Error ? e : new Error(String(e)));
      });
  }, []);

  if (err) {
    // This is separate from ErrorBoundary: it catches import/boot errors
    return (
      <div style={{
        height:"100vh", padding:"24px",
        fontFamily:"ui-sans-serif, system-ui",
        background:"#0b0f14", color:"#e6edf3"
      }}>
        <h1 style={{margin:"0 0 12px 0"}}>LYNX failed to boot</h1>
        <pre style={{
          whiteSpace:"pre-wrap",
          background:"#111827",
          border:"1px solid rgba(255,255,255,0.12)",
          padding:"14px",
          borderRadius:"12px",
          color:"#ffb4b4"
        }}>{err.message}</pre>
      </div>
    );
  }

  if (!Comp) {
    return (
      <div style={{
        height:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"ui-sans-serif, system-ui",
        background:"#0b0f14", color:"#e6edf3"
      }}>
        <div style={{opacity:0.85}}>Starting LYNX…</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Comp />
    </ErrorBoundary>
  );
}

const el = document.getElementById("root");
if (!el) {
  document.body.innerHTML = "<pre style='padding:16px;font-family:monospace'>FATAL: #root not found in index.html</pre>";
} else {
  createRoot(el).render(<Boot />);
}
