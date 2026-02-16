import { useState, useEffect } from "react";

export function PomodoroTimer() {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        let interval: any = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            // Optional: alert or sound
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const toggle = () => setIsActive(!isActive);
    const reset = () => {
        setIsActive(false);
        setTimeLeft(25 * 60);
    };

    return (
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#f1f5f9",
                padding: "4px 12px",
                borderRadius: 20,
                border: "1px solid var(--border-color)"
            }}>
                <button
                    onClick={toggle}
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        backgroundColor: "var(--brand-color)",
                        color: "#fff",
                        fontSize: 10,
                        border: "none",
                        cursor: "pointer"
                    }}
                >
                    {isActive ? "⏸" : "▶"}
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, minWidth: 40, textAlign: "center" }}>{formatTime(timeLeft)}</span>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.3, fontSize: 16 }}
                >
                    ⋮
                </button>
            </div>

            {showSettings && (
                <div style={{
                    position: "absolute",
                    top: 40,
                    right: 0,
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    border: "1px solid var(--border-color)",
                    padding: 8,
                    zIndex: 10,
                    width: 120
                }}>
                    <button
                        onClick={reset}
                        style={{ width: "100%", textAlign: "left", padding: "8px", borderRadius: 6, border: "none", background: "none", fontSize: 12, fontWeight: 600 }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                        🔄 Reset
                    </button>
                    <div style={{ height: 1, backgroundColor: "var(--border-color)", margin: "4px 0" }} />
                    {[5, 10, 15, 20, 25, 30, 45].map(mins => (
                        <button
                            key={mins}
                            onClick={() => { setTimeLeft(mins * 60); setShowSettings(false); }}
                            style={{ width: "100%", textAlign: "left", padding: "8px", borderRadius: 6, border: "none", background: "none", fontSize: 12 }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                            {mins} minutes
                        </button>
                    ))}
                </div>
            )}
            {showSettings && (
                <div
                    onClick={() => setShowSettings(false)}
                    style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 }}
                />
            )}
        </div>
    );
}
