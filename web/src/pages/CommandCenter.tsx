import { useState, useEffect } from "react";
import { api } from "../lib/api";

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{
            padding: 20, borderRadius: 16,
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            color: "var(--text-main)",
            ...style,
        }}>
            {children}
        </div>
    );
}

export function CommandCenterPage() {
    const [stats, setStats] = useState<any>(null);
    const [deep, setDeep] = useState<any>(null);
    const [todayTasks, setTodayTasks] = useState<any[]>([]);
    const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [teamWorkload, setTeamWorkload] = useState<any[]>([]);
    const [autoPlanMessage, setAutoPlanMessage] = useState("");
    const [planLoading, setPlanLoading] = useState(false);

    useEffect(() => {
        // Fetch all data in parallel
        api.analyticsStats().then(setStats).catch(() => { });
        api.analyticsDeep().then(setDeep).catch(() => { });
        api.notificationList().then(r => setNotifications(r.notifications.slice(0, 5))).catch(() => { });

        // Today's tasks
        api.tasksList().then((res: any) => {
            const now = new Date();
            const todayStr = now.toISOString().split("T")[0];
            const today = res.items.filter((t: any) =>
                t.status !== "done" && t.due_at && t.due_at.startsWith(todayStr)
            );
            const overdue = res.items.filter((t: any) =>
                t.status !== "done" && t.due_at && new Date(t.due_at) < now && !t.due_at.startsWith(todayStr)
            );
            setTodayTasks(today.slice(0, 8));
            setOverdueTasks(overdue.slice(0, 5));
        }).catch(() => { });

        // Team (optional)
        api.teamWorkload().then(setTeamWorkload).catch(() => { });
    }, []);

    const handlePlanDay = async () => {
        setPlanLoading(true);
        try {
            const res = await api.aiAutoPlan();
            setAutoPlanMessage(res.message);
        } catch (e) {
            setAutoPlanMessage("Failed to auto-plan.");
        }
        setPlanLoading(false);
    };

    const greetingHour = new Date().getHours();
    const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";

    const streak = deep?.streaks?.current || 0;
    const velocity = deep?.velocity?.avg_per_day?.toFixed(1) || "0";
    const completionRate = stats?.completion_rate ?? 0;

    const priorityColors: Record<string, string> = {
        high: "#ef4444", medium: "#f59e0b", low: "#22c55e",
    };

    return (
        <div style={{ padding: 0, maxWidth: 1100, display: "flex", flexDirection: "column", gap: 24 }}>
            {/* ── Greeting ────────────────────────────────────────── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
                        {greeting} 👋
                    </h2>
                    <p style={{ fontSize: 13, opacity: 0.5, margin: "4px 0 0" }}>
                        Here&apos;s your day at a glance
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        onClick={handlePlanDay}
                        disabled={planLoading}
                        style={{
                            padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                            background: "linear-gradient(135deg, #7c3aed, #9333ea)", color: "#fff",
                            border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                        }}
                    >
                        ⚡ {planLoading ? "Planning..." : "Plan My Day"}
                    </button>
                </div>
            </div>

            {autoPlanMessage && (
                <div style={{
                    padding: "10px 16px", borderRadius: 10,
                    backgroundColor: "var(--status-bg-done)", border: "1px solid var(--status-done)",
                    fontSize: 13, fontWeight: 600, color: "var(--status-done)",
                }}>
                    {autoPlanMessage}
                </div>
            )}

            {/* ── Top Stats Row ────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase" }}>Streak</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b" }}>🔥 {streak}</div>
                    <div style={{ fontSize: 11, opacity: 0.4 }}>consecutive days</div>
                </GlassCard>
                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase" }}>Velocity</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#3b82f6" }}>⚡ {velocity}</div>
                    <div style={{ fontSize: 11, opacity: 0.4 }}>tasks/day (30d avg)</div>
                </GlassCard>
                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase" }}>Completion</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#22c55e" }}>✅ {completionRate}%</div>
                    <div style={{ fontSize: 11, opacity: 0.4 }}>all-time rate</div>
                </GlassCard>
                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase" }}>Open Tasks</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#7c3aed" }}>📋 {stats?.total_tasks ? stats.total_tasks - stats.completed_tasks : 0}</div>
                    <div style={{ fontSize: 11, opacity: 0.4 }}>to be completed</div>
                </GlassCard>
            </div>

            {/* ── Main Content Grid ──────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
                {/* Left: Today's Tasks + Overdue */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Overdue Alerts */}
                    {overdueTasks.length > 0 && (
                        <GlassCard style={{ borderColor: "var(--status-overdue)" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#ef4444", marginBottom: 10 }}>
                                ⏰ {overdueTasks.length} Overdue
                            </div>
                            {overdueTasks.map((t: any) => (
                                <div key={t.id} style={{
                                    padding: "6px 0", fontSize: 12, display: "flex", justifyContent: "space-between",
                                    borderBottom: "1px solid var(--border-color)",
                                }}>
                                    <span style={{ fontWeight: 600 }}>{t.title}</span>
                                    <span style={{ fontSize: 10, opacity: 0.5 }}>
                                        {t.due_at ? new Date(t.due_at).toLocaleDateString() : ""}
                                    </span>
                                </div>
                            ))}
                        </GlassCard>
                    )}

                    {/* Today's Tasks */}
                    <GlassCard>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 800 }}>📅 Today&apos;s Tasks</span>
                            <span style={{ fontSize: 11, opacity: 0.4, fontWeight: 600 }}>{todayTasks.length} tasks</span>
                        </div>
                        {todayTasks.length === 0 ? (
                            <div style={{ textAlign: "center", padding: 24, opacity: 0.3, fontSize: 13 }}>
                                No tasks due today. Hit &quot;Plan My Day&quot; to schedule some!
                            </div>
                        ) : todayTasks.map((t: any) => (
                            <div key={t.id} style={{
                                padding: "8px 0", fontSize: 12, display: "flex", alignItems: "center", gap: 8,
                                borderBottom: "1px solid var(--border-color)",
                            }}>
                                <div style={{
                                    width: 6, height: 6, borderRadius: "50%",
                                    backgroundColor: priorityColors[t.priority] || "#94a3b8",
                                }} />
                                <span style={{ flex: 1, fontWeight: 600 }}>{t.title}</span>
                                {t.duration_minutes && (
                                    <span style={{ fontSize: 10, opacity: 0.35 }}>{t.duration_minutes}m</span>
                                )}
                                {t.energy_level && (
                                    <span style={{
                                        fontSize: 9, padding: "2px 6px", borderRadius: 4,
                                        backgroundColor: t.energy_level === "high" ? "#fef3c7" : t.energy_level === "low" ? "#d1fae5" : "#e0e7ff",
                                        fontWeight: 700,
                                    }}>{t.energy_level}</span>
                                )}
                            </div>
                        ))}
                    </GlassCard>
                </div>

                {/* Right: Notifications + Team */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Recent Notifications */}
                    <GlassCard>
                        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>🔔 Recent</div>
                        {notifications.length === 0 ? (
                            <div style={{ textAlign: "center", padding: 16, opacity: 0.3, fontSize: 12 }}>No notifications</div>
                        ) : notifications.map((n: any) => (
                            <div key={n.id} style={{
                                padding: "6px 0", fontSize: 11, borderBottom: "1px solid #f1f5f950",
                                opacity: n.read ? 0.5 : 1,
                            }}>
                                <div style={{ fontWeight: n.read ? 500 : 700 }}>{n.title}</div>
                            </div>
                        ))}
                    </GlassCard>

                    {/* Team Status (if members exist) */}
                    {teamWorkload.length > 0 && (
                        <GlassCard>
                            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>👥 Team Status</div>
                            {teamWorkload.slice(0, 4).map((m: any) => (
                                <div key={m.member_id} style={{
                                    display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
                                    borderBottom: "1px solid var(--border-color)",
                                }}>
                                    <div style={{
                                        width: 24, height: 24, borderRadius: "50%",
                                        backgroundColor: "var(--bg-hover)", display: "flex",
                                        alignItems: "center", justifyContent: "center", fontSize: 10,
                                    }}>{m.name?.[0] || "?"}</div>
                                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{m.name}</span>
                                    <div style={{
                                        width: 40, height: 4, borderRadius: 2, backgroundColor: "var(--border-color)",
                                        overflow: "hidden",
                                    }}>
                                        <div style={{
                                            height: "100%",
                                            width: `${Math.min(m.utilization_pct || 0, 100)}%`,
                                            backgroundColor: (m.utilization_pct || 0) > 90 ? "#ef4444" : "#22c55e",
                                            borderRadius: 2, transition: "width 0.3s",
                                        }} />
                                    </div>
                                    <span style={{ fontSize: 10, opacity: 0.4, width: 30, textAlign: "right" }}>
                                        {Math.round(m.utilization_pct || 0)}%
                                    </span>
                                </div>
                            ))}
                        </GlassCard>
                    )}

                    {/* Quick Actions */}
                    <GlassCard>
                        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>⚡ Quick Actions</div>
                        {[
                            { icon: "🤖", label: "AI Chat", tab: "ai-center" },
                            { icon: "📋", label: "Blueprints", tab: "blueprints" },
                            { icon: "📊", label: "Analytics", tab: "analytics" },
                            { icon: "🔄", label: "Kanban", tab: "kanban" },
                        ].map(a => (
                            <div
                                key={a.tab}
                                style={{
                                    padding: "6px 8px", fontSize: 12, fontWeight: 600,
                                    borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                                    transition: "background 0.15s",
                                }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                                <span>{a.icon}</span> {a.label}
                            </div>
                        ))}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
