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
        setItems(await api.aiSuggest());
    }

    useEffect(() => {
        refresh().catch((e) => setErr(String(e)));
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
            push("Applied", "ok");
        } catch (e: any) {
            setErr(String(e));
            push("Failed to apply", "err");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div style={{ maxWidth: 860, margin: "24px auto" }}>
            <h2>AI Suggestions</h2>
            <button onClick={() => refresh()}>Refresh</button>
            {err && <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</pre>}

            <ul style={{ listStyle: "none", padding: 0 }}>
                {items.map((s, idx) => (
                    <li key={idx} style={{ padding: 12, border: "1px solid #eee", marginTop: 8 }}>
                        <strong>{s.title}</strong>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>type={s.action_type} confidence={s.confidence}</div>
                        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                            <button onClick={() => applySuggestion(s, idx)} disabled={busyId === idx}>
                                {busyId === idx ? "Applying..." : "Apply"}
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            <div style={{ position: "fixed", right: 16, bottom: 16, width: 240 }}>
                {toasts.map((t) => (
                    <Toast key={t.id} msg={t} onDone={dismiss} />
                ))}
            </div>
        </div>
    );
}