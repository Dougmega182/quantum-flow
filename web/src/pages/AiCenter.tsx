import { useState, useEffect } from "react";
import { api } from "../lib/api";

export function AiCenterPage() {
    return (
        <div style={{ padding: "40px", maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>AI Center</h1>

            {/* Aki Section */}
            <AiSection
                title="Aki"
                icon="🟣"
                description="Use AI to automatically plan your tasks and manage your integrations."
                enabled
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <AiCard icon="📧" title="Send Aki an Email" description="Send Aki an email to create tasks and events">
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                                <span style={{ opacity: 0.5 }}>Your Aki email:</span>
                                <code style={{ backgroundColor: "#f1f5f9", padding: "4px 8px", borderRadius: 6, fontWeight: 600 }}>aki+m0hckgmnhe@aki.akiflow.com</code>
                                <button style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.3 }}>📋</button>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                                <span style={{ opacity: 0.5 }}>Enabled addresses:</span>
                                <span style={{ fontWeight: 600 }}>francesco@keepproductive.com</span>
                                <button style={{ color: "var(--brand-color)", border: "none", background: "none", fontSize: 13, fontWeight: 600 }}>+ Add</button>
                            </div>
                        </div>
                    </AiCard>

                    <AiCard icon="💬" title="Message Aki on WhatsApp" description="Text and Talk to Aki on WhatsApp">
                        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                            <select style={{ backgroundColor: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                                <option>Select country code</option>
                            </select>
                            <input placeholder="Enter your phone number" style={{ backgroundColor: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 12px", flex: 1, fontSize: 13 }} />
                        </div>
                    </AiCard>

                    <AiCard icon="⚙️" title="AI Workflows" description="Delegate to Aki: AI Workflows and Automations">
                        <button style={{
                            marginTop: 12,
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "1px solid var(--border-color)",
                            backgroundColor: "#fff",
                            fontSize: 13,
                            fontWeight: 600
                        }}>Manage Workflows</button>
                    </AiCard>
                </div>
            </AiSection>

            {/* Auto Assign Section */}
            <AiSection
                title="Auto assign projects"
                icon="✨"
                description="Aki automatically assigns projects to tasks based on content"
            >
                <div style={{ flex: 1, fontSize: 14, opacity: 0.7, lineHeight: 1.6 }}>
                    Akiflow AI automatically assigns your projects to tasks. Your data will only train your private AI model.<br /><br />
                    AI is constantly learning. The more you use Akiflow, the smarter it gets.
                </div>
            </AiSection>

            {/* Energy Profile (Phase 2B) */}
            <AiSection
                title="Energy Profile"
                icon="⚡"
                description="Your 24-hour productivity heatmap — learned from completed tasks"
                enabled
            >
                <EnergyHeatmap />
            </AiSection>

            {/* Profile Settings */}
            <AiSection
                title="Profile Settings"
                icon="👤"
                description="Manage your identity and profile picture."
                enabled
            >
                <ProfileSettings />
            </AiSection>
        </div>
    );
}

function ProfileSettings() {
    const [avatarUrl, setAvatarUrl] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.userMe().then(u => setAvatarUrl(u.avatar_url || "")).catch(() => { });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.userUpdateMe({ avatar_url: avatarUrl });
            window.location.reload(); // Quick way to refresh Header
        } catch (e) {
            console.error(e);
            alert("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AiCard icon="🖼️" title="Profile Picture" description="Paste a link to your avatar image">
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <input
                    placeholder="https://example.com/avatar.png"
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    style={{ backgroundColor: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 12px", flex: 1, fontSize: 13 }}
                />
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        backgroundColor: saving ? "#ccc" : "var(--brand-color)",
                        color: "#fff",
                        border: "none",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: saving ? "default" : "pointer"
                    }}
                >
                    {saving ? "Saving..." : "Save"}
                </button>
            </div>
        </AiCard>
    );
}

function EnergyHeatmap() {
    const [heatmap, setHeatmap] = useState<{ hour: number; label: string; score: number; samples: number }[]>([]);
    const [peakHours, setPeakHours] = useState<number[]>([]);
    const [learning, setLearning] = useState(false);

    const loadProfile = async () => {
        try {
            const res = await api.aiEnergyProfile();
            setHeatmap(res.heatmap);
            setPeakHours(res.peak_hours);
        } catch (e) {
            console.error("Failed to load energy profile", e);
        }
    };

    useEffect(() => { loadProfile(); }, []);

    const handleLearn = async () => {
        setLearning(true);
        try {
            await api.aiLearnEnergy();
            await loadProfile();
        } catch (e) {
            console.error("Learning failed", e);
        } finally {
            setLearning(false);
        }
    };

    const maxScore = Math.max(...heatmap.map(h => h.score), 0.01);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Peak hours:</span>
                {peakHours.length === 0 && <span style={{ fontSize: 12, opacity: 0.5 }}>Not enough data yet</span>}
                {peakHours.map(h => (
                    <span key={h} style={{
                        fontSize: 11, fontWeight: 800,
                        padding: "3px 8px", borderRadius: 6,
                        backgroundColor: "#f5f3ff", color: "#7c3aed",
                    }}>{h.toString().padStart(2, "0")}:00</span>
                ))}
                <button
                    onClick={handleLearn}
                    disabled={learning}
                    style={{
                        marginLeft: "auto",
                        padding: "6px 14px",
                        borderRadius: 8,
                        backgroundColor: learning ? "#e2e8f0" : "#7c3aed",
                        color: learning ? "#64748b" : "#fff",
                        border: "none",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: learning ? "default" : "pointer",
                    }}
                >
                    {learning ? "Learning..." : "🧠 Learn Energy"}
                </button>
            </div>

            {/* 24-hour bar chart */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 100, padding: "0 4px" }}>
                {heatmap.map(h => {
                    const height = Math.max(4, (h.score / maxScore) * 88);
                    const isPeak = peakHours.includes(h.hour);
                    return (
                        <div key={h.hour} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 2 }}
                            title={`${h.label}: ${(h.score * 100).toFixed(0)}% (${h.samples} completions)`}
                        >
                            <div style={{
                                width: "100%",
                                height,
                                borderRadius: "4px 4px 0 0",
                                backgroundColor: isPeak ? "#7c3aed" : h.score > 0 ? "#c4b5fd" : "#e2e8f0",
                                transition: "height 0.3s ease",
                            }} />
                            <span style={{
                                fontSize: 8, fontWeight: isPeak ? 800 : 500,
                                color: isPeak ? "#7c3aed" : "#94a3b8",
                            }}>
                                {h.hour % 3 === 0 ? h.hour.toString().padStart(2, "0") : ""}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function AiSection({ title, beta, icon, description, enabled, children }: any) {
    return (
        <div style={{ backgroundColor: "#fff", borderRadius: 16, border: "1px solid var(--border-color)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid #f8fafc" }}>
                <input type="checkbox" checked={enabled} readOnly style={{ width: 18, height: 18, accentColor: "#10b981" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <span style={{ fontWeight: 700 }}>{title}</span>
                    {beta && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", backgroundColor: "#f3e8ff", color: "#9333ea", borderRadius: 4, textTransform: "uppercase" }}>Beta</span>
                    )}
                </div>
                <div style={{ flex: 1, textAlign: "right", fontSize: 12, opacity: 0.4 }}>{description}</div>
                <button style={{ background: "none", border: "none", fontSize: 12, fontWeight: 700, opacity: 0.5 }}>Guide</button>
            </div>
            <div style={{ padding: "24px" }}>
                {children}
            </div>
        </div>
    );
}

function AiCard({ icon, title, description, children }: any) {
    return (
        <div style={{ padding: "20px", borderRadius: 12, border: "1px solid var(--border-color)", backgroundColor: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
                    <div style={{ fontSize: 13, opacity: 0.5, marginTop: 2 }}>{description}</div>
                </div>
            </div>
            {children}
        </div>
    );
}

