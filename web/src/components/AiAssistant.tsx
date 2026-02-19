import { useState, useRef, useEffect } from "react";
import { api } from "../lib/api";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    type?: "text" | "task_card";
    taskData?: any;
}

export function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hello! I'm your Quantum Assistant. How can I help you today?",
            type: "text"
        }
    ]);

    useEffect(() => {
        const loadSuggestions = async () => {
            try {
                const suggestions = await api.aiSuggest();
                if (suggestions.length > 0) {
                    setMessages(prev => [...prev, {
                        id: "sugg-1",
                        role: "assistant",
                        content: "I've found some things that might need your attention. Would you like to review your overdue tasks or prioritize your inbox?",
                        type: "text"
                    }]);
                }
            } catch (e) {
                console.error("Failed to load suggestions", e);
            }
        };
        if (isOpen) loadSuggestions();
    }, [isOpen]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || sending) return;
        const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        const msg = input;
        setInput("");
        setSending(true);

        try {
            const res = await api.aiChat(msg);

            // If the response includes a task card, render it
            if (res.task_card) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: "",
                    type: "task_card",
                    taskData: {
                        title: res.task_card!.title,
                        time: res.task_card!.due_at ? new Date(res.task_card!.due_at).toLocaleString() : "No due date",
                        duration: res.task_card!.duration_minutes ? `${res.task_card!.duration_minutes}m` : "",
                    }
                }]);
            }

            // Schedule preview as a list of task cards
            if (res.schedule_preview && res.schedule_preview.length > 0) {
                for (const item of res.schedule_preview.slice(0, 5)) {
                    setMessages(prev => [...prev, {
                        id: (Date.now() + Math.random()).toString(),
                        role: "assistant",
                        content: "",
                        type: "task_card",
                        taskData: {
                            title: item.title,
                            time: new Date(item.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                            duration: `→ ${new Date(item.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
                        }
                    }]);
                }
            }

            // Main reply text
            setMessages(prev => [...prev, {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: res.reply,
                type: "text"
            }]);
        } catch (e) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "⚠️ Something went wrong. Please try again.",
                type: "text"
            }]);
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, fontFamily: "var(--font-sans)" }}>
            {/* Chat Window */}
            {isOpen && (
                <div style={{
                    position: "absolute",
                    bottom: 80,
                    right: 0,
                    width: 400,
                    height: 600,
                    backgroundColor: "#f8fafc",
                    borderRadius: 24,
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    border: "1px solid rgba(0,0,0,0.05)"
                }}>
                    {/* Messages Area */}
                    <div
                        ref={scrollRef}
                        style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}
                    >
                        {messages.map(msg => (
                            <div key={msg.id} style={{
                                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                                maxWidth: "85%"
                            }}>
                                {msg.type === "task_card" ? (
                                    <div style={{
                                        backgroundColor: "#fff",
                                        padding: "16px",
                                        borderRadius: "16px",
                                        border: "1px solid #e2e8f0",
                                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 12
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #cbd5e1" }} />
                                            <span style={{ fontWeight: 700, fontSize: 15 }}>{msg.taskData.title}</span>
                                        </div>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", backgroundColor: "#f1f5f9", borderRadius: 4, color: "#64748b" }}>{msg.taskData.time}</span>
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", backgroundColor: "#f1f5f9", borderRadius: 4, color: "#64748b" }}>{msg.taskData.duration}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        backgroundColor: msg.role === "user" ? "#fff" : "transparent",
                                        padding: msg.role === "user" ? "12px 16px" : "0",
                                        borderRadius: "16px",
                                        boxShadow: msg.role === "user" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                                        fontSize: 14,
                                        lineHeight: 1.6,
                                        whiteSpace: "pre-wrap",
                                        color: "#1e293b"
                                    }}>
                                        {msg.content}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div style={{ padding: "0 24px 12px 24px", display: "flex", justifyContent: "flex-end" }}>
                        <button style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "6px 12px",
                            backgroundColor: "#fff",
                            borderRadius: 20,
                            border: "1px solid #e2e8f0",
                            color: "#1e293b",
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                        }}>
                            <span style={{ color: "var(--brand-color)" }}>◈</span> Prioritize Inbox tasks
                        </button>
                    </div>

                    {/* Input Area */}
                    <div style={{ padding: "0 24px 24px 24px" }}>
                        <div style={{
                            backgroundColor: "#fff",
                            borderRadius: 28,
                            padding: "6px 6px 6px 20px",
                            display: "flex",
                            alignItems: "center",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                            border: "1px solid #e2e8f0"
                        }}>
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSend()}
                                placeholder="Ask me anything"
                                style={{ flex: 1, border: "none", outline: "none", fontSize: 14 }}
                            />
                            <button
                                onClick={handleSend}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    backgroundColor: "transparent",
                                    color: "var(--brand-color)",
                                    fontSize: 18
                                }}
                            >
                                🎤
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Toggle Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    backgroundColor: isOpen ? "#fff" : "var(--brand-color)",
                    color: isOpen ? "var(--brand-color)" : "#fff",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    fontSize: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: isOpen ? "1px solid var(--border-color)" : "none"
                }}
            >
                {isOpen ? "✕" : "✨"}
            </button>
        </div>
    );
}
