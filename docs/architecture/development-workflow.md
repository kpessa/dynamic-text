# Development Workflow

## Local Development Setup

### Prerequisites
```bash
# Required tools
node --version  # v18+ required
pnpm --version  # v8+ required
git --version   # For version control
```

### Initial Setup
```bash
# Clone repository
git clone https://github.com/yourorg/tpn-dynamic-text-editor.git
cd tpn-dynamic-text-editor

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Configure Firebase credentials in .env
# VITE_FIREBASE_API_KEY=your-api-key
# VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
# VITE_FIREBASE_PROJECT_ID=your-project-id
# VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
# VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
# VITE_FIREBASE_APP_ID=your-app-id
# GEMINI_API_KEY=your-gemini-api-key
```

### Development Commands
```bash
# Start all services
pnpm dev              # Frontend at http://localhost:5173

# Start frontend only
pnpm dev:client       # Just the Svelte app

# Start backend only (if needed for testing)
pnpm dev:api          # Vercel functions locally

# Run tests
pnpm test            # Unit tests with Vitest
pnpm test:e2e        # E2E tests with Playwright
pnpm test:coverage   # Generate coverage report
```

## Environment Configuration

### Required Environment Variables
```bash
# Frontend (.env.local)
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_API_URL=http://localhost:3000/api  # Local API

# Backend (.env)
GEMINI_API_KEY=xxx
FIREBASE_ADMIN_KEY=xxx  # For server-side auth

# Shared
NODE_ENV=development
```
