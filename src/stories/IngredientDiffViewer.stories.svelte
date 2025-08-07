<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import IngredientDiffViewerMock from './IngredientDiffViewerMock.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Components/IngredientDiffViewer',
    component: IngredientDiffViewerMock,
    tags: ['autodocs'],
    argTypes: {
      ingredient: {
        control: 'object',
        description: 'The ingredient to compare references for'
      },
      healthSystem: {
        control: 'text',
        description: 'Optional health system filter'
      },
      onClose: {
        description: 'Callback when the viewer is closed'
      }
    },
    args: {
      onClose: fn()
    },
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component: 'A diff viewer component for comparing ingredient references across different population types and versions. Supports side-by-side and unified diff views with enhanced diff2html integration.'
        }
      }
    }
  });

  // Mock ingredient data
  const mockIngredient = {
    id: 'amino-acids-001',
    name: 'Amino Acids',
    category: 'Macronutrients',
    unit: 'g/kg/day'
  };
  
  const minimalIngredient = {
    id: 'test-001',
    name: 'Test Ingredient',
    category: 'Test',
    unit: 'mg'
  };
  
  const electrolytesIngredient = {
    id: 'sodium-001',
    name: 'Sodium',
    category: 'Electrolytes',
    unit: 'mEq/kg/day'
  };
</script>

<Story 
  name="Default"
  args={{
    ingredient: mockIngredient,
    healthSystem: null
  }}
/>

<Story 
  name="FilteredByHealthSystem"
  args={{
    ingredient: mockIngredient,
    healthSystem: 'CHOC'
  }}
/>

<Story 
  name="DifferentIngredient"
  args={{
    ingredient: electrolytesIngredient,
    healthSystem: null
  }}
/>

<Story 
  name="MinimalData"
  args={{
    ingredient: minimalIngredient,
    healthSystem: null
  }}
/>