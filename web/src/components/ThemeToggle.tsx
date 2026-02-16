import { useState, useEffect } from "react";

export function ThemeToggle() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("theme") || "light";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
    };

    useEffect(() => {
        const savedColor = localStorage.getItem("accent_color");
        if (savedColor) {
            document.documentElement.style.setProperty("--brand-color", savedColor);
        }
    }, []);

    return (
        <button
            onClick={toggleTheme}
            style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                padding: "8px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-main)"
            }}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
            {theme === "light" ? "🌙" : "☀️"}
        </button>
    );
}
