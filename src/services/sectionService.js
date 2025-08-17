// src/services/sectionService.js
// Service layer for section operations using stores and event bus

import { sectionStore } from '../stores/sectionStore.js';
import { workspaceStore } from '../stores/workspaceStore.js';
import { testStore } from '../stores/testStore.js';
import { eventBus, Events } from '../lib/eventBus.js';

export const sectionService = {
  // Add a new section
  addSection(type) {
    const section = sectionStore.addSection(type);
    workspaceStore.markAsModified();
    eventBus.emit(Events.SECTION_ADD, section);
    eventBus.emit(Events.DOCUMENT_MODIFIED);
    return section;
  },
  
  // Update section content
  updateSectionContent(sectionId, content) {
    sectionStore.updateSectionContent(sectionId, content);
    workspaceStore.markAsModified();
    eventBus.emit(Events.SECTION_UPDATE, { sectionId, content });
    eventBus.emit(Events.DOCUMENT_MODIFIED);
  },
  
  // Delete a section
  deleteSection(sectionId) {
    if (confirm('Are you sure you want to delete this section?')) {
      sectionStore.deleteSection(sectionId);
      workspaceStore.markAsModified();
      eventBus.emit(Events.SECTION_DELETE, sectionId);
      eventBus.emit(Events.DOCUMENT_MODIFIED);
    }
  },
  
  // Move section (drag and drop)
  moveSection(fromIndex, toIndex) {
    sectionStore.moveSection(fromIndex, toIndex);
    workspaceStore.markAsModified();
    eventBus.emit(Events.SECTION_MOVE, { fromIndex, toIndex });
    eventBus.emit(Events.DOCUMENT_MODIFIED);
  },
  
  // Start editing a section
  startEditingSection(sectionId) {
    sectionStore.setEditingSection(sectionId);
    eventBus.emit(Events.SECTION_EDIT_START, sectionId);
  },
  
  // End editing a section
  endEditingSection() {
    const sectionId = sectionStore.getEditingSection();
    sectionStore.setEditingSection(null);
    eventBus.emit(Events.SECTION_EDIT_END, sectionId);
  },
  
  // Convert static section to dynamic
  convertToDynamic(sectionId, jsContent) {
    sectionStore.updateSection(sectionId, {
      type: 'dynamic',
      content: jsContent,
      testCases: []
    });
    workspaceStore.markAsModified();
    eventBus.emit(Events.SECTION_UPDATE, { sectionId, type: 'dynamic' });
    eventBus.emit(Events.DOCUMENT_MODIFIED);
  },
  
  // Add test case to section
  addTestCase(sectionId, testCase) {
    sectionStore.addTestCase(sectionId, testCase);
    workspaceStore.markAsModified();
    eventBus.emit(Events.SECTION_UPDATE, { sectionId, testCase });
  },
  
  // Run tests for all sections
  async runAllTests() {
    eventBus.emit(Events.TEST_RUN_ALL);
    const results = await testStore.runAllTests();
    eventBus.emit(Events.TEST_COMPLETE, results);
    return results;
  },
  
  // Run tests for a specific section
  async runSectionTests(sectionId) {
    eventBus.emit(Events.TEST_RUN_SECTION, sectionId);
    const results = await testStore.runSectionTests(sectionId);
    eventBus.emit(Events.TEST_COMPLETE, { sectionId, results });
    return results;
  },
  
  // Clear all sections
  clearAllSections() {
    if (workspaceStore.hasUnsavedChanges()) {
      if (!confirm('You have unsaved changes. Clear anyway?')) {
        return false;
      }
    }
    
    sectionStore.clearSections();
    workspaceStore.reset();
    testStore.reset();
    eventBus.emit(Events.DOCUMENT_NEW);
    return true;
  },
  
  // Load sections from data
  loadSections(sections) {
    sectionStore.setSections(sections);
    workspaceStore.setOriginalContent(sections);
    eventBus.emit(Events.DOCUMENT_LOADED, sections);
  },
  
  // Get current sections for export
  exportSections() {
    const sections = sectionStore.getSections();
    eventBus.emit(Events.DOCUMENT_EXPORT, sections);
    return sections;
  }
};