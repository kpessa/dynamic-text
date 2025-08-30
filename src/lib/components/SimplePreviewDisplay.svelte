<script lang="ts">
  // Simple display-only preview component with props
  // No direct store access - follows incremental refactoring approach
  
  interface Props {
    previewHTML: string;
    collapsed?: boolean;
  }

  let { 
    previewHTML = '', 
    collapsed = false 
  } = $props();
</script>

{#if !collapsed}
  <div class="preview">
    {@html previewHTML}
  </div>
{/if}

<style>
  .preview {
    flex: 1;
    padding: 2rem;
    overflow: auto;
    background: white;
  }
  
  /* Ensure preview content has proper text color */
  .preview :global(*) {
    color: inherit;
  }
  
  .preview :global(h1),
  .preview :global(h2),
  .preview :global(h3),
  .preview :global(h4),
  .preview :global(h5),
  .preview :global(h6) {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: #333;
  }
  
  .preview :global(p) {
    margin-bottom: 1rem;
    line-height: 1.6;
  }
  
  .preview :global(ul),
  .preview :global(ol) {
    margin-bottom: 1rem;
    padding-left: 2rem;
  }
  
  .preview :global(li) {
    margin-bottom: 0.25rem;
  }
  
  .preview :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
  }
  
  .preview :global(th),
  .preview :global(td) {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  
  .preview :global(th) {
    background-color: #f2f2f2;
    font-weight: bold;
  }
  
  .preview :global(code) {
    background-color: #f4f4f4;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: monospace;
  }
  
  .preview :global(pre) {
    background-color: #f4f4f4;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin-bottom: 1rem;
  }
  
  .preview :global(pre code) {
    background-color: transparent;
    padding: 0;
  }
</style>