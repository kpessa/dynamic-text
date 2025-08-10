import type { Section, TestCase } from '../types/section.js';

// Section store using Svelte 5 runes
class SectionStore {
  private _sections = $state<Section[]>([]);
  private _nextSectionId = $state<number>(1);
  private _activeTestCase = $state<Record<number, TestCase>>({});
  private _expandedTestCases = $state<Record<number, boolean>>({});
  private _editingSection = $state<number | null>(null);
  private _draggedSection = $state<Section | null>(null);

  // Getters
  get sections() {
    return this._sections;
  }

  get nextSectionId() {
    return this._nextSectionId;
  }

  get activeTestCase() {
    return this._activeTestCase;
  }

  get expandedTestCases() {
    return this._expandedTestCases;
  }

  get editingSection() {
    return this._editingSection;
  }

  get draggedSection() {
    return this._draggedSection;
  }

  // Derived values - using getters to prevent reactivity loops
  get dynamicSections() { return this._sections.filter(s => s.type === 'dynamic'); }

  // Computed properties
  get hasActiveSections() { return this._sections.length > 0; }
  get dynamicSectionCount() { return this._sections.filter(s => s.type === 'dynamic').length; }
  get staticSectionCount() { return this._sections.filter(s => s.type === 'static').length; }

  // Section management methods
  addSection(type: 'static' | 'dynamic') {
    const section: Section = {
      id: this._nextSectionId,
      type,
      name: `${type === 'static' ? 'Static Section' : 'Dynamic Section'} ${this._nextSectionId}`,
      content: type === 'static' 
        ? '<p>Enter your HTML content here...</p>' 
        : '// Enter your JavaScript code here\nreturn "Hello, World!";',
      testCases: type === 'dynamic' ? [{
        name: 'Default Test',
        variables: {},
        expected: '',
        matchType: 'contains'
      }] : []
    };

    this._sections.push(section);
    this._nextSectionId += 1;

    if (type === 'dynamic') {
      const testCase = section.testCases[0];
      if (testCase) {
        this._activeTestCase[section.id] = testCase;
        this._expandedTestCases[section.id] = true;
      }
    }

    return section;
  }

  deleteSection(id: number) {
    const index = this._sections.findIndex(s => s.id === id);
    if (index !== -1) {
      this._sections.splice(index, 1);
      delete this._activeTestCase[id];
      delete this._expandedTestCases[id];
      
      if (this._editingSection === id) {
        this._editingSection = null;
      }
    }
  }

  updateSectionContent(id: number, content: string) {
    const sectionIndex = this._sections.findIndex(s => s.id === id);
    if (sectionIndex !== -1 && this._sections[sectionIndex]) {
      const section = this._sections[sectionIndex];
      // Create new section object to ensure reactivity
      this._sections[sectionIndex] = {
        id: section.id,
        type: section.type,
        name: section.name,
        testCases: section.testCases,
        content
      };
    }
  }

  updateSectionName(id: number, name: string) {
    const sectionIndex = this._sections.findIndex(s => s.id === id);
    if (sectionIndex !== -1 && this._sections[sectionIndex]) {
      const section = this._sections[sectionIndex];
      // Create new section object to ensure reactivity
      this._sections[sectionIndex] = {
        id: section.id,
        type: section.type,
        content: section.content,
        testCases: section.testCases,
        name
      };
    }
  }

  // Test case management
  addTestCase(sectionId: number) {
    const section = this._sections.find(s => s.id === sectionId);
    if (section && section.type === 'dynamic') {
      const newTestCase: TestCase = {
        name: `Test ${section.testCases.length + 1}`,
        variables: {},
        expected: '',
        matchType: 'contains'
      };
      section.testCases.push(newTestCase);
      this._activeTestCase[sectionId] = newTestCase;
    }
  }

