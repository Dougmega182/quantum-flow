import { useState, useEffect } from "react";
import { api } from "../lib/api";
import type { Task } from "../lib/api";

export function FocusModePage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [seconds, setSeconds] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        api.tasksList({ view: "today", status: "open" }).then(res => {
            setTasks(res.items);
        });
    }, []);

    useEffect(() => {
        let interval: any = null;
        if (isActive && seconds > 0) {
            interval = setInterval(() => {
                setSeconds(s => s - 1);
            }, 1000);
        } else if (seconds === 0) {
            setIsActive(false);
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive, seconds]);

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const currentTask = tasks[currentIndex];

    if (!currentTask && tasks.length > 0) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 24, opacity: 0.5 }}>
                All done for now! ✨
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 24, opacity: 0.5 }}>
                No tasks scheduled for today.
            </div>
        );
    }

    return (
        <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: "10vh",
            backgroundColor: "#fafafa"
        }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.4, marginBottom: 40 }}>
                Focus Mode
            </div>

            <div style={{ textAlign: "center", maxWidth: 600, marginBottom: 60 }}>
                <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 16, color: "#111" }}>{currentTask.title}</h1>
                <p style={{ fontSize: 18, opacity: 0.6, lineHeight: 1.6 }}>{currentTask.description || "No description provided."}</p>
            </div>

            <div style={{
                fontSize: 120,
                fontWeight: 200,
                fontFamily: "monospace",
                marginBottom: 60,
                color: isActive ? "var(--brand-color)" : "#111"
            }}>
                {formatTime(seconds)}
            </div>

            <div style={{ display: "flex", gap: 24 }}>
                <button
                    onClick={() => setIsActive(!isActive)}
                    style={{
                        padding: "16px 40px",
                        borderRadius: 50,
                        backgroundColor: isActive ? "#eee" : "var(--brand-color)",
                        color: isActive ? "#111" : "#fff",
                        border: "none",
                        fontSize: 18,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s"
                    }}
                >
                    {isActive ? "Pause" : "Start Session"}
                </button>
                <button
                    onClick={() => {
                        api.taskComplete(currentTask.id);
                        setCurrentIndex(i => i + 1);
                        setSeconds(25 * 60);
                        setIsActive(false);
                    }}
                    style={{
                        padding: "16px 40px",
                        borderRadius: 50,
                        backgroundColor: "#fff",
                        color: "#111",
                        border: "1px solid #ddd",
                        fontSize: 18,
                        fontWeight: 600,
                        cursor: "pointer"
                    }}
                >
                    Mark as Done
                </button>
            </div>

            <div style={{ position: "fixed", bottom: 40, display: "flex", gap: 8 }}>
                {tasks.map((_, idx) => (
                    <div
                        key={idx}
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: idx === currentIndex ? "var(--brand-color)" : "#ddd"
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
