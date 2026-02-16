import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Task } from "../lib/api";
import { Toast } from "../components/Toast";
import { useToasts } from "../hooks/useToasts";

const STATUS_FILTERS = ["", "open", "in_progress", "done", "all"] as const;
const LS_KEY = "qf_tasks_filters";

interface TasksPageProps {
    view?: "" | "today" | "overdue" | "upcoming" | "all" | "someday" | "inbox";
    label?: string;
    onTaskSelect?: (task: Task) => void;
}

export function TasksPage({ view: initialView, label, onTaskSelect }: TasksPageProps) {
    const saved = (() => {
        try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
    })();

    const [view, setView] = useState<any>(initialView || saved.view || "today");
    const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>(saved.statusFilter ?? "");
    const [sort, setSort] = useState<"due_at_asc" | "due_at_desc">(saved.sort ?? "due_at_asc");
    const [items, setItems] = useState<Task[]>([]);
    const [title, setTitle] = useState("");
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
        if (label) params.label = label;
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
                <h2 style={{ fontSize: 28, textTransform: "capitalize", fontWeight: 800 }}>{label || (view === "inbox" ? "Unified Inbox" : view) || "Unified Inbox"}</h2>
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
                alignItems: "center",
                gap: 12,
                marginBottom: 32,
                backgroundColor: "#fff",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}>
                <div style={{ color: "var(--text-muted)", fontSize: 20 }}>+</div>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Add new task"
                    style={{ flex: 1, border: "none", fontSize: 15, outline: "none", backgroundColor: "transparent" }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && title.trim()) {
                            (async () => {
                                await api.taskCreate({
                                    title,
                                    labels: label || undefined
                                });
                                setTitle("");
                                push("Captured", "ok");
                                await refresh();
                            })();
                        }
                    }}
                />
                <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    backgroundColor: "#f8fafc"
                }}>C</div>
            </div>

            {err && <div style={{ color: "crimson", padding: 12 }}>{err}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {items.map((t) => (
                    <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData("application/json", JSON.stringify(t));
                            e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={() => {
                            setSelectedId(t.id);
                            onTaskSelect?.(t);
                        }}
                        style={{
                            padding: "8px 12px",
                            backgroundColor: selectedId === t.id ? "#f1f5f9" : "transparent",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            cursor: "pointer",
                            transition: "background 0.1s ease",
                            border: "1px solid transparent",
                            borderColor: selectedId === t.id ? "var(--border-color)" : "transparent"
                        }}
                    >
                        <div
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (t.status !== "done") await api.taskComplete(t.id);
                                else await api.taskReopen(t.id);
                                push(t.status === "done" ? "Reopened" : "Completed", "ok");
                                await refresh();
                            }}
                            style={{
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                border: `2px solid ${t.status === "done" ? "var(--status-done)" : "#d1d5db"}`,
                                backgroundColor: t.status === "done" ? "var(--status-done)" : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                flexShrink: 0
                            }}
                        >
                            {t.status === "done" && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                        </div>

                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                            {t.labels && t.labels.includes("email") && <span title="From Gmail" style={{ opacity: 0.6 }}>📧</span>}
                            {t.labels && t.labels.includes("slack") && <span title="From Slack" style={{ opacity: 0.6 }}>💬</span>}
                            <span style={{
                                fontWeight: 500,
                                fontSize: 14,
                                textDecoration: t.status === "done" ? "line-through" : "none",
                                opacity: t.status === "done" ? 0.4 : 1,
                                color: "var(--text-main)"
                            }}>
                                {t.title}
                            </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {t.energy_level === "high" && <span title="High Energy" style={{ fontSize: 12 }}>🔥</span>}
                            {t.energy_level === "medium" && <span title="Medium Energy" style={{ fontSize: 12 }}>⚡</span>}
                            {t.energy_level === "low" && <span title="Low Energy" style={{ fontSize: 12 }}>🔋</span>}

                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", opacity: 0.6 }}>{t.duration_minutes || 30}m</span>
                            {t.labels && t.labels.split(",").map(l => {
                                if (l.trim() === "email" || l.trim() === "slack") return null;
                                return (
                                    <span key={l} style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        backgroundColor: l.trim() === "Admin" ? "#ffeef3" : "#e0f2fe",
                                        color: l.trim() === "Admin" ? "#f1416c" : "#0369a1",
                                        borderRadius: "4px",
                                        textTransform: "capitalize"
                                    }}>
                                        {l.trim()}
                                    </span>
                                )
                            })}
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
