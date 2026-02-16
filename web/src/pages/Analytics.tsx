import { useState, useEffect } from "react";
import { api } from "../lib/api";
import type { Task } from "../lib/api";

export function AnalyticsPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.analyticsStats().then(res => {
            setStats(res);
            setLoading(false);
        });
    }, []);

    if (loading || !stats) return <div style={{ padding: 40, opacity: 0.5 }}>Loading analytics...</div>;

    const energyDist = {
        high: stats.energy_distribution.high || 0,
        medium: (stats.energy_distribution.medium || 0) + (stats.energy_distribution.none || 0),
        low: stats.energy_distribution.low || 0,
    };

    return (
        <div style={{ padding: "40px", maxWidth: 1000, margin: "0 auto" }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Productivity Insights</h1>
            <p style={{ opacity: 0.5, marginBottom: 40 }}>Understanding your energy patterns and execution velocity based on live data.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 48 }}>
                <StatCard label="Completed Tasks" value={stats.completed_tasks} subValue={`${Math.round(stats.completion_rate)}% completion rate`} />
                <StatCard label="Total Actions" value={stats.total_tasks} subValue="Tasks tracked in ecosystem" />
                <StatCard label="Current Backlog" value={stats.total_tasks - stats.completed_tasks} subValue="Tasks ready to schedule" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
                <section>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Energy Distribution</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <EnergyBar label="High Energy" count={energyDist.high} total={stats.total_tasks} color="var(--brand-color)" />
                        <EnergyBar label="Medium Energy" count={energyDist.medium} total={stats.total_tasks} color="#3b82f6" />
                        <EnergyBar label="Low Energy" count={energyDist.low} total={stats.total_tasks} color="#94a3b8" />
                    </div>
                </section>

                <section style={{ backgroundColor: "#f8fafc", borderRadius: 16, padding: 32 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Weekly Focus</h3>
                    <p style={{ fontSize: 14, opacity: 0.6, lineHeight: 1.6, marginBottom: 24 }}>
                        Live completion trends for the last 7 days.
                    </p>
                    <div style={{ display: "flex", gap: 8, height: 100, alignItems: "flex-end" }}>
                        {Object.entries(stats.weekly_focus).map(([day, count]: [string, any]) => (
                            <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                                <div style={{
                                    width: "100%",
                                    height: `${Math.min(100, (count / (stats.total_tasks || 1)) * 500 + 5)}%`,
                                    backgroundColor: "var(--brand-color)",
                                    borderRadius: 4
                                }} />
                                <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.3 }}>{day.split("-").slice(1).join("/")}</span>
                            </div>
                        ))}
                        {Object.keys(stats.weekly_focus).length === 0 && (
                            <div style={{ flex: 1, textAlign: "center", opacity: 0.5, fontSize: 12 }}>No activity logged this week.</div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

function StatCard({ label, value, subValue }: { label: string, value: string | number, subValue: string }) {
    return (
        <div style={{ padding: 24, backgroundColor: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>{subValue}</div>
        </div>
    );
}

function EnergyBar({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
    const pct = Math.round((count / (total || 1)) * 100);
    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{label}</span>
                <span style={{ opacity: 0.5 }}>{count} tasks ({pct}%)</span>
            </div>
            <div style={{ height: 8, width: "100%", backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
            </div>
        </div>
    );
}
