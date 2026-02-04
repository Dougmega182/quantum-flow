import { useState } from "react";
import { setApiKey, clearApiKey } from "../lib/api";

export function ApiKeyGate(props: { children: React.ReactNode }) {
    const [key, setKey] = useState(localStorage.getItem("QF_API_KEY") || "");
    const [saved, setSaved] = useState(Boolean(localStorage.getItem("QF_API_KEY")));

    if (!saved) {
        return (
            <div style={{ maxWidth: 560, margin: "48px auto", fontFamily: "system-ui" }}>
                <h2>Quantum Flow</h2>
                <p>Enter your API key to use the app.</p>
                <input
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="X-API-Key"
                    style={{ width: "100%", padding: 12, fontSize: 16 }}
                />
                <button
                    onClick={() => {
                        setApiKey(key);
                        setSaved(true);
                    }}
                    style={{ marginTop: 12, padding: "10px 14px" }}
                >
                    Save
                </button>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: "system-ui" }}>
            <div style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                <button
                    onClick={() => {
                        clearApiKey();
                        setSaved(false);
                        setKey("");
                    }}
                >
                    Sign out (clear key)
                </button>
            </div>
            {props.children}
        </div>
    );
}