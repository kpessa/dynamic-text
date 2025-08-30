# External APIs

## Google Gemini API
- **Purpose:** Generate intelligent test cases for dynamic JavaScript sections
- **Documentation:** https://ai.google.dev/gemini-api/docs
- **Base URL(s):** https://generativelanguage.googleapis.com/v1beta
- **Authentication:** API Key (GEMINI_API_KEY environment variable)
- **Rate Limits:** 60 requests per minute (free tier)

**Key Endpoints Used:**
- `POST /models/gemini-pro:generateContent` - Generate test cases from code analysis

**Integration Notes:** Called via Vercel serverless function to protect API key. Responses are parsed and formatted into TestCase objects. Fallback to manual test creation if service unavailable.

## Firebase Services API
- **Purpose:** Authentication and real-time data persistence
- **Documentation:** https://firebase.google.com/docs/web
- **Base URL(s):** Project-specific Firebase endpoints
- **Authentication:** Firebase SDK handles auth automatically
- **Rate Limits:** 10K writes/day (free tier), unlimited reads

**Key Endpoints Used:**
- Firestore CRUD operations via SDK
- Auth operations via SDK

**Integration Notes:** SDK-based integration, no direct HTTP calls. Offline persistence enabled for resilience.

## Babel Standalone CDN
- **Purpose:** Transpile modern JavaScript to browser-compatible code
- **Documentation:** https://babeljs.io/docs/babel-standalone
- **Base URL(s):** https://unpkg.com/@babel/standalone@7.28.2/babel.min.js
- **Authentication:** None (public CDN)
- **Rate Limits:** None (CDN cached)

**Key Endpoints Used:**
- Direct script loading from CDN

**Integration Notes:** Lazy-loaded only when user creates dynamic sections. Cached in browser for performance.
