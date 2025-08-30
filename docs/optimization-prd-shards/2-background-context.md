# 2. Background & Context

## Project History
- **Initial Development:** Rapid prototyping approach to validate concept
- **Feature Expansion:** 50+ features added over multiple sprints
- **Current State:** Feature-complete but technically debt-laden
- **Recovery Status:** Recently stabilized on `recovery/stable-baseline` branch

## Technical Debt Inventory
| Component | Current Lines | Target | Impact Level |
|-----------|--------------|--------|--------------|
| Sidebar.svelte | 4,165 | <500 | Critical |
| App.svelte | 3,556 | <500 | Critical |
| IngredientManager | 2,354 | <500 | High |
| IngredientDiffViewer | 2,285 | <500 | High |
| Test Coverage | 3% | 80% | Critical |

## Why Now?
- Feature development velocity has dropped 70% due to code complexity
- Bug fix time increased from hours to days
- New developer onboarding takes 3+ weeks
- Risk of catastrophic regressions increasing with each change

---
