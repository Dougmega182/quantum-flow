import { useState, useEffect, useRef } from "react";

type TimerMode = "work" | "shortBreak" | "longBreak";

interface TimerSettings {
    work: number;
    shortBreak: number;
    longBreak: number;
}

const DEFAULT_SETTINGS: TimerSettings = {
    work: 25,
    shortBreak: 5,
    longBreak: 15
};

export function PomodoroTimer() {
    const [settings, setSettings] = useState<TimerSettings>(() => {
        const saved = localStorage.getItem("pomodoro_settings");
        return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    });

    const [mode, setMode] = useState<TimerMode>("work");
    const [timeLeft, setTimeLeft] = useState(settings[mode] * 60);
    const [isActive, setIsActive] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);

    const totalTime = settings[mode] * 60;
    const progress = ((totalTime - timeLeft) / totalTime) * 100;

    // Audio Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        localStorage.setItem("pomodoro_settings", JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        let interval: any = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            handleTimerComplete();
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const handleTimerComplete = () => {
        setIsActive(false);
        playFinishSound();

        if (Notification.permission === "granted") {
            new Notification("Quantum Flow", {
                body: `${mode === "work" ? "Work session" : "Break"} is over!`,
                icon: "/quantumflow_logo.png"
            });
        }

        if (mode === "work") {
            setSessionsCompleted(prev => prev + 1);
            // Auto switch to break
            const nextMode = (sessionsCompleted + 1) % 4 === 0 ? "longBreak" : "shortBreak";
            setMode(nextMode);
            setTimeLeft(settings[nextMode] * 60);
        } else {
            setMode("work");
            setTimeLeft(settings["work"] * 60);
        }
    };

    const playFinishSound = () => {
        // Subtle chime
        const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
        audio.play().catch(e => console.log("Audio play blocked by browser"));
    };

    const toggle = () => {
        if (!isActive && Notification.permission === "default") {
            Notification.requestPermission();
        }
        setIsActive(!isActive);
    };

    const reset = () => {
        setIsActive(false);
        setTimeLeft(settings[mode] * 60);
    };

    const changeMode = (newMode: TimerMode) => {
        setIsActive(false);
        setMode(newMode);
        setTimeLeft(settings[newMode] * 60);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Circular Progress Props
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                backgroundColor: "var(--bg-card)",
                padding: "6px 14px",
                borderRadius: 24,
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                backdropFilter: "blur(8px)"
            }}>
                {/* SVG Progress Circle */}
                <div style={{ position: "relative", width: 28, height: 28 }}>
                    <svg width="28" height="28" viewBox="0 0 28 28">
                        <circle
                            cx="14"
                            cy="14"
                            r={radius}
                            fill="none"
                            stroke="var(--border-color)"
                            strokeWidth="2"
                        />
                        <circle
                            cx="14"
                            cy="14"
                            r={radius}
                            fill="none"
                            stroke="var(--brand-color)"
                            strokeWidth="2"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            transform="rotate(-90 14 14)"
                            style={{ transition: "stroke-dashoffset 1s linear" }}
                        />
                    </svg>
                    <button
                        onClick={toggle}
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            backgroundColor: "var(--brand-color)",
                            color: "#fff",
                            fontSize: 8,
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 0
                        }}
                    >
                        {isActive ? "⏸" : "▶"}
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", minWidth: 40 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-main)", lineHeight: 1 }}>
                        {formatTime(timeLeft)}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {mode === "work" ? "Focus" : "Break"}
                    </span>
                </div>

                <button
                    onClick={() => setShowSettings(!showSettings)}
                    style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.4, fontSize: 16, padding: 0 }}
                >
                    ⚙️
                </button>
            </div>

            {showSettings && (
                <div style={{
                    position: "absolute",
                    top: 48,
                    right: 0,
                    backgroundColor: "var(--bg-card)",
                    borderRadius: 16,
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    border: "1px solid var(--border-color)",
                    padding: 16,
                    zIndex: 100,
                    width: 200
                }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                        {(["work", "shortBreak", "longBreak"] as TimerMode[]).map(m => (
                            <button
                                key={m}
                                onClick={() => changeMode(m)}
                                style={{
                                    flex: 1,
                                    padding: "6px",
                                    fontSize: 10,
                                    borderRadius: 8,
                                    border: "none",
                                    backgroundColor: mode === m ? "var(--brand-muted)" : "transparent",
                                    color: mode === m ? "var(--brand-color)" : "var(--text-muted)",
                                    fontWeight: 700
                                }}
                            >
                                {m === "work" ? "🧘" : m === "shortBreak" ? "☕" : "😴"}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {Object.entries(settings).map(([key, val]) => (
                            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                                <input
                                    type="number"
                                    value={val}
                                    onChange={(e) => {
                                        const newTime = parseInt(e.target.value) || 1;
                                        setSettings(s => {
                                            const updated = { ...s, [key]: newTime };
                                            if (mode === key) setTimeLeft(newTime * 60);
                                            return updated;
                                        });
                                    }}
                                    style={{ width: 50, padding: "4px 8px", fontSize: 11, borderRadius: 6, border: "1px solid var(--border-color)" }}
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={reset}
                        style={{
                            width: "100%",
                            marginTop: 16,
                            padding: "10px",
                            borderRadius: 10,
                            backgroundColor: "var(--bg-hover)",
                            border: "none",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--text-main)"
                        }}
                    >
                        🔄 Reset Timer
                    </button>
                </div>
            )}

            {showSettings && (
                <div
                    onClick={() => setShowSettings(false)}
                    style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                />
            )}
        </div>
    );
}
