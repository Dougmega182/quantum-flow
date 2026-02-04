import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Task } from "../lib/api";
import { Toast } from "../components/Toast";
import { useToasts } from "../hooks/useToasts";

const STATUS_FILTERS = ["", "open", "in_progress", "done", "all"] as const;

const LS_KEY = "qf_tasks_filters";

export function TasksPage() {
    const saved = (() => {
        try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
    })();
    const [items, setItems] = useState<Task[]>([]);
    const [view, setView] = useState<"" | "today" | "overdue" | "upcoming">(saved.view ?? "today");
    const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>(saved.statusFilter ?? "");
    const [sort, setSort] = useState<"due_at_asc" | "due_at_desc">(saved.sort ?? "due_at_asc");
    const [title, setTitle] = useState("");
    const [dueAt, setDueAt] = useState<string>("");
    const [err, setErr] = useState<string | null>(null);
    const { toasts, push, dismiss } = useToasts();

    async function refresh() {
        setErr(null);
        const params: Record<string, string> = {};
        if (view) params.view = view;
        if (statusFilter !== "all") params.status = statusFilter;
        const res = await api.tasksList(params);
        let list = res.items;
        if (sort === "due_at_asc" || sort === "due_at_desc") {
            list = [...list].sort((a, b) => {
                const ad = a.due_at ? Date.parse(a.due_at) : Infinity;
                const bd = b.due_at ? Date.parse(b.due_at) : Infinity;
                return sort === "due_at_asc" ? ad - bd : bd - ad;
            });
        }
        setItems(list);
        localStorage.setItem(LS_KEY, JSON.stringify({ view, statusFilter, sort }));
    }

    useEffect(() => {
        refresh().catch((e) => setErr(String(e)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, statusFilter, sort]);

    return (
        <div style={{ maxWidth: 860, margin: "24px auto" }}>
            <h2>Tasks</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <select value={view} onChange={(e) => setView(e.target.value as any)}>
                    <option value="today">Today</option>
                    <option value="overdue">Overdue</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="">All</option>
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                    <option value="">Any status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value as any)}>
                    <option value="due_at_asc">Due date ↑</option>
                    <option value="due_at_desc">Due date ↓</option>
                </select>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task title" style={{ flex: 1 }} />
                <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                <button
                    onClick={async () => {
                        setErr(null);
                        await api.taskCreate({ title, due_at: dueAt || undefined });
                        setTitle("");
                        setDueAt("");
                        push("Task created", "ok");
                        await refresh();
                    }}
                    disabled={!title.trim()}
                >
                    Add
                </button>
            </div>

            {err && <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</pre>}

            <ul style={{ listStyle: "none", padding: 0 }}>
                {items.map((t) => (
                    <li key={t.id} style={{ padding: 12, border: "1px solid #eee", marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <div>
                                <strong>{t.title}</strong>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>
                                    status={t.status} due={t.due_at ?? "-"} priority={t.priority ?? "-"}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                {t.status !== "done" ? (
                                    <button onClick={async () => { await api.taskComplete(t.id); push("Completed", "ok"); await refresh(); }}>Complete</button>
                                ) : (
                                    <button onClick={async () => { await api.taskReopen(t.id); push("Reopened", "ok"); await refresh(); }}>Reopen</button>
                                )}
                                <button onClick={async () => { await api.taskDelete(t.id); push("Deleted", "ok"); await refresh(); }}>Delete</button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

            <div style={{ position: "fixed", right: 16, bottom: 16, width: 240 }}>
                {toasts.map((t: { id: number; text: string; tone?: "ok" | "err" }) => (
                    <Toast key={t.id} msg={t} onDone={dismiss} />
                ))}
            </div>
        </div>
    );
}