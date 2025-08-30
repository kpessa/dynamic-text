<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Section, DynamicSection, StaticSection } from '../types';
  
  interface Props {
    sections: Section[];
    tpnMode?: boolean;
    currentTPNInstance?: any;
    editingSection?: number | null;
    onSectionsChange?: (sections: Section[]) => void;
    onHasUnsavedChanges?: (hasChanges: boolean) => void;
    onEditSection?: (sectionId: number | null) => void;
  }
  
  let { 
    sections = [],
    tpnMode = false,
    currentTPNInstance = null,
    editingSection = null,
    onSectionsChange = () => {},
    onHasUnsavedChanges = () => {},
    onEditSection = () => {}
  }: Props = $props();
  
  const dispatch = createEventDispatcher();
  
  let draggedSection = $state<Section | null>(null);
  let nextSectionId = $state(1);
  let originalSections = $state<Section[] | null>(null);
  
  $effect(() => {
    if (sections && sections.length > 0) {
      const maxId = Math.max(...sections.map(s => s.id));
      nextSectionId = maxId + 1;
    }
  });
  
  $effect(() => {
    if (originalSections === null && sections.length > 0) {
      originalSections = JSON.parse(JSON.stringify(sections));
    }
  });
  
  function addSection(type: 'static' | 'dynamic') {
    console.log('[SectionManager] addSection called, current sections:', sections);
    console.log('[SectionManager] nextSectionId:', nextSectionId);
    
    const newSection: Section = type === 'static' 
      ? {
          id: nextSectionId++,
          type: 'static',
          content: ''
        } as StaticSection
      : {
          id: nextSectionId++,
          type: 'dynamic',
          content: '// Write JavaScript that returns HTML\nreturn ""',
          testCases: [{ name: 'Default', variables: {} }]
        } as DynamicSection;
    
    console.log('[SectionManager] Created new section:', newSection);
    
    const updatedSections = [...sections, newSection];
    console.log('[SectionManager] Updated sections:', updatedSections);
    console.log('[SectionManager] Dispatching sections-changed event');
    
    // Dispatch the event with the new sections
    dispatch('sections-changed', updatedSections);
    checkForChanges(updatedSections);
    
    dispatch('sectionAdded', { section: newSection });
    
    // Auto-focus the new section
    setTimeout(() => {
      onEditSection(newSection.id);
    }, 100);
  }
  
  function deleteSection(id: number) {
    const updatedSections = sections.filter(s => s.id !== id);
    dispatch('sections-changed', updatedSections);
    checkForChanges(updatedSections);
    
    if (editingSection === id) {
      onEditSection(null);
    }
    
    dispatch('sectionDeleted', { id });
  }
  
  function updateSectionContent(id: number, content: string) {
    const updatedSections = sections.map(s => 
      s.id === id ? { ...s, content } : s
    );
    dispatch('sections-changed', updatedSections);
    checkForChanges(updatedSections);
    
    dispatch('sectionUpdated', { id, content });
  }
  
  function handleConvertToDynamic(sectionId: number, content: string) {
    // Find the position of "[f(" in the content if converting from static
    const bracketIndex = content.indexOf('[f(');
    
    let dynamicContent = '';
    if (bracketIndex !== -1) {
      const htmlBefore = content.substring(0, bracketIndex).trim();
      const dynamicStart = content.substring(bracketIndex + 3);
      
      if (htmlBefore) {
        dynamicContent = `// Converted from static HTML\nlet html = \`${htmlBefore}\`;\n\n// Your dynamic expression here\n${dynamicStart || '// Start typing your JavaScript expression...'}`;
      } else {
        dynamicContent = `// Your dynamic expression here\n${dynamicStart || '// Start typing your JavaScript expression...'}`;
      }
    } else {
      dynamicContent = '// Write JavaScript that returns HTML\nreturn ""';
    }
    
    const updatedSections = sections.map(section => {
      if (section.id === sectionId && section.type === 'static') {
        const dynamicSection: DynamicSection = {
          id: section.id,
          type: 'dynamic',
          content: dynamicContent,
          testCases: [{ name: 'Default', variables: {} }]
        };
        return dynamicSection;
      }
      return section;
    });
    
    onSectionsChange(updatedSections);
    checkForChanges(updatedSections);
    
    dispatch('sectionConverted', { id: sectionId, type: 'dynamic' });
  }
  
  function checkForChanges(updatedSections?: Section[]) {
    const sectionsToCheck = updatedSections || sections;
    const hasChanges = originalSections !== null && 
      JSON.stringify(sectionsToCheck) !== JSON.stringify(originalSections);
    onHasUnsavedChanges(hasChanges);
  }
  
  function setSections(newSections: Section[]) {
    // Ensure dynamic sections have testCases for backward compatibility
    const migratedSections = newSections.map(section => {
      if (section.type === 'dynamic' && !section.testCases) {
        return {
          ...section,
          testCases: [{ name: 'Default', variables: {} }]
        } as DynamicSection;
      }
      return section;
    });
    
    onSectionsChange(migratedSections);
    originalSections = JSON.parse(JSON.stringify(migratedSections));
    nextSectionId = migratedSections.length > 0 
      ? Math.max(...migratedSections.map(s => s.id)) + 1 
      : 1;
    onHasUnsavedChanges(false);
    
    dispatch('sectionsReset', { sections: migratedSections });
  }
  
  function clearEditor() {
    setSections([]);
    onEditSection(null);
    
    dispatch('editorCleared');
  }
  
  // Drag and drop handlers
  function handleSectionDragStart(e: DragEvent, section: Section) {
    draggedSection = section;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  }
  
  function handleSectionDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }
  
  function handleSectionDrop(e: DragEvent, targetSection: Section) {
    e.preventDefault();
    if (!draggedSection || draggedSection.id === targetSection.id) return;
    
    const draggedIndex = sections.findIndex(s => s.id === draggedSection.id);
    const targetIndex = sections.findIndex(s => s.id === targetSection.id);
    
    const newSections = [...sections];
    const [removed] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, removed);
    
    onSectionsChange(newSections);
    checkForChanges(newSections);
    
    dispatch('sectionsReordered', { sections: newSections });
  }
  
  function handleSectionDragEnd() {
    draggedSection = null;
  }
  
  function handleEditClick(sectionId: number) {
    const newEditingSection = editingSection === sectionId ? null : sectionId;
    onEditSection(newEditingSection);
  }
  
  function handleDeleteClick(sectionId: number) {
    deleteSection(sectionId);
  }
  
  // Export public methods for parent component
  export function publicAddSection(type: 'static' | 'dynamic') {
    console.log('[SectionManager] publicAddSection called with type:', type);
    addSection(type);
  }
  
  export function publicDeleteSection(id: number) {
    deleteSection(id);
  }
  
  export function publicUpdateSectionContent(id: number, content: string) {
    updateSectionContent(id, content);
  }
  
  export function publicSetSections(newSections: Section[]) {
    setSections(newSections);
  }
  
  export function publicClearEditor() {
    clearEditor();
  }
  
  export function publicConvertToDynamic(sectionId: number, content: string) {
    handleConvertToDynamic(sectionId, content);
  }
