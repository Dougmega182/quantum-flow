import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Toast } from "../components/Toast";
import { useToasts } from "../hooks/useToasts";

export function IntegrationsPage() {
    const [status, setStatus] = useState<{ status: string; has_token: boolean } | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const { toasts, push, dismiss } = useToasts();

    async function refresh() {
        try {
            const data = await api.googleStatus();
            setStatus(data);
        } catch (e) {
            console.error(e);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    async function handleConnect() {
        try {
            const { url } = await api.googleAuthUrl();
            window.location.href = url;
        } catch (e) {
            setErr(String(e));
        }
    }

    async function handlePull() {
        setLoading(true);
        setErr(null);
        try {
            const res = await api.googlePull();
            push(`Fetched ${res.fetched} events, synced ${res.synced} new tasks`, "ok");
        } catch (e) {
            setErr(String(e));
        } finally {
            setLoading(false);
        }
    }

    async function handlePush() {
        setLoading(true);
        setErr(null);
        try {
            const res = await api.googlePush();
            push(`Pushed ${res.pushed} tasks to Google Calendar`, "ok");
        } catch (e) {
            setErr(String(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <h2>Integrations</h2>

            <div style={{ border: "1px solid #eee", padding: 20, borderRadius: 8, background: "white" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h3 style={{ margin: 0 }}>Google Calendar</h3>
                        <p style={{ margin: "4px 0", color: "#666" }}>Sync your tasks with Google Calendar events.</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                            <span style={{
                                display: "inline-block",
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: status?.status === "connected" ? "#2ecc71" : "#95a5a6"
                            }} />
                            <span style={{ fontWeight: 500, textTransform: "capitalize" }}>
                                {status?.status || "Loading..."}
                            </span>
                        </div>
                    </div>

                    {status?.status !== "connected" ? (
                        <button onClick={handleConnect} style={{ background: "#4285F4", color: "white", padding: "10px 20px" }}>
                            Connect Google
                        </button>
                    ) : (
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={handlePull} disabled={loading} style={{ background: "#f8f9fa", border: "1px solid #ddd" }}>
                                {loading ? "Syncing..." : "Sync from Google"}
                            </button>
                            <button onClick={handlePush} disabled={loading} style={{ background: "#f8f9fa", border: "1px solid #ddd" }}>
                                {loading ? "Syncing..." : "Sync to Google"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {err && <pre style={{ color: "crimson", whiteSpace: "pre-wrap", marginTop: 20 }}>{err}</pre>}

            <div style={{ position: "fixed", right: 16, bottom: 16, width: 240 }}>
                {toasts.map((t) => (
                    <Toast key={t.id} msg={t} onDone={dismiss} />
                ))}
            </div>
        </div>
    );
}
