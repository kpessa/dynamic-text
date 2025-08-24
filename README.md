# TPN Dynamic Text Editor

A specialized web application for creating and testing dynamic text content with TPN (Total Parenteral Nutrition) advisor functions. The editor supports both static HTML content and dynamic JavaScript expressions that can be evaluated in real-time.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server (includes AI API for test generation)
pnpm dev

# The app will be available at http://localhost:5174
```

## Features

### Core Functionality
- **Dual-mode editor**: Create static HTML sections and dynamic JavaScript sections
- **Live preview**: See your content rendered in real-time as you type
- **TPN calculations**: Access TPN values and calculations via `me.getValue(key)`
- **Test cases**: Create and run test cases for your dynamic sections
- **AI-powered test generation**: Generate test cases automatically from your code

### Editor Modes
1. **Static HTML Sections**: Write HTML content with full sanitization
2. **Dynamic JavaScript Sections**: Write JavaScript expressions that get evaluated at runtime
3. **TPN Mode**: Special mode with access to TPN calculation functions

## Basic Usage

### Creating Content

1. **Add a Static HTML Section**:
   - Click "+ Add HTML Section"
   - Type or paste HTML content
   - See it rendered immediately in the preview panel

2. **Add a Dynamic JavaScript Section**:
   - Click "+ Add JavaScript Section"
   - Write JavaScript code that returns a value
   - Use `me.getValue('key')` to access TPN values in TPN mode

### Example: Simple TPN Calculation

```javascript
// In a dynamic section with TPN mode enabled:
const weight = me.getValue('actualBodyWeight');
const proteinNeeds = weight * 1.2;
return `Protein needs: ${proteinNeeds.toFixed(1)} g/day`;
```

### Working with Test Cases

1. In any dynamic section, click "Show Tests"
2. Click "+ Add Test Case"
3. Define test variables and expected output
4. Click "Run" to execute the test

### Exporting Your Work

- Click "Export" in the navbar to copy your content to clipboard
- The exported JSON can be imported into other TPN systems

## TPN Mode

When TPN mode is enabled (via the TPN button in navbar):
- A TPN Test Panel appears with input fields for medical values
- Dynamic sections have access to the `me` object with TPN functions
- Common TPN keys are available via the reference panel

### Available TPN Functions

```javascript
me.getValue(key)           // Get a TPN value
me.ingredients            // Access ingredient data
me.populationType        // Current population type
```

## Firebase Integration (Optional)

The app can optionally connect to Firebase for:
- Saving and loading ingredient references
- Sharing configurations across users
- Version history tracking

To enable Firebase, set the following environment variables:
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## AI Test Generation

To enable AI-powered test generation, add:
```bash
GEMINI_API_KEY=your_gemini_api_key
```

Then use the "Generate Tests" button in any dynamic section.

## Development

### Project Structure
```
src/
├── App.svelte           # Main application component
├── lib/
│   ├── components/      # Reusable UI components
│   ├── services/        # Business logic services
│   ├── stores/          # Svelte stores for state
│   ├── utils/           # Utility functions
│   └── firebase.js      # Firebase configuration
└── api/
    └── generate-tests.js # AI test generation endpoint
```

### Commands
```bash
pnpm dev              # Start full dev server with API
pnpm dev:frontend     # Frontend only (no API)
pnpm build           # Build for production
pnpm preview         # Preview production build
pnpm test            # Run tests
pnpm typecheck       # Check TypeScript
```

## Architecture Highlights

- **Svelte 5** with runes API for reactive state management
- **Web Worker** sandbox for secure code execution
- **CodeMirror 6** for syntax-highlighted editing
- **DOMPurify** for HTML sanitization
- **Babel** (via CDN) for JavaScript transpilation
- **Firebase Firestore** for data persistence
- **Vercel Functions** for serverless API

## Security

- All dynamic code execution happens in a secure Web Worker sandbox
- HTML content is sanitized with DOMPurify
- No patient data is stored or processed
- Firebase authentication uses anonymous sign-in only

## License

Proprietary - All rights reserved