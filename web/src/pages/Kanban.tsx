import { useState, useEffect } from "react";
import { api, type Task } from "../lib/api";

export function KanbanPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

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
        { id: "inbox", label: "Inbox", icon: "📥" },
        { id: "todo", label: "To-do", icon: "📋" },
        { id: "doing", label: "Doing", icon: "⚡" },
        { id: "done", label: "Done", icon: "✅" },
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

    const handleUpdateStatus = async (taskId: number, newStatus: string) => {
        try {
            await api.taskUpdate(taskId, { status: newStatus as any });
            fetchTasks();
        } catch (e) {
            console.error("Update failed", e);
        }
    };

    if (loading) return <div style={{ padding: 40 }}>Loading Board...</div>;

    return (
        <div style={{ display: "flex", gap: 24, height: "100%", overflowX: "auto", padding: "8px 0" }}>
            {columns.map(col => (
                <div
                    key={col.id}
                    style={{
                        flex: 1,
                        minWidth: 300,
                        backgroundColor: "#f1f5f9",
                        borderRadius: 16,
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span>{col.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{col.label}</span>
                        <span style={{ marginLeft: "auto", opacity: 0.3, fontWeight: 700, fontSize: 12 }}>{getTasksForColumn(col.id).length}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, overflowY: "auto" }}>
                        {getTasksForColumn(col.id).map(t => (
                            <div
                                key={t.id}
                                style={{
                                    backgroundColor: "#fff",
                                    padding: 16,
                                    borderRadius: 12,
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                    border: "1px solid var(--border-color)",
                                    cursor: "pointer"
                                }}
                            >
                                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t.title}</div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: 4 }}>
                                        {t.labels?.split(",").map(l => (
                                            <span key={l} style={{ fontSize: 10, fontWeight: 700, backgroundColor: "#f3e8ff", color: "#9333ea", padding: "2px 6px", borderRadius: 4 }}>{l}</span>
                                        ))}
                                    </div>
                                    <select
                                        value={t.status}
                                        onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                                        style={{ border: "none", fontSize: 10, fontWeight: 800, opacity: 0.4, background: "none" }}
                                    >
                                        <option value="open">TODO</option>
                                        <option value="in_progress">DOING</option>
                                        <option value="done">DONE</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
