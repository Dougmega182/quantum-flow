import { useState } from "react";

type ViewType = "day" | "week" | "month";

export function CalendarView() {
    const [view, setView] = useState<ViewType>("week");

    return (
        <div style={{ padding: "32px", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <h2 style={{ fontSize: 28, fontWeight: 800 }}>Calendar</h2>
                <div style={{ display: "flex", backgroundColor: "#f1f5f9", padding: 4, borderRadius: 8, gap: 4 }}>
                    {(["day", "week", "month"] as ViewType[]).map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            style={{
                                padding: "6px 16px",
                                borderRadius: 6,
                                border: "none",
                                backgroundColor: view === v ? "#fff" : "transparent",
                                color: view === v ? "#000" : "#64748b",
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: "pointer",
                                boxShadow: view === v ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                                textTransform: "capitalize"
                            }}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                {view === "day" && <DayView />}
                {view === "week" && <WeekView />}
                {view === "month" && <MonthView />}
            </div>
        </div>
    );
}

function DayView() {
    return (
        <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: 20 }}>
            {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} style={{ height: 60, borderBottom: "1px solid #f8fafc", position: "relative" }}>
                    <span style={{ position: "absolute", top: -8, left: 0, fontSize: 10, opacity: 0.3 }}>{i}:00</span>
                </div>
            ))}
            <div style={{ position: "absolute", top: 500, left: 60, right: 20, height: 80, backgroundColor: "var(--brand-light)", borderLeft: "4px solid var(--brand-color)", borderRadius: 4, padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Update Architecture Plan</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>4:15 PM - 5:35 PM</div>
            </div>
        </div>
    );
}

function WeekView() {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 60 }} />
                {days.map(d => (
                    <div key={d} style={{ flex: 1, padding: "12px", textAlign: "center", fontSize: 12, fontWeight: 700, opacity: 0.5 }}>{d}</div>
                ))}
            </div>
            <div style={{ flex: 1, display: "flex", overflowY: "auto" }}>
                <div style={{ width: 60 }}>
                    {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} style={{ height: 60, textAlign: "right", paddingRight: 8, fontSize: 10, opacity: 0.3 }}>{i}:00</div>
                    ))}
                </div>
                {days.map(d => (
                    <div key={d} style={{ flex: 1, borderLeft: "1px solid #f8fafc", position: "relative" }}>
                        {d === "Wed" && (
                            <div style={{ position: "absolute", top: 120, left: 4, right: 4, height: 60, backgroundColor: "var(--brand-light)", borderLeft: "4px solid var(--brand-color)", borderRadius: 4, padding: 4, fontSize: 10 }}>
                                <div style={{ fontWeight: 700 }}>Meeting</div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function MonthView() {
    return (
        <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(5, 1fr)" }}>
            {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} style={{ border: "1px solid #f8fafc", padding: 8, fontSize: 12, opacity: 0.5 }}>
                    {i + 1 > 31 ? (i + 1) % 31 : i + 1}
                </div>
            ))}
        </div>
    );
}
