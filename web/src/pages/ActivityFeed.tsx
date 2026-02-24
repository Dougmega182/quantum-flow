import { useState, useEffect } from "react";
import { api } from "../lib/api";

const ACTION_ICONS: Record<string, string> = {
    created: "✨", completed: "✅", updated: "✏️", deleted: "🗑️",
    assigned: "👤", linked: "🔗", blueprint_used: "📋",
};

const ENTITY_COLORS: Record<string, string> = {
    task: "#3b82f6", goal: "#7c3aed", blueprint: "#f59e0b",
    notification: "#ef4444", team: "#22c55e",
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function ActivityFeed() {
    const [activities, setActivities] = useState<any[]>([]);
    const [filter, setFilter] = useState<string>("all");

    useEffect(() => {
        const params = filter === "all" ? undefined : filter;
        api.activityList(50).then((r: any) => {
            const items = r.activities || [];
            setActivities(params ? items.filter((a: any) => a.entity_type === params) : items);
        }).catch(() => { });
    }, [filter]);

    return (
        <div style={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📰 Activity Feed</h2>
                <div style={{ display: "flex", gap: 6 }}>
                    {["all", "task", "goal", "blueprint"].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                                border: "none", cursor: "pointer",
                                backgroundColor: filter === f ? "#7c3aed" : "var(--bg-card, #f1f5f9)",
                                color: filter === f ? "#fff" : "var(--text-primary, #333)",
                                textTransform: "capitalize",
                            }}
                        >{f}</button>
                    ))}
                </div>
            </div>

            {activities.length === 0 ? (
                <div style={{
                    textAlign: "center", padding: 48, opacity: 0.3, fontSize: 14,
                    background: "var(--bg-card, #fff)", borderRadius: 16,
                    border: "1px solid var(--border-color, #e8ecf4)",
                }}>
                    No activity yet. Actions you take will appear here.
                </div>
            ) : (
                <div style={{
                    background: "var(--bg-card, #fff)", borderRadius: 16,
                    border: "1px solid var(--border-color, #e8ecf4)",
                    overflow: "hidden",
                }}>
                    {activities.map((a: any, i: number) => (
                        <div key={a.id} style={{
                            padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
                            borderBottom: i < activities.length - 1 ? "1px solid var(--border-color, #f1f5f9)" : "none",
                            transition: "background 0.15s",
                        }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover, #f8f9ff)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                            {/* Icon */}
                            <div style={{
                                width: 32, height: 32, borderRadius: "50%",
                                backgroundColor: ENTITY_COLORS[a.entity_type] + "15",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 14, flexShrink: 0,
                            }}>
                                {ACTION_ICONS[a.action] || "📌"}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                    <span style={{ textTransform: "capitalize" }}>{a.action}</span>
                                    {" "}
                                    <span style={{
                                        padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                                        backgroundColor: ENTITY_COLORS[a.entity_type] + "20",
                                        color: ENTITY_COLORS[a.entity_type],
                                    }}>{a.entity_type}</span>
                                    {a.entity_title && (
                                        <span style={{ fontWeight: 700 }}> &quot;{a.entity_title}&quot;</span>
                                    )}
                                </div>
                            </div>

                            {/* Time */}
                            <span style={{ fontSize: 11, opacity: 0.4, flexShrink: 0 }}>
                                {a.created_at ? timeAgo(a.created_at) : ""}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
