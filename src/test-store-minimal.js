import { logError } from '$lib/logger';
// Test which store is causing the freeze
// console.log('Testing store imports individually...');

try {
  // console.log('Testing sectionStore...');
  const { sectionStore } = await import('./stores/sectionStore.svelte.ts');
  // console.log('sectionStore imported successfully');
} catch (error) {
  // logError('sectionStore failed:', error);
}
try {
  // console.log('Testing uiStore...');
  const { uiStore } = await import('./stores/uiStore.svelte.ts');
  // console.log('uiStore imported successfully');
} catch (error) {
  // logError('uiStore failed:', error);
}
try {
  // console.log('Testing workspaceStore...');
  const { workspaceStore } = await import('./stores/workspaceStore.svelte.ts');
  // console.log('workspaceStore imported successfully');
} catch (error) {
  // logError('workspaceStore failed:', error);
}
try {
  // console.log('Testing tpnStore...');
  const { tpnStore } = await import('./stores/tpnStore.svelte.ts');
  // console.log('tpnStore imported successfully');
} catch (error) {
  // logError('tpnStore failed:', error);
}
try {
  // console.log('Testing testStore...');
  const { testStore } = await import('./stores/testStore.svelte.ts');
  // console.log('testStore imported successfully');
} catch (error) {
  // logError('testStore failed:', error);
}
// console.log('All store import tests completed');
