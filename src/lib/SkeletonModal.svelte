<script>
  import { getModalStore } from './stores/modalStore.js';
  
  const modalStore = getModalStore();
  
  export function showAlert(title, message, type = 'info') {
    const modal = {
      type: 'alert',
      title: title,
      body: message,
      buttonTextCancel: 'Close',
      modalClasses: `variant-filled-${type}`
    };
    modalStore.trigger(modal);
  }
  
  export function showConfirm(title, message, onConfirm) {
    const modal = {
      type: 'confirm',
      title: title,
      body: message,
      response: (r) => {
        if (r) onConfirm();
      }
    };
    modalStore.trigger(modal);
  }
  
  export function showPrompt(title, message, onSubmit) {
    const modal = {
      type: 'prompt',
      title: title,
      body: message,
      value: '',
      response: (r) => {
        if (r) onSubmit(r);
      }
    };
    modalStore.trigger(modal);
  }
</script>

<!-- This component just exports functions, no UI needed -->