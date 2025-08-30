# Appendices

## A. File Structure
```
dynamic-text/
├── src/
│   ├── App.svelte
│   ├── main.ts
│   ├── app.css
│   └── lib/
│       ├── components/
│       ├── services/
│       ├── stores/
│       └── utils/
├── api/
│   └── generate-tests.ts
├── docs/
│   ├── architecture.md
│   ├── prd.md
│   └── stories/
├── tests/
│   ├── unit/
│   └── e2e/
└── public/
    └── assets/
```

## B. Configuration Files
- `vite.config.ts` - Build configuration
- `tailwind.config.js` - Styling configuration
- `tsconfig.json` - TypeScript configuration
- `playwright.config.ts` - E2E test configuration
- `.env` - Environment variables

## C. Development Commands
```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm test:unit    # Run unit tests
pnpm test:e2e     # Run E2E tests
pnpm preview      # Preview build
```

---

**Document Status:** COMPLETE  
**Next Review:** After refactoring completion  
**Maintained By:** Architecture Team