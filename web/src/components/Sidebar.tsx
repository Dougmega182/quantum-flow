import { useState } from "react";
import { useLogout } from "./ApiKeyGate";

interface SidebarProps {
    activeTab: string;
    setTab: (tab: any) => void;
    lists: { id: string, label: string, icon: string }[];
    projects: { id: string, label: string, icon: string }[];
    onAddList: () => void;
    onDeleteList: (id: string) => void;
    onAddProject: () => void;
    onDeleteProject: (id: string) => void;
}

export function Sidebar({
    activeTab,
    setTab,
    lists,
    projects,
    onAddList,
    onDeleteList,
    onAddProject,
    onDeleteProject
}: SidebarProps) {
    const navItems = [
        { id: "tasks", label: "Inbox", icon: "📥" },
        { id: "today", label: "Today", icon: "☀️" },
        { id: "focus", label: "Focus Mode", icon: "🎯" },
        { id: "all", label: "All Tasks", icon: "📋" },
        { id: "kanban", label: "Kanban Board", icon: "🍱" },
        { id: "calendar", label: "Calendar", icon: "📅" },
        { id: "review", label: "Weekly Review", icon: "📈" },
        { id: "graph", label: "Project Graph", icon: "🕸️" },
        { id: "search", label: "Semantic Search", icon: "🔍" },
        { id: "planning", label: "Daily Planning", icon: "☀️" },
    ];

    return (
        <div style={{
            backgroundColor: "#111111",
            color: "#e0e0e0",
            display: "flex",
            flexDirection: "column",
            padding: "24px 0",
            userSelect: "none",
            borderRight: "1px solid #222",
            height: "100%",
            width: "100%"
        }}>
            <div style={{ padding: "0 24px 28px 24px", fontSize: 16, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
                <img
                    src="/logo.png"
                    alt="Quantum Flow"
                    style={{ width: 32, height: 32, objectFit: "contain" }}
                />
                Quantum Flow
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

                    <div style={{ height: 24 }} />

                    <SectionHeader title="Lists" onAdd={onAddList} />
                    {lists.map(item => (
                        <SidebarItem
                            key={item.id}
                            item={item}
                            active={activeTab === item.id}
                            onClick={() => setTab(item.id)}
                            onDelete={() => onDeleteList(item.id)}
                        />
                    ))}

                    <div style={{ height: 24 }} />

                    <SectionHeader title="Projects" onAdd={onAddProject} />
                    {projects.map(item => (
                        <SidebarItem
                            key={item.id}
                            item={item}
                            active={activeTab === item.id}
                            onClick={() => setTab(item.id)}
                            onDelete={() => onDeleteProject(item.id)}
                        />
                    ))}

                </nav>
            </div>

            <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12, opacity: 0.5 }}>
                v0.2.0-alpha
            </div>
        </div>
    );
}

function SectionHeader({ title, onAdd }: { title: string, onAdd: () => void }) {
    return (
        <div style={{
            padding: "0 12px",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            opacity: 0.5,
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
        }}>
            {title}
            <button
                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                style={{
                    background: "none",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 14,
                    opacity: 0.8,
                    padding: "0 4px"
                }}
            >
                +
            </button>
        </div>
    );
}

function SidebarItem({ item, active, onClick, onDelete }: { item: any, active: boolean, onClick: () => void, onDelete: () => void }) {
    const [hover, setHover] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                padding: "8px 12px",
                borderRadius: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 2,
                backgroundColor: active ? "var(--sidebar-hover)" : "transparent",
                color: active ? "var(--sidebar-text-active)" : "inherit",
                position: "relative"
            }}
        >
            <span>{item.icon}</span>
            <span style={{ fontSize: 14, flex: 1 }}>{item.label}</span>
            {hover && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    style={{
                        background: "none",
                        border: "none",
                        color: "#ff4d4f",
                        cursor: "pointer",
                        fontSize: 10,
                        opacity: 0.6
                    }}
                >
                    ✕
                </button>
            )}
        </div>
    );
}
