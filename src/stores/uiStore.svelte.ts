// UI store for managing modal and panel states
type OutputMode = 'json' | 'configurator';
type PreviewMode = 'preview' | 'output';

class UIStore {
  // Sidebar and panels
  private _showSidebar = $state<boolean>(false);
  private _previewCollapsed = $state<boolean>(false);
  private _showOutput = $state<boolean>(false);
  private _outputMode = $state<OutputMode>('json');
  private _previewMode = $state<PreviewMode>('preview');

  // Modals
  private _showTestSummary = $state<boolean>(false);
  private _showTestGeneratorModal = $state<boolean>(false);
  private _showAIWorkflowInspector = $state<boolean>(false);
  private _showIngredientManager = $state<boolean>(false);
  private _showDiffViewer = $state<boolean>(false);
  private _showMigrationTool = $state<boolean>(false);
  private _showPreferences = $state<boolean>(false);
  private _showCommitMessageDialog = $state<boolean>(false);
  private _showExportModal = $state<boolean>(false);
  private _showSelectiveApply = $state<boolean>(false);
  private _showKPTReference = $state<boolean>(false);

  // Population dropdown
  private _showPopulationDropdown = $state<boolean>(false);
  private _loadingPopulations = $state<boolean>(false);

  // Other UI state
  private _copied = $state<boolean>(false);

  // Getters
  get showSidebar() { return this._showSidebar; }
  get previewCollapsed() { return this._previewCollapsed; }
  get showOutput() { return this._showOutput; }
  get outputMode(): OutputMode { return this._outputMode; }
  get previewMode(): PreviewMode { return this._previewMode; }
  get showTestSummary() { return this._showTestSummary; }
  get showTestGeneratorModal() { return this._showTestGeneratorModal; }
  get showAIWorkflowInspector() { return this._showAIWorkflowInspector; }
  get showIngredientManager() { return this._showIngredientManager; }
  get showDiffViewer() { return this._showDiffViewer; }
  get showMigrationTool() { return this._showMigrationTool; }
  get showPreferences() { return this._showPreferences; }
  get showCommitMessageDialog() { return this._showCommitMessageDialog; }
  get showExportModal() { return this._showExportModal; }
  get showSelectiveApply() { return this._showSelectiveApply; }
  get showKPTReference() { return this._showKPTReference; }
  get showPopulationDropdown() { return this._showPopulationDropdown; }
  get loadingPopulations() { return this._loadingPopulations; }
  get copied() { return this._copied; }

  // Derived computed values - using getters to prevent reactivity loops
  get hasOpenModals() {
    return this._showTestSummary ||
      this._showTestGeneratorModal ||
      this._showAIWorkflowInspector ||
      this._showIngredientManager ||
      this._showDiffViewer ||
      this._showMigrationTool ||
      this._showPreferences ||
      this._showCommitMessageDialog ||
      this._showExportModal ||
      this._showSelectiveApply ||
      this._showKPTReference;
  }
  
  get isOutputVisible() { return this._showOutput || this._previewMode === 'output'; }
  get isSidebarCollapsed() { return !this._showSidebar; }

  // Setters
  setShowSidebar(show: boolean) { this._showSidebar = show; }
  setPreviewCollapsed(collapsed: boolean) { this._previewCollapsed = collapsed; }
  setShowOutput(show: boolean) { this._showOutput = show; }
  setOutputMode(mode: OutputMode) { this._outputMode = mode; }
  setPreviewMode(mode: PreviewMode) { this._previewMode = mode; }
  setShowTestSummary(show: boolean) { this._showTestSummary = show; }
  setShowTestGeneratorModal(show: boolean) { this._showTestGeneratorModal = show; }
  setShowAIWorkflowInspector(show: boolean) { this._showAIWorkflowInspector = show; }
  setShowIngredientManager(show: boolean) { this._showIngredientManager = show; }
  setShowDiffViewer(show: boolean) { this._showDiffViewer = show; }
  setShowMigrationTool(show: boolean) { this._showMigrationTool = show; }
  setShowPreferences(show: boolean) { this._showPreferences = show; }
  setShowCommitMessageDialog(show: boolean) { this._showCommitMessageDialog = show; }
  setShowExportModal(show: boolean) { this._showExportModal = show; }
  setShowSelectiveApply(show: boolean) { this._showSelectiveApply = show; }
  setShowKPTReference(show: boolean) { this._showKPTReference = show; }
  setShowPopulationDropdown(show: boolean) { this._showPopulationDropdown = show; }
  setLoadingPopulations(loading: boolean) { this._loadingPopulations = loading; }
  setCopied(copied: boolean) { this._copied = copied; }

  // Convenience methods
  toggleSidebar() { this._showSidebar = !this._showSidebar; }
  toggleOutput() { this._showOutput = !this._showOutput; }
  togglePreviewCollapsed() { this._previewCollapsed = !this._previewCollapsed; }

  closeAllModals() {
    this._showTestSummary = false;
    this._showTestGeneratorModal = false;
    this._showAIWorkflowInspector = false;
    this._showKPTReference = false;
    this._showIngredientManager = false;
    this._showDiffViewer = false;
    this._showMigrationTool = false;
    this._showPreferences = false;
    this._showCommitMessageDialog = false;
    this._showExportModal = false;
    this._showSelectiveApply = false;
    this._showPopulationDropdown = false;
  }

  // Temporary states for copy feedback
  showCopiedFeedback() {
    this._copied = true;
    setTimeout(() => {
      this._copied = false;
    }, 2000);
  }

  // Batch modal operations
  openModal(modalType: 'testSummary' | 'testGenerator' | 'aiWorkflow' | 'ingredientManager' | 'diffViewer' | 'migrationTool' | 'preferences' | 'commitMessage' | 'export' | 'selectiveApply' | 'kptReference') {
    // Close all other modals first for better UX
    this.closeAllModals();
    
    // Open the requested modal
    switch (modalType) {
      case 'testSummary':
        this._showTestSummary = true;
        break;
      case 'testGenerator':
        this._showTestGeneratorModal = true;
        break;
      case 'aiWorkflow':
        this._showAIWorkflowInspector = true;
        break;
      case 'ingredientManager':
        this._showIngredientManager = true;
        break;
      case 'diffViewer':
        this._showDiffViewer = true;
        break;
      case 'migrationTool':
        this._showMigrationTool = true;
        break;
      case 'preferences':
        this._showPreferences = true;
        break;
      case 'commitMessage':
        this._showCommitMessageDialog = true;
        break;
      case 'export':
        this._showExportModal = true;
        break;
      case 'selectiveApply':
        this._showSelectiveApply = true;
        break;
      case 'kptReference':
        this._showKPTReference = true;
        break;
    }
  }
}

// Create and export the store instance
export const uiStore = new UIStore();
