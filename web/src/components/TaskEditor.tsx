import { useState, useEffect } from "react";
import { api } from "../lib/api";
import type { Task } from "../lib/api";

interface TaskEditorProps {
    task: Task;
    onClose: () => void;
    onUpdate: () => void;
}

export function TaskEditor({ task, onClose, onUpdate }: TaskEditorProps) {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || "");
    const [priority, setPriority] = useState(task.priority || "low");
    const [labels, setLabels] = useState(task.labels || "");
    const [dueAt, setDueAt] = useState(task.due_at ? task.due_at.split("T")[0] : "");
    const [duration, setDuration] = useState(task.duration_minutes || 30);
    const [subtasks, setSubtasks] = useState<Task[]>([]);
    const [newSubtask, setNewSubtask] = useState("");

    useEffect(() => {
        setTitle(task.title);
        setDescription(task.description || "");
        setPriority(task.priority || "low");
        setLabels(task.labels || "");
        setDueAt(task.due_at ? task.due_at.split("T")[0] : "");
        setDuration(task.duration_minutes || 30);
        refreshSubtasks();
    }, [task]);

    async function refreshSubtasks() {
        try {
            const res = await api.tasksList({ parent_id: task.id });
            setSubtasks(res.items);
        } catch (e) { }
    }

    const handleSave = async () => {
        await api.taskUpdate(task.id, {
            title,
            description,
            priority,
            labels,
            duration_minutes: duration,
            due_at: dueAt ? new Date(dueAt).toISOString() : undefined
        });
        onUpdate();
    };

    const addSubtask = async () => {
        if (!newSubtask.trim()) return;
        await api.taskCreate({
            title: newSubtask,
            parent_id: task.id,
            priority: "low"
        });
        setNewSubtask("");
        refreshSubtasks();
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 20, overflowY: "auto", paddingRight: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={onClose} style={{ padding: 4, background: "none", opacity: 0.5, border: "none", cursor: "pointer" }}>✕ Close</button>
                <button onClick={handleSave} style={{ backgroundColor: "var(--brand-color)", color: "#fff", padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
            </div>

            <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ fontSize: 22, fontWeight: 800, border: "none", padding: 0, outline: "none", color: "#1a1a1a" }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ fontSize: 13, opacity: 0.5, width: 80 }}>Priority</span>
                    <select value={priority} onChange={e => setPriority(e.target.value)} style={{ border: "none", padding: "6px 10px", backgroundColor: "#f3f4f6", borderRadius: 6, fontSize: 13, outline: "none" }}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>

                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ fontSize: 13, opacity: 0.5, width: 80 }}>Due Date</span>
                    <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} style={{ border: "none", padding: "6px 10px", backgroundColor: "#f3f4f6", borderRadius: 6, fontSize: 13, outline: "none" }} />
                </div>

                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ fontSize: 13, opacity: 0.5, width: 80 }}>Duration</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                            type="number"
                            value={duration}
                            onChange={e => setDuration(Number(e.target.value))}
                            style={{ border: "none", padding: "6px 10px", backgroundColor: "#f3f4f6", borderRadius: 6, fontSize: 13, width: 60, outline: "none" }}
                        />
                        <span style={{ fontSize: 12, opacity: 0.5 }}>mins</span>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ fontSize: 13, opacity: 0.5, width: 80 }}>Labels</span>
                    <input
                        value={labels}
                        onChange={e => setLabels(e.target.value)}
                        placeholder="Work, urgent..."
                        style={{ border: "none", padding: "6px 10px", backgroundColor: "#f3f4f6", borderRadius: 6, flex: 1, fontSize: 13, outline: "none" }}
                    />
                </div>
            </div>

            <div style={{ height: 1, backgroundColor: "#f0f0f0", margin: "4px 0" }} />

            <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Subtasks</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {subtasks.map(s => (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: s.status === "done" ? "#aaa" : "inherit" }}>
                            <input type="checkbox" checked={s.status === "done"} readOnly style={{ cursor: "pointer" }} />
                            <span style={{ textDecoration: s.status === "done" ? "line-through" : "none" }}>{s.title}</span>
                        </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <input
                            placeholder="Add subtask..."
                            value={newSubtask}
                            onChange={e => setNewSubtask(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && addSubtask()}
                            style={{ flex: 1, border: "none", borderBottom: "1px solid #eee", fontSize: 13, padding: "4px 0", outline: "none" }}
                        />
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 13, opacity: 0.5 }}>Description</span>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Add details..."
                    style={{ flex: 1, backgroundColor: "#fcfcfd", padding: 12, borderRadius: 8, resize: "none", fontSize: 14, outline: "none", border: "1px solid #f0f0f0" }}
                />
            </div>
        </div>
    );
}