</script>

<!-- SectionManager is a logic-only component, UI is handled by EditorPanel -->

<style>
  .sections {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }
  
  .empty-state {
    padding: 3rem;
    text-align: center;
    color: #6c757d;
  }
  
  .empty-state-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  .empty-state-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
    color: #333;
  }
  
  .empty-state-description {
    font-size: 1rem;
    margin: 0 0 2rem;
    color: #6c757d;
  }
  
  .empty-state-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .empty-state-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem;
    min-width: 200px;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .empty-state-btn:hover {
    border-color: #007bff;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .empty-state-btn.static:hover {
    border-color: #007bff;
    background: #f0f8ff;
  }
  
  .empty-state-btn.dynamic:hover {
    border-color: #28a745;
    background: #f0fff4;
  }
  
  .btn-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  
  .btn-label {
    font-weight: 600;
    font-size: 1rem;
    margin-bottom: 0.25rem;
    color: #333;
  }
  
  .btn-hint {
    font-size: 0.875rem;
    color: #6c757d;
  }
  
  .section {
    margin-bottom: 1rem;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    background: white;
    transition: box-shadow 0.2s;
  }
  
  .section:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .section.dragging {
    opacity: 0.5;
  }
  
  .section-header {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    border-radius: 7px 7px 0 0;
    gap: 0.5rem;
  }
  
  .drag-handle {
    cursor: move;
    color: #6c757d;
    margin-right: 0.5rem;
    user-select: none;
  }
  
  .section-type {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .section-type.static {
    background: #e7f3ff;
    color: #0066cc;
  }
  
  .section-type.dynamic {
    background: #e6f7e6;
    color: #28a745;
  }
  
  .delete-section-btn {
    margin-left: auto;
    background: transparent;
    border: none;
    color: #dc3545;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    opacity: 0.6;
    transition: opacity 0.2s;
  }
  
  .delete-section-btn:hover {
    opacity: 1;
  }
</style>