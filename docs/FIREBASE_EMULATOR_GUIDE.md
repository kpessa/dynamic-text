# Firebase Emulator Guide

## Overview

This guide covers the Firebase Emulator setup for local development and testing of the Dynamic Text application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [NPM Scripts](#npm-scripts)
5. [Backup & Restore](#backup--restore)
6. [Testing](#testing)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)
9. [Team Onboarding](#team-onboarding)

## Prerequisites

- Node.js 20+ and pnpm installed
- Firebase CLI installed globally: `npm install -g firebase-tools`
- Java Runtime Environment (JRE) 11+ (required for emulator)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start the emulator with data import
pnpm emulator:start

# 3. In another terminal, start the development server
pnpm dev

# 4. Open http://localhost:5173 and see the emulator indicator
```

## Configuration

### Environment Variables

Create `.env.local` from `.env.emulator`:

```bash
cp .env.emulator .env.local
```

Key variables:
- `VITE_USE_FIREBASE_EMULATOR=true` - Enable emulator mode
- `VITE_FIREBASE_EMULATOR_HOST=localhost` - Emulator host
- `VITE_FIREBASE_FIRESTORE_PORT=8080` - Firestore port
- `VITE_FIREBASE_AUTH_PORT=9099` - Auth port
- `VITE_FIREBASE_UI_PORT=4000` - Emulator UI port

### Firebase Configuration

The `firebase.json` file configures emulator ports and settings:

```json
{
  "emulators": {
    "firestore": { "port": 8080 },
    "auth": { "port": 9099 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

## NPM Scripts

### Emulator Management

```bash
# Start emulator with data import
pnpm emulator:start

# Export current emulator data
pnpm emulator:export

# Clean all emulator data
pnpm emulator:clean

# Create backup of emulator data
pnpm emulator:backup

# Run tests against emulator
pnpm test:emulator
```

### Data Management Scripts

```bash
# Export collection to JSON/CSV
node scripts/firebase-export.js -c ingredients -f json

# Import data from file
node scripts/firebase-import.js -f data.json -c ingredients

# Safe reset collections with backup
node scripts/safe-reset.js -c ingredients
```

## Backup & Restore

### Creating Backups

```bash
# Manual backup with compression
./scripts/firebase-backup.sh --compress

# Automated backup via NPM
pnpm emulator:backup
```

### Restoring from Backup

```bash
# Interactive restore
./scripts/firebase-restore.sh

# Restore specific backup
./scripts/firebase-restore.sh --backup emulator-backup-20250901-120000

# Overwrite existing data
./scripts/firebase-restore.sh --backup <id> --overwrite
```

### Backup Location

Backups are stored in `./backups/` directory with metadata:
- Timestamp
- Document count
- Collections included
- Checksum for validation

## Testing

### Unit Tests with Emulator

```bash
# Run all tests against emulator
pnpm test:emulator

# Run specific test suite
firebase emulators:exec --only firestore,auth "pnpm test:unit"
```

### Integration Tests

```bash
# Run integration tests
pnpm test:unit -- tests/integration/
```

### E2E Tests

```bash
# Start emulator first
pnpm emulator:start

# In another terminal
pnpm test:e2e
```

## CI/CD Integration

### GitHub Actions

The project includes `.github/workflows/ci-emulator.yml` which:
1. Installs Firebase CLI
2. Starts emulator
3. Runs tests in parallel
4. Exports data on failure for debugging

### Environment Setup

```yaml
env:
  VITE_USE_FIREBASE_EMULATOR: 'true'
  VITE_FIREBASE_PROJECT_ID: 'demo-test'
  CI: 'true'
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Check what's using the port
lsof -i :8080

# Kill the process
kill -9 <PID>

# Or use different ports in firebase.json
```

#### Emulator Won't Start

```bash
# Check Java version
java -version  # Should be 11+

# Clear emulator cache
rm -rf ~/.cache/firebase/emulators/

# Re-download emulators
firebase setup:emulators:firestore
```

#### Data Not Persisting

```bash
# Ensure export on exit
pnpm emulator:start  # Includes --export-on-exit

# Manual export before stopping
pnpm emulator:export
```

### Debug Commands

```bash
# Check emulator status
curl http://localhost:8080

# View emulator logs
tail -f firestore-debug.log

# Access Emulator UI
open http://localhost:4000
```

## Team Onboarding

### New Developer Setup

1. **Install Prerequisites**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Verify installation
   firebase --version
   ```

2. **Clone and Setup**
   ```bash
   git clone <repo>
   cd dynamic-text
   pnpm install
   ```

3. **Configure Environment**
   ```bash
   # Copy emulator config
   cp .env.emulator .env.local
   
   # Start emulator
   pnpm emulator:start
   ```

4. **Import Sample Data**
   ```bash
   # Import test data
   node scripts/firebase-import.js -f samples/test-data.json -c ingredients
   ```

5. **Verify Setup**
   - Open http://localhost:5173
   - Check for emulator indicator (bottom right)
   - Open Emulator UI at http://localhost:4000

### Best Practices

1. **Always use emulator for development**
   - Prevents accidental production data changes
   - Faster iteration without network latency
   - Free from quota limits

2. **Regular backups**
   ```bash
   # Before major changes
   pnpm emulator:backup
   
   # End of day
   pnpm emulator:export
   ```

3. **Test data management**
   - Keep test data in `emulator-data/` directory
   - Version control important test scenarios
   - Use `safe-reset.js` for clean slate

4. **Debugging**
   - Use Emulator UI for visual inspection
   - Check console logs in browser
   - Monitor `firestore-debug.log`

### Security Notes

- Emulator has **no security rules** by default in some modes
- Don't use production credentials with emulator
- Emulator data is stored locally - don't commit to git
- Add `.firebase/` and `emulator-data/` to `.gitignore`

## Advanced Usage

### Custom Seed Data

Create `emulator-data/seed.json`:

```json
{
  "ingredients": [
    {
      "id": "test-1",
      "name": "Test Ingredient",
      "content": "Test content"
    }
  ]
}
```

Import on startup:
```bash
firebase emulators:start --import=./emulator-data
```

### Emulator-Only Features

The app shows special UI elements in emulator mode:
- Emulator indicator component
- Debug panel access
- Reset collection buttons
- Performance metrics

### Production Safety

The app automatically detects emulator mode via environment variables:
- Shows warnings in emulator mode
- Prevents accidental production operations
- Different color schemes for visual distinction

## Resources

- [Firebase Emulator Documentation](https://firebase.google.com/docs/emulator-suite)
- [Firestore Emulator Guide](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- [CI/CD with Emulators](https://firebase.google.com/docs/emulator-suite/ci-cd)
- Project Issues: [GitHub Issues](https://github.com/your-repo/issues)