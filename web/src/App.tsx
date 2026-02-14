import { ApiKeyGate } from "./components/ApiKeyGate";
import { Dashboard } from "./pages/Dashboard";
import { CommandBar } from "./components/CommandBar";

export default function App() {
  return (
    <ApiKeyGate>
      <Dashboard />
      <CommandBar />
    </ApiKeyGate>
  );
}