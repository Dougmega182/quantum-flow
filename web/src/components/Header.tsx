import { useState, useEffect } from "react";
import { useLogout } from "./ApiKeyGate";
import { PomodoroTimer } from "./PomodoroTimer";
import { ThemeToggle } from "./ThemeToggle";
import { api } from "../lib/api";

interface HeaderProps {
    onTabSelect: (tab: any) => void;
}

export function Header({ onTabSelect }: HeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const logout = useLogout();

    useEffect(() => {
        api.userMe().then(setUser).catch(e => console.error("Failed to fetch user", e));
    }, []);

    const menuItems = [
        { id: "settings", label: "Settings", icon: "⚙️", shortcut: "⌘ ," },
        { id: "integrations", label: "Integrations", icon: "🧩" },
        { id: "analytics", label: "Statistics", icon: "📊" },
        { divider: true },
        { id: "help", label: "Help & Guides", icon: "❓", shortcut: "?" },
        { id: "shortcuts", label: "Shortcuts", icon: "⌨️" },
        { divider: true },
        { id: "team", label: "Create your team", icon: "👥" },
    ];

    return (
        <header style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "#fff",
            position: "sticky",
            top: 0,
            zIndex: 100
        }}>
            {/* Left: Search Bar & Tools */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative", width: 240 }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.3 }}>🔍</span>
                    <input
                        placeholder="Search..."
                        style={{
                            width: "100%",
                            padding: "8px 12px 8px 36px",
                            borderRadius: 8,
                            border: "1px solid transparent",
                            backgroundColor: "#f1f5f9",
                            fontSize: 14,
                            outline: "none"
                        }}
                    />
                </div>

                <button style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border-color)",
                    backgroundColor: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-muted)"
                }}>
                    <span style={{ fontSize: 16 }}>⌘</span> Command Bar
                </button>

                <PomodoroTimer />
            </div>

            {/* Right: Actions & Profile */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <ThemeToggle />

                <div style={{ position: "relative" }}>
                    <div
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            backgroundColor: "#e2e8f0",
                            backgroundImage: `url('${user?.avatar_url || "https://i.pravatar.cc/100?u=quantum"}')`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            cursor: "pointer",
                            border: "2px solid #fff",
                            boxShadow: "0 0 0 1px #e2e8f0"
                        }}
                    />

                    {isMenuOpen && (
                        <>
                            <div
                                onClick={() => setIsMenuOpen(false)}
                                style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}
                            />
                            <div style={{
                                position: "absolute",
                                top: 44,
                                right: 0,
                                width: 280,
                                backgroundColor: "#fff",
                                borderRadius: 12,
                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                border: "1px solid var(--border-color)",
                                padding: "8px",
                                display: "flex",
                                flexDirection: "column"
                            }}>
                                {menuItems.map((item, idx) => (
                                    item.divider ? (
                                        <div key={idx} style={{ height: 1, backgroundColor: "var(--border-color)", margin: "8px 4px" }} />
                                    ) : (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                onTabSelect(item.id);
                                                setIsMenuOpen(false);
                                            }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                padding: "10px 12px",
                                                borderRadius: 8,
                                                backgroundColor: "transparent",
                                                border: "none",
                                                cursor: "pointer",
                                                gap: 12,
                                                transition: "background 0.1s"
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                        >
                                            <span style={{ fontSize: 16 }}>{item.icon}</span>
                                            <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 500 }}>{item.label}</span>
                                            {item.shortcut && <span style={{ fontSize: 11, opacity: 0.3, fontWeight: 700 }}>{item.shortcut}</span>}
                                        </button>
                                    )
                                ))}
                                <div style={{ height: 1, backgroundColor: "var(--border-color)", margin: "8px 4px" }} />
                                <button
                                    onClick={logout}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "10px 12px",
                                        borderRadius: 8,
                                        backgroundColor: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        gap: 12,
                                        color: "#ef4444"
                                    }}
                                >
                                    <span style={{ fontSize: 16 }}>🚪</span>
                                    <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 500 }}>Sign out</span>
                                </button>

                                <div style={{ padding: "12px", borderTop: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", opacity: 0.5 }}>Accent Color</div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        {["#9333ea", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"].map(c => (
                                            <div
                                                key={c}
                                                onClick={() => {
                                                    document.documentElement.style.setProperty("--brand-color", c);
                                                    localStorage.setItem("accent_color", c);
                                                }}
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 6,
                                                    backgroundColor: c,
                                                    cursor: "pointer",
                                                    border: "1px solid rgba(0,0,0,0.1)"
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
