import { useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { TasksPage } from "./Tasks";
import { IntegrationsPage } from "./Integrations";
import { AutomationsPage } from "./Automations";
import { SuggestionsPage } from "./Suggestions";
import { AnalyticsPage } from "./Analytics";
import { TemplatesPage } from "./Templates";
import { RecurrencePage } from "./Recurrence";
import { TaskEditor } from "../components/TaskEditor";
import { CommandBar } from "../components/CommandBar";
import { FocusModePage } from "./FocusMode";
import { CalendarView } from "./Calendar";
import { HelpPage } from "./Help";
import { api, type Task, type SmartScheduleItem } from "../lib/api";
import { useEffect } from "react";
import { Header } from "../components/Header";
import { AiAssistant } from "../components/AiAssistant";
import { AiCenterPage } from "./AiCenter";
import { PlanningWizard } from "./PlanningWizard";
import { KanbanPage } from "./Kanban";
import { ProjectVault } from "./ProjectVault";
import { GraphView } from "../components/GraphView";
import { WeeklyReview } from "./WeeklyReview";
import { SemanticSearch } from "../components/SemanticSearch";

export function Dashboard() {
    const [activeTab, setTab] = useState<any>("today");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [showCommandBar, setShowCommandBar] = useState(false);
    const [scheduledItems, setScheduledItems] = useState<SmartScheduleItem[]>([]);
    const [isPlanning, setIsPlanning] = useState(false);

    // Custom Lists State (Still in localStorage for now, but Projects moved to DB)
    const [lists, setLists] = useState<{ id: string, label: string, icon: string }[]>(() => {
        const saved = localStorage.getItem("qf_custom_lists");
        return saved ? JSON.parse(saved) : [
            { id: "list:Work", label: "Work", icon: "💼" },
            { id: "list:Home", label: "Home", icon: "🏠" },
        ];
    });

    // Projects State (DB Backed - Phase 11)
    const [projects, setProjects] = useState<any[]>([]);

    const refreshProjects = async () => {
        try {
            const res = await api.projectList();
            // Map backend Project to Sidebar expected format if needed
            setProjects(res.items.map(p => ({
                id: `proj:${p.id}`,
                label: p.name,
                icon: p.emoji || "🚀",
                rawId: p.id
            })));
        } catch (e) {
            console.error("Failed to load projects", e);
        }
    };

    useEffect(() => {
        refreshProjects();
    }, []);

    useEffect(() => {
        localStorage.setItem("qf_custom_lists", JSON.stringify(lists));
    }, [lists]);

    const handleAddList = () => {
        const name = prompt("List name:");
        if (name) setLists([...lists, { id: `list:${name}`, label: name, icon: "📁" }]);
    };

    const handleDeleteList = (id: string) => {
        if (confirm(`Delete list "${id.replace("list:", "")}"?`)) {
            setLists(lists.filter(l => l.id !== id));
            if (activeTab === id) setTab("today");
        }
    };

    const handleAddProject = async () => {
        const name = prompt("Project name:");
        if (name) {
            try {
                await api.projectCreate({ name, emoji: "🚀" });
                refreshProjects();
            } catch (e) {
                alert("Failed to create project");
            }
        }
    };

    const handleDeleteProject = async (id: string) => {
        const rawId = projects.find(p => p.id === id)?.rawId;
        if (!rawId) return;

        if (confirm(`Delete project "${id.replace("proj:", "")}"?`)) {
            try {
                await api.projectDelete(rawId);
                refreshProjects();
                if (activeTab === id) setTab("today");
            } catch (e) {
                alert("Failed to delete project");
            }
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "k") {
                e.preventDefault();
                setShowCommandBar(true);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleCommand = (action: string) => {
        setShowCommandBar(false);
        if (action === "today") setTab("today");
        if (action === "inbox") setTab("tasks");
        if (action === "focus") setTab("focus");
    };

    const handleAutoPlan = async () => {
        setIsPlanning(true);
        try {
            const res = await api.aiSmartSchedule();
            setScheduledItems(res.items);
        } catch (e) {
            console.error("Planning failed", e);
        } finally {
            setIsPlanning(false);
        }
    };

    const renderContent = (onTaskClick: (t: Task) => void) => {
        if (activeTab.startsWith("proj:")) {
            const id = parseInt(activeTab.split(":")[1]);
            return <ProjectVault projectId={id} />;
        }

        if (activeTab.startsWith("list:")) {
            const label = activeTab.split(":")[1];
            return <TasksPage view="" label={label} onTaskSelect={onTaskClick} />;
        }

        switch (activeTab) {
            case "tasks":
                return <TasksPage view="inbox" onTaskSelect={onTaskClick} />;
            case "today":
            case "overdue":
            case "upcoming":
            case "all":
            case "someday":
                return <TasksPage view={activeTab === "all" ? "" : activeTab} onTaskSelect={onTaskClick} />;
            case "templates": return <TemplatesPage />;
            case "recurrence": return <RecurrencePage />;
            case "integrations": return <IntegrationsPage />;
            case "automations": return <AutomationsPage />;
            case "ai": return <SuggestionsPage />;
            case "analytics": return <AnalyticsPage />;
            case "focus": return <FocusModePage />;
            case "calendar": return <CalendarView />;
            case "help": return <HelpPage />;
            case "ai_center": return <AiCenterPage />;
            case "kanban": return <KanbanPage />;
            case "graph": return <GraphView />;
            case "review": return <WeeklyReview />;
            case "search": return <SemanticSearch />;
            case "planning": return <PlanningWizard onComplete={() => setTab("today")} />;
            default: return <TasksPage onTaskSelect={onTaskClick} />;
        }
    };

    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [contextWidth, setContextWidth] = useState(400);
    const [resizing, setResizing] = useState<"sidebar" | "context" | null>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (resizing === "sidebar") {
                const newWidth = e.clientX;
                if (newWidth > 150 && newWidth < 500) setSidebarWidth(newWidth);
            } else if (resizing === "context") {
                const newWidth = window.innerWidth - e.clientX;
                if (newWidth > 200 && newWidth < 800) setContextWidth(newWidth);
            }
        };
        const handleMouseUp = () => setResizing(null);

        if (resizing) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [resizing]);

    return (
        <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", overflow: "hidden" }}>
            {showCommandBar && <CommandBar onClose={() => setShowCommandBar(false)} onAction={handleCommand} />}

            <Header onTabSelect={setTab} />

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                {/* Column 1: Side Navigation */}
                <div style={{
                    width: sidebarWidth,
                    display: "flex",
                    flexDirection: "column",
                    borderRight: "1px solid var(--border-color)",
                    flexShrink: 0,
                    position: "relative"
                }}>
                    <Sidebar
                        activeTab={activeTab}
                        setTab={setTab}
                        lists={lists}
                        projects={projects}
                        onAddList={handleAddList}
                        onDeleteList={handleDeleteList}
                        onAddProject={handleAddProject}
                        onDeleteProject={handleDeleteProject}
                    />

                    {/* Resize Handle */}
                    <div
                        onMouseDown={() => setResizing("sidebar")}
                        style={{
                            position: "absolute",
                            top: 0,
                            right: -4,
                            width: 8,
                            height: "100%",
                            cursor: "col-resize",
                            zIndex: 100,
                            backgroundColor: resizing === "sidebar" ? "var(--brand-color)" : "transparent",
                            transition: "background-color 0.2s"
                        }}
                    />
                </div>

                {/* Column 2: Main Content Area (Tasks) */}
                <main style={{
                    flex: 1,
                    backgroundColor: "var(--bg-app)",
                    padding: "32px",
                    overflowY: "auto",
                    borderRight: "1px solid var(--border-color)",
                    minWidth: 350
                }}>
                    {renderContent((t) => setSelectedTask(t))}
                </main>

                {/* Column 3: Context Pane (Calendar or Editor) */}
                <aside style={{
                    width: contextWidth,
                    backgroundColor: "#fff",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    boxShadow: "-4px 0 20px rgba(0,0,0,0.01)",
                    flexShrink: 0,
                    position: "relative",
                    overflowY: "auto"
                }}>
                    {/* Resize Handle (Left of Aside) */}
                    <div
                        onMouseDown={() => setResizing("context")}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: -4,
                            width: 8,
                            height: "100%",
                            cursor: "col-resize",
                            zIndex: 100,
                            backgroundColor: resizing === "context" ? "var(--brand-color)" : "transparent",
                            transition: "background-color 0.2s"
                        }}
                    />
                    {selectedTask ? (
                        <TaskEditor
                            task={selectedTask}
                            onClose={() => setSelectedTask(null)}
                            onUpdate={() => {
                                // Update logic
                            }}
                        />
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 800 }}>Schedule — Feb 16</h3>
                                <button
                                    onClick={handleAutoPlan}
                                    disabled={isPlanning}
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: "4px 10px",
                                        borderRadius: 6,
                                        border: "none",
                                        backgroundColor: "var(--brand-color)",
                                        color: "#fff",
                                        cursor: "pointer",
                                        opacity: isPlanning ? 0.5 : 1
                                    }}
                                >
                                    {isPlanning ? "Planning..." : "Auto Plan"}
                                </button>
                            </div>

                            {/* Integrated Planning View (Side-by-side) */}
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, position: "relative", overflowY: "auto" }}>
                                {Array.from({ length: 15 }, (_, i) => {
                                    const hour = i + 8; // 8am to 10pm
                                    return (
                                        <div
                                            key={hour}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = "move";
                                                e.currentTarget.style.backgroundColor = "#f8fafc";
                                            }}
                                            onDragLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "transparent";
                                            }}
                                            onDrop={async (e) => {
                                                e.preventDefault();
                                                e.currentTarget.style.backgroundColor = "transparent";
                                                const data = e.dataTransfer.getData("application/json");
                                                if (data) {
                                                    const task = JSON.parse(data);
                                                    const newDate = new Date();
                                                    newDate.setHours(hour, 0, 0, 0);
                                                    await api.taskUpdate(task.id, {
                                                        due_at: newDate.toISOString(),
                                                        status: "open"
                                                    });
                                                    setTab("today"); // Force refresh
                                                }
                                            }}
                                            style={{ height: 60, borderTop: "1px solid #f0f0f0", position: "relative", transition: "background 0.2s" }}
                                        >
                                            <div style={{ position: "absolute", top: -8, left: 0, fontSize: 11, opacity: 0.3, fontWeight: 700 }}>
                                                {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Render Auto-Planned Items */}
                                {scheduledItems.map((item, idx) => {
                                    const start = new Date(item.start_time);
                                    const hour = start.getHours();
                                    const minutes = start.getMinutes();
                                    const top = (hour - 8) * 60 + minutes;
                                    const height = item.duration_minutes;

                                    return (
                                        <div key={item.task_id} style={{
                                            position: "absolute",
                                            top: top,
                                            left: 40,
                                            right: 0,
                                            height: height,
                                            backgroundColor: idx % 2 === 0 ? "var(--brand-light)" : "#f0f7ff",
                                            borderLeft: `4px solid ${idx % 2 === 0 ? "var(--brand-color)" : "#3b82f6"}`,
                                            borderRadius: "0 8px 8px 0",
                                            padding: "8px 12px",
                                            fontSize: 12,
                                            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                                            zIndex: 10,
                                            overflow: "hidden"
                                        }}>
                                            <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                                <div style={{ opacity: 0.6, fontSize: 10 }}>
                                                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                {(item as any).rationale && (
                                                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--brand-color)", backgroundColor: "rgba(255,255,255,0.5)", padding: "1px 4px", borderRadius: 4 }}>
                                                        ✨ {(item as any).rationale}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </aside>

                <AiAssistant />
            </div>
        </div>
    );
}
