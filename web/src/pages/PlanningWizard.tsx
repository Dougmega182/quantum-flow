import { useState, useEffect } from "react";
import { api, type Task } from "../lib/api";

export function PlanningWizard({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState<1 | 2>(1);
    const [yesterdayTasks, setYesterdayTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecap = async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            try {
                // Fetch tasks done yesterday
                const res = await api.tasksList({ status: "done" });
                // Filter locally for yesterday's completion (assuming completed_at is available)
                const filtered = res.items.filter(t => {
                    if (!t.completed_at) return false;
                    const d = new Date(t.completed_at);
                    return d >= yesterday && d < today;
                });
                setYesterdayTasks(filtered);
            } catch (e) {
                console.error("Recap failed", e);
            } finally {
                setLoading(false);
            }
        };
        fetchRecap();
    }, []);

    const totalTime = yesterdayTasks.reduce((acc, t) => acc + (t.duration_minutes || 0), 0);

    const energyStats = yesterdayTasks.reduce((acc, t) => {
        const level = t.energy_level || "medium";
        acc[level] = (acc[level] || 0) + (t.duration_minutes || 30);
        return acc;
    }, {} as Record<string, number>);

    const formatDuration = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    if (loading) return <div style={{ padding: 40 }}>Analyzing your progress...</div>;

    return (
        <div style={{ display: "flex", height: "100%", backgroundColor: "#fff" }}>
            {step === 1 ? (
                <>
                    {/* Left Panel: Recap Stats */}
                    <div style={{ width: 300, borderRight: "1px solid var(--border-color)", padding: 40, backgroundColor: "#f8fafc" }}>
                        <div style={{ opacity: 0.5, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>← Back to Akiflow</div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Yesterday's Recap</h1>
                        <p style={{ opacity: 0.5, marginBottom: 40 }}>Reflect on your progress!</p>

                        <div style={{ marginBottom: 40 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.5, marginBottom: 4 }}>Tasks done Yesterday</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                                <span style={{ fontSize: 32, fontWeight: 800 }}>{yesterdayTasks.length}</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: 40 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                                <span style={{ opacity: 0.5 }}>Yesterday's Tasks</span>
                                <span>{formatDuration(totalTime)}</span>
                            </div>

                            <RecapRow label="High Energy" time={formatDuration(energyStats.high || 0)} color="#9333ea" percent={totalTime > 0 ? ((energyStats.high || 0) / totalTime) * 100 : 0} />
                            <RecapRow label="Medium Energy" time={formatDuration(energyStats.medium || 0)} color="#3b82f6" percent={totalTime > 0 ? ((energyStats.medium || 0) / totalTime) * 100 : 0} />
                            <RecapRow label="Low Energy" time={formatDuration(energyStats.low || 0)} color="#f1416c" percent={totalTime > 0 ? ((energyStats.low || 0) / totalTime) * 100 : 0} />
                        </div>

                        <div style={{ marginTop: "auto" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.5, marginBottom: 16 }}>Rate Yesterday</div>
                            <div style={{ display: "flex", gap: 12 }}>
                                {["😞", "😐", "🙂", "😊", "🤩"].map((e, i) => (
                                    <button key={i} style={{ fontSize: 20, background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}>{e}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Middle Panel: Task List */}
                    <div style={{ flex: 1, padding: 40, overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.5 }}>☀️ Daily Planning - 1/2</span>
                            <button style={{ background: "none", border: "none", opacity: 0.3 }}>☰</button>
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Yesterday</h2>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--border-color)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontWeight: 700, color: "#10b981" }}>Done</span>
                                <span style={{ opacity: 0.4, fontWeight: 700 }}>{yesterdayTasks.length}</span>
                            </div>
                            <span style={{ opacity: 0.4, fontSize: 12, fontWeight: 700 }}>{formatDuration(totalTime)}</span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {yesterdayTasks.map(t => (
                                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                                    <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10 }}>✓</div>
                                    <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{t.title}</span>
                                    {t.labels && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--brand-color)", opacity: 0.6 }}>{t.labels.includes(",") ? t.labels.split(",")[0] : t.labels}</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Button Overlay (approximate) */}
                    <div style={{ position: "fixed", bottom: 40, left: 340, right: 40, display: "flex", justifyContent: "center" }}>
                        <button
                            onClick={() => setStep(2)}
                            style={{
                                width: 400,
                                backgroundColor: "var(--brand-color)",
                                color: "#fff",
                                padding: "12px 24px",
                                borderRadius: 12,
                                fontWeight: 700,
                                border: "none",
                                boxShadow: "0 10px 15px -3px rgba(147, 51, 234, 0.3)"
                            }}
                        >
                            Next: Plan Today
                        </button>
                    </div>
                </>
            ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24 }}>
                    <div style={{ fontSize: 48 }}>🎯</div>
                    <h2 style={{ fontSize: 32, fontWeight: 800 }}>Time to Plan Today</h2>
                    <p style={{ opacity: 0.5, maxWidth: 400, textAlign: "center" }}>Use the Auto-Plan engine to find the most efficient route through your day.</p>
                    <button
                        onClick={onComplete}
                        style={{
                            backgroundColor: "var(--brand-color)",
                            color: "#fff",
                            padding: "16px 32px",
                            borderRadius: 12,
                            fontWeight: 700,
                            border: "none",
                            fontSize: 16
                        }}
                    >
                        Go to Today's View
                    </button>
                </div>
            )}
        </div>
    );
}

function RecapRow({ label, time, color, percent }: any) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
                    {label}
                </span>
                <span style={{ opacity: 0.5 }}>{time}</span>
            </div>
            <div style={{ height: 4, width: "100%", backgroundColor: "#e2e8f0", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${percent}%`, backgroundColor: color, borderRadius: 2 }} />
            </div>
        </div>
    );
}
