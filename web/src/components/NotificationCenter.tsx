import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";

type NotificationItem = {
    id: number;
    type: string;
    title: string;
    body: string | null;
    read: boolean;
    task_id: number | null;
    created_at: string;
};

export function NotificationBell({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void }) {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.notificationList();
            setNotifications(res.notifications);
            setUnreadCount(res.unread_count);
        } catch (e) {
            console.error("Failed to load notifications", e);
        }
    };

    useEffect(() => { fetchNotifications(); }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleMarkRead = async (id?: number) => {
        try {
            await api.notificationMarkRead(id);
            fetchNotifications();
        } catch (e) {
            console.error("Failed to mark read", e);
        }
    };

    const handleGenerateDigest = async () => {
        try {
            await api.notificationGenerateDigest();
            fetchNotifications();
        } catch (e) {
            console.error("Failed to generate digest", e);
        }
    };

    const typeIcons: Record<string, string> = {
        overdue: "⏰", streak: "🔥", digest: "📊", assignment: "👤", blueprint: "📋", system: "🔔",
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    };

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button
                onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
                style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 20, position: "relative", padding: 8,
                }}
                title="Notifications"
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: "absolute", top: 2, right: 2,
                        width: 18, height: 18, borderRadius: "50%",
                        backgroundColor: "#ef4444", color: "#fff",
                        fontSize: 10, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
                )}
            </button>

            {open && (
                <div style={{
                    position: "absolute", top: "100%", right: 0, width: 380,
                    backgroundColor: "#fff", borderRadius: 16,
                    border: "1px solid #e2e8f0", boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                    zIndex: 1000, overflow: "hidden",
                }}>
                    {/* Header */}
                    <div style={{
                        padding: "14px 16px", borderBottom: "1px solid #f1f5f9",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                        <span style={{ fontWeight: 800, fontSize: 14 }}>Notifications</span>
                        <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={handleGenerateDigest} style={{
                                padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                                backgroundColor: "#f3e8ff", color: "#7c3aed", border: "none", cursor: "pointer",
                            }}>📊 Digest</button>
                            {unreadCount > 0 && (
                                <button onClick={() => handleMarkRead()} style={{
                                    padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                                    backgroundColor: "#f0fdf4", color: "#22c55e", border: "none", cursor: "pointer",
                                }}>✓ All Read</button>
                            )}
                        </div>
                    </div>

                    {/* Notification List */}
                    <div style={{ maxHeight: 400, overflowY: "auto" }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: 32, textAlign: "center", opacity: 0.4, fontSize: 13 }}>
                                No notifications yet.
                            </div>
                        ) : notifications.map(n => (
                            <div
                                key={n.id}
                                onClick={() => { if (!n.read) handleMarkRead(n.id); }}
                                style={{
                                    padding: "12px 16px",
                                    backgroundColor: n.read ? "#fff" : "#faf5ff",
                                    borderBottom: "1px solid #f8fafc",
                                    cursor: n.read ? "default" : "pointer",
                                    transition: "background 0.15s",
                                }}
                            >
                                <div style={{ display: "flex", gap: 10 }}>
                                    <span style={{ fontSize: 16 }}>{typeIcons[n.type] || "🔔"}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontWeight: n.read ? 500 : 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {n.title}
                                            </span>
                                            <span style={{ fontSize: 10, opacity: 0.35, flexShrink: 0, marginLeft: 8 }}>
                                                {timeAgo(n.created_at)}
                                            </span>
                                        </div>
                                        {n.body && (
                                            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4, lineHeight: 1.5, whiteSpace: "pre-line" }}>
                                                {n.body}
                                            </div>
                                        )}
                                    </div>
                                    {!n.read && (
                                        <div style={{
                                            width: 8, height: 8, borderRadius: "50%",
                                            backgroundColor: "#7c3aed", flexShrink: 0, marginTop: 4,
                                        }} />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
