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
            setLoading(true);
        }
    }

    async function handleRun(id: number) {
        setLoading(true);
        try {
            const run = await api.automationRun(id);
            setRuns(prev => [run, ...prev].slice(0, 5));
            push(`Run ${run.status}: ${run.message}`, run.status === "success" ? "ok" : "err");
        } catch (e) {
            setErr(String(e));
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: number) {
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
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>Automations</h2>
                <button
                    onClick={() => api.automationRunAll().then(rs => {
                        setRuns(prev => [...rs, ...prev].slice(0, 10));
                        push("All active run", "ok");
                    })}
                    disabled={loading}
                    style={{ background: "#9b59b6", color: "white" }}
                >
                    {loading ? "Processing..." : "Run All Active"}
                </button>
            </div>

            <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 24 }}>
                <h3>Create New Automation</h3>
                <div style={{ display: "grid", gap: 10 }}>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Automation Name" />
                    <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
                    <textarea
                        value={actionConfig}
                        onChange={(e) => setActionConfig(e.target.value)}
                        placeholder='Action Config (JSON)'
                        rows={3}
                        style={{ fontFamily: "monospace" }}
                    />
                    <button onClick={handleCreate} disabled={!name || loading}>Create Automation</button>
                </div>
            </div>

            {err && <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</pre>}

            <ul style={{ listStyle: "none", padding: 0 }}>
                {automations.map((auto) => (
                    <li key={auto.id} style={{ padding: 16, border: "1px solid #eee", marginBottom: 12, borderRadius: 8, background: auto.active ? "#fff" : "#f9f9f9" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ opacity: auto.active ? 1 : 0.6 }}>
                                <h4 style={{ margin: "0 0 4px 0" }}>{auto.name}</h4>
                                <p style={{ margin: "0 0 8px 0", fontSize: 14, color: "#666" }}>{auto.description}</p>
                                <div style={{ fontSize: 12 }}>
                                    <span style={{ fontWeight: 600 }}>Trigger:</span> {auto.trigger_type} |
                                    <span style={{ fontWeight: 600, marginLeft: 8 }}>Action:</span> {auto.action_type}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => handleToggle(auto)} disabled={loading} style={{ background: auto.active ? "#eee" : "#2ecc71", color: auto.active ? "#333" : "#fff" }}>
                                    {auto.active ? "Deactivate" : "Activate"}
                                </button>
                                <button onClick={() => handleRun(auto.id)} disabled={!auto.active || loading} style={{ background: "#4285F4", color: "white" }}>Run Now</button>
                                <button onClick={() => handleDelete(auto.id)} disabled={loading} style={{ background: "#e74c3c", color: "white" }}>Delete</button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

            {runs.length > 0 && (
                <div style={{ marginTop: 32 }}>
                    <h3>Recent Runs</h3>
                    <div style={{ display: "grid", gap: 8 }}>
                        {runs.map(run => (
                            <div key={run.id} style={{ fontSize: 14, padding: "8px 12px", borderLeft: `4px solid ${run.status === 'success' ? '#2ecc71' : '#e74c3c'}`, background: "#f8f9fa" }}>
                                <strong>{run.status.toUpperCase()}</strong>: {run.message}
                                <span style={{ opacity: 0.6, fontSize: 12, marginLeft: 12 }}>{new Date(run.executed_at).toLocaleTimeString()}</span>
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
