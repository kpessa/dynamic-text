<script lang="ts">
  import type { Section } from '../types/section';
  
  interface Props {
    sections?: Section[];
    activeSection?: Section | null;
    onSectionUpdate?: (id: number, content: string) => void;
    onSectionDelete?: (id: number) => void;
    onAddSection?: (type: 'static' | 'dynamic') => void;
    onConvertToDynamic?: (id: number, content: string) => void;
  }
  
  let { 
    sections = [],
    activeSection = null,
    onSectionUpdate = () => {},
    onSectionDelete = () => {},
    onAddSection = () => {},
    onConvertToDynamic = () => {}
  }: Props = $props();
</script>

<div class="editor-workspace">
  <div class="editor-header">
    <h2>Editor</h2>
    <div class="editor-actions">
      <button 
        class="btn btn-primary" 
        onclick={() => onAddSection('static')}
        title="Add HTML Section"
      >
        + HTML Section
      </button>
      <button 
        class="btn btn-secondary" 
        onclick={() => onAddSection('dynamic')}
        title="Add JavaScript Section"
      >
        + JavaScript Section
      </button>
    </div>
  </div>
  
  <div class="sections-container">
    {#each sections as section (section.id)}
      <div class="section-item {section.type} {activeSection?.id === section.id ? 'active' : ''}">
        <div class="section-header">
          <span class="section-type-badge {section.type}">
            {section.type === 'static' ? 'HTML' : 'JavaScript'}
          </span>
          <span class="section-name">{section.name || 'Untitled'}</span>
          <button 
            class="btn btn-sm btn-danger"
            onclick={() => onSectionDelete(section.id)}
            title="Delete Section"
          >
            ×
          </button>
        </div>
        
        <div class="section-content">
          <textarea 
            value={section.content}
            oninput={(e) => onSectionUpdate(section.id, e.currentTarget.value)}
            class="code-editor"
            placeholder={section.type === 'static' ? 'Enter HTML content...' : 'Enter JavaScript code...'}
          ></textarea>
        </div>
      </div>
    {/each}
    
    {#if sections.length === 0}
      <div class="empty-state">
        <p>No sections yet. Add a section to get started!</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .editor-workspace {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-surface, #fff);
    border-radius: 8px;
    overflow: hidden;
  }
  
  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--color-surface-elevated, #f5f5f5);
    border-bottom: 1px solid var(--color-border, #e0e0e0);
  }
  
  .editor-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .editor-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .sections-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }
  
  .section-item {
    margin-bottom: 1rem;
    border: 1px solid var(--color-border, #e0e0e0);
    border-radius: 6px;
    overflow: hidden;
    transition: all 0.2s ease;
  }
  
  .section-item.active {
    border-color: var(--color-primary, #007bff);
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
  
  .section-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--color-surface-elevated, #f5f5f5);
    border-bottom: 1px solid var(--color-border, #e0e0e0);
  }
  
  .section-type-badge {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    border-radius: 4px;
  }
  
  .section-type-badge.static {
    background: var(--color-info-soft, #e3f2fd);
    color: var(--color-info, #1976d2);
  }
  
  .section-type-badge.dynamic {
    background: var(--color-success-soft, #e8f5e9);
    color: var(--color-success, #4caf50);
  }
  
  .section-name {
    flex: 1;
    font-weight: 500;
  }
  
  .section-content {
    padding: 1rem;
  }
  
  .code-editor {
    width: 100%;
    min-height: 150px;
    padding: 0.75rem;
    border: 1px solid var(--color-border, #e0e0e0);
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.875rem;
    resize: vertical;
  }
  
  .empty-state {
    padding: 3rem;
    text-align: center;
    color: var(--color-text-secondary, #666);
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .btn-primary {
    background: var(--color-primary, #007bff);
    color: white;
  }
  
  .btn-primary:hover {
    background: var(--color-primary-dark, #0056b3);
  }
  
  .btn-secondary {
    background: var(--color-secondary, #6c757d);
    color: white;
  }
  
  .btn-secondary:hover {
    background: var(--color-secondary-dark, #545b62);
  }
  
  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
  
  .btn-danger {
    background: var(--color-danger, #dc3545);
    color: white;
  }
  
  .btn-danger:hover {
    background: var(--color-danger-dark, #c82333);
  }
</style>