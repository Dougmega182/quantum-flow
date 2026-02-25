import { useState, useEffect } from "react";
import { api } from "../lib/api";

type DeepAnalytics = {
    streaks: { current: number; best: number };
    velocity: { trend: { date: string; count: number }[]; avg_per_day: number };
    priority_breakdown: Record<string, number>;
    avg_completion_hours: number;
    comparison: { this_week: number; last_week: number; change_pct: number };
};

export function AnalyticsPage() {
    const [stats, setStats] = useState<any>(null);
    const [deep, setDeep] = useState<DeepAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.analyticsStats(), api.analyticsDeep()])
            .then(([s, d]) => { setStats(s); setDeep(d); })
            .finally(() => setLoading(false));
    }, []);

    if (loading || !stats || !deep) return <div style={{ padding: 40, opacity: 0.5 }}>Loading analytics...</div>;

    const energyDist = {
        high: stats.energy_distribution.high || 0,
        medium: (stats.energy_distribution.medium || 0) + (stats.energy_distribution.none || 0),
        low: stats.energy_distribution.low || 0,
    };

    const priorityColors: Record<string, string> = {
        high: "#ef4444", medium: "#f59e0b", low: "#3b82f6", none: "#94a3b8",
    };
    const priorityTotal = Object.values(deep.priority_breakdown).reduce((s, c) => s + c, 0);

    const changePct = deep.comparison.change_pct;
    const changeColor = changePct > 0 ? "#22c55e" : changePct < 0 ? "#ef4444" : "#94a3b8";
    const changeArrow = changePct > 0 ? "↑" : changePct < 0 ? "↓" : "→";

    return (
        <div style={{ padding: "0", maxWidth: 1100, display: "flex", flexDirection: "column", gap: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>📊 Productivity Insights</h2>

            {/* Top Row: Streak + Velocity + Comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Current Streak</div>
                    <div style={{ fontSize: 36, fontWeight: 800, color: "#f59e0b" }}>🔥 {deep.streaks.current}</div>
                    <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>Best: {deep.streaks.best} days</div>
                </GlassCard>

                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Velocity</div>
                    <div style={{ fontSize: 36, fontWeight: 800, color: "#7c3aed" }}>{deep.velocity.avg_per_day}</div>
                    <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>tasks/day avg (30d)</div>
                </GlassCard>

                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>This Week</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 36, fontWeight: 800 }}>{deep.comparison.this_week}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: changeColor }}>{changeArrow} {Math.abs(changePct)}%</span>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>vs last week: {deep.comparison.last_week}</div>
                </GlassCard>

                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Avg Completion</div>
                    <div style={{ fontSize: 36, fontWeight: 800, color: "#22c55e" }}>
                        {deep.avg_completion_hours < 24
                            ? `${deep.avg_completion_hours}h`
                            : `${Math.round(deep.avg_completion_hours / 24)}d`}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>create → complete</div>
                </GlassCard>
            </div>

            {/* Middle: Velocity Sparkline + Priority Donut */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
                <GlassCard>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>30-Day Velocity Trend</div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
                        {deep.velocity.trend.map((v, i) => {
                            const max = Math.max(...deep.velocity.trend.map(x => x.count), 1);
                            return (
                                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
                                    title={`${v.date}: ${v.count} tasks`}>
                                    <div style={{
                                        width: "100%", borderRadius: "3px 3px 0 0",
                                        height: Math.max(3, (v.count / max) * 70),
                                        backgroundColor: v.count > deep.velocity.avg_per_day ? "#7c3aed" : "#c4b5fd",
                                        transition: "height 0.3s ease",
                                    }} />
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, opacity: 0.3, marginTop: 4 }}>
                        <span>{deep.velocity.trend[0]?.date.split("-").slice(1).join("/") || ""}</span>
                        <span>{deep.velocity.trend[deep.velocity.trend.length - 1]?.date.split("-").slice(1).join("/") || ""}</span>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Priority Breakdown</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {Object.entries(deep.priority_breakdown).map(([p, c]) => {
                            const pct = Math.round((c / Math.max(priorityTotal, 1)) * 100);
                            return (
                                <div key={p}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                                        <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{p}</span>
                                        <span style={{ opacity: 0.4 }}>{c} ({pct}%)</span>
                                    </div>
                                    <div style={{ height: 6, backgroundColor: "var(--border-color)", borderRadius: 3, overflow: "hidden" }}>
                                        <div style={{
                                            height: "100%", width: `${pct}%`,
                                            backgroundColor: priorityColors[p] || "#94a3b8",
                                            borderRadius: 3, transition: "width 0.3s ease",
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>
            </div>

            {/* Bottom: Original Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Completed Tasks</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.completed_tasks}</div>
                    <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>{Math.round(stats.completion_rate)}% completion rate</div>
                </GlassCard>
                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Total Actions</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.total_tasks}</div>
                    <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>Tasks tracked in ecosystem</div>
                </GlassCard>
                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Current Backlog</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.total_tasks - stats.completed_tasks}</div>
                    <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>Tasks ready to schedule</div>
                </GlassCard>
            </div>

            {/* Energy Distribution + Weekly Focus (existing but restyled) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <GlassCard>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Energy Distribution</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <EnergyBar label="High Energy" count={energyDist.high} total={stats.total_tasks} color="#7c3aed" />
                        <EnergyBar label="Medium Energy" count={energyDist.medium} total={stats.total_tasks} color="#3b82f6" />
                        <EnergyBar label="Low Energy" count={energyDist.low} total={stats.total_tasks} color="#94a3b8" />
                    </div>
                </GlassCard>

                <GlassCard>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Weekly Focus (7 days)</div>
                    <div style={{ display: "flex", gap: 6, height: 80, alignItems: "flex-end" }}>
                        {Object.entries(stats.weekly_focus).map(([day, count]: [string, any]) => (
                            <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <div style={{
                                    width: "100%", borderRadius: "3px 3px 0 0",
                                    height: `${Math.min(100, (count / (stats.total_tasks || 1)) * 500 + 5)}%`,
                                    backgroundColor: "#7c3aed",
                                }} />
                                <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.3 }}>{day.split("-").slice(1).join("/")}</span>
                            </div>
                        ))}
                        {Object.keys(stats.weekly_focus).length === 0 && (
                            <div style={{ flex: 1, textAlign: "center", opacity: 0.5, fontSize: 12 }}>No activity this week.</div>
                        )}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}

function GlassCard({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            padding: 20, backgroundColor: "var(--bg-card)", borderRadius: 16,
            border: "1px solid var(--border-color)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            color: "var(--text-main)",
        }}>
            {children}
        </div>
    );
}

function EnergyBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const pct = Math.round((count / (total || 1)) * 100);
    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{label}</span>
                <span style={{ opacity: 0.4 }}>{count} ({pct}%)</span>
            </div>
            <div style={{ height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, backgroundColor: color, borderRadius: 3, transition: "width 0.3s ease" }} />
            </div>
        </div>
    );
}
