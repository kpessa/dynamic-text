import { writable, derived } from 'svelte/store';

// UI store for managing modal and panel states using Svelte 4 stores
type OutputMode = 'json' | 'configurator';
type PreviewMode = 'preview' | 'output';

// Individual stores
const showSidebar = writable<boolean>(false);
const previewCollapsed = writable<boolean>(false);
const showOutput = writable<boolean>(false);
const outputMode = writable<OutputMode>('json');
const previewMode = writable<PreviewMode>('preview');

// Modal stores
const showTestSummary = writable<boolean>(false);
const showTestGeneratorModal = writable<boolean>(false);
const showAIWorkflowInspector = writable<boolean>(false);
const showIngredientManager = writable<boolean>(false);
const showDiffViewer = writable<boolean>(false);
const showMigrationTool = writable<boolean>(false);
const showPreferences = writable<boolean>(false);
const showCommitMessageDialog = writable<boolean>(false);
const showExportModal = writable<boolean>(false);
const showSelectiveApply = writable<boolean>(false);
const showKPTReference = writable<boolean>(false);
const showKPTManager = writable<boolean>(false);

// Population dropdown
const showPopulationDropdown = writable<boolean>(false);
const loadingPopulations = writable<boolean>(false);

// Other UI state
const copied = writable<boolean>(false);

// Derived stores
const hasOpenModals = derived(
  [showTestSummary, showTestGeneratorModal, showAIWorkflowInspector, 
   showIngredientManager, showDiffViewer, showMigrationTool, showPreferences,
   showCommitMessageDialog, showExportModal, showSelectiveApply, 
   showKPTReference, showKPTManager],
  ([$showTestSummary, $showTestGeneratorModal, $showAIWorkflowInspector,
    $showIngredientManager, $showDiffViewer, $showMigrationTool, $showPreferences,
    $showCommitMessageDialog, $showExportModal, $showSelectiveApply,
    $showKPTReference, $showKPTManager]) => {
    return $showTestSummary || $showTestGeneratorModal || $showAIWorkflowInspector ||
           $showIngredientManager || $showDiffViewer || $showMigrationTool || $showPreferences ||
           $showCommitMessageDialog || $showExportModal || $showSelectiveApply ||
           $showKPTReference || $showKPTManager;
  }
);

const isOutputVisible = derived(
  [showOutput, previewMode],
  ([$showOutput, $previewMode]) => $showOutput || $previewMode === 'output'
);

const isSidebarCollapsed = derived(
  showSidebar,
  ($showSidebar) => !$showSidebar
);

class UIStore {

  // Store getters
  get showSidebar() { return showSidebar; }
  get previewCollapsed() { return previewCollapsed; }
  get showOutput() { return showOutput; }
  get outputMode() { return outputMode; }
  get previewMode() { return previewMode; }
  get showTestSummary() { return showTestSummary; }
  get showTestGeneratorModal() { return showTestGeneratorModal; }
  get showAIWorkflowInspector() { return showAIWorkflowInspector; }
  get showIngredientManager() { return showIngredientManager; }
  get showDiffViewer() { return showDiffViewer; }
  get showMigrationTool() { return showMigrationTool; }
  get showPreferences() { return showPreferences; }
  get showCommitMessageDialog() { return showCommitMessageDialog; }
  get showExportModal() { return showExportModal; }
  get showSelectiveApply() { return showSelectiveApply; }
  get showKPTReference() { return showKPTReference; }
  get showKPTManager() { return showKPTManager; }
  get showPopulationDropdown() { return showPopulationDropdown; }
  get loadingPopulations() { return loadingPopulations; }
  get copied() { return copied; }

  // Derived stores
  get hasOpenModals() { return hasOpenModals; }
  get isOutputVisible() { return isOutputVisible; }
  get isSidebarCollapsed() { return isSidebarCollapsed; }

