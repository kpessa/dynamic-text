

/** @type { import('@storybook/svelte-vite').StorybookConfig } */
const config = {
  stories: [
    "../src/**/*.stories.@(js|jsx|ts|tsx|svelte)",
    "../src/stories/**/*.stories.svelte"
  ],
  addons: [
    "@storybook/addon-svelte-csf"
  ],
  framework: {
    name: "@storybook/svelte-vite",
    options: {}
  }
};

export default config;