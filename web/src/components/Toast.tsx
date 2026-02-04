import { useEffect } from "react";

export type ToastMsg = { id: number; text: string; tone?: "ok" | "err" };

export function Toast({ msg, onDone }: { msg: ToastMsg; onDone: (id: number) => void }) {
    useEffect(() => {
        const t = setTimeout(() => onDone(msg.id), 2500);
        return () => clearTimeout(t);
    }, [msg, onDone]);
    const color = msg.tone === "err" ? "#b00020" : "#0a8f08";
    return (
        <div style={{ background: color, color: "#fff", padding: "10px 12px", borderRadius: 6, marginTop: 8 }}>
            {msg.text}
        </div>
    );
}