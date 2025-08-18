import type { Section, TestCase } from '../types/section.js';
import { eventBus } from '../lib/eventBus.ts';

// Section store using Svelte 5 runes
class SectionStore {
  private _sections = $state<Section[]>([]);
  private _nextSectionId = $state<number>(1);
  private _activeTestCase = $state<Record<number, TestCase>>({});
  private _expandedTestCases = $state<Record<number, boolean>>({});
  private _editingSection = $state<number | null>(null);
  private _draggedSection = $state<Section | null>(null);
  private _originalSections = $state<string>('[]');
  private _hasUnsavedChanges = $state<boolean>(false);

  // Getters for state
  get sections() { return this._sections; }
  get nextSectionId() { return this._nextSectionId; }
  get activeTestCase() { return this._activeTestCase; }
  get expandedTestCases() { return this._expandedTestCases; }
  get editingSection() { return this._editingSection; }
  get draggedSection() { return this._draggedSection; }
  get originalSections() { return this._originalSections; }
  get hasUnsavedChanges() { return this._hasUnsavedChanges; }

  // Derived values using Svelte 5 $derived
  dynamicSections = $derived(this._sections.filter(s => s.type === 'dynamic'));
  sectionsJSON = $derived(this.sectionsToJSON());
  lineObjects = $derived(this.sectionsToLineObjects());

  // Computed properties using $derived
  hasActiveSections = $derived(this._sections.length > 0);
  dynamicSectionCount = $derived(this._sections.filter(s => s.type === 'dynamic').length);
  staticSectionCount = $derived(this._sections.filter(s => s.type === 'static').length);

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
        // variables: {},
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
      this.checkForChanges();
      eventBus.emit('section:updated', { sectionId: id, content });
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
        // variables: {},
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
      const newTestCase: TestCase = {
        name: currentTestCase.name,
        variables: currentTestCase.variables,
        expected: currentTestCase.expected,
        matchType: currentTestCase.matchType,
        ...updates
      };
      if (currentTestCase.expectedStyles !== undefined || updates.expectedStyles !== undefined) {
        newTestCase.expectedStyles = updates.expectedStyles ?? currentTestCase.expectedStyles;
      }
      updatedTestCases[index] = newTestCase;
      
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
    
    // Store original state for change detection
    this._originalSections = JSON.stringify(sections);
    this._hasUnsavedChanges = false;
    eventBus.emit('sections:loaded', sections);
  }

  clearSections() {
    this._sections = [];
    this._nextSectionId = 1;
    this._activeTestCase = {};
    this._expandedTestCases = {};
    this._editingSection = null;
    this._draggedSection = null;
    this._originalSections = '[]';
    this._hasUnsavedChanges = false;
    eventBus.emit('sections:cleared');
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
    const sectionIndex = this._sections.findIndex(s => s.id === sectionId);
    if (sectionIndex !== -1 && this._sections[sectionIndex] && this._sections[sectionIndex].type === 'static') {
      const section = this._sections[sectionIndex];
      const newSection: Section = {
        ...section,
        type: 'dynamic',
        content: jsContent,
        testCases: [{
          name: 'Default Test',
          // variables: {},
          expected: '',
          matchType: 'contains'
        }]
      };
      
      this._sections[sectionIndex] = newSection;
      const testCase = newSection.testCases[0];
      if (testCase) {
        this._activeTestCase[section.id] = testCase;
        this._expandedTestCases[section.id] = true;
      }
      
      this.checkForChanges();
      eventBus.emit('section:converted', { sectionId, type: 'dynamic' });
    }
  }
  
  // Change detection
  checkForChanges() {
    const currentSections = JSON.stringify(this._sections);
    this._hasUnsavedChanges = currentSections !== this._originalSections;
    eventBus.emit('changes:detected', this._hasUnsavedChanges);
  }
  
  // Export methods for JSON output
  sectionsToJSON(): string {
    const output: any[] = [];
    
    this._sections.forEach(section => {
      if (section.type === 'static') {
        output.push({
          type: 'static',
          content: section.content
        });
      } else if (section.type === 'dynamic') {
        output.push({
          type: 'dynamic',
          content: section.content,
          testCases: section.testCases || []
        });
      }
    });
    
    return JSON.stringify(output, null, 2);
  }
  
  sectionsToLineObjects(): any[] {
    const lines: any[] = [];
    
    this._sections.forEach(section => {
      if (section.type === 'static') {
        lines.push({
          type: 'static',
          name: section.name,
          content: section.content
        });
      } else if (section.type === 'dynamic') {
        lines.push({
          type: 'dynamic',
          name: section.name,
          content: section.content,
          testCases: section.testCases || []
        });
      }
    });
    
    return lines;
  }
  
  // Reset to saved state
  resetToSaved() {
    if (this._originalSections) {
      const originalSections = JSON.parse(this._originalSections);
      this.setSections(originalSections);
    }
  }
  
  // Mark as saved
  markAsSaved() {
    this._originalSections = JSON.stringify(this._sections);
    this._hasUnsavedChanges = false;
    eventBus.emit('sections:saved');
  }
}

// Create and export the store instance
export const sectionStore = new SectionStore();
