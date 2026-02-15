import { useState, useEffect } from "react";

interface CommandBarProps {
    onClose: () => void;
    onAction: (action: string, payload?: any) => void;
}

export function CommandBar({ onClose, onAction }: CommandBarProps) {
    const [query, setQuery] = useState("");

    useEffect(() => {
        const handleDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleDown);
        return () => window.removeEventListener("keydown", handleDown);
    }, [onClose]);

    const suggestions = [
        { id: "capture", icon: "➕", label: "Capture Task", shortcut: "C" },
        { id: "search", icon: "🔍", label: "Search Tasks", shortcut: "S" },
        { id: "today", icon: "☀️", label: "Go to Today", shortcut: "G T" },
        { id: "inbox", icon: "📥", label: "Go to Inbox", shortcut: "G I" },
    ].filter(s => s.label.toLowerCase().includes(query.toLowerCase()));

    return (
        <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            paddingTop: "15vh",
            zIndex: 1000,
            backdropFilter: "blur(4px)"
        }} onClick={onClose}>
            <div
                style={{
                    width: 600,
                    maxHeight: 400,
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column"
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>🔍</span>
                    <input
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Type a command or search..."
                        style={{
                            flex: 1,
                            border: "none",
                            outline: "none",
                            fontSize: 16,
                            color: "#1a1a1a"
                        }}
                    />
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.3, border: "1px solid #ddd", padding: "2px 4px", borderRadius: 4 }}>ESC</div>
                </div>

                <div style={{ padding: 8, overflowY: "auto" }}>
                    {suggestions.map((s, idx) => (
                        <div
                            key={s.id}
                            onClick={() => onAction(s.id)}
                            style={{
                                padding: "10px 12px",
                                borderRadius: 8,
                                cursor: "pointer",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                backgroundColor: idx === 0 ? "#f8f9fa" : "transparent"
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span>{s.icon}</span>
                                <span style={{ fontSize: 14 }}>{s.label}</span>
                            </div>
                            {s.shortcut && (
                                <span style={{ fontSize: 11, color: "#999", fontWeight: 600 }}>{s.shortcut}</span>
                            )}
                        </div>
                    ))}
                    {suggestions.length === 0 && (
                        <div style={{ padding: 24, textAlign: "center", opacity: 0.5, fontSize: 14 }}>
                            No commands found for "{query}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
