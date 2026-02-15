import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Automation, AutomationRun } from "../lib/api";
import { Toast } from "../components/Toast";
import { useToasts } from "../hooks/useToasts";

export function AutomationsPage() {
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [actionConfig, setActionConfig] = useState('{"title": "Automated Task", "description": "Triggered by automation"}');
    const [loading, setLoading] = useState(false);
    const [runs, setRuns] = useState<AutomationRun[]>([]);
    const [err, setErr] = useState<string | null>(null);
    const { toasts, push, dismiss } = useToasts();

    async function refresh() {
        setLoading(true);
        try {
            const data = await api.automationList();
            setAutomations(data);
        } catch (e) {
            setErr(String(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    async function handleCreate() {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await api.automationCreate({
                name,
                description,
                trigger_type: "manual",
                action_type: "create_task",
                action_config: actionConfig,
                active: true
            });
            push("Automation created", "ok");
            setName(""); setDescription("");
            await refresh();
        } catch (e) {
            setErr(String(e));
        } finally {
            setLoading(false);
        }
    }

    async function handleRun(id: number) {
        setLoading(true);
        try {
            const run = await api.automationRun(id);
            setRuns(prev => [run, ...prev].slice(0, 10));
            push(`Run ${run.status}: ${run.message}`, run.status === "success" ? "ok" : "err");
        } catch (e) {
            setErr(String(e));
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm("Delete this automation?")) return;
        setLoading(true);
        try {
            await api.automationDelete(id);
            push("Automation deleted", "ok");
            await refresh();
        } catch (e) {
            setErr(String(e));
        } finally {
            setLoading(false);
        }
    }

    async function handleToggle(auto: Automation) {
        setLoading(true);
        try {
            await api.automationUpdate(auto.id, { active: !auto.active });
            await refresh();
        } catch (e) {
            setErr(String(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <h2 style={{ fontSize: 28, fontWeight: 800 }}>⚡ Automations</h2>
                <button
                    onClick={() => api.automationRunAll().then(rs => {
                        setRuns(prev => [...rs, ...prev].slice(0, 10));
                        push("All active run", "ok");
                    })}
                    disabled={loading || automations.filter(a => a.active).length === 0}
                    style={{ background: "var(--brand-color)", color: "white", padding: "10px 20px", fontWeight: 600 }}
                >
                    {loading ? "Processing..." : "Run All Active"}
                </button>
            </div>

            <div style={{
                background: "white",
                padding: 24,
                borderRadius: 16,
                border: "1px solid var(--border-color)",
                marginBottom: 32,
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)"
            }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Create New Automation</h3>
                <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Automation Name"
                            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd" }}
                        />
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description (optional)"
                            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd" }}
                        />
                    </div>
                    <textarea
                        value={actionConfig}
                        onChange={(e) => setActionConfig(e.target.value)}
                        placeholder='Action Config (JSON)'
                        rows={3}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            fontFamily: "monospace",
                            fontSize: 13
                        }}
                    />
                    <button
                        onClick={handleCreate}
                        disabled={!name || loading}
                        style={{ padding: "12px", background: "#f8f9fa", border: "1px solid #ddd", fontWeight: 600 }}
                    >
                        Create Automation
                    </button>
                </div>
            </div>

            {err && <pre style={{ color: "crimson", whiteSpace: "pre-wrap", background: "#fee", padding: 12, borderRadius: 8, marginBottom: 24 }}>{err}</pre>}

            <div style={{ display: "grid", gap: 16 }}>
                {automations.map((auto) => (
                    <div key={auto.id} style={{
                        padding: 20,
                        border: "1px solid var(--border-color)",
                        borderRadius: 16,
                        background: auto.active ? "white" : "#fafafa",
                        opacity: auto.active ? 1 : 0.8
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <h4 style={{ margin: "0 0 4px 0", fontSize: 17 }}>{auto.name}</h4>
                                <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#666" }}>{auto.description}</p>
                                <div style={{ display: "flex", gap: 12 }}>
                                    <span style={{ fontSize: 11, background: "#eee", padding: "2px 8px", borderRadius: 4 }}>Trigger: {auto.trigger_type}</span>
                                    <span style={{ fontSize: 11, background: "#eee", padding: "2px 8px", borderRadius: 4 }}>Action: {auto.action_type}</span>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    onClick={() => handleToggle(auto)}
                                    disabled={loading}
                                    style={{
                                        background: auto.active ? "#eee" : "var(--brand-color)",
                                        color: auto.active ? "#333" : "white",
                                        padding: "8px 16px",
                                        fontSize: 13
                                    }}
                                >
                                    {auto.active ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                    onClick={() => handleRun(auto.id)}
                                    disabled={!auto.active || loading}
                                    style={{ background: "#f8f9fa", border: "1px solid #ddd", padding: "8px 16px", fontSize: 13 }}
                                >
                                    Run Now
                                </button>
                                <button
                                    onClick={() => handleDelete(auto.id)}
                                    disabled={loading}
                                    style={{ background: "#fff", border: "1px solid #fee", color: "#e74c3c", padding: "8px 16px", fontSize: 13 }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {runs.length > 0 && (
                <div style={{ marginTop: 48 }}>
                    <h3 style={{ fontSize: 18, marginBottom: 16 }}>Activity Log</h3>
                    <div style={{ display: "grid", gap: 8 }}>
                        {runs.map(run => (
                            <div key={run.id} style={{
                                fontSize: 13,
                                padding: "12px 16px",
                                borderLeft: `4px solid ${run.status === 'success' ? '#2ecc71' : '#e74c3c'}`,
                                background: "white",
                                borderRadius: "0 8px 8px 0",
                                display: "flex",
                                justifyContent: "space-between"
                            }}>
                                <span>
                                    <strong style={{ color: run.status === 'success' ? '#27ae60' : '#c0392b' }}>{run.status.toUpperCase()}</strong>: {run.message}
                                </span>
                                <span style={{ opacity: 0.5, fontSize: 11 }}>{new Date(run.executed_at).toLocaleTimeString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div style={{ position: "fixed", right: 16, bottom: 16, width: 240 }}>
                {toasts.map((t) => (
                    <Toast key={t.id} msg={t} onDone={dismiss} />
                ))}
            </div>
        </div>
    );
}
