import { useState, useEffect } from "react";
import { api, type Project } from "../lib/api";

interface ProjectVaultProps {
    projectId: number;
}

export function ProjectVault({ projectId }: ProjectVaultProps) {
    const [project, setProject] = useState<Project | null>(null);
    const [content, setContent] = useState("");
    const [backlinks, setBacklinks] = useState<Project[]>([]);
    const [saving, setSaving] = useState(false);
    const [view, setView] = useState<"edit" | "preview">("edit");

    useEffect(() => {
        async function load() {
            try {
                const [p, bl] = await Promise.all([
                    api.projectGet(projectId),
                    api.projectBacklinks(projectId)
                ]);
                setProject(p);
                setContent(p.content || "");
                setBacklinks(bl);
            } catch (e) {
                console.error("Failed to load project", e);
            }
        }
        load();
    }, [projectId]);

    const handleSave = async () => {
        if (!project) return;
        setSaving(true);
        try {
            const updated = await api.projectUpdate(project.id, { content });
            setProject(updated);
            // Refresh backlinks too in case something changed
            const bl = await api.projectBacklinks(projectId);
            setBacklinks(bl);
        } catch (e) {
            alert("Failed to save project");
        } finally {
            setSaving(false);
        }
    };

    const handleExport = () => {
        window.open(`${import.meta.env.VITE_API_BASE_URL}projects/${projectId}/export`, "_blank");
    };

    const renderPreview = (text: string) => {
        if (!text) return "No content yet.";

        // Simple WikiLink parser: [[Name]]
        const parts = text.split(/(\[\[.*?\]\])/g);
        return parts.map((part, i) => {
            if (part.startsWith("[[") && part.endsWith("]]")) {
                const name = part.slice(2, -2);
                return (
                    <span key={i} style={{ color: "var(--brand-color)", fontWeight: 600, borderBottom: "1px dashed var(--brand-color)", cursor: "pointer" }}>
                        {name}
                    </span>
                );
            }
            return part;
        });
    };

    if (!project) return <div style={{ padding: 40, opacity: 0.5 }}>Loading vault...</div>;

    return (
        <div style={{ height: "100%", display: "flex", gap: 20 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 32 }}>{project.emoji || "🚀"}</span>
                        <h2 style={{ fontSize: 28, fontWeight: 800 }}>{project.name}</h2>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ display: "flex", backgroundColor: "#f1f5f9", padding: 4, borderRadius: 8, gap: 4 }}>
                            <button
                                onClick={() => setView("edit")}
                                style={{
                                    padding: "6px 12px", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                                    backgroundColor: view === "edit" ? "#fff" : "transparent",
                                    color: view === "edit" ? "#000" : "#64748b",
                                    boxShadow: view === "edit" ? "0 2px 4px rgba(0,0,0,0.05)" : "none"
                                }}
                            >
                                Write
                            </button>
                            <button
                                onClick={() => setView("preview")}
                                style={{
                                    padding: "6px 12px", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                                    backgroundColor: view === "preview" ? "#fff" : "transparent",
                                    color: view === "preview" ? "#000" : "#64748b",
                                    boxShadow: view === "preview" ? "0 2px 4px rgba(0,0,0,0.05)" : "none"
                                }}
                            >
                                Preview
                            </button>
                        </div>
                        <button
                            onClick={handleExport}
                            style={{
                                padding: "6px 16px",
                                backgroundColor: "#f1f5f9",
                                color: "#000",
                                border: "none",
                                borderRadius: 8,
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: "pointer"
                            }}
                        >
                            Export .md
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                padding: "6px 16px",
                                backgroundColor: "var(--brand-color)",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: "pointer",
                                opacity: saving ? 0.7 : 1
                            }}
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, backgroundColor: "#fff", border: "1px solid var(--border-color)", borderRadius: 16, overflow: "hidden", display: "flex" }}>
                    {view === "edit" ? (
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="# Start writing your project notes in Markdown..."
                            style={{
                                width: "100%",
                                height: "100%",
                                border: "none",
                                padding: 32,
                                fontSize: 16,
                                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                                lineHeight: 1.6,
                                resize: "none",
                                outline: "none"
                            }}
                        />
                    ) : (
                        <div style={{ padding: 40, overflowY: "auto", width: "100%", lineHeight: 1.6 }}>
                            <div style={{ maxWidth: 800, margin: "0 auto" }}>
                                <div style={{ whiteSpace: "pre-wrap" }}>{renderPreview(content)}</div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ fontSize: 11, opacity: 0.4, display: "flex", justifyContent: "flex-end" }}>
                    Last saved: {new Date(project.updated_at).toLocaleTimeString()}
                </div>
            </div>

            {/* Backlinks Sidebar */}
            <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", opacity: 0.6 }}>Backlinks</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {backlinks.length > 0 ? backlinks.map(bl => (
                        <div key={bl.id} style={{
                            padding: "12px",
                            backgroundColor: "#f8fafc",
                            borderRadius: 8,
                            border: "1px solid #f1f5f9",
                            cursor: "pointer",
                            fontSize: 13,
                        }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>{bl.name}</div>
                            <div style={{ opacity: 0.5, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {bl.content?.substring(0, 50)}...
                            </div>
                        </div>
                    )) : (
                        <div style={{ fontSize: 12, opacity: 0.4, fontStyle: "italic" }}>No backlinks yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
