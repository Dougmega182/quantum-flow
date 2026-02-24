import { useState, useEffect, useRef } from "react";
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

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TimeTracker() {
    const [running, setRunning] = useState<any>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [analysis, setAnalysis] = useState<any>(null);
    const [elapsed, setElapsed] = useState(0);
    const [tasks, setTasks] = useState<any[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const intervalRef = useRef<number | null>(null);

    const load = async () => {
        try {
            const [r, e, a, t] = await Promise.all([
                api.timeRunning(),
                api.timeEntries(),
                api.timeAnalysis(),
                api.tasksList({ status: "open" }),
            ]);
            setRunning(r.entry);
            setEntries(e.entries);
            setAnalysis(a);
            setTasks((t as any).items || []);
        } catch {
            /* initial load */
        }
    };

    useEffect(() => { load(); }, []);

    // Live timer
    useEffect(() => {
        if (running) {
            const started = new Date(running.started_at).getTime();
            const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000));
            tick();
            intervalRef.current = window.setInterval(tick, 1000);
        } else {
            setElapsed(0);
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [running]);

    const handleStart = async () => {
        if (!selectedTaskId) return;
        const entry = await api.timeStart(selectedTaskId);
        setRunning(entry);
        load();
    };

    const handleStop = async () => {
        if (!running) return;
        await api.timeStop(running.id);
        setRunning(null);
        load();
    };

    const avgAccuracy = analysis?.summary?.avg_accuracy_pct || 100;
    const totalHours = analysis?.summary?.total_tracked_hours || 0;

    return (
        <div style={{ maxWidth: 1000, display: "flex", flexDirection: "column", gap: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>⏱️ Time Tracker</h2>

            {/* ── Active Timer ──────────────────────────────────── */}
            <GlassCard style={{
                background: running
                    ? "linear-gradient(135deg, #fef3c7, #fff7ed)"
                    : "var(--bg-card, #fff)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {running ? (
                        <>
                            <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "monospace", color: "#f59e0b" }}>
                                {formatDuration(elapsed)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>
                                    Working on: {entries.find(e => e.id === running.id)?.title || `Task #${running.task_id}`}
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.5 }}>Timer running since {new Date(running.started_at).toLocaleTimeString()}</div>
                            </div>
                            <button onClick={handleStop} style={{
                                padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                                background: "#ef4444", color: "#fff", border: "none", cursor: "pointer",
                            }}>⏹ Stop</button>
                        </>
                    ) : (
                        <>
                            <select
                                value={selectedTaskId || ""}
                                onChange={e => setSelectedTaskId(Number(e.target.value))}
                                style={{
                                    flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 13,
                                    border: "1px solid var(--border-color, #ddd)", background: "var(--bg-main, #fff)",
                                }}
                            >
                                <option value="">Select a task...</option>
                                {tasks.map((t: any) => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleStart}
                                disabled={!selectedTaskId}
                                style={{
                                    padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                                    background: selectedTaskId ? "linear-gradient(135deg, #22c55e, #16a34a)" : "#e2e8f0",
                                    color: selectedTaskId ? "#fff" : "#94a3b8",
                                    border: "none", cursor: selectedTaskId ? "pointer" : "default",
                                }}
                            >▶ Start Timer</button>
                        </>
                    )}
                </div>
            </GlassCard>

            {/* ── Stats Row ────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase" }}>Total Tracked</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#3b82f6" }}>{totalHours}h</div>
                </GlassCard>
                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase" }}>Sessions</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#7c3aed" }}>{analysis?.summary?.total_entries || 0}</div>
                </GlassCard>
                <GlassCard>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase" }}>Estimate Accuracy</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: avgAccuracy > 120 ? "#ef4444" : avgAccuracy > 80 ? "#22c55e" : "#f59e0b" }}>
                        {avgAccuracy}%
                    </div>
                </GlassCard>
            </div>

            {/* ── Actual vs Estimated ──────────────────────────── */}
            {(analysis?.comparisons?.length > 0) && (
                <GlassCard>
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>📊 Actual vs Estimated</div>
                    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-color, #e8ecf4)", opacity: 0.5 }}>
                                <th style={{ textAlign: "left", padding: "6px 0" }}>Task</th>
                                <th>Est.</th>
                                <th>Actual</th>
                                <th>Accuracy</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysis.comparisons.slice(0, 10).map((c: any) => (
                                <tr key={c.task_id} style={{ borderBottom: "1px solid var(--border-color, #f1f5f9)" }}>
                                    <td style={{ padding: "8px 0", fontWeight: 600 }}>{c.title}</td>
                                    <td style={{ textAlign: "center" }}>{c.estimated_minutes}m</td>
                                    <td style={{ textAlign: "center" }}>{c.actual_minutes}m</td>
                                    <td style={{ textAlign: "center", fontWeight: 700, color: c.accuracy_pct > 120 ? "#ef4444" : "#22c55e" }}>
                                        {c.accuracy_pct}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </GlassCard>
            )}

            {/* ── Recent Entries ───────────────────────────────── */}
            <GlassCard>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>📝 Recent Sessions</div>
                {entries.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 24, opacity: 0.3 }}>No time entries yet. Start a timer above!</div>
                ) : entries.slice(0, 15).map((e: any) => (
                    <div key={e.id} style={{
                        padding: "8px 0", fontSize: 12, display: "flex", justifyContent: "space-between",
                        borderBottom: "1px solid var(--border-color, #f1f5f9)",
                    }}>
                        <span style={{ fontWeight: 600 }}>Task #{e.task_id}</span>
                        <span style={{ opacity: 0.5 }}>
                            {e.started_at ? new Date(e.started_at).toLocaleString() : ""}
                        </span>
                        <span style={{ fontWeight: 700, color: e.is_running ? "#f59e0b" : "#22c55e" }}>
                            {e.is_running ? "▶ Running" : formatDuration(e.duration_seconds || 0)}
                        </span>
                    </div>
                ))}
            </GlassCard>
        </div>
    );
}
