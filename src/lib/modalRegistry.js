// Modal Registry for Skeleton UI Modal System
// This file registers all modal components for use with the Skeleton modal store

import ExportModalSkeleton from './ExportModalSkeleton.svelte';
import PreferencesModalSkeleton from './PreferencesModalSkeleton.svelte';
import TestGeneratorModalSkeleton from './TestGeneratorModalSkeleton.svelte';
import DuplicateReportModalSkeleton from './DuplicateReportModalSkeleton.svelte';

// Legacy modal imports (for backwards compatibility during migration)
import ExportModal from './ExportModal.svelte';
import PreferencesModal from './PreferencesModal.svelte';
import TestGeneratorModal from './TestGeneratorModal.svelte';
import DuplicateReportModal from './DuplicateReportModal.svelte';

/**
 * Modal Registry
 * Maps modal IDs to their component references
 * Used by Skeleton's Modal component to render the correct modal
 */
export const modalRegistry = {
  // New Skeleton UI modals
  exportModal: { 
    ref: ExportModalSkeleton,
    props: {} // Default props if needed
  },
  preferencesModal: { 
    ref: PreferencesModalSkeleton,
    props: {}
  },
  testGeneratorModal: { 
    ref: TestGeneratorModalSkeleton,
    props: {}
  },
  duplicateReportModal: { 
    ref: DuplicateReportModalSkeleton,
    props: {}
  },
  
  // Legacy modals (for gradual migration)
  exportModalLegacy: { 
    ref: ExportModal,
    props: {}
  },
  preferencesModalLegacy: { 
    ref: PreferencesModal,
    props: {}
  },
  testGeneratorModalLegacy: { 
    ref: TestGeneratorModal,
    props: {}
  },
  duplicateReportModalLegacy: { 
    ref: DuplicateReportModal,
    props: {}
  }
};

/**
 * Helper function to trigger a modal
 * @param {string} modalId - The ID of the modal to trigger
 * @param {object} meta - Additional data to pass to the modal
 */
export function triggerModal(modalStore, modalId, meta = {}) {
  if (!modalRegistry[modalId]) {
    console.error(`Modal with ID "${modalId}" not found in registry`);
    return;
  }
  
  modalStore.trigger({
    type: 'component',
    component: modalId,
    meta
  });
}

/**
 * Helper to close all modals
 */
export function closeAllModals(modalStore) {
  modalStore.close();
}

// Export individual modal IDs as constants for type safety
export const MODAL_IDS = {
  EXPORT: 'exportModal',
  PREFERENCES: 'preferencesModal',
  TEST_GENERATOR: 'testGeneratorModal',
  DUPLICATE_REPORT: 'duplicateReportModal',
  // Legacy IDs
  EXPORT_LEGACY: 'exportModalLegacy',
  PREFERENCES_LEGACY: 'preferencesModalLegacy',
  TEST_GENERATOR_LEGACY: 'testGeneratorModalLegacy',
  DUPLICATE_REPORT_LEGACY: 'duplicateReportModalLegacy'
};