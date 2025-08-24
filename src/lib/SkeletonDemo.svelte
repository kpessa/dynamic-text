<script>
  import { getToastStore } from './stores/toastStore.ts';
import { getModalStore } from './stores/modalStore.js';
  import SkeletonCard from './SkeletonCard.svelte';
  import SkeletonButton from './SkeletonButton.svelte';
  
  const toastStore = getToastStore();
  const modalStore = getModalStore();
  const drawerStore = getDrawerStore();
  
  let inputValue = $state('');
  let selectValue = $state('option1');
  let checkboxValue = $state(false);
  let switchValue = $state(false);
  let rangeValue = $state(50);
  
  function showToast(preset) {
    toastStore.trigger({
      message: `This is a ${preset} toast!`,
      preset,
      timeout: 3000
    });
  }
  
  function showModal() {
    modalStore.trigger({
      type: 'alert',
      title: 'Skeleton UI Integration',
      body: 'This modal demonstrates Skeleton UI v3 integration with your TPN Editor!',
      buttonTextCancel: 'Awesome!'
    });
  }
  
  function showConfirmModal() {
    modalStore.trigger({
      type: 'confirm',
      title: 'Confirm Action',
      body: 'Are you sure you want to proceed with this action?',
      response: (r) => {
        if (r) {
          toastStore.trigger({
            message: 'Action confirmed!',
            preset: 'success'
          });
        }
      }
    });
  }
  
  function showDrawer() {
    drawerStore.open({
      id: 'demo-drawer',
      position: 'left',
      width: 'w-[280px] md:w-[480px]',
      padding: 'p-4',
      rounded: 'rounded-xl'
    });
  }
</script>

