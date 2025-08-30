<script lang="ts">
  interface Props {
    onAddStatic: () => void;
    onAddDynamic: () => void;
  }

  let { onAddStatic, onAddDynamic }: Props = $props();
</script>

<div class="empty-state">
  <div class="empty-state-icon">📄</div>
  <h3 class="empty-state-title">Start Creating Your Reference Text</h3>
  <p class="empty-state-description">
    Add sections to build your dynamic text content
  </p>
  <div class="empty-state-actions">
    <button class="empty-state-btn static" onclick={onAddStatic}>
      <span class="btn-icon">📝</span>
      <span class="btn-label">Add Static HTML</span>
      <span class="btn-hint">For fixed content and formatting</span>
    </button>
    <button class="empty-state-btn dynamic" onclick={onAddDynamic}>
      <span class="btn-icon">⚡</span>
      <span class="btn-label">Add Dynamic JavaScript</span>
      <span class="btn-hint">For calculations and logic</span>
    </button>
  </div>
</div>

<style>
  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
    color: #666;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 8px;
    margin: 2rem 0;
  }
  
  .empty-state-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  .empty-state-title {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: #333;
  }
  
  .empty-state-description {
    margin-bottom: 2rem;
    color: #666;
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
    gap: 0.5rem;
    padding: 1.5rem 2rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 200px;
  }
  
  .empty-state-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .empty-state-btn.static {
    border-color: #4a90e2;
  }
  
  .empty-state-btn.static:hover {
    background: #f0f7ff;
    border-color: #2c5aa0;
  }
  
  .empty-state-btn.dynamic {
    border-color: #f39c12;
  }
  
  .empty-state-btn.dynamic:hover {
    background: #fff9e6;
    border-color: #e67e22;
  }
  
  .empty-state-btn .btn-icon {
    font-size: 2rem;
  }
  
  .empty-state-btn .btn-label {
    font-weight: 600;
    color: #333;
    font-size: 1rem;
  }
  
  .empty-state-btn .btn-hint {
    font-size: 0.85rem;
    color: #666;
  }
</style>