  // Setters
  setShowSidebar(show: boolean) { showSidebar.set(show); }
  setPreviewCollapsed(collapsed: boolean) { previewCollapsed.set(collapsed); }
  setShowOutput(show: boolean) { showOutput.set(show); }
  setOutputMode(mode: OutputMode) { outputMode.set(mode); }
  setPreviewMode(mode: PreviewMode) { previewMode.set(mode); }
  setShowTestSummary(show: boolean) { showTestSummary.set(show); }
  setShowTestGeneratorModal(show: boolean) { showTestGeneratorModal.set(show); }
  setShowAIWorkflowInspector(show: boolean) { showAIWorkflowInspector.set(show); }
  setShowIngredientManager(show: boolean) { showIngredientManager.set(show); }
  setShowDiffViewer(show: boolean) { showDiffViewer.set(show); }
  setShowMigrationTool(show: boolean) { showMigrationTool.set(show); }
  setShowPreferences(show: boolean) { showPreferences.set(show); }
  setShowCommitMessageDialog(show: boolean) { showCommitMessageDialog.set(show); }
  setShowExportModal(show: boolean) { showExportModal.set(show); }
  setShowSelectiveApply(show: boolean) { showSelectiveApply.set(show); }
  setShowKPTReference(show: boolean) { showKPTReference.set(show); }
  setShowKPTManager(show: boolean) { showKPTManager.set(show); }
  setShowPopulationDropdown(show: boolean) { showPopulationDropdown.set(show); }
  setLoadingPopulations(loading: boolean) { loadingPopulations.set(loading); }
  setCopied(isCopied: boolean) { copied.set(isCopied); }

  // Convenience methods
  toggleSidebar() { showSidebar.update(val => !val); }
  toggleOutput() { showOutput.update(val => !val); }
  togglePreviewCollapsed() { previewCollapsed.update(val => !val); }

  closeAllModals() {
    showTestSummary.set(false);
    showTestGeneratorModal.set(false);
    showAIWorkflowInspector.set(false);
    showKPTReference.set(false);
    showKPTManager.set(false);
    showIngredientManager.set(false);
    showDiffViewer.set(false);
    showMigrationTool.set(false);
    showPreferences.set(false);
    showCommitMessageDialog.set(false);
    showExportModal.set(false);
    showSelectiveApply.set(false);
    showPopulationDropdown.set(false);
  }

  // Temporary states for copy feedback
  showCopiedFeedback() {
    copied.set(true);
    setTimeout(() => {
      copied.set(false);
    }, 2000);
  }

  // Batch modal operations
  openModal(modalType: 'testSummary' | 'testGenerator' | 'aiWorkflow' | 'ingredientManager' | 'diffViewer' | 'migrationTool' | 'preferences' | 'commitMessage' | 'export' | 'selectiveApply' | 'kptReference' | 'kptManager') {
    // Close all other modals first for better UX
    this.closeAllModals();
    
    // Open the requested modal
    switch (modalType) {
      case 'testSummary':
        showTestSummary.set(true);
        break;
      case 'testGenerator':
        showTestGeneratorModal.set(true);
        break;
      case 'aiWorkflow':
        showAIWorkflowInspector.set(true);
        break;
      case 'ingredientManager':
        showIngredientManager.set(true);
        break;
      case 'diffViewer':
        showDiffViewer.set(true);
        break;
      case 'migrationTool':
        showMigrationTool.set(true);
        break;
      case 'preferences':
        showPreferences.set(true);
        break;
      case 'commitMessage':
        showCommitMessageDialog.set(true);
        break;
      case 'export':
        showExportModal.set(true);
        break;
      case 'selectiveApply':
        showSelectiveApply.set(true);
        break;
      case 'kptReference':
        showKPTReference.set(true);
        break;
      case 'kptManager':
        showKPTManager.set(true);
        break;
    }
  }
}

// Create and export the store instance
export const uiStore = new UIStore();
