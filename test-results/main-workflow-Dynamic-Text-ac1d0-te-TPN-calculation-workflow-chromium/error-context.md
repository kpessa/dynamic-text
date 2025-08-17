# Page snapshot

```yaml
- text: Loading TPN Dynamic Text Editor... Failed to load application. Please refresh the page.
- heading "Application Error" [level=1]
- paragraph: The TPN Dynamic Text Editor failed to load.
- button "Reload Application"
- group: Technical Details
- text: "[plugin:vite:import-analysis] Failed to resolve import \"./CodeMirror.svelte\" from \"src/components/SectionList.svelte\". Does the file exist? SectionList.svelte:4:25 6 | import { getIngredientBadgeColor } from '../services/uiHelpers'; 7 | import TestCaseManager from './TestCaseManager.svelte'; 8 | import CodeMirror from './CodeMirror.svelte'; | ^ 9 | 10 | var on_click = (_, onAddSection) => onAddSection()('static'); at TransformPluginContext._formatLog (file:///Users/kpessa/code/dynamic-text/node_modules/.pnpm/vite@7.0.6_@types+node@24.2.0_sass@1.90.0_terser@5.43.1/node_modules/vite/dist/node/chunks/dep-BHkUv4Z8.js:31460:43) at TransformPluginContext.error (file:///Users/kpessa/code/dynamic-text/node_modules/.pnpm/vite@7.0.6_@types+node@24.2.0_sass@1.90.0_terser@5.43.1/node_modules/vite/dist/node/chunks/dep-BHkUv4Z8.js:31457:14) at normalizeUrl (file:///Users/kpessa/code/dynamic-text/node_modules/.pnpm/vite@7.0.6_@types+node@24.2.0_sass@1.90.0_terser@5.43.1/node_modules/vite/dist/node/chunks/dep-BHkUv4Z8.js:29999:18) at async file:///Users/kpessa/code/dynamic-text/node_modules/.pnpm/vite@7.0.6_@types+node@24.2.0_sass@1.90.0_terser@5.43.1/node_modules/vite/dist/node/chunks/dep-BHkUv4Z8.js:30057:32 at async Promise.all (index 4) at async TransformPluginContext.transform (file:///Users/kpessa/code/dynamic-text/node_modules/.pnpm/vite@7.0.6_@types+node@24.2.0_sass@1.90.0_terser@5.43.1/node_modules/vite/dist/node/chunks/dep-BHkUv4Z8.js:30025:4) at async EnvironmentPluginContainer.transform (file:///Users/kpessa/code/dynamic-text/node_modules/.pnpm/vite@7.0.6_@types+node@24.2.0_sass@1.90.0_terser@5.43.1/node_modules/vite/dist/node/chunks/dep-BHkUv4Z8.js:31274:14) at async loadAndTransform (file:///Users/kpessa/code/dynamic-text/node_modules/.pnpm/vite@7.0.6_@types+node@24.2.0_sass@1.90.0_terser@5.43.1/node_modules/vite/dist/node/chunks/dep-BHkUv4Z8.js:26451:26) at async viteTransformMiddleware (file:///Users/kpessa/code/dynamic-text/node_modules/.pnpm/vite@7.0.6_@types+node@24.2.0_sass@1.90.0_terser@5.43.1/node_modules/vite/dist/node/chunks/dep-BHkUv4Z8.js:27536:20) Click outside, press Esc key, or fix the code to dismiss. You can also disable this overlay by setting"
- code: server.hmr.overlay
- text: to
- code: "false"
- text: in
- code: vite.config.ts
- text: .
```