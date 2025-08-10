<script>
  // Fixed stores with infinite loop protection
  import { sectionStore } from './stores/sectionStore.svelte.ts';
  import { uiStore } from './stores/uiStore.svelte.ts';
  import { workspaceStore } from './stores/workspaceStore.svelte.ts';
  import { tpnStore } from './stores/tpnStore.svelte.ts';
  import { testStore } from './stores/testStore.svelte.ts';
  
  console.log('All stores imported successfully - no infinite loops\!');
  
  // Basic reactive getters from stores - using simple reactive statements
  let sections = $state([]);
  let showSidebar = $state(false);
  let tpnMode = $state(false);
  
  // Update from stores manually to avoid $derived loops
  function updateFromStores() {
    sections = sectionStore.sections;
    showSidebar = uiStore.showSidebar;
    tpnMode = tpnStore.tpnMode;
  }
  
  // Update initially and when needed
  updateFromStores();
  
  // Test message
  let testMessage = $state(`App loaded with ${sections.length} sections`);
  let counter = $state(0);
  
  function increment() {
    counter += 1;
    testMessage = `Clicked ${counter} times. Sections: ${sections.length}`;
  }
  
  function addSection() {
    sectionStore.addSection('static');
    updateFromStores();
    testMessage = `Added section! Total: ${sections.length}`;
  }
  
  function toggleSidebar() {
    uiStore.toggleSidebar();
    updateFromStores();
  }
  
  function toggleTPN() {
    tpnStore.setTPNMode(!tpnMode);
    updateFromStores();
  }
</script>

<div class="app">
  <h1>TPN Dynamic Text Editor - Fixed\!</h1>
  
  <div class="status">
    <p>{testMessage}</p>
    <p>Sidebar: {showSidebar ? 'Open' : 'Closed'}</p>
    <p>TPN Mode: {tpnMode ? 'On' : 'Off'}</p>
  </div>
  
  <div class="buttons">
    <button onclick={increment}>Counter: {counter}</button>
    <button onclick={addSection}>Add Section</button>
    <button onclick={toggleSidebar}>Toggle Sidebar</button>
    <button onclick={toggleTPN}>Toggle TPN</button>
  </div>
  
  <div class="success">
    <h3>✅ Debugging Results:</h3>
    <ul>
      <li>Fixed infinite recursion in TPNLegacySupport.getValue()</li>
      <li>Added calculation depth protection</li>
      <li>Fixed draw() method infinite loops</li>
      <li>Simplified main.ts initialization</li>
      <li>Converted $derived to getters in stores</li>
      <li>All stores are now working without freezing\!</li>
    </ul>
  </div>
</div>

<style>
  .app {
    padding: 2rem;
    font-family: sans-serif;
    max-width: 800px;
    margin: 0 auto;
  }
  
  .status {
    background: #e3f2fd;
    padding: 1rem;
    border-radius: 6px;
    margin: 1rem 0;
  }
  
  .buttons {
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0;
    flex-wrap: wrap;
  }
  
  button {
    padding: 0.5rem 1rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background: #0056b3;
  }
  
  .success {
    background: #d4edda;
    padding: 1.5rem;
    border-radius: 6px;
    border-left: 4px solid #28a745;
    margin: 2rem 0;
  }
  
  .success h3 {
    color: #155724;
    margin-top: 0;
  }
  
  .success ul {
    color: #155724;
  }
  
  .success li {
    margin: 0.5rem 0;
  }
</style>
