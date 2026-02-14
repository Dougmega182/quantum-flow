import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { RecurrenceRule, TaskTemplate } from "../lib/api";
import { Toast } from "../components/Toast";
import { useToasts } from "../hooks/useToasts";

export function RecurrencePage() {
    const [rules, setRules] = useState<RecurrenceRule[]>([]);
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number>(0);
    const [freq, setFreq] = useState<"daily" | "weekly" | "monthly">("daily");
    const [interval, setInterval] = useState<number>(1);
    const [byweekday, setByweekday] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const { toasts, push, dismiss } = useToasts();

    async function refresh() {
        setErr(null);
        try {
            const [rulesData, templatesData] = await Promise.all([
                api.recurrenceList(),
                api.templateList()
            ]);
            setRules(rulesData);
            setTemplates(templatesData);
        } catch (e) {
            setErr(String(e));
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    async function handleAdd() {
        if (!selectedTemplateId) return;
        setErr(null);
        try {
            await api.recurrenceCreate({
                template_id: selectedTemplateId,
                freq,
                interval,
                byweekday: freq === "weekly" ? byweekday || undefined : undefined
            });
            push("Recurrence rule created", "ok");
            await refresh();
        } catch (e) {
            setErr(String(e));
        }
    }

    async function handleDelete(id: number) {
        setErr(null);
        try {
            await api.recurrenceDelete(id);
            push("Rule deleted", "ok");
            await refresh();
        } catch (e) {
            setErr(String(e));
        }
    }

    async function handleMaterialize() {
        setErr(null);
        try {
            const res = await api.recurrenceMaterialize();
            push(`Created ${res.created} tasks`, "ok");
        } catch (e) {
            setErr(String(e));
        }
    }

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>Recurrence Rules</h2>
                <button onClick={handleMaterialize} style={{ background: "#2ecc71", color: "white" }}>Run Materialize Now</button>
            </div>

            <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 24 }}>
                <h3>Add New Recurrence</h3>
                <div style={{ display: "grid", gap: 8 }}>
                    <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(parseInt(e.target.value))}>
                        <option value={0}>Select Template</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: 8 }}>
                        <select value={freq} onChange={(e) => setFreq(e.target.value as any)} style={{ flex: 1 }}>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                        <input type="number" value={interval} onChange={(e) => setInterval(parseInt(e.target.value))} placeholder="Interval" style={{ width: 100 }} />
                    </div>
                    {freq === "weekly" && (
                        <input value={byweekday} onChange={(e) => setByweekday(e.target.value)} placeholder="Days (e.g. MO,TU,FR)" />
                    )}
                    <button onClick={handleAdd} disabled={!selectedTemplateId}>Add Rule</button>
                </div>
            </div>

            {err && <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</pre>}

            <ul style={{ listStyle: "none", padding: 0 }}>
                {rules.map((rule) => {
                    const template = templates.find(t => t.id === rule.template_id);
                    return (
                        <li key={rule.id} style={{ padding: 12, border: "1px solid #eee", marginBottom: 8, borderRadius: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <div>
                                    <strong>{template?.title || `Template #${rule.template_id}`}</strong>
                                    <div style={{ fontSize: 14, margin: "4px 0" }}>
                                        Every {rule.interval} {rule.freq}{rule.byweekday ? ` on ${rule.byweekday}` : ""}
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                                        Last run: {rule.last_materialized_at ? new Date(rule.last_materialized_at).toLocaleString() : "Never"}
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(rule.id)}>Delete</button>
                            </div>
                        </li>
                    );
                })}
            </ul>

            <div style={{ position: "fixed", right: 16, bottom: 16, width: 240 }}>
                {toasts.map((t) => (
                    <Toast key={t.id} msg={t} onDone={dismiss} />
                ))}
            </div>
        </div>
    );
}
