import { useState, useCallback } from "react";
import type { ToastMsg } from "../components/Toast";

export function useToasts() {
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const push = useCallback((text: string, tone: "ok" | "err" = "ok") => {
        setToasts((t) => [...t, { id: Date.now() + Math.random(), text, tone }]);
    }, []);
    const dismiss = useCallback((id: number) => {
        setToasts((t) => t.filter((x) => x.id !== id));
    }, []);
    return { toasts, push, dismiss };
}