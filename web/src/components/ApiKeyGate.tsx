import { useState, createContext, useContext } from "react";
import { setApiKey, clearApiKey } from "../lib/api";

const LogoutContext = createContext<() => void>(() => { });
export const useLogout = () => useContext(LogoutContext);

export function ApiKeyGate(props: { children: React.ReactNode }) {
    const [key, setKey] = useState(localStorage.getItem("QF_API_KEY") || "");
    const [saved, setSaved] = useState(Boolean(localStorage.getItem("QF_API_KEY")));

    const handleLogout = () => {
        clearApiKey();
        setSaved(false);
        setKey("");
    };

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
        <LogoutContext.Provider value={handleLogout}>
            <div style={{ display: "flex", flex: 1, height: "100vh", width: "100vw", overflow: "hidden" }}>
                {props.children}
            </div>
        </LogoutContext.Provider>
    );
}
