import { ApiKeyGate } from "./components/ApiKeyGate";
import { TasksPage } from "./pages/Tasks";
import { SuggestionsPage } from "./pages/Suggestions";
import { TemplatesPage } from "./pages/Templates";
import { RecurrencePage } from "./pages/Recurrence";
import { IntegrationsPage } from "./pages/Integrations";
import { AutomationsPage } from "./pages/Automations";
import { useState } from "react";

export default function App() {
  const [tab, setTab] = useState<"tasks" | "ai" | "templates" | "recurrence" | "integrations" | "automations">("tasks");

  return (
    <ApiKeyGate>
      <div style={{ maxWidth: 860, margin: "12px auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setTab("tasks")}>Tasks</button>
        <button onClick={() => setTab("templates")}>Templates</button>
        <button onClick={() => setTab("recurrence")}>Recurrence</button>
        <button onClick={() => setTab("integrations")}>Integrations</button>
        <button onClick={() => setTab("automations")}>Automations</button>
        <button onClick={() => setTab("ai")}>AI</button>
      </div>

      {tab === "tasks" ? (
        <TasksPage />
      ) : tab === "templates" ? (
        <TemplatesPage />
      ) : tab === "recurrence" ? (
        <RecurrencePage />
      ) : tab === "integrations" ? (
        <IntegrationsPage />
      ) : tab === "automations" ? (
        <AutomationsPage />
      ) : (
        <SuggestionsPage />
      )}
    </ApiKeyGate>
  );
}