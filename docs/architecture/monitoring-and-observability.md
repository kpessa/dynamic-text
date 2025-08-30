# Monitoring and Observability

## Monitoring Stack

- **Frontend Monitoring:** Vercel Analytics (Core Web Vitals, custom events)
- **Backend Monitoring:** Vercel Functions logs and metrics
- **Error Tracking:** Console logging with structured format (consider Sentry for production)
- **Performance Monitoring:** Lighthouse CI in GitHub Actions

## Key Metrics

**Frontend Metrics:**
- Core Web Vitals (LCP, FID, CLS)
- JavaScript errors rate
- API response times (p50, p95, p99)
- User interactions (section creates, test runs, saves)

**Backend Metrics:**
- Request rate by endpoint
- Error rate (4xx, 5xx)
- Response time percentiles
- Database query performance
- AI API latency
