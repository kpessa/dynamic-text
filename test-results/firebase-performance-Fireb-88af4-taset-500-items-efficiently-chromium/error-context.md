# Page snapshot

```yaml
- main:
  - banner "Main navigation":
    - button "Show sidebar navigation": Show sidebar
    - heading "TPN Dynamic Text Editor" [level=1]
    - button "🛠️ KPT"
    - button "Open ingredient manager": Ingredients
    - button "🚀 Migrate"
    - button "Create new document": New
    - button "Export content to clipboard": Export
    - button "Open preferences": Preferences
    - button "Show keyboard shortcuts": Shortcuts
  - heading "Content Sections" [level=2]
  - button "🧪 Run All Tests"
  - button "+ Static HTML"
  - button "+ Dynamic JS"
  - list:
    - text: 📄
    - heading "Start Creating Your Reference Text" [level=3]
    - paragraph: Add sections to build your dynamic text content
    - button "📝 Add Static HTML For fixed content and formatting"
    - button "⚡ Add Dynamic JavaScript For calculations and logic"
  - button "👁️ Preview"
  - button "📊 Output"
  - button "▶"
- button "Close modal overlay":
  - dialog "Ingredient Manager":
    - button "×"
    - heading "📦 Ingredient Library" [level=2]
    - button "☐ Select"
    - paragraph: Loading ingredients...
```