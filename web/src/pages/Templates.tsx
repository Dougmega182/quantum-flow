import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { TaskTemplate } from "../lib/api";
import { Toast } from "../components/Toast";
import { useToasts } from "../hooks/useToasts";

export function TemplatesPage() {
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("");
    const [dueDays, setDueDays] = useState<number>(0);
    const [err, setErr] = useState<string | null>(null);
    const { toasts, push, dismiss } = useToasts();

    async function refresh() {
        setErr(null);
        try {
            const data = await api.templateList();
            setTemplates(data);
        } catch (e) {
            setErr(String(e));
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    async function handleAdd() {
        if (!title.trim()) return;
        setErr(null);
        try {
            await api.templateCreate({
                title,
                description: description || undefined,
                priority: priority || undefined,
                default_due_days: dueDays || undefined
            });
            setTitle("");
            setDescription("");
            setPriority("");
            setDueDays(0);
            push("Template created", "ok");
            await refresh();
        } catch (e) {
            setErr(String(e));
        }
    }

    async function handleDelete(id: number) {
        setErr(null);
        try {
            await api.templateDelete(id);
            push("Template deleted", "ok");
            await refresh();
        } catch (e) {
            setErr(String(e));
        }
    }

    async function handleCreateTask(id: number) {
        setErr(null);
        try {
            await api.taskCreateFromTemplate(id);
            push("Task created from template", "ok");
        } catch (e) {
            setErr(String(e));
        }
    }

    return (
        <div style={{ maxWidth: 860, margin: "24px auto" }}>
            <h2>Task Templates</h2>

            <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 24 }}>
                <h3>Add New Template</h3>
                <div style={{ display: "grid", gap: 8 }}>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Template Title" />
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
                    <div style={{ display: "flex", gap: 8 }}>
                        <input value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="Priority (optional)" style={{ flex: 1 }} />
                        <input type="number" value={dueDays} onChange={(e) => setDueDays(parseInt(e.target.value))} placeholder="Due in X days" style={{ width: 120 }} />
                    </div>
                    <button onClick={handleAdd} disabled={!title.trim()}>Create Template</button>
                </div>
            </div>

            {err && <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</pre>}

            <ul style={{ listStyle: "none", padding: 0 }}>
                {templates.map((tpl) => (
                    <li key={tpl.id} style={{ padding: 12, border: "1px solid #eee", marginBottom: 8, borderRadius: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <div>
                                <strong>{tpl.title}</strong>
                                {tpl.description && <p style={{ fontSize: 14, margin: "4px 0" }}>{tpl.description}</p>}
                                <div style={{ fontSize: 12, opacity: 0.7 }}>
                                    priority={tpl.priority ?? "-"} due_days={tpl.default_due_days ?? "-"}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <button onClick={() => handleCreateTask(tpl.id)}>Use</button>
                                <button onClick={() => handleDelete(tpl.id)}>Delete</button>
                            </div>
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
