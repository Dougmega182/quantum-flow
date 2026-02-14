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

    useEffect(() => {
        setTitle(task.title);
        setDescription(task.description || "");
        setPriority(task.priority || "low");
        setLabels(task.labels || "");
        setDueAt(task.due_at ? task.due_at.split("T")[0] : "");
    }, [task]);

    const handleSave = async () => {
        await api.taskUpdate(task.id, {
            title,
            description,
            priority,
            labels,
            due_at: dueAt ? new Date(dueAt).toISOString() : undefined
        });
        onUpdate();
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={onClose} style={{ padding: 4, background: "none", opacity: 0.5 }}>✕ Close</button>
                <button onClick={handleSave} style={{ backgroundColor: "var(--brand-color)", color: "#fff", padding: "6px 16px", borderRadius: 6 }}>Save</button>
            </div>

            <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ fontSize: 20, fontWeight: 700, border: "none", padding: 0 }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ fontSize: 13, opacity: 0.5, width: 80 }}>Priority</span>
                    <select value={priority} onChange={e => setPriority(e.target.value)} style={{ border: "none", padding: "4px 8px", backgroundColor: "#f3f4f6", borderRadius: 4 }}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>

                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ fontSize: 13, opacity: 0.5, width: 80 }}>Due Date</span>
                    <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} style={{ border: "none", padding: "4px 8px", backgroundColor: "#f3f4f6", borderRadius: 4 }} />
                </div>

                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ fontSize: 13, opacity: 0.5, width: 80 }}>Labels</span>
                    <input
                        value={labels}
                        onChange={e => setLabels(e.target.value)}
                        placeholder="Work, urgent..."
                        style={{ border: "none", padding: "4px 8px", backgroundColor: "#f3f4f6", borderRadius: 4, flex: 1 }}
                    />
                </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 13, opacity: 0.5 }}>Description</span>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Add details..."
                    style={{ flex: 1, border: "none", backgroundColor: "#fcfcfd", padding: 12, borderRadius: 8, resize: "none", fontSize: 14 }}
                />
            </div>
        </div>
    );
}
