<script>
  // MINIMAL VERSION FOR DEBUGGING FREEZE ISSUE
  
  let testMessage = $state('Testing Svelte 5 reactivity...');
  let counter = $state(0);
  
  function increment() {
    counter += 1;
    testMessage = `Counter: ${counter}`;
  }
</script>

<div>
  <h1>Debugging App Freeze Issue</h1>
  <p>{testMessage}</p>
  <button onclick={increment}>Increment: {counter}</button>
  <p>If you can see this and click the button, Svelte 5 reactivity is working\!</p>
</div>

<style>
  div {
    padding: 2rem;
    font-family: sans-serif;
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
</style>
