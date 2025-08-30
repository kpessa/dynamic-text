# Deployment Architecture

## Deployment Strategy

**Frontend Deployment:**
- **Platform:** Vercel Edge Network
- **Build Command:** `pnpm build`
- **Output Directory:** `dist`
- **CDN/Edge:** Automatic edge caching via Vercel

**Backend Deployment:**
- **Platform:** Vercel Serverless Functions
- **Build Command:** Automatic (Vercel detects `/api` folder)
- **Deployment Method:** Git push triggers deployment

## CI/CD Pipeline

```yaml
# .github/workflows/deploy.yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm test:e2e
        env:
          CI: true
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Environments

| Environment | Frontend URL | Backend URL | Purpose |
|------------|--------------|-------------|---------|
| Development | http://localhost:5173 | http://localhost:3000/api | Local development |
| Staging | https://tpn-editor-staging.vercel.app | https://tpn-editor-staging.vercel.app/api | Pre-production testing |
| Production | https://tpn-editor.vercel.app | https://tpn-editor.vercel.app/api | Live environment |
