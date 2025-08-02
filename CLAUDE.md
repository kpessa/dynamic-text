# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dynamic Text Editor - A specialized web application for creating and testing dynamic text content with TPN (Total Parenteral Nutrition) advisor functions. The editor supports both static HTML content and dynamic JavaScript expressions that can be evaluated in real-time.

## Commands

### Development
- `pnpm dev` - Start Vercel development server with both frontend and AI API functions (**Recommended**)
- `pnpm run dev:frontend` - Start Vite development server (frontend only, AI features disabled)
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build locally

### AI Test Generation API
This project includes Vercel serverless functions for AI-powered test generation:
- **Local Development**: Use `pnpm dev` (default) to enable API functions during development
- **Production API**: Available at `https://dynamic-text-beta.vercel.app/api/generate-tests`
- **Dependencies**: Requires Google Gemini API key set in environment variables (`GEMINI_API_KEY`)
- **Configuration**: API settings in `api/generate-tests.js` and `vercel.json`
- **Error Handling**: Frontend components provide helpful messages when API is unavailable

### Package Management
This project uses pnpm. If pnpm is not available, npm can be used as a fallback.

## Architecture

This is a Svelte 5 single-page application built with Vite. Key architectural points:

### Technology Stack
- **Svelte 5.35+** - Using modern runes API (`$state`, `$derived`, etc.)
- **Vite 7** - Build tool providing fast HMR and optimized production builds
- **ES Modules** - Project uses native ES module syntax
- **CodeMirror 6** - Code editor for HTML and JavaScript content
- **Babel Standalone** - Runtime JavaScript transpilation for dynamic code execution
- **DOMPurify** - HTML sanitization for secure content rendering

### Core Features
1. **Dual Mode Editor**: Supports both static HTML sections and dynamic JavaScript sections
2. **TPN Mode**: Special mode for testing TPN advisor functions with mock data
3. **Live Preview**: Real-time rendering of content with HTML sanitization
4. **Test Cases**: Dynamic sections can have multiple test cases with different variable values
5. **Export Functionality**: Generate JSON output compatible with TPN configurator format

### Project Structure
- `src/` - Application source code
  - `main.js` - Entry point that mounts the Svelte app
  - `App.svelte` - Root component managing sections, preview, and TPN mode
  - `lib/` - Reusable components directory
    - `CodeEditor.svelte` - CodeMirror wrapper for code editing
    - `Sidebar.svelte` - Reference management sidebar
    - `TPNTestPanel.svelte` - TPN value input panel
    - `TPNKeyReference.svelte` - TPN key reference panel
    - `tpnLegacy.js` - Legacy TPN advisor function support
- `public/` - Static files served directly

### Component Architecture
- **App.svelte**: Main orchestrator handling section management, test cases, and state
- **CodeEditor**: Wraps CodeMirror with language-specific syntax highlighting
- **Sidebar**: Manages saving/loading of reference documents
- **TPN Components**: Provide TPN-specific functionality when in TPN mode

### Dynamic Code Execution
- JavaScript code is transpiled using Babel before execution
- Code runs in a sandboxed environment with access to a `me` object
- In TPN mode, `me` provides access to TPN values via `getValue()` and formatting via `maxP()`

### Svelte 5 Runes
This project uses Svelte 5's new runes API. When creating or modifying components:
- Use `$state()` for reactive state instead of `let`
- Use `$derived()` for computed values
- Use `$effect()` for side effects instead of `$:`

### Styling
- Global styles in `src/app.css`
- Component styles use scoped `<style>` blocks
- CSS supports custom properties and includes dark/light theme variables
- Preview panel forces light theme for content display

### Development Notes
- Type checking is enabled for JavaScript files (`checkJs: true`)
- No testing framework is currently configured
- No linting or formatting tools are set up
- Drag-and-drop functionality for reordering sections
- LocalStorage used for persisting references