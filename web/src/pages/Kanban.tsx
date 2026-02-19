import { useState, useEffect } from "react";
import type { DragEvent } from "react";
import { api, type Task } from "../lib/api";

export function KanbanPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedId, setDraggedId] = useState<number | null>(null);

    const fetchTasks = async () => {
        try {
            const res = await api.tasksList({});
            setTasks(res.items);
        } catch (e) {
            console.error("Failed to fetch tasks", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const columns = [
        { id: "inbox", label: "Inbox", icon: "📥", status: "open", color: "#94a3b8" },
        { id: "todo", label: "To-do", icon: "📋", status: "open", color: "#3b82f6" },
        { id: "doing", label: "Doing", icon: "⚡", status: "in_progress", color: "#f59e0b" },
        { id: "done", label: "Done", icon: "✅", status: "done", color: "#22c55e" },
    ];

    const getTasksForColumn = (colId: string) => {
        switch (colId) {
            case "inbox":
                return tasks.filter(t => t.status !== "done" && (!t.labels || t.labels === "") && !t.due_at);
            case "todo":
                return tasks.filter(t => t.status === "open" && (t.labels || t.due_at));
            case "doing":
                return tasks.filter(t => t.status === "in_progress");
            case "done":
                return tasks.filter(t => t.status === "done");
            default:
                return [];
        }
    };

    const handleDragStart = (e: DragEvent, taskId: number) => {
        setDraggedId(taskId);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e: DragEvent, targetStatus: string) => {
        e.preventDefault();
        if (draggedId === null) return;

        try {
            if (targetStatus === "done") {
                await api.taskComplete(draggedId);
            } else {
                await api.taskUpdate(draggedId, { status: targetStatus as any });
            }
            fetchTasks();
        } catch (err) {
            console.error("Drop update failed", err);
        }
        setDraggedId(null);
    };

    if (loading) return <div style={{ padding: 40 }}>Loading Board...</div>;

    return (
        <div style={{ display: "flex", gap: 20, height: "100%", overflowX: "auto", padding: "8px 0" }}>
            {columns.map(col => (
                <div
                    key={col.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.status)}
                    style={{
                        flex: 1,
                        minWidth: 280,
                        backgroundColor: "#f8fafc",
                        borderRadius: 16,
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        border: "2px solid transparent",
                        transition: "border-color 0.15s",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, paddingBottom: 8, borderBottom: `2px solid ${col.color}20` }}>
                        <span>{col.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{col.label}</span>
                        <span style={{
                            marginLeft: "auto",
                            fontSize: 11,
                            fontWeight: 800,
                            backgroundColor: col.color + "20",
                            color: col.color,
                            padding: "2px 8px",
                            borderRadius: 10,
                        }}>
                            {getTasksForColumn(col.id).length}
                        </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto" }}>
                        {getTasksForColumn(col.id).map(t => (
                            <div
                                key={t.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, t.id)}
                                style={{
                                    backgroundColor: "#fff",
                                    padding: 14,
                                    borderRadius: 12,
                                    boxShadow: draggedId === t.id
                                        ? "0 8px 25px rgba(0,0,0,0.15)"
                                        : "0 1px 3px rgba(0,0,0,0.04)",
                                    border: "1px solid #e2e8f0",
                                    cursor: "grab",
                                    opacity: draggedId === t.id ? 0.5 : 1,
                                    transition: "box-shadow 0.15s, opacity 0.15s, transform 0.1s",
                                    transform: draggedId === t.id ? "rotate(2deg)" : "none",
                                }}
                            >
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>{t.title}</div>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                                    {t.priority && (
                                        <span style={{
                                            fontSize: 10, fontWeight: 700,
                                            padding: "2px 6px", borderRadius: 4,
                                            backgroundColor: t.priority === "high" ? "#fef2f2" : t.priority === "medium" ? "#fffbeb" : "#f0fdf4",
                                            color: t.priority === "high" ? "#ef4444" : t.priority === "medium" ? "#f59e0b" : "#22c55e",
                                        }}>
                                            {t.priority}
                                        </span>
                                    )}
                                    {t.labels?.split(",").filter(Boolean).map(l => (
                                        <span key={l} style={{ fontSize: 10, fontWeight: 700, backgroundColor: "#f3e8ff", color: "#9333ea", padding: "2px 6px", borderRadius: 4 }}>{l}</span>
                                    ))}
                                    {t.due_at && (
                                        <span style={{ fontSize: 10, marginLeft: "auto", opacity: 0.5 }}>
                                            📅 {new Date(t.due_at).toLocaleDateString("en", { month: "short", day: "numeric" })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
