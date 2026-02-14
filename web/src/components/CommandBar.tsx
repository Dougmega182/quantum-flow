import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";

export function CommandBar() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+K or Ctrl+K to open
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen(prev => !prev);
            }
            if (e.key === "Escape") {
                setOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
        if (open) {
            inputRef.current?.focus();
        } else {
            setQuery("");
        }
    }, [open]);

    if (!open) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            paddingTop: "15vh"
        }} onClick={() => setOpen(false)}>
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
                <div style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>🌌</span>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search or capture: 'Buy milk tomorrow'..."
                        style={{
                            flex: 1,
                            border: "none",
                            fontSize: 18,
                            outline: "none",
                            background: "none"
                        }}
                        onKeyDown={async (e) => {
                            if (e.key === "Enter" && query.trim()) {
                                // Quick add task
                                await api.taskCreate({ title: query });
                                setOpen(false);
                                // We'd ideally need a global refresh trigger here
                            }
                        }}
                    />
                    <div style={{ fontSize: 12, opacity: 0.5 }}>ESC to close</div>
                </div>

                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, padding: "0 8px", marginBottom: 4 }}>ACTIONS</div>
                    <div className="cmd-item">🚀 Launch Ritual</div>
                    <div className="cmd-item">📅 Schedule Meeting</div>
                    <div className="cmd-item">⚡ New Automation</div>
                </div>
            </div>

            <style>{`
        .cmd-item {
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        .cmd-item:hover {
          background-color: #f3f4f6;
        }
      `}</style>
        </div>
    );
}
