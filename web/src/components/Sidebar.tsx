

interface SidebarProps {
    activeTab: string;
    setTab: (tab: any) => void;
}

export function Sidebar({ activeTab, setTab }: SidebarProps) {
    const navItems = [
        { id: "tasks", label: "Inbox", icon: "📥" },
        { id: "today", label: "Today", icon: "☀️" },
        { id: "all", label: "All Tasks", icon: "📋" },
    ];

    const projectItems = [
        { id: "list:Work", label: "Work", icon: "💼" },
        { id: "list:Home", label: "Home", icon: "🏠" },
        { id: "list:Projects", label: "Projects", icon: "🚀" },
    ];

    const secondaryItems = [
        { id: "integrations", label: "Integrations", icon: "🔌" },
        { id: "automations", label: "Automations", icon: "⚡" },
        { id: "ai", label: "AI Suggestions", icon: "✨" },
    ];

    return (
        <div style={{
            width: 240,
            height: "100%",
            backgroundColor: "var(--bg-sidebar)",
            color: "var(--sidebar-text)",
            display: "flex",
            flexDirection: "column",
            padding: "20px 0",
            userSelect: "none",
        }}>
            <div style={{ padding: "0 20px 20px 20px", fontSize: 18, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 24 }}>🌌</span> Quantum Flow
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
                <nav style={{ padding: "0 10px" }}>
                    {navItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => setTab(item.id)}
                            style={{
                                padding: "10px 12px",
                                borderRadius: 6,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                marginBottom: 2,
                                backgroundColor: activeTab === item.id ? "var(--sidebar-hover)" : "transparent",
                                color: activeTab === item.id ? "var(--sidebar-text-active)" : "inherit",
                            }}
                        >
                            <span>{item.icon}</span>
                            <span style={{ fontSize: 14 }}>{item.label}</span>
                        </div>
                    ))}

                    <div style={{ height: 16 }} />

                    <div style={{ padding: "0 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.5, marginBottom: 8 }}>
                        Lists
                    </div>
                    {projectItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => setTab(item.id)}
                            style={{
                                padding: "8px 12px",
                                borderRadius: 6,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                marginBottom: 2,
                                backgroundColor: activeTab === item.id ? "var(--sidebar-hover)" : "transparent",
                                color: activeTab === item.id ? "var(--sidebar-text-active)" : "inherit",
                            }}
                        >
                            <span>{item.icon}</span>
                            <span style={{ fontSize: 14 }}>{item.label}</span>
                        </div>
                    ))}

                    <div style={{ height: 24 }} />

                    <div style={{ padding: "0 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.5, marginBottom: 8 }}>
                        Settings
                    </div>
                    {secondaryItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => setTab(item.id)}
                            style={{
                                padding: "8px 12px",
                                borderRadius: 6,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                marginBottom: 2,
                                backgroundColor: activeTab === item.id ? "var(--sidebar-hover)" : "transparent",
                                color: activeTab === item.id ? "var(--sidebar-text-active)" : "inherit",
                            }}
                        >
                            <span>{item.icon}</span>
                            <span style={{ fontSize: 14 }}>{item.label}</span>
                        </div>
                    ))}
                </nav>
            </div>

            <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12, opacity: 0.5 }}>
                v0.2.0-alpha
            </div>
        </div>
    );
}
