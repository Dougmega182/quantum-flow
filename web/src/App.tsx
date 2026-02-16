import { ApiKeyGate } from "./components/ApiKeyGate";
import { Dashboard } from "./pages/Dashboard";

export default function App() {
  return (
    <ApiKeyGate>
      <Dashboard />
    </ApiKeyGate>
  );
}