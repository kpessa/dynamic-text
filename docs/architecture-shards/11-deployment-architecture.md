# 11. Deployment Architecture

## Infrastructure
```yaml
Hosting: Vercel
  - Static site hosting
  - Edge functions
  - Preview deployments
  
Database: Firebase
  - Firestore database
  - Authentication service
  - Cloud Storage (future)
  
CDN: Vercel Edge Network
  - Global distribution
  - Asset caching
  - Edge middleware
```

## CI/CD Pipeline
```yaml
# GitHub Actions Workflow
on: [push, pull_request]
jobs:
  test:
    - pnpm install
    - pnpm test:unit
    - pnpm test:e2e
  
  build:
    - pnpm build
    - Check bundle size
    
  deploy:
    - Vercel deployment
    - Run smoke tests
```
