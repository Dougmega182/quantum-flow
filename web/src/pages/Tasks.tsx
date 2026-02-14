import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Task } from "../lib/api";
import { Toast } from "../components/Toast";
import { useToasts } from "../hooks/useToasts";

const STATUS_FILTERS = ["", "open", "in_progress", "done", "all"] as const;
const LS_KEY = "qf_tasks_filters";

interface TasksPageProps {
    view?: "" | "today" | "overdue" | "upcoming" | "all" | "someday";
    onTaskSelect?: (task: Task) => void;
}

export function TasksPage({ view: initialView, onTaskSelect }: TasksPageProps) {
    const saved = (() => {
        try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
    })();

    const [view, setView] = useState<any>(initialView || saved.view || "today");
    const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>(saved.statusFilter ?? "");
    const [sort, setSort] = useState<"due_at_asc" | "due_at_desc">(saved.sort ?? "due_at_asc");
    const [items, setItems] = useState<Task[]>([]);
    const [title, setTitle] = useState("");
    const [dueAt, setDueAt] = useState<string>("");
    const [err, setErr] = useState<string | null>(null);
    const { toasts, push, dismiss } = useToasts();
    const [selectedId, setSelectedId] = useState<number | null>(null);

    useEffect(() => {
        if (initialView !== undefined) setView(initialView === "all" ? "" : initialView);
    }, [initialView]);

    async function refresh() {
        setErr(null);
        const params: Record<string, string> = {};
        if (view) params.view = view;
        if (statusFilter && statusFilter !== "all") params.status = statusFilter;
        try {
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
        } catch (e) {
            setErr(String(e));
        }
    }

    useEffect(() => {
        refresh();
    }, [view, statusFilter, sort]);

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ fontSize: 28, textTransform: "capitalize", fontWeight: 800 }}>{view || "Inbox"}</h2>
                <div style={{ display: "flex", gap: 12 }}>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={{ border: "none", backgroundColor: "transparent", opacity: 0.5, fontWeight: 600 }}>
                        <option value="">Any status</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="done">Done</option>
                    </select>
                    <select value={sort} onChange={(e) => setSort(e.target.value as any)} style={{ border: "none", backgroundColor: "transparent", opacity: 0.5, fontWeight: 600 }}>
                        <option value="due_at_asc">Due date ↑</option>
                        <option value="due_at_desc">Due date ↓</option>
                    </select>
                </div>
            </div>

            <div style={{
                display: "flex",
                gap: 12,
                marginBottom: 32,
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
            }}>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Capture an idea..."
                    style={{ flex: 1, border: "none", fontSize: 18, outline: "none" }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && title.trim()) {
                            (async () => {
                                await api.taskCreate({ title, due_at: dueAt || undefined });
                                setTitle("");
                                push("Captured", "ok");
                                await refresh();
                            })();
                        }
                    }}
                />
                <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} style={{ border: "none", opacity: 0.3, cursor: "pointer", fontSize: 14 }} />
            </div>

            {err && <div style={{ color: "crimson", padding: 12 }}>{err}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {items.map((t) => (
                    <div
                        key={t.id}
                        onClick={() => {
                            setSelectedId(t.id);
                            onTaskSelect?.(t);
                        }}
                        style={{
                            padding: "12px 16px",
                            backgroundColor: selectedId === t.id ? "var(--brand-light)" : "transparent",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={t.status === "done"}
                            onChange={async (e) => {
                                e.stopPropagation();
                                if (t.status !== "done") await api.taskComplete(t.id);
                                else await api.taskReopen(t.id);
                                push(t.status === "done" ? "Reopened" : "Completed", "ok");
                                await refresh();
                            }}
                            style={{
                                width: 22,
                                height: 22,
                                cursor: "pointer",
                                accentColor: "var(--brand-color)",
                                flexShrink: 0
                            }}
                        />
                        <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{
                                    fontWeight: 500,
                                    fontSize: 15,
                                    textDecoration: t.status === "done" ? "line-through" : "none",
                                    opacity: t.status === "done" ? 0.4 : 1,
                                    color: selectedId === t.id ? "var(--brand-color)" : "inherit"
                                }}>
                                    {t.title}
                                </div>
                                {t.labels && (
                                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                                        {t.labels.split(",").map(l => (
                                            <span key={l} style={{ fontSize: 10, padding: "2px 6px", backgroundColor: "#f3f4f6", borderRadius: 4, opacity: 0.7 }}>{l.trim()}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {t.due_at && (
                                <div style={{
                                    fontSize: 12,
                                    opacity: 0.5,
                                    color: new Date(t.due_at) < new Date() && t.status !== "done" ? "var(--status-overdue)" : "inherit",
                                    fontWeight: new Date(t.due_at) < new Date() && t.status !== "done" ? 700 : 400
                                }}>
                                    {new Date(t.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ position: "fixed", right: 16, bottom: 16, width: 240, zIndex: 100 }}>
                {toasts.map((t: { id: number; text: string; tone?: "ok" | "err" }) => (
                    <Toast key={t.id} msg={t} onDone={dismiss} />
                ))}
            </div>
        </div>
    );
}
