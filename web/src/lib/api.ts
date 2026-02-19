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
    depends_on_id: number | null;
    energy_level: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    deleted_at: string | null;
};

export interface Project {
    id: number;
    user_id: number;
    name: string;
    content: string | null;
    emoji: string | null;
    created_at: string;
    updated_at: string;
}

export interface TaskList {
    items: Task[];
    limit: number;
    offset: number;
    total: number;
}

export interface ProjectList {
    items: Project[];
    total: number;
}

export type AISuggestion = {
    title: string;
    description?: string | null;
    action_type: string;
    payload: Record<string, any>;
    confidence: number;
};

export type SmartScheduleItem = {
    task_id: number;
    title: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
};

export type SmartScheduleResponse = {
    items: SmartScheduleItem[];
    message: string;
};

export type AutoPlanItem = {
    task_id: number;
    title: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    block_label: string | null;
    rationale: string | null;
};

export type AutoPlanResponse = {
    items: AutoPlanItem[];
    message: string;
    total_focus_minutes: number;
};

export type RescheduleItem = {
    task_id: number;
    title: string;
    old_due: string | null;
    new_due: string;
    rationale: string;
};

export type RescheduleResponse = {
    items: RescheduleItem[];
    message: string;
};

export type Nudge = {
    type: string;
    message: string;
    task_id: number | null;
    action_type: string;
    severity: string;
};

export type ChatAction = {
    type: string;
    task_id?: number | null;
    detail?: string | null;
};

