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
    labels: string | null;
    tags: string | null;
    due_at: string | null;
    duration_minutes: number | null;
    parent_id: number | null;
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

export type TaskTemplate = {
    id: number;
    user_id: number;
    title: string;
    description: string | null;
    intent_id: number | null;
    priority: string | null;
    default_due_days: number | null;
    created_at: string;
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
    taskCreate: (body: { title: string; description?: string; due_at?: string | null; priority?: string | null; labels?: string; tags?: string; duration_minutes?: number; parent_id?: number }) =>
        request<Task>(`/v1/tasks`, { method: "POST", body: JSON.stringify(body) }),
    taskUpdate: (id: number, body: Partial<{ title: string; description: string; due_at: string; priority: string; labels: string; tags: string; status: string; duration_minutes: number; parent_id: number }>) =>
        request<Task>(`/v1/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    taskComplete: (id: number) => request<Task>(`/v1/tasks/${id}/complete`, { method: "POST" }),
    taskReopen: (id: number) => request<Task>(`/v1/tasks/${id}/reopen`, { method: "POST" }),
    taskDelete: (id: number) => request<{ status: string }>(`/v1/tasks/${id}`, { method: "DELETE" }),

    // Templates
    templateList: () => request<TaskTemplate[]>(`/v1/task-templates`),
    templateCreate: (body: { title: string; description?: string; priority?: string; default_due_days?: number }) =>
        request<TaskTemplate>(`/v1/task-templates`, { method: "POST", body: JSON.stringify(body) }),
    templateDelete: (id: number) => request<{ status: string }>(`/v1/task-templates/${id}`, { method: "DELETE" }),
    taskCreateFromTemplate: (templateId: number) =>
        request<Task>(`/v1/task-templates/${templateId}/create-task`, { method: "POST" }),

    // Recurrence
    recurrenceList: () => request<RecurrenceRule[]>(`/v1/recurrence`),
    recurrenceCreate: (body: { template_id: number; freq: string; interval?: number; byweekday?: string }) =>
        request<RecurrenceRule>(`/v1/recurrence`, { method: "POST", body: JSON.stringify(body) }),
    recurrenceDelete: (id: number) => request<{ status: string }>(`/v1/recurrence/${id}`, { method: "DELETE" }),
    recurrenceMaterialize: () => request<{ created: number }>(`/v1/recurrence/materialize`, { method: "POST" }),

    // Integrations
    googleAuthUrl: () => request<{ url: string }>(`/v1/google-calendar/auth-url`),
    googleStatus: () => request<{ status: string; has_token: boolean }>(`/v1/google-calendar/status`),
    googlePull: () => request<{ fetched: number; synced: number }>(`/v1/google-calendar/pull`, { method: "POST" }),
    googlePush: () => request<{ pushed: number }>(`/v1/google-calendar/push`, { method: "POST" }),

    // Automations
    automationList: () => request<Automation[]>(`/v1/automations`),
    automationCreate: (body: Partial<Automation>) => request<Automation>(`/v1/automations`, { method: "POST", body: JSON.stringify(body) }),
    automationUpdate: (id: number, body: Partial<Automation>) => request<Automation>(`/v1/automations/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    automationDelete: (id: number) => request<{ status: string }>(`/v1/automations/${id}`, { method: "DELETE" }),
    automationRun: (id: number) => request<AutomationRun>(`/v1/automations/${id}/run`, { method: "POST" }),
    automationRunAll: () => request<AutomationRun[]>(`/v1/automations/run-all`, { method: "POST" }),

    aiSuggest: () => request<AISuggestion[]>(`/v1/ai/suggest`),
};

export type RecurrenceRule = {
    id: number;
    user_id: number;
    template_id: number;
    freq: "daily" | "weekly" | "monthly";
    interval: number;
    byweekday: string | null;
    created_at: string;
    last_materialized_at: string | null;
};

export type Automation = {
    id: number;
    user_id: number;
    name: string;
    description: string | null;
    trigger_type: string;
    trigger_config: string | null;
    action_type: string;
    action_config: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
};

export type AutomationRun = {
    id: number;
    automation_id: number;
    status: "success" | "error";
    message: string | null;
    executed_at: string;
};