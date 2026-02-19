import { useState, useEffect } from "react";
import { api } from "../lib/api";

type TeamMember = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    capacity_hours_per_day: number;
    avatar_url: string | null;
};

type WorkloadEntry = {
    member: TeamMember;
    task_count: number;
    allocated_hours: number;
    capacity_hours: number;
    utilization_pct: number;
    status: "overloaded" | "balanced" | "available";
};

type Suggestion = {
    task_id: number;
    task_title: string;
    task_priority: string | null;
    suggested_member_id: number;
    suggested_member_name: string;
    rationale: string;
};

export function TeamWorkloadPage() {
    const [workload, setWorkload] = useState<WorkloadEntry[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newRole, setNewRole] = useState("");

    const fetchData = async () => {
        try {
            const wl = await api.teamWorkload();
            setWorkload(wl);
        } catch (e) {
            console.error("Failed to load workload", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddMember = async () => {
        if (!newName || !newEmail) return;
        try {
            await api.teamCreateMember({ name: newName, email: newEmail, role: newRole || undefined });
            setNewName(""); setNewEmail(""); setNewRole(""); setShowAddForm(false);
            fetchData();
        } catch (e) {
            console.error("Failed to add member", e);
        }
    };

    const handleSuggest = async () => {
        try {
            const res = await api.teamSuggestAssignments();
            setSuggestions(res.suggestions);
        } catch (e) {
            console.error("Failed to get suggestions", e);
        }
    };

    const handleApplyAssignment = async (taskId: number, memberId: number) => {
        try {
            await api.teamAssign(taskId, memberId);
            setSuggestions(prev => prev.filter(s => s.task_id !== taskId));
            fetchData();
        } catch (e) {
            console.error("Failed to assign", e);
        }
    };

    const statusColors: Record<string, string> = {
        overloaded: "#ef4444",
        balanced: "#22c55e",
        available: "#3b82f6",
    };

    if (loading) return <div style={{ padding: 40 }}>Loading team workload...</div>;

    return (
        <div style={{ padding: "0", maxWidth: 1100, display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>👥 Team Workload</h2>
                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        style={{
                            padding: "8px 16px", borderRadius: 10,
                            backgroundColor: "#f8fafc", border: "1px solid #e2e8f0",
                            fontSize: 13, fontWeight: 700, cursor: "pointer",
                        }}
                    >+ Add Member</button>
                    <button
                        onClick={handleSuggest}
                        style={{
                            padding: "8px 16px", borderRadius: 10,
                            backgroundColor: "#7c3aed", color: "#fff", border: "none",
                            fontSize: 13, fontWeight: 700, cursor: "pointer",
                        }}
                    >🤖 AI Suggest</button>
                </div>
            </div>

            {/* Add Member Form */}
            {showAddForm && (
                <div style={{ display: "flex", gap: 8, padding: 16, backgroundColor: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)}
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    <input placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    <input placeholder="Role (optional)" value={newRole} onChange={e => setNewRole(e.target.value)}
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    <button onClick={handleAddMember} style={{
                        padding: "8px 16px", borderRadius: 8, backgroundColor: "#22c55e",
                        color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    }}>Save</button>
                </div>
            )}

            {/* Workload Grid */}
            {workload.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", opacity: 0.5, fontSize: 14 }}>
                    No team members yet. Add your first team member above.
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320, 1fr))", gap: 16 }}>
                    {workload.map(w => (
                        <div key={w.member.id} style={{
                            backgroundColor: "#fff", borderRadius: 16, padding: 20,
                            border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: "50%",
                                    backgroundColor: "#f3e8ff", display: "flex",
                                    alignItems: "center", justifyContent: "center",
                                    fontSize: 18, fontWeight: 800, color: "#7c3aed",
                                }}>
                                    {w.member.avatar_url ? (
                                        <img src={w.member.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: "50%" }} />
                                    ) : w.member.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>{w.member.name}</div>
                                    <div style={{ fontSize: 11, opacity: 0.5 }}>{w.member.role || w.member.email}</div>
                                </div>
                                <span style={{
                                    marginLeft: "auto",
                                    fontSize: 10, fontWeight: 800,
                                    padding: "3px 8px", borderRadius: 6,
                                    backgroundColor: statusColors[w.status] + "15",
                                    color: statusColors[w.status],
                                    textTransform: "uppercase",
                                }}>{w.status}</span>
                            </div>

                            {/* Utilization Bar */}
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600 }}>{w.task_count} tasks</span>
                                    <span style={{ opacity: 0.5 }}>{w.allocated_hours}h / {w.capacity_hours}h</span>
                                </div>
                                <div style={{ height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{
                                        height: "100%", borderRadius: 4,
                                        width: `${Math.min(w.utilization_pct, 100)}%`,
                                        backgroundColor: statusColors[w.status],
                                        transition: "width 0.3s ease",
                                    }} />
                                </div>
                                <div style={{ fontSize: 10, textAlign: "right", marginTop: 2, opacity: 0.4 }}>
                                    {w.utilization_pct}% utilized
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Assignment Suggestions */}
            {suggestions.length > 0 && (
                <div style={{ backgroundColor: "#f8fafc", borderRadius: 16, padding: 20, border: "1px solid #e2e8f0" }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🤖 Assignment Suggestions</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {suggestions.map(s => (
                            <div key={s.task_id} style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "12px 16px", backgroundColor: "#fff", borderRadius: 10,
                                border: "1px solid #e2e8f0",
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.task_title}</div>
                                    <div style={{ fontSize: 11, opacity: 0.5 }}>→ {s.suggested_member_name} · {s.rationale}</div>
                                </div>
                                {s.task_priority && (
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                                        backgroundColor: s.task_priority === "high" ? "#fef2f2" : "#f0fdf4",
                                        color: s.task_priority === "high" ? "#ef4444" : "#22c55e",
                                    }}>{s.task_priority}</span>
                                )}
                                <button
                                    onClick={() => handleApplyAssignment(s.task_id, s.suggested_member_id)}
                                    style={{
                                        padding: "6px 12px", borderRadius: 8,
                                        backgroundColor: "#22c55e", color: "#fff",
                                        border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
                                    }}
                                >Assign</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
