import { useState, useEffect } from "react";
import { api } from "../lib/api";

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{
            padding: 20, borderRadius: 16,
            background: "var(--bg-card, #fff)",
            border: "1px solid var(--border-color, #e8ecf4)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            ...style,
        }}>
            {children}
        </div>
    );
}

type GoalItem = {
    id: number; title: string; description: string | null;
    target_value: number; current_value: number; unit: string;
    status: string; progress_pct: number; created_at: string;
};

export function GoalsPage() {
    const [goals, setGoals] = useState<GoalItem[]>([]);
    const [newTitle, setNewTitle] = useState("");
    const [newTarget, setNewTarget] = useState(100);
    const [newUnit, setNewUnit] = useState("%");
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [progressData, setProgressData] = useState<any>(null);

    const load = async () => {
        try {
            const r = await api.goalsList();
            setGoals(r.goals);
        } catch { /* */ }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        await api.goalCreate({ title: newTitle, target_value: newTarget, unit: newUnit });
        setNewTitle(""); setNewTarget(100); setNewUnit("%");
        load();
    };

    const handleExpand = async (id: number) => {
        if (expandedId === id) { setExpandedId(null); return; }
        setExpandedId(id);
        try {
            const p = await api.goalProgress(id);
            setProgressData(p);
        } catch { /* */ }
    };

    const handleDelete = async (id: number) => {
        await api.goalDelete(id);
        if (expandedId === id) setExpandedId(null);
        load();
    };

    const statusColors: Record<string, string> = {
        active: "#3b82f6", completed: "#22c55e", archived: "#94a3b8",
    };

    return (
        <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🎯 Goals & OKRs</h2>

            {/* ── Create Goal ─────────────────────────────────── */}
            <GlassCard>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="New objective..."
                        onKeyDown={e => e.key === "Enter" && handleCreate()}
                        style={{
                            flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 13,
                            border: "1px solid var(--border-color, #ddd)", background: "var(--bg-main, #fff)",
                        }}
                    />
                    <input
                        type="number" value={newTarget}
                        onChange={e => setNewTarget(Number(e.target.value))}
                        style={{ width: 70, padding: "10px", borderRadius: 10, border: "1px solid var(--border-color, #ddd)", textAlign: "center", fontSize: 13 }}
                    />
                    <select value={newUnit} onChange={e => setNewUnit(e.target.value)}
                        style={{ padding: "10px", borderRadius: 10, border: "1px solid var(--border-color, #ddd)", fontSize: 13 }}>
                        <option value="%">%</option>
                        <option value="tasks">tasks</option>
                        <option value="hours">hours</option>
                        <option value="units">units</option>
                    </select>
                    <button onClick={handleCreate} style={{
                        padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                        background: "linear-gradient(135deg, #7c3aed, #9333ea)", color: "#fff",
                        border: "none", cursor: "pointer",
                    }}>+ Add Goal</button>
                </div>
            </GlassCard>

            {/* ── Goal List ───────────────────────────────────── */}
            {goals.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, opacity: 0.3, fontSize: 14 }}>
                    No goals yet. Set an objective to start tracking progress!
                </div>
            ) : goals.map(g => (
                <GlassCard key={g.id} style={{ cursor: "pointer" }}>
                    <div onClick={() => handleExpand(g.id)} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {/* Progress Ring */}
                        <div style={{ position: "relative", width: 52, height: 52 }}>
                            <svg width="52" height="52" viewBox="0 0 52 52">
                                <circle cx="26" cy="26" r="22" fill="none" stroke="var(--border-color)" strokeWidth="4" />
                                <circle cx="26" cy="26" r="22" fill="none"
                                    stroke={statusColors[g.status] || "#3b82f6"}
                                    strokeWidth="4" strokeLinecap="round"
                                    strokeDasharray={`${(g.progress_pct / 100) * 138.2} 138.2`}
                                    transform="rotate(-90 26 26)"
                                />
                            </svg>
                            <div style={{
                                position: "absolute", inset: 0, display: "flex",
                                alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 800,
                            }}>{Math.round(g.progress_pct)}%</div>
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{g.title}</div>
                            <div style={{ fontSize: 11, opacity: 0.5 }}>
                                {g.current_value} / {g.target_value} {g.unit}
                                {g.status !== "active" && (
                                    <span style={{
                                        marginLeft: 8, padding: "2px 8px", borderRadius: 4,
                                        fontSize: 10, fontWeight: 700,
                                        backgroundColor: g.status === "completed" ? "var(--status-bg-done)" : "var(--bg-hover)",
                                        color: g.status === "completed" ? "var(--status-done)" : "var(--text-muted)",
                                    }}>{g.status}</span>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ width: 120, height: 6, borderRadius: 3, backgroundColor: "var(--border-color)", overflow: "hidden" }}>
                            <div style={{
                                height: "100%", borderRadius: 3,
                                width: `${Math.min(g.progress_pct, 100)}%`,
                                background: `linear-gradient(90deg, ${statusColors[g.status]}, ${statusColors[g.status]}cc)`,
                                transition: "width 0.3s ease",
                            }} />
                        </div>

                        <button onClick={e => { e.stopPropagation(); handleDelete(g.id); }} style={{
                            padding: "4px 8px", borderRadius: 6, border: "none",
                            backgroundColor: "transparent", cursor: "pointer", fontSize: 14, opacity: 0.3,
                        }}>🗑</button>
                    </div>

                    {/* Expanded: Linked Tasks */}
                    {expandedId === g.id && progressData && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color, #e8ecf4)" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.6 }}>
                                Linked Tasks ({progressData.tasks_done}/{progressData.tasks_total} done)
                            </div>
                            {progressData.linked_tasks?.length > 0 ? progressData.linked_tasks.map((t: any) => (
                                <div key={t.id} style={{
                                    padding: "6px 0", fontSize: 12, display: "flex", alignItems: "center", gap: 8,
                                    borderBottom: "1px solid var(--border-color, #f1f5f9)",
                                }}>
                                    <span style={{ color: t.status === "done" ? "#22c55e" : "#94a3b8" }}>
                                        {t.status === "done" ? "✅" : "⬜"}
                                    </span>
                                    <span style={{
                                        fontWeight: 600,
                                        textDecoration: t.status === "done" ? "line-through" : "none",
                                        opacity: t.status === "done" ? 0.5 : 1,
                                    }}>{t.title}</span>
                                </div>
                            )) : (
                                <div style={{ fontSize: 12, opacity: 0.3, padding: 8 }}>
                                    No tasks linked yet. Link tasks to auto-track progress.
                                </div>
                            )}
                        </div>
                    )}
                </GlassCard>
            ))}
        </div>
    );
}