  updateTestCase(sectionId: number, index: number, updates: Partial<TestCase>) {
    const sectionIndex = this._sections.findIndex(s => s.id === sectionId);
    if (sectionIndex !== -1 && this._sections[sectionIndex] && this._sections[sectionIndex].testCases[index]) {
      const section = this._sections[sectionIndex];
      const currentTestCase = section.testCases[index];
      const updatedTestCases = [...section.testCases];
      updatedTestCases[index] = {
        name: currentTestCase.name,
        variables: currentTestCase.variables,
        expected: currentTestCase.expected,
        matchType: currentTestCase.matchType,
        expectedStyles: currentTestCase.expectedStyles,
        ...updates
      };
      
      this._sections[sectionIndex] = {
        id: section.id,
        type: section.type,
        name: section.name,
        content: section.content,
        testCases: updatedTestCases
      };
    }
  }

  deleteTestCase(sectionId: number, index: number) {
    const section = this._sections.find(s => s.id === sectionId);
    if (section && section.testCases[index]) {
      section.testCases.splice(index, 1);
      
      // Update active test case if needed
      if (section.testCases.length > 0) {
        const testCase = section.testCases[0];
        if (testCase) {
          this._activeTestCase[sectionId] = testCase;
        }
      } else {
        delete this._activeTestCase[sectionId];
      }
    }
  }

  setActiveTestCase(sectionId: number, testCase: TestCase) {
    this._activeTestCase[sectionId] = testCase;
  }

  toggleTestCases(sectionId: number) {
    this._expandedTestCases[sectionId] = !this._expandedTestCases[sectionId];
  }

  // Drag and drop
  setDraggedSection(section: Section | null) {
    this._draggedSection = section;
  }

  reorderSections(draggedSectionId: number, targetSectionId: number) {
    const draggedIndex = this._sections.findIndex(s => s.id === draggedSectionId);
    const targetIndex = this._sections.findIndex(s => s.id === targetSectionId);
    
    if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
      const [draggedSection] = this._sections.splice(draggedIndex, 1);
      if (draggedSection) {
        this._sections.splice(targetIndex, 0, draggedSection);
      }
    }
  }

  // Editing state
  setEditingSection(sectionId: number | null) {
    this._editingSection = sectionId;
  }

  // Bulk operations
  setSections(sections: Section[]) {
    this._sections = [...sections]; // Create new array to ensure reactivity
    this._nextSectionId = sections.length > 0 ? Math.max(...sections.map(s => s.id), 0) + 1 : 1;
    
    // Reset related state
    this._activeTestCase = {};
    this._expandedTestCases = {};
    this._editingSection = null;
    
    // Set up active test cases for dynamic sections
    sections.forEach(section => {
      if (section.type === 'dynamic' && section.testCases.length > 0) {
        const testCase = section.testCases[0];
        if (testCase) {
          this._activeTestCase[section.id] = testCase;
          this._expandedTestCases[section.id] = true;
        }
      }
    });
  }

  clearSections() {
    this._sections = [];
    this._nextSectionId = 1;
    this._activeTestCase = {};
    this._expandedTestCases = {};
    this._editingSection = null;
    this._draggedSection = null;
  }

  // Utility methods
  getSectionById(id: number): Section | undefined {
    return this._sections.find(s => s.id === id);
  }

  getSectionIndex(id: number): number {
    return this._sections.findIndex(s => s.id === id);
  }

  // Validation helpers
  validateSection(section: Section): boolean {
    return !!(section.name?.trim() && section.content?.trim());
  }

  // Convert to dynamic section
  convertToDynamic(sectionId: number, jsContent: string) {
    const section = this._sections.find(s => s.id === sectionId);
    if (section && section.type === 'static') {
      section.type = 'dynamic';
      section.content = jsContent;
      section.testCases = [{
        name: 'Default Test',
        variables: {},
        expected: '',
        matchType: 'contains'
      }];
      
      const testCase = section.testCases[0];
      if (testCase) {
        this._activeTestCase[section.id] = testCase;
        this._expandedTestCases[section.id] = true;
      }
    }
  }
}

// Create and export the store instance
export const sectionStore = new SectionStore();
