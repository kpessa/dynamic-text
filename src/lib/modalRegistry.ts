// Modal Registry for Skeleton UI Modal System
// This file registers all modal components for use with the Skeleton modal store

import AITestGenerator from './components/testing/AITestGenerator.svelte';

// Modal imports
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
  // Modal components
  exportModal: { 
    ref: ExportModal,
    props: {} // Default props if needed
  },
  preferencesModal: { 
    ref: PreferencesModal,
    props: {}
  },
  testGeneratorModal: { 
    ref: TestGeneratorModal,
    props: {}
  },
  duplicateReportModal: { 
    ref: DuplicateReportModal,
    props: {}
  },
  aiTestGenerator: {
    ref: AITestGenerator,
    props: {}
  }
};

/**
 * Helper function to trigger a modal
 * @param {any} modalStore - The modal store instance
 * @param {string} modalId - The ID of the modal to trigger
 * @param {object} meta - Additional data to pass to the modal
 */
export function triggerModal(modalStore: any, modalId: string, meta: any = {}) {
  const modalConfig = modalRegistry[modalId as keyof typeof modalRegistry];
  if (!modalConfig) {
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
export function closeAllModals(modalStore: any) {
  modalStore.close();
}

// Export individual modal IDs as constants for type safety
export const MODAL_IDS = {
  EXPORT: 'exportModal',
  PREFERENCES: 'preferencesModal',
  TEST_GENERATOR: 'testGeneratorModal',
  DUPLICATE_REPORT: 'duplicateReportModal',
  AI_TEST_GENERATOR: 'aiTestGenerator'
};

// Simple modal state management for components that don't use Skeleton's modal store
let activeModals: Map<string, any> = new Map();

export function openModal(modalId: string, props: any = {}) {
  activeModals.set(modalId, props);
  // This is a simplified version - in a real app you'd trigger the actual modal display
  console.log(`Opening modal: ${modalId}`, props);
}

export function closeModal(modalId: string) {
  activeModals.delete(modalId);
  console.log(`Closing modal: ${modalId}`);
}