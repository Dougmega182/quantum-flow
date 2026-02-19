import { useState, useEffect, useMemo } from "react";
import { api, type Task } from "../lib/api";

type Milestone = {
    id: number;
    project_id: number;
    title: string;
    due_at: string | null;
    completed_at: string | null;
};

export function TimelinePage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.tasksList({ limit: 200 }).then(r => setTasks(r.items.filter(t => t.due_at))),
            fetch(`${(import.meta as any).env?.VITE_API_URL || "http://localhost:8000"}/v1/milestones`, {
                headers: { "X-API-Key": localStorage.getItem("qf_api_key") || "" }
            }).then(r => r.json()).then(setMilestones).catch(() => { }),
        ]).finally(() => setLoading(false));
    }, []);

    // Build date range (next 30 days)
    const dateRange = useMemo(() => {
        const days: Date[] = [];
        const today = new Date();
        for (let i = -7; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            days.push(d);
        }
        return days;
    }, []);

    const dayWidth = 48;
    const rowHeight = 36;
    const headerHeight = 60;

    function dayOffset(dateStr: string): number {
        const d = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return (diff + 7) * dayWidth; // +7 because we start 7 days ago
    }

    function barWidth(t: Task): number {
        const dur = t.duration_minutes || 30;
        return Math.max(dayWidth, (dur / 60) * dayWidth);
    }

    if (loading) return <div style={{ padding: 40 }}>Loading Timeline...</div>;

    const sortedTasks = [...tasks].sort((a, b) => {
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    });

    const totalWidth = dateRange.length * dayWidth;
    const totalHeight = headerHeight + sortedTasks.length * rowHeight + 40;

    return (
        <div style={{ height: "100%", overflow: "auto" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
                📊 Timeline / Gantt
            </h2>
            <div style={{ position: "relative", width: totalWidth, height: totalHeight, minWidth: "100%" }}>
                {/* Date headers */}
                <div style={{ display: "flex", position: "sticky", top: 0, zIndex: 2, backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    {dateRange.map((d, i) => {
                        const isToday = d.toDateString() === new Date().toDateString();
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        return (
                            <div key={i} style={{
                                width: dayWidth, textAlign: "center", fontSize: 10, fontWeight: isToday ? 800 : 500,
                                padding: "8px 0", color: isToday ? "#7c3aed" : isWeekend ? "#94a3b8" : "#64748b",
                                backgroundColor: isToday ? "#f5f3ff" : "transparent",
                                borderRight: "1px solid #f1f5f9",
                            }}>
                                <div>{d.toLocaleDateString("en", { weekday: "short" })}</div>
                                <div style={{ fontSize: 12, fontWeight: 700 }}>{d.getDate()}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Task bars */}
                {sortedTasks.map((t, idx) => {
                    if (!t.due_at) return null;
                    const left = dayOffset(t.due_at);
                    const width = barWidth(t);
                    const priorityColors: Record<string, string> = {
                        high: "#ef4444", medium: "#f59e0b", low: "#22c55e"
                    };
                    const color = priorityColors[t.priority || "low"] || "#94a3b8";

                    return (
                        <div key={t.id} style={{
                            position: "absolute",
                            top: headerHeight + idx * rowHeight,
                            left,
                            width,
                            height: rowHeight - 8,
                            backgroundColor: color + "20",
                            border: `2px solid ${color}`,
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                            padding: "0 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#1e293b",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                            transition: "transform 0.1s",
                        }}
                            title={`${t.title} — ${t.priority || "low"} priority`}
                        >
                            <span style={{
                                width: 6, height: 6, borderRadius: "50%",
                                backgroundColor: color, marginRight: 6, flexShrink: 0,
                            }} />
                            {t.title}
                        </div>
                    );
                })}

                {/* Milestone markers */}
                {milestones.map(m => {
                    if (!m.due_at) return null;
                    const left = dayOffset(m.due_at);
                    return (
                        <div key={`ms-${m.id}`} style={{
                            position: "absolute",
                            top: headerHeight - 8,
                            left: left - 8,
                            width: 0,
                            height: totalHeight - headerHeight,
                            borderLeft: `2px dashed ${m.completed_at ? "#22c55e" : "#7c3aed"}`,
                            zIndex: 1,
                        }}>
                            <div style={{
                                position: "absolute",
                                top: -20,
                                left: -40,
                                width: 80,
                                textAlign: "center",
                                fontSize: 10,
                                fontWeight: 800,
                                color: m.completed_at ? "#22c55e" : "#7c3aed",
                                backgroundColor: m.completed_at ? "#f0fdf4" : "#f5f3ff",
                                padding: "2px 4px",
                                borderRadius: 4,
                            }}>
                                🏁 {m.title}
                            </div>
                        </div>
                    );
                })}

                {/* Today line */}
                <div style={{
                    position: "absolute",
                    top: 0,
                    left: 7 * dayWidth,
                    width: 2,
                    height: totalHeight,
                    backgroundColor: "#7c3aed",
                    opacity: 0.5,
                    zIndex: 3,
                }} />
            </div>
        </div>
    );
}
