const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

function getApiKey(): string | null {
    return localStorage.getItem("QF_API_KEY");
}

export function setApiKey(key: string) {
    localStorage.setItem("QF_API_KEY", key.trim());
}

export function clearApiKey() {
    localStorage.removeItem("QF_API_KEY");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Missing API key");

    const headers: HeadersInit = {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        ...(init.headers || {}),
    };

    const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}

export type Task = {
    id: number;
    user_id: number;
    intent_id: number | null;
    title: string;
    description: string | null;
    status: "open" | "in_progress" | "done";
    priority: string | null;
    due_at: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    deleted_at: string | null;
};

export type TaskList = {
    items: Task[];
    limit: number;
    offset: number;
    total: number;
};

export type AISuggestion = {
    title: string;
    description?: string | null;
    action_type: string;
    payload: Record<string, any>;
    confidence: number;
};

export const api = {
    tasksList: (params: Record<string, string | number | undefined> = {}) => {
        const qs = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
        });
        const q = qs.toString();
        return request<TaskList>(`/v1/tasks${q ? `?${q}` : ""}`);
    },
    taskCreate: (body: { title: string; description?: string; due_at?: string | null; priority?: string | null }) =>
        request<Task>(`/v1/tasks`, { method: "POST", body: JSON.stringify(body) }),
    taskComplete: (id: number) => request<Task>(`/v1/tasks/${id}/complete`, { method: "POST" }),
    taskReopen: (id: number) => request<Task>(`/v1/tasks/${id}/reopen`, { method: "POST" }),
    taskDelete: (id: number) => request<{ status: string }>(`/v1/tasks/${id}`, { method: "DELETE" }),
    taskCreateFromTemplate: (templateId: number) =>
        request<Task>(`/v1/task-templates/${templateId}/create-task`, { method: "POST" }),
    aiSuggest: () => request<AISuggestion[]>(`/v1/ai/suggest`),
};