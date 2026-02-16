export function HelpPage() {
    return (
        <div style={{ padding: "40px", maxWidth: 800, margin: "0 auto", lineHeight: 1.6 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Quantum Flow Guide</h1>
            <p style={{ opacity: 0.6, fontSize: 18, marginBottom: 40 }}>Everything you need to master the AI Execution OS.</p>

            <section style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>Keyboard Shortcuts</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <ShortcutItem keys="Ctrl + K" label="Open Command Bar" />
                    <ShortcutItem keys="Shift + A" label="Capture New Task" />
                    <ShortcutItem keys="Space" label="Play/Pause Task Timer" />
                    <ShortcutItem keys="Esc" label="Close Context Pane" />
                </div>
            </section>

            <section style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>Google Integration Setup</h2>
                <div style={{ backgroundColor: "#fff9db", padding: 20, borderRadius: 12, border: "1px solid #ffe066" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#856404" }}>Fixing Redirect URI Mismatch</h3>
                    <p style={{ fontSize: 14, color: "#856404" }}>
                        If you see a "redirect_uri_mismatch" error, ensure your Google Cloud Console "Authorized redirect URIs" matches your current environment exactly.
                    </p>
                    <code style={{ display: "block", backgroundColor: "rgba(0,0,0,0.05)", padding: 8, marginTop: 12, borderRadius: 4, fontSize: 12 }}>
                        https://parakeet-novel-accurately.ngrok-free.app/v1/google-calendar/callback
                    </code>
                </div>
            </section>

            <section style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>AI & Intelligence</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div>
                        <h4 style={{ fontWeight: 700, marginBottom: 4 }}>Natural Language Entry (NLE)</h4>
                        <p style={{ fontSize: 14, opacity: 0.7 }}>Type "Lunch with Sarah tomorrow at 12pm" to automatically set due dates and times.</p>
                    </div>
                    <div>
                        <h4 style={{ fontWeight: 700, marginBottom: 4 }}>Smart Scheduling</h4>
                        <p style={{ fontSize: 14, opacity: 0.7 }}>The "Auto Plan" engine uses a greedy optimization heuristic to slot tasks into your calendar based on priority and energy levels.</p>
                    </div>
                </div>
            </section>

            <section>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>Email to Task</h2>
                <p style={{ fontSize: 14, opacity: 0.7 }}>
                    You can send tasks directly to your inbox using our ingestion API. A personalized email address feature is coming soon in v0.3.
                </p>
            </section>
        </div>
    );
}

function ShortcutItem({ keys, label }: { keys: string, label: string }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", backgroundColor: "#f8fafc", borderRadius: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
            <kbd style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", padding: "2px 6px", borderRadius: 4, fontSize: 11, boxShadow: "0 1px 1px rgba(0,0,0,0.1)" }}>{keys}</kbd>
        </div>
    );
}
