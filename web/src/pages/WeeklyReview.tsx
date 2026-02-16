import { useState, useEffect } from "react";
import { api } from "../lib/api";

export function WeeklyReview() {
    const [stats, setStats] = useState<any>(null);
    const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [s, tasks] = await Promise.all([
                    api.analyticsStats(),
                    api.tasksList()
                ]);
                setStats(s);

                const now = new Date();
                const overdue = (tasks.items as any[]).filter(t => t.status !== "done" && t.due_at && new Date(t.due_at) < now);
                setOverdueTasks(overdue);
            } catch (e) {
                console.error("Failed to load weekly review", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div style={{ padding: 40, opacity: 0.5 }}>Analyzing your week...</div>;

    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
            <header style={{ marginBottom: 40 }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Weekly Review</h1>
                <p style={{ fontSize: 16, color: "var(--text-muted)" }}>Reflect on your progress and plan the week ahead.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 48 }}>
                <div style={statCardStyle}>
                    <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.5, textTransform: "uppercase" }}>Completed</span>
                    <div style={{ fontSize: 36, fontWeight: 700 }}>{stats?.completed_tasks || 0}</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>tasks this week</div>
                </div>
                <div style={statCardStyle}>
                    <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.5, textTransform: "uppercase" }}>Focus Time</span>
                    <div style={{ fontSize: 36, fontWeight: 700 }}>{Math.round((stats?.completed_tasks || 0) * 0.5 * 10) / 10}h</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>estimated focused work</div>
                </div>
                <div style={statCardStyle}>
                    <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.5, textTransform: "uppercase" }}>Efficiency</span>
                    <div style={{ fontSize: 36, fontWeight: 700 }}>{Math.round(stats?.completion_rate * 100) || 0}%</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>task completion rate</div>
                </div>
            </div>

            <section style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                    🧹 Clean Up Checklist
                    <span style={{ fontSize: 12, backgroundColor: "var(--status-bg-overdue)", color: "var(--status-overdue)", padding: "2px 8px", borderRadius: 10 }}>{overdueTasks.length} Overdue</span>
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {overdueTasks.length > 0 ? overdueTasks.map(t => (
                        <div key={t.id} style={{
                            padding: "16px",
                            backgroundColor: "var(--bg-card)",
                            borderRadius: 12,
                            border: "1px solid var(--border-color)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>{t.title}</div>
                                <div style={{ fontSize: 12, color: "var(--status-overdue)" }}>Was due on {new Date(t.due_at).toLocaleDateString()}</div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button style={{ padding: "6px 12px", borderRadius: 6, border: "none", backgroundColor: "var(--brand-muted)", color: "var(--brand-color)", fontSize: 12, fontWeight: 600 }}>Reschedule</button>
                                <button style={{ padding: "6px 12px", borderRadius: 6, border: "none", backgroundColor: "#f1f5f9", color: "#64748b", fontSize: 12, fontWeight: 600 }}>Dismiss</button>
                            </div>
                        </div>
                    )) : (
                        <div style={{ textAlign: "center", padding: 40, opacity: 0.5, border: "2px dashed var(--border-color)", borderRadius: 16 }}>
                            Inbox Zero! No overdue tasks to clean up.
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Next Week Outlook</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div style={statCardStyle}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Key Targets</h3>
                        <textarea
                            placeholder="What are your top 3 goals for next week?"
                            style={{ width: "100%", height: 120, border: "none", backgroundColor: "transparent", resize: "none", outline: "none", padding: 0 }}
                        />
                    </div>
                    <div style={statCardStyle}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Energy Reflection</h3>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Your highest energy peak was on Tuesday morning. Schedule deep work accordingly.</p>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
                            {Object.values(stats?.energy_distribution || {}).map((val: any, idx: number) => (
                                <div key={idx} style={{ flex: 1, height: `${val * 10}%`, backgroundColor: "var(--brand-color)", borderRadius: "2px 2px 0 0", opacity: 0.3 + (val * 0.1) }} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

const statCardStyle = {
    padding: "24px",
    backgroundColor: "var(--bg-card)",
    borderRadius: 20,
    border: "1px solid var(--border-color)",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
};
