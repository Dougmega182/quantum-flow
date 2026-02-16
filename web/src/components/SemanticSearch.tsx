import { useState } from "react";
import { api } from "../lib/api";

export function SemanticSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<{ tasks: any[], projects: any[] } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        try {
            const res = await (api as any).semanticSearch(query);
            setResults(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "24px", maxWidth: 800, margin: "0 auto" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Conceptual Search</h2>
            <p style={{ opacity: 0.6, marginBottom: 24 }}>Find tasks and projects by meaning, not just keywords.</p>

            <form onSubmit={handleSearch} style={{ display: "flex", gap: 12, marginBottom: 32 }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. 'What should I do for the frontend redesign?'"
                    style={{
                        flex: 1,
                        padding: "16px 24px",
                        borderRadius: 16,
                        border: "1px solid var(--border-color)",
                        fontSize: 16,
                        outline: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                    }}
                />
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: "0 32px",
                        backgroundColor: "var(--brand-color)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 16,
                        fontWeight: 700,
                        cursor: "pointer",
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? "Searching..." : "Search"}
                </button>
            </form>

            {results && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div>
                        <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", opacity: 0.5, marginBottom: 16 }}>Tasks</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {results.tasks.length > 0 ? results.tasks.map(t => (
                                <div key={t.id} style={{ padding: 16, backgroundColor: "#fff", borderRadius: 12, border: "1px solid var(--border-color)" }}>
                                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                                </div>
                            )) : <div style={{ opacity: 0.4, fontSize: 12 }}>No matching tasks found.</div>}
                        </div>
                    </div>
                    <div>
                        <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", opacity: 0.5, marginBottom: 16 }}>Projects</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {results.projects.length > 0 ? results.projects.map(p => (
                                <div key={p.id} style={{ padding: 16, backgroundColor: "#fff", borderRadius: 12, border: "1px solid var(--border-color)" }}>
                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                </div>
                            )) : <div style={{ opacity: 0.4, fontSize: 12 }}>No matching projects found.</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
