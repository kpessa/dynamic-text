# Playwright MCP Setup Guide

## Installation Complete ✅

The Playwright MCP (Model Context Protocol) server has been successfully installed and configured for this project.

### What Was Installed

1. **Chromium Browser**: Installed via `pnpm exec playwright install chromium`
   - Location: `~/.cache/ms-playwright/chromium-1181`
   - Version: Compatible with Playwright 1.54.2

2. **Playwright MCP Package**: `@playwright/mcp@0.0.34`
   - Provides the MCP server for browser automation
   - Binary: `mcp-server-playwright`

3. **Updated Permissions**: Added to `.claude/settings.local.json`
   - `"Bash(pnpm exec playwright:*)"`
   - `"Bash(pnpm exec @playwright/mcp:*)"`

### Available Scripts

The following npm scripts have been added to `package.json`:

```bash
# Install/update browsers
pnpm run playwright:install

# Start MCP server (for debugging)
pnpm run playwright:mcp

# Run tests with visible browser
pnpm run test:browser

# Run interactive tests
pnpm run test:interactive
```

## Using Playwright MCP

### Option 1: Through Test Scripts (Working ✅)

Create and run Playwright test scripts as demonstrated:
```bash
pnpm test:e2e
pnpm test:interactive
```

### Option 2: Direct MCP Server Usage

To use the MCP server directly, you need to configure it to use Chromium instead of Chrome:

```bash
# Start MCP server with Chromium
pnpm exec mcp-server-playwright --browser chromium

# With additional options
pnpm exec mcp-server-playwright \
  --browser chromium \
  --headless \
  --allowed-origins "http://localhost:5173"
```

### Option 3: Configure Claude's MCP Settings

To enable direct browser control from Claude, the MCP configuration needs to be updated to use Chromium. This requires modifying Claude's internal MCP settings to specify `--browser chromium` as an argument.

## Current Status

- ✅ **Chromium browser installed and working**
- ✅ **MCP server package installed**
- ✅ **Permissions configured**
- ✅ **Test scripts working**
- ⚠️  **Direct MCP browser control**: Requires Chrome or configuration update

## Troubleshooting

### Error: "Chrome not found"
The MCP tools default to Chrome. Solutions:
1. Install Chrome: `pnpm exec playwright install chrome` (requires sudo)
2. Use Chromium in test scripts (recommended)
3. Configure MCP to use Chromium via arguments

### Browser Installation Issues
If you encounter permission errors:
```bash
# Install without system dependencies
pnpm exec playwright install chromium

# List installed browsers
pnpm exec playwright install --list
```

## Testing the Setup

Run the interactive test to verify everything works:
```bash
pnpm run test:interactive
```

This will:
- Launch Chromium browser
- Navigate to the app
- Take screenshots
- Test interactions
- Generate performance metrics

## Next Steps

For full direct browser control from Claude's MCP tools:
1. Install Chrome browser (requires system permissions)
2. OR configure Claude's MCP client to pass `--browser chromium` flag
3. OR use the test script approach which is currently working

The current setup fully supports browser automation through Playwright test scripts, which provides the same functionality as direct MCP control.