export type ChatResponse = {
    reply: string;
    actions: ChatAction[];
    task_card?: { id: number; title: string; due_at?: string | null; status?: string; duration_minutes?: number } | null;
    schedule_preview?: { task_id: number; title: string; start_time: string; end_time: string }[] | null;
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
    taskCreate: (body: { title: string; description?: string; due_at?: string | null; priority?: string | null; labels?: string; tags?: string; duration_minutes?: number; parent_id?: number; depends_on_id?: number | null; energy_level?: string }) =>
        request<Task>(`/v1/tasks`, { method: "POST", body: JSON.stringify(body) }),
    taskUpdate: (id: number, body: Partial<{ title: string; description: string; due_at: string; priority: string; labels: string; tags: string; status: string; duration_minutes: number; parent_id: number; depends_on_id: number | null; energy_level: string }>) =>
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
    gmailPull: () => request<{ fetched: number; synced: number }>(`/v1/google-calendar/pull-gmail`, { method: "POST" }),
    googlePush: () => request<{ pushed: number }>(`/v1/google-calendar/push`, { method: "POST" }),

    // Automations
    automationList: () => request<Automation[]>(`/v1/automations`),
    automationCreate: (body: Partial<Automation>) => request<Automation>(`/v1/automations`, { method: "POST", body: JSON.stringify(body) }),
    automationUpdate: (id: number, body: Partial<Automation>) => request<Automation>(`/v1/automations/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    automationDelete: (id: number) => request<{ status: string }>(`/v1/automations/${id}`, { method: "DELETE" }),
    automationRun: (id: number) => request<AutomationRun>(`/v1/automations/${id}/run`, { method: "POST" }),
    automationRunAll: () => request<AutomationRun[]>(`/v1/automations/run-all`, { method: "POST" }),

    aiSuggest: () => request<AISuggestion[]>(`/v1/ai/suggest`),
    aiSmartSchedule: () => request<{ items: SmartScheduleItem[] }>("/v1/ai/smart-schedule", { method: "POST" }),
    aiAutoPlan: () => request<AutoPlanResponse>(`/v1/ai/auto-plan`, { method: "POST" }),
    aiReschedule: () => request<RescheduleResponse>(`/v1/ai/reschedule`, { method: "POST" }),
    aiNudges: () => request<Nudge[]>(`/v1/ai/nudges`),
    aiChat: (message: string) => request<ChatResponse>(`/v1/ai/chat`, { method: "POST", body: JSON.stringify({ message }) }),

    // Energy Profile (Phase 2B)
    aiLearnEnergy: () => request<{ message: string; updated: number }>(`/v1/ai/learn-energy`, { method: "POST" }),
    aiEnergyProfile: () => request<{ heatmap: { hour: number; label: string; score: number; samples: number }[]; peak_hours: number[]; total_samples: number }>(`/v1/ai/energy-profile`),

    // Milestones (Phase 2C)
    milestoneList: (projectId?: number) => request<any[]>(`/v1/milestones${projectId ? `?project_id=${projectId}` : ""}`),
    milestoneCreate: (body: { project_id: number; title: string; due_at?: string }) =>
        request<any>(`/v1/milestones`, { method: "POST", body: JSON.stringify(body) }),
    milestoneUpdate: (id: number, body: { title?: string; due_at?: string }) =>
        request<any>(`/v1/milestones/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    milestoneComplete: (id: number) => request<any>(`/v1/milestones/${id}/complete`, { method: "POST" }),
    milestoneDelete: (id: number) => request<{ status: string }>(`/v1/milestones/${id}`, { method: "DELETE" }),

    // Team (Phase 3A)
    teamMembers: () => request<any[]>(`/v1/team/members`),
    teamCreateMember: (body: { name: string; email: string; role?: string; capacity_hours_per_day?: number }) =>
        request<any>(`/v1/team/members`, { method: "POST", body: JSON.stringify(body) }),
    teamUpdateMember: (id: number, body: Record<string, any>) =>
        request<any>(`/v1/team/members/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    teamDeleteMember: (id: number) => request<{ status: string }>(`/v1/team/members/${id}`, { method: "DELETE" }),
    teamWorkload: () => request<any[]>(`/v1/team/workload`),
    teamSuggestAssignments: () => request<{ suggestions: any[]; message: string }>(`/v1/team/suggest-assignments`, { method: "POST" }),
    teamAssign: (taskId: number, memberId: number) =>
        request<any>(`/v1/team/assign?task_id=${taskId}&member_id=${memberId}`, { method: "POST" }),

    // Blueprints (Phase 3B)
    blueprintList: (category?: string) => request<any[]>(`/v1/blueprints${category ? `?category=${category}` : ""}`),
    blueprintGet: (id: number) => request<any>(`/v1/blueprints/${id}`),
    blueprintCreate: (body: { title: string; description?: string; category?: string; steps?: any[] }) =>
        request<any>(`/v1/blueprints`, { method: "POST", body: JSON.stringify(body) }),
    blueprintInstantiate: (id: number) =>
        request<{ blueprint: string; tasks_created: number; tasks: any[]; message: string }>(`/v1/blueprints/${id}/instantiate`, { method: "POST" }),
    blueprintDelete: (id: number) => request<{ status: string }>(`/v1/blueprints/${id}`, { method: "DELETE" }),

    // Subtasks
    taskSubtasks: (id: number) => request<TaskList>(`/v1/tasks/${id}/subtasks`),
    taskCreateSubtask: (parentId: number, body: { title: string; description?: string; priority?: string; duration_minutes?: number; energy_level?: string }) =>
        request<Task>(`/v1/tasks/${parentId}/subtasks`, { method: "POST", body: JSON.stringify(body) }),

    // Projects (Phase 11)
    projectList: () => request<ProjectList>("projects"),
    projectGet: (id: number) => request<Project>(`projects/${id}`),
    projectCreate: (data: Partial<Project>) => request<Project>("projects", { method: "POST", body: JSON.stringify(data) }),
    projectUpdate: (id: number, data: Partial<Project>) => request<Project>(`projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    projectDelete: (id: number) => request<{ status: string }>(`projects/${id}`, { method: "DELETE" }),
    projectBacklinks: (id: number) => request<Project[]>(`projects/${id}/backlinks`),
    projectGraphData: () => request<{ nodes: any[], links: any[] }>("projects/graph/data"),
    semanticSearch: (q: string) => request<{ tasks: any[], projects: any[] }>(`/v1/search/semantic?q=${encodeURIComponent(q)}`),

    // Notifications (Phase 4A)
    notificationList: (unreadOnly?: boolean) =>
        request<{ notifications: any[]; unread_count: number }>(`/v1/notifications${unreadOnly ? "?unread_only=true" : ""}`),
    notificationMarkRead: (id?: number) =>
        request<{ marked: number }>(`/v1/notifications/mark-read`, { method: "POST", body: JSON.stringify(id ? { notification_id: id } : {}) }),
    notificationGenerateDigest: () => request<any>(`/v1/notifications/generate-digest`, { method: "POST" }),

    analyticsStats: () => request<{
        total_tasks: number;
        completed_tasks: number;
        completion_rate: number;
        energy_distribution: Record<string, number>;
        weekly_focus: Record<string, number>;
    }>(`/v1/analytics/stats`),
    analyticsDeep: () => request<{
        streaks: { current: number; best: number };
        velocity: { trend: { date: string; count: number }[]; avg_per_day: number };
        priority_breakdown: Record<string, number>;
        avg_completion_hours: number;
        comparison: { this_week: number; last_week: number; change_pct: number };
    }>(`/v1/analytics/deep`),

    // User Profile
    userMe: () => request<{ id: number; email: string; avatar_url: string | null }>(`/v1/users/me`),
    userUpdateMe: (body: { avatar_url: string }) => request<{ id: number; email: string; avatar_url: string | null }>(`/v1/users/me`, { method: "PATCH", body: JSON.stringify(body) }),
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