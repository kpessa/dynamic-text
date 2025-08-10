<script>
  import { sectionStore } from '../../stores/sectionStore.svelte.ts';
  import { workspaceStore } from '../../stores/workspaceStore.svelte.ts';
  import SectionItem from './SectionItem.svelte';
  
  // Reactive getters from stores
  const sections = $derived(sectionStore.sections);
  const draggedSection = $derived(sectionStore.draggedSection);
  
  function handleSectionDragOver(e) {
    e.preventDefault();
  }
  
  function handleSectionDrop(e, targetSection) {
    e.preventDefault();
    if (draggedSection && targetSection && draggedSection.id !== targetSection.id) {
      sectionStore.reorderSections(draggedSection.id, targetSection.id);
      workspaceStore.markAsChanged();
    }
    sectionStore.setDraggedSection(null);
  }
  
  function handleSectionDragEnd() {
    sectionStore.setDraggedSection(null);
  }
</script>

<div class="sections" role="list">
  {#if sections.length === 0}
    <div class="empty-state">
      <div class="empty-state-icon">📄</div>
      <h3 class="empty-state-title">Start Creating Your Reference Text</h3>
      <p class="empty-state-description">
        Add static HTML sections for consistent content, or dynamic JavaScript sections for personalized text based on patient data.
      </p>
      <div class="empty-state-actions">
        <button class="add-btn primary" onclick={() => sectionStore.addSection('static')}>
          + Add Static Section
        </button>
        <button class="add-btn secondary" onclick={() => sectionStore.addSection('dynamic')}>
          + Add Dynamic Section
        </button>
      </div>
    </div>
  {:else}
    {#each sections as section (section.id)}
      <SectionItem 
        {section}
        isDragged={draggedSection?.id === section.id}
        onDragStart={(e) => {
          sectionStore.setDraggedSection(section);
        }}
        onDragOver={handleSectionDragOver}
        onDrop={(e) => handleSectionDrop(e, section)}
        onDragEnd={handleSectionDragEnd}
        onChange={() => workspaceStore.markAsChanged()}
      />
    {/each}
  {/if}
</div>

<style>
  .sections {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 3rem 2rem;
    height: 100%;
    color: #6c757d;
  }
  
  .empty-state-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.7;
  }
  
  .empty-state-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    color: #495057;
  }
  
  .empty-state-description {
    font-size: 1rem;
    line-height: 1.5;
    margin: 0 0 2rem 0;
    max-width: 400px;
  }
  
  .empty-state-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .add-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .add-btn.primary {
    background: #007bff;
    color: white;
  }
  
  .add-btn.primary:hover {
    background: #0056b3;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,123,255,0.3);
  }
  
  .add-btn.secondary {
    background: white;
    color: #007bff;
    border: 2px solid #007bff;
  }
  
  .add-btn.secondary:hover {
    background: #f8f9fa;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,123,255,0.2);
  }
</style>