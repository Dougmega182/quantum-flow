import { useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { TasksPage } from "./Tasks";
import { IntegrationsPage } from "./Integrations";
import { AutomationsPage } from "./Automations";
import { SuggestionsPage } from "./Suggestions";
import { TemplatesPage } from "./Templates";
import { RecurrencePage } from "./Recurrence";
import { TaskEditor } from "../components/TaskEditor";
import type { Task } from "../lib/api";

export function Dashboard() {
    const [activeTab, setTab] = useState<any>("today");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const renderContent = (onTaskClick: (t: Task) => void) => {
        switch (activeTab) {
            case "tasks":
            case "today":
            case "someday":
            case "all":
            case "overdue":
            case "upcoming":
                return <TasksPage view={activeTab === "tasks" ? "" : activeTab} onTaskSelect={onTaskClick} />;
            case "templates": return <TemplatesPage />;
            case "recurrence": return <RecurrencePage />;
            case "integrations": return <IntegrationsPage />;
            case "automations": return <AutomationsPage />;
            case "ai": return <SuggestionsPage />;
            default: return <TasksPage onTaskSelect={onTaskClick} />;
        }
    };

    return (
        <div style={{ display: "flex", width: "100%", height: "100vh" }}>
            {/* Column 1: Side Navigation */}
            <Sidebar activeTab={activeTab} setTab={setTab} />

            {/* Column 2: Main Content Area (Tasks) */}
            <main style={{
                flex: 1,
                backgroundColor: "var(--bg-app)",
                padding: "32px",
                overflowY: "auto",
                borderRight: "1px solid var(--border-color)"
            }}>
                {renderContent((t) => setSelectedTask(t))}
            </main>

            {/* Column 3: Context Pane (Calendar or Editor) */}
            <aside style={{
                width: 380,
                backgroundColor: "#fff",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                boxShadow: "-1px 0 10px rgba(0,0,0,0.02)"
            }}>
                {selectedTask ? (
                    <TaskEditor
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        onUpdate={() => {
                            // Trigger refresh? We'd ideally use a global context or event emitter
                            // For now, it will update when Dashboard is re-rendered or TasksPage refreshes itself
                        }}
                    />
                ) : (
                    <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ fontSize: 16 }}>February 2026</h3>
                        </div>

                        {/* Mock Calendar Grid */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(7, 1fr)",
                            gap: 4,
                            fontSize: 12,
                            textAlign: "center"
                        }}>
                            {["S", "M", "T", "W", "T", "F", "S"].map(d => (
                                <div key={d} style={{ fontWeight: 600, opacity: 0.5, padding: 4 }}>{d}</div>
                            ))}
                            {Array.from({ length: 28 }, (_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        padding: 8,
                                        borderRadius: 4,
                                        backgroundColor: i + 1 === 13 ? "var(--brand-color)" : "transparent",
                                        color: i + 1 === 13 ? "#fff" : "inherit",
                                        cursor: "pointer"
                                    }}
                                >
                                    {i + 1}
                                </div>
                            ))}
                        </div>

                        <div style={{ height: 1, backgroundColor: "var(--border-color)" }} />

                        <div>
                            <h4 style={{ fontSize: 13, marginBottom: 12, opacity: 0.7 }}>Schedule</h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <div style={{ padding: 12, borderRadius: 8, fontSize: 13, backgroundColor: "var(--brand-light)", borderLeft: "4px solid var(--brand-color)" }}>
                                    <div style={{ fontWeight: 600 }}>Google Calendar Sync</div>
                                    <div style={{ opacity: 0.7 }}>09:00 - 10:00</div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </aside>
        </div>
    );
}
