const { skeleton } = require('@skeletonlabs/tw-plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './index.html',
    // Skeleton requires this
    './node_modules/@skeletonlabs/skeleton/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      colors: {
        // Medical-grade color system (will be integrated with Skeleton theme)
        medical: {
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    skeleton({
      themes: {
        // Custom medical theme
        preset: [
          {
            name: 'medical',
            enhancements: true,
          },
        ],
      },
    }),
  ],
}

