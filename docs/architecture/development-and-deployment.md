# Development and Deployment

## Local Development Setup

1.  Run `pnpm install` to install dependencies.
2.  Create a `.env` file with Firebase and Gemini API keys.
3.  Run `pnpm dev` to start the Vite development server.

## Build and Deployment Process

- **Build Command**: `pnpm build` (uses Vite).
- **Deployment**: The presence of `vercel.json` and the `vercel` dependency suggests the project is deployed on the Vercel platform. Deployment is likely handled automatically via Vercel's Git integration.
