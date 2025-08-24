import { writable } from 'svelte/store';

function createModalStore() {
  const { subscribe, set, update } = writable({
    isOpen: false,
    component: null,
    props: {}
  });

  return {
    subscribe,
    trigger: (config) => {
      set({
        isOpen: true,
        component: config.component,
        props: config.props || {}
      });
    },
    close: () => {
      set({
        isOpen: false,
        component: null,
        props: {}
      });
    }
  };
}

export const modalStore = createModalStore();

export function getModalStore() {
  return modalStore;
}
