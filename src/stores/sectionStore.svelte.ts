import type { Section, TestCase } from '../types/section.js';

// Section store for managing document sections
class SectionStore {
  private _sections = $state<Section[]>([]);
  private _nextSectionId = $state<number>(1);
  private _draggedSection = $state<Section | null>(null);
  private _editingSection = $state<number | null>(null);
  private _activeTestCase = $state<Record<number, TestCase>>({});
  private _expandedTestCases = $state<Record<number, boolean>>({});

  // Getters
  get sections() { return this._sections; }
  get nextSectionId() { return this._nextSectionId; }
  get draggedSection() { return this._draggedSection; }
  get editingSection() { return this._editingSection; }
  get activeTestCase() { return this._activeTestCase; }
  get expandedTestCases() { return this._expandedTestCases; }

  // Derived
  get dynamicSections() {
    return this._sections.filter(s => s.type === 'dynamic');
  }

  // Section management
  addSection(type: 'static' | 'dynamic'): Section {
    const id = this._nextSectionId++;
    const section = type === 'static' 
      ? {
          id,
          type: 'static' as const,
          name: `Static Section ${id}`,
          content: '<p>Enter your HTML content here...</p>',
          testCases: []
        }
      : {
          id,
          type: 'dynamic' as const,
          name: `Dynamic Section ${id}`,
          content: '// Enter your JavaScript code here\nreturn "Hello World";',
          testCases: [{
            id: `${id}-tc-1`,
            name: 'Default Test',
            variables: {},
            expected: 'Hello World',
            matchType: 'contains'
          }]
        };
    
    this._sections = [...this._sections, section];
    
    if (type === 'dynamic' && section.type === 'dynamic') {
      this._activeTestCase[id] = section.testCases[0];
      this._expandedTestCases[id] = true;
    }
    
    return section;
  }

  deleteSection(id: number) {
    this._sections = this._sections.filter(s => s.id !== id);
    delete this._activeTestCase[id];
    delete this._expandedTestCases[id];
    if (this._editingSection === id) {
      this._editingSection = null;
    }
  }

  updateSectionContent(id: number, content: string) {
    this._sections = this._sections.map(s => 
      s.id === id ? { ...s, content } : s
    );
  }

  updateSectionName(id: number, name: string) {
    this._sections = this._sections.map(s => 
      s.id === id ? { ...s, name } : s
    );
  }

  // Test case management
  addTestCase(sectionId: number, testCase: TestCase) {
    this._sections = this._sections.map(section => {
      if (section.id === sectionId && section.type === 'dynamic') {
        return {
          ...section,
          testCases: [...section.testCases, testCase]
        };
      }
      return section;
    });
  }

  updateTestCase(sectionId: number, testCaseId: string, updates: Partial<TestCase>) {
    this._sections = this._sections.map(section => {
      if (section.id === sectionId && section.type === 'dynamic') {
        return {
          ...section,
          testCases: section.testCases.map(tc =>
            tc.id === testCaseId ? { ...tc, ...updates } : tc
          )
        };
      }
      return section;
    });
  }

  deleteTestCase(sectionId: number, testCaseId: string) {
    this._sections = this._sections.map(section => {
      if (section.id === sectionId && section.type === 'dynamic') {
        const updatedTestCases = section.testCases.filter(tc => tc.id !== testCaseId);
        // If we deleted the active test case, select another one
        if (this._activeTestCase[sectionId]?.id === testCaseId && updatedTestCases.length > 0) {
          this._activeTestCase[sectionId] = updatedTestCases[0];
        }
        return {
          ...section,
          testCases: updatedTestCases
        };
      }
      return section;
    });
  }

  setActiveTestCase(sectionId: number, testCase: TestCase) {
    this._activeTestCase[sectionId] = testCase;
  }

  toggleTestCaseExpansion(sectionId: number) {
    this._expandedTestCases[sectionId] = !this._expandedTestCases[sectionId];
  }

  // Drag and drop
  setDraggedSection(section: Section | null) {
    this._draggedSection = section;
  }

  reorderSections(fromId: number, toId: number) {
    const fromIndex = this._sections.findIndex(s => s.id === fromId);
    const toIndex = this._sections.findIndex(s => s.id === toId);
    
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    
    const newSections = [...this._sections];
    const [removed] = newSections.splice(fromIndex, 1);
    newSections.splice(toIndex, 0, removed);
    this._sections = newSections;
  }

  // Bulk operations
  setSections(sections: Section[]) {
    this._sections = sections;
    // Reset test case state for new sections
    this._activeTestCase = {};
    this._expandedTestCases = {};
    
    sections.forEach(section => {
      if (section.type === 'dynamic' && section.testCases.length > 0) {
        this._activeTestCase[section.id] = section.testCases[0];
        this._expandedTestCases[section.id] = false;
      }
    });
    
    // Update next ID to avoid conflicts
    const maxId = Math.max(0, ...sections.map(s => s.id));
    this._nextSectionId = maxId + 1;
  }

  clearSections() {
    this._sections = [];
    this._nextSectionId = 1;
    this._activeTestCase = {};
    this._expandedTestCases = {};
    this._editingSection = null;
    this._draggedSection = null;
  }

  // Section conversion
  convertToDynamic(sectionId: number) {
    this._sections = this._sections.map(section => {
      if (section.id === sectionId && section.type === 'static') {
        const dynamicSection: Section = {
          ...section,
          type: 'dynamic',
          testCases: [{
            id: `${sectionId}-tc-1`,
            name: 'Default Test',
            variables: {},
            expected: '',
            matchType: 'contains'
          }]
        };
        this._activeTestCase[sectionId] = dynamicSection.testCases[0];
        this._expandedTestCases[sectionId] = true;
        return dynamicSection;
      }
      return section;
    });
  }

  // Editing state
  setEditingSection(sectionId: number | null) {
    this._editingSection = sectionId;
  }
}

// Create and export the store instance
export const sectionStore = new SectionStore();

// Export sections as a separate export for backward compatibility
import { writable, derived } from 'svelte/store';
export const sections = writable(sectionStore.sections);