# AI Test Generation Troubleshooting Guide

## Common Issues and Solutions

### 1. 500 Internal Server Error: "Failed to parse AI response"

**Symptoms:**
- Error message: "Failed to parse AI response"
- HTTP 500 status code
- Console shows JSON parsing errors

**Causes:**
- Gemini AI returning malformed JSON
- Complex code causing AI to generate invalid test syntax
- API response exceeding size limits

**Solutions:**
1. **Simplify your code**: Try testing with simpler JavaScript code first
2. **Check the AI response**: Look at the "AI Response" tab in the AIWorkflowInspector to see the raw response
3. **Retry**: Sometimes the AI generates better responses on subsequent attempts
4. **Use fallback tests**: The system now provides basic fallback tests when parsing fails

### 2. 404 Not Found Error

**Symptoms:**
- Error: "API endpoint not found"
- 404 status code

**Cause:**
- Running frontend-only development server

**Solution:**
- Use `pnpm dev` instead of `pnpm run dev:frontend`
- This starts the Vercel dev server with API support

### 3. "AI service not configured" Error

**Symptoms:**
- Error message about missing GEMINI_API_KEY

**Solution:**
1. Copy `.env.local.example` to `.env.local`
2. Add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```
3. Get a free API key from https://ai.google.dev/
4. Restart the development server

### 4. CORS Errors

**Symptoms:**
- Browser console shows CORS policy errors

**Solution:**
- Make sure you're accessing the app via `localhost` not `127.0.0.1`
- The API now includes proper CORS headers

### 5. Timeout Errors

**Symptoms:**
- Request takes too long and times out

**Causes:**
- Very complex code requiring extensive analysis
- Slow API response from Gemini

**Solution:**
- Reduce the complexity of the code being tested
- Try testing smaller sections at a time

## Development Tips

### Local Development
```bash
# Start with full API support (recommended)
pnpm dev

# Frontend only (AI features disabled)
pnpm run dev:frontend
```

### Production URLs
- Main app: https://dynamic-text-beta.vercel.app
- API endpoint: https://dynamic-text-beta.vercel.app/api/generate-tests

### Debugging

1. **Check Browser Console**: Look for detailed error messages
2. **Use AIWorkflowInspector**: It shows detailed request/response information
3. **Check Network Tab**: Inspect the actual API request and response
4. **Server Logs**: When running locally, check terminal output for server-side errors

### Best Practices

1. **Start Simple**: Test with basic code before complex examples
2. **Use Valid Variable Names**: Stick to standard JavaScript variable naming
3. **Provide Context**: Include comments in your code to help the AI understand intent
4. **Check JSON Syntax**: If you see parsing errors, the AI might be generating invalid JSON

## Environment Setup

### Required Environment Variables
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### Vercel Deployment
1. Set environment variables in Vercel dashboard
2. Ensure the API directory is included in deployment
3. Check function logs in Vercel dashboard for errors