<div class="space-y-6">
  <!-- Header Card -->
  <SkeletonCard title="Skeleton UI v3 Integration" subtitle="Modern UI components for your TPN Editor">
    <p class="text-surface-600-300-token">
      Skeleton UI provides a comprehensive set of components built with Svelte 5 and Tailwind CSS.
      All components are fully accessible and follow medical-grade design standards.
    </p>
  </SkeletonCard>

  <!-- Buttons Section -->
  <SkeletonCard title="Button Components">
    <div class="flex flex-wrap gap-2">
      <SkeletonButton variant="filled" color="primary" onclick={() => showToast('primary')}>
        Primary Button
      </SkeletonButton>
      <SkeletonButton variant="filled" color="secondary" onclick={() => showToast('secondary')}>
        Secondary
      </SkeletonButton>
      <SkeletonButton variant="filled" color="success" onclick={() => showToast('success')}>
        Success
      </SkeletonButton>
      <SkeletonButton variant="filled" color="warning" onclick={() => showToast('warning')}>
        Warning
      </SkeletonButton>
      <SkeletonButton variant="filled" color="error" onclick={() => showToast('error')}>
        Error
      </SkeletonButton>
    </div>
    
    <div class="flex flex-wrap gap-2 mt-4">
      <SkeletonButton variant="ghost" color="primary" icon="edit">
        Edit
      </SkeletonButton>
      <SkeletonButton variant="ghost" color="secondary" icon="save">
        Save
      </SkeletonButton>
      <SkeletonButton variant="soft" color="primary" icon="download">
        Export
      </SkeletonButton>
      <SkeletonButton variant="ringed" color="primary" loading={true}>
        Loading
      </SkeletonButton>
    </div>
  </SkeletonCard>

  <!-- Forms Section -->
  <SkeletonCard title="Form Components">
    <div class="space-y-4">
      <!-- Text Input -->
      <label class="label">
        <span>Text Input</span>
        <input 
          class="input variant-form-material" 
          type="text" 
          placeholder="Enter some text..."
          bind:value={inputValue}
        />
      </label>

      <!-- Select -->
      <label class="label">
        <span>Select Dropdown</span>
        <select class="select variant-form-material" bind:value={selectValue}>
          <option value="option1">Option 1</option>
          <option value="option2">Option 2</option>
          <option value="option3">Option 3</option>
        </select>
      </label>

      <!-- Textarea -->
      <label class="label">
        <span>Textarea</span>
        <textarea 
          class="textarea variant-form-material" 
          rows="3" 
          placeholder="Enter description..."
        />
      </label>

      <!-- Checkbox -->
      <label class="flex items-center space-x-2">
        <input class="checkbox" type="checkbox" bind:checked={checkboxValue} />
        <p>Enable notifications</p>
      </label>

      <!-- Switch -->
      <label class="flex items-center justify-between">
        <span>Dark Mode</span>
        <input class="switch" type="checkbox" bind:checked={switchValue} />
      </label>

      <!-- Range Slider -->
      <label class="label">
        <span>Volume: {rangeValue}%</span>
        <input 
          class="range" 
          type="range" 
          min="0" 
          max="100" 
          bind:value={rangeValue}
        />
      </label>
    </div>
  </SkeletonCard>

  <!-- Interactive Components -->
  <SkeletonCard title="Interactive Components">
    <div class="flex flex-wrap gap-2">
      <button class="btn variant-filled-primary" on:click={showModal}>
        Show Modal
      </button>
      <button class="btn variant-filled-secondary" on:click={showConfirmModal}>
        Confirm Dialog
      </button>
      <button class="btn variant-filled-tertiary" on:click={showDrawer}>
        Open Drawer
      </button>
    </div>
  </SkeletonCard>

  <!-- Alerts Section -->
  <SkeletonCard title="Alert Components">
    <div class="space-y-2">
      <aside class="alert variant-filled-success">
        <div class="alert-message">
          <h3 class="h4">Success</h3>
          <p>Your changes have been saved successfully.</p>
        </div>
      </aside>
      
      <aside class="alert variant-filled-warning">
        <div class="alert-message">
          <h3 class="h4">Warning</h3>
          <p>Please review your input before proceeding.</p>
        </div>
      </aside>
      
      <aside class="alert variant-filled-error">
        <div class="alert-message">
          <h3 class="h4">Error</h3>
          <p>An error occurred while processing your request.</p>
        </div>
      </aside>
    </div>
  </SkeletonCard>

  <!-- Medical UI Components -->
  <SkeletonCard title="Medical UI Components" variant="ghost" color="primary">
    <div class="space-y-4">
      <!-- Progress indicators -->
      <div>
        <p class="text-sm font-medium mb-2">Patient Progress</p>
        <div class="progress-bar">
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: 75%"></div>
          </div>
        </div>
      </div>

      <!-- Badge components -->
      <div>
        <p class="text-sm font-medium mb-2">Status Badges</p>
        <div class="flex gap-2">
          <span class="badge variant-filled-success">Active</span>
          <span class="badge variant-filled-warning">Pending</span>
          <span class="badge variant-filled-error">Critical</span>
          <span class="badge variant-soft-primary">TPN</span>
          <span class="badge variant-soft-secondary">Neonatal</span>
        </div>
      </div>

      <!-- Chip components -->
      <div>
        <p class="text-sm font-medium mb-2">Ingredient Chips</p>
        <div class="flex flex-wrap gap-2">
          <span class="chip variant-filled">Sodium</span>
          <span class="chip variant-filled">Potassium</span>
          <span class="chip variant-filled">Calcium</span>
          <span class="chip variant-filled">Magnesium</span>
        </div>
      </div>
    </div>
  </SkeletonCard>

  <!-- Table Example -->
  <SkeletonCard title="Data Table">
    <div class="table-container">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Ingredient</th>
            <th>Value</th>
            <th>Unit</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sodium</td>
            <td>140</td>
            <td>mEq/L</td>
            <td><span class="badge variant-filled-success">Normal</span></td>
          </tr>
          <tr>
            <td>Potassium</td>
            <td>5.2</td>
            <td>mEq/L</td>
            <td><span class="badge variant-filled-warning">High</span></td>
          </tr>
          <tr>
            <td>Glucose</td>
            <td>85</td>
            <td>mg/dL</td>
            <td><span class="badge variant-filled-success">Normal</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </SkeletonCard>
</div>

<style>
  /* Additional styles for medical UI */
  .progress-bar {
    @apply w-full bg-surface-300-600-token rounded-full h-2;
  }
  
  .progress-bar-track {
    @apply h-full rounded-full;
  }
  
  .progress-bar-fill {
    @apply bg-primary-500 h-full rounded-full transition-all duration-300;
  }
</style>