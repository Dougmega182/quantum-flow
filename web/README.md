# Quantum Flow Web

A React-based frontend for the Quantum Flow intent and task management service.

## Features

- **Multi-Tab Navigation**: Tasks, Templates, Recurrence, Integrations, Automations, AI.
- **Real-time Feedback**: Toast notifications for all actions.
- **API Connectivity**: Integrated with the FastAPI backend via a unified `api.ts` client.
- **Type Safety**: Fully typed with TypeScript.

## Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Ensure `web/.env` contains the backend URL:
   ```
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Start Dev Server**:
   ```bash
   npm run dev
   ```

## Production

Build the assets for deployment:
```bash
npm run build
```
The output will be in the `dist` folder, ready to be served by Nginx.
