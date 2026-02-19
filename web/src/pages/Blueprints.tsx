import { useState, useEffect } from "react";
import { api } from "../lib/api";

type Step = {
    title: string;
    order: number;
    duration_minutes: number;
    energy_level: string;
    depends_on_step?: number;
};

type Blueprint = {
    id: number;
    title: string;
    description: string | null;
    category: string | null;
    steps: Step[];
    is_builtin: boolean;
};

const categoryColors: Record<string, string> = {
    Engineering: "#3b82f6",
    Productivity: "#22c55e",
    Marketing: "#f59e0b",
    Operations: "#8b5cf6",
};

export function BlueprintsPage() {
    const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBp, setSelectedBp] = useState<Blueprint | null>(null);
    const [instantiating, setInstantiating] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    useEffect(() => {
        api.blueprintList().then(res => {
            setBlueprints(res);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const handleInstantiate = async (bp: Blueprint) => {
        setInstantiating(true);
        setResult(null);
        try {
            const res = await api.blueprintInstantiate(bp.id);
            setResult(res.message);
            setTimeout(() => setResult(null), 4000);
        } catch (e) {
            setResult("Failed to instantiate blueprint.");
        } finally {
            setInstantiating(false);
        }
    };

    if (loading) return <div style={{ padding: 40 }}>Loading blueprints...</div>;

    return (
        <div style={{ padding: "0", maxWidth: 1100, display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>📋 Workflow Blueprints</h2>
                {result && (
                    <span style={{
                        padding: "6px 14px", borderRadius: 8,
                        backgroundColor: "#f0fdf4", color: "#22c55e",
                        fontSize: 12, fontWeight: 700,
                    }}>✅ {result}</span>
                )}
            </div>

            {/* Gallery Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {blueprints.map(bp => (
                    <div
                        key={bp.id}
                        onClick={() => setSelectedBp(selectedBp?.id === bp.id ? null : bp)}
                        style={{
                            backgroundColor: "#fff", borderRadius: 16, padding: 20,
                            border: selectedBp?.id === bp.id ? "2px solid #7c3aed" : "1px solid #e2e8f0",
                            boxShadow: selectedBp?.id === bp.id ? "0 0 0 3px rgba(124,58,237,0.1)" : "0 2px 4px rgba(0,0,0,0.02)",
                            cursor: "pointer", transition: "all 0.15s ease",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                            <span style={{ fontSize: 20 }}>
                                {bp.category === "Engineering" ? "⚙️" : bp.category === "Marketing" ? "📣" : bp.category === "Productivity" ? "🎯" : "📦"}
                            </span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{bp.title}</div>
                                <div style={{ fontSize: 11, opacity: 0.5 }}>{bp.steps.length} steps · {bp.steps.reduce((s, st) => s + st.duration_minutes, 0)} min total</div>
                            </div>
                            {bp.category && (
                                <span style={{
                                    fontSize: 10, fontWeight: 800, padding: "3px 8px",
                                    borderRadius: 6, textTransform: "uppercase",
                                    backgroundColor: (categoryColors[bp.category] || "#94a3b8") + "15",
                                    color: categoryColors[bp.category] || "#94a3b8",
                                }}>{bp.category}</span>
                            )}
                        </div>
                        <p style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.5, marginBottom: 12 }}>
                            {bp.description}
                        </p>

                        {/* Expanded Step List */}
                        {selectedBp?.id === bp.id && (
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, marginBottom: 8, textTransform: "uppercase" }}>Steps</div>
                                {bp.steps.sort((a, b) => a.order - b.order).map((step, i) => (
                                    <div key={i} style={{
                                        display: "flex", alignItems: "center", gap: 8,
                                        padding: "8px 10px", borderRadius: 8,
                                        backgroundColor: i % 2 === 0 ? "#f8fafc" : "transparent",
                                        fontSize: 12,
                                    }}>
                                        <span style={{
                                            width: 20, height: 20, borderRadius: "50%",
                                            backgroundColor: "#f3e8ff", color: "#7c3aed",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 10, fontWeight: 800, flexShrink: 0,
                                        }}>{step.order}</span>
                                        <span style={{ flex: 1, fontWeight: 500 }}>{step.title}</span>
                                        <span style={{ opacity: 0.4, fontSize: 10 }}>{step.duration_minutes}m</span>
                                        <span style={{
                                            fontSize: 9, fontWeight: 700, padding: "2px 5px",
                                            borderRadius: 4, textTransform: "uppercase",
                                            backgroundColor: step.energy_level === "high" ? "#fef2f2" : step.energy_level === "low" ? "#f0f9ff" : "#f5f3ff",
                                            color: step.energy_level === "high" ? "#ef4444" : step.energy_level === "low" ? "#3b82f6" : "#7c3aed",
                                        }}>{step.energy_level}</span>
                                        {step.depends_on_step && (
                                            <span style={{ fontSize: 9, opacity: 0.3 }}>← {step.depends_on_step}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={(e) => { e.stopPropagation(); handleInstantiate(bp); }}
                            disabled={instantiating}
                            style={{
                                width: "100%", padding: "10px", borderRadius: 10,
                                backgroundColor: instantiating ? "#e2e8f0" : "#7c3aed",
                                color: instantiating ? "#64748b" : "#fff",
                                border: "none", fontSize: 13, fontWeight: 700,
                                cursor: instantiating ? "default" : "pointer",
                            }}
                        >
                            {instantiating ? "Creating tasks..." : "🚀 Use This Blueprint"}
                        </button>
                    </div>
                ))}
            </div>

            {blueprints.length === 0 && (
                <div style={{ padding: 48, textAlign: "center", opacity: 0.5, fontSize: 14 }}>
                    No blueprints yet. They'll appear after the first server startup seeds them.
                </div>
            )}
        </div>
    );
}
