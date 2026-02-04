import { ApiKeyGate } from "./components/ApiKeyGate";
import { TasksPage } from "./pages/Tasks";
import { SuggestionsPage } from "./pages/Suggestions";
import { useState } from "react";

export default function App() {
  const [tab, setTab] = useState<"tasks" | "ai">("tasks");

  return (
    <ApiKeyGate>
      <div style={{ maxWidth: 860, margin: "12px auto", display: "flex", gap: 8 }}>
        <button onClick={() => setTab("tasks")}>Tasks</button>
        <button onClick={() => setTab("ai")}>AI</button>
      </div>

      {tab === "tasks" ? <TasksPage /> : <SuggestionsPage />}
    </ApiKeyGate>
  );
}