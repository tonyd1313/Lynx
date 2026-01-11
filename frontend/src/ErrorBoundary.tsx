import React from "react";

type Props = { children: React.ReactNode };
type State = { error?: Error };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    // Keep logs in console too
    console.error("[LYNX] UI crash:", error, info);
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || String(this.state.error);
      return (
        <div style={{
          height:"100vh", padding:"24px",
          fontFamily:"ui-sans-serif, system-ui",
          background:"#0b0f14", color:"#e6edf3"
        }}>
          <h1 style={{margin:"0 0 12px 0"}}>LYNX crashed (but we caught it)</h1>
          <p style={{opacity:0.85, margin:"0 0 16px 0"}}>
            This means the dashboard code threw at runtime. The exact error is below.
          </p>
          <pre style={{
            whiteSpace:"pre-wrap",
            background:"#111827",
            border:"1px solid rgba(255,255,255,0.12)",
            padding:"14px",
            borderRadius:"12px",
            color:"#ffb4b4"
          }}>{msg}</pre>
          <p style={{opacity:0.75, marginTop:"14px"}}>
            Open DevTools Console for the full stack trace.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
