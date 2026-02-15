import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AISuggestion } from "../lib/api";
import { Toast } from "../components/Toast";
import { useToasts } from "../hooks/useToasts";

export function SuggestionsPage() {
    const [items, setItems] = useState<AISuggestion[]>([]);
    const [err, setErr] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const { toasts, push, dismiss } = useToasts();

    async function refresh() {
        setErr(null);
        try {
            const data = await api.aiSuggest();
            setItems(data);
        } catch (e) {
            setErr(String(e));
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    async function applySuggestion(s: AISuggestion, idx: number) {
        try {
            setBusyId(idx);
            if (s.action_type === "create_task_from_template") {
                const tplId = s.payload?.template_id;
                if (!tplId) throw new Error("Missing template_id");
                await api.taskCreateFromTemplate(Number(tplId));
            } else if (s.action_type === "complete_task") {
                const taskId = s.payload?.task_id;
                if (!taskId) throw new Error("Missing task_id");
                await api.taskComplete(Number(taskId));
            } else {
                throw new Error(`Unsupported action_type: ${s.action_type}`);
            }
            push("Suggestion applied", "ok");
            await refresh();
        } catch (e: any) {
            setErr(String(e));
            push("Failed to apply", "err");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <h2 style={{ fontSize: 28, fontWeight: 800 }}>✨ AI Suggestions</h2>
                <button
                    onClick={() => refresh()}
                    style={{ background: "transparent", border: "1px solid #ddd", color: "#666", padding: "8px 16px" }}
                >
                    Refresh
                </button>
            </div>

            {err && <pre style={{ color: "crimson", whiteSpace: "pre-wrap", background: "#fee", padding: 12, borderRadius: 8 }}>{err}</pre>}

            {items.length === 0 && !err && (
                <div style={{ textAlign: "center", padding: 64, opacity: 0.5 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
                    <div>Everything is up to date! Check back later for more suggestions.</div>
                </div>
            )}

            <div style={{ display: "grid", gap: 16 }}>
                {items.map((s, idx) => (
                    <div
                        key={idx}
                        style={{
                            padding: 24,
                            border: "1px solid var(--border-color)",
                            borderRadius: 16,
                            background: "white",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            transition: "transform 0.2s ease",
                        }}
                    >
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: "var(--brand-light)", color: "var(--brand-color)", padding: "2px 8px", borderRadius: 4 }}>
                                    {Math.round(s.confidence * 100)}% Confidence
                                </span>
                            </div>
                            <h4 style={{ margin: "0 0 6px 0", fontSize: 17 }}>{s.title}</h4>
                            <p style={{ margin: 0, fontSize: 14, color: "#666" }}>{s.description}</p>
                        </div>
                        <button
                            onClick={() => applySuggestion(s, idx)}
                            disabled={busyId === idx}
                            style={{
                                background: "var(--brand-color)",
                                color: "white",
                                padding: "10px 20px",
                                fontSize: 14,
                                fontWeight: 600
                            }}
                        >
                            {busyId === idx ? "Applying..." : "Apply"}
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ position: "fixed", right: 16, bottom: 16, width: 240, zIndex: 100 }}>
                {toasts.map((t) => (
                    <Toast key={t.id} msg={t} onDone={dismiss} />
                ))}
            </div>
        </div>
    );
}
