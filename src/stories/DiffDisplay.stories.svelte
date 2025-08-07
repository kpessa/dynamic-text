<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import DiffDisplay from '../lib/DiffDisplay.svelte';

  const { Story } = defineMeta({
    title: 'Components/DiffDisplay',
    component: DiffDisplay,
    tags: ['autodocs'],
    argTypes: {
      content1: {
        control: 'text',
        description: 'First content to compare'
      },
      content2: {
        control: 'text',
        description: 'Second content to compare'
      },
      label1: {
        control: 'text',
        description: 'Label for first content'
      },
      label2: {
        control: 'text',
        description: 'Label for second content'
      },
      outputFormat: {
        control: { type: 'select' },
        options: ['side-by-side', 'line-by-line'],
        description: 'Diff display format'
      },
      diffStyle: {
        control: { type: 'select' },
        options: ['word', 'char'],
        description: 'Granularity of diff'
      },
      minHeight: {
        control: 'text',
        description: 'Minimum height of diff display'
      },
      maxHeight: {
        control: 'text',
        description: 'Maximum height of diff display'
      }
    },
    parameters: {
      layout: 'padded',
      docs: {
        description: {
          component: 'A standalone diff display component using diff2html for visualizing text differences with various display modes and styling options.'
        }
      }
    }
  });

  // Sample content for testing
  const sampleCode1 = `function calculateDose(weight, age) {
  // Initial dose calculation
  let dose = weight * 2.0;
  
  if (age < 1) {
    dose = dose * 1.5;
  } else if (age < 5) {
    dose = dose * 1.2;
  }
  
  return dose.toFixed(2) + " mg/kg/day";
}`;

  const sampleCode2 = `function calculateDose(weight, age, criticallyIll) {
  // Enhanced dose calculation with critical illness factor
  let dose = weight * 2.0;
  
  if (age < 1) {
    dose = dose * 1.5;
  } else if (age < 5) {
    dose = dose * 1.25; // Slightly increased
  } else if (age < 12) {
    dose = dose * 1.1;
  }
  
  // New: Adjust for critical illness
  if (criticallyIll) {
    dose = dose * 1.2;
  }
  
  return dose.toFixed(2) + " mg/kg/day";
}`;

  const sampleHTML1 = `<h3>Clinical Guidelines</h3>
<p>Standard dosing protocol for pediatric patients.</p>
<ul>
  <li>Neonates: 2.0-3.0 g/kg/day</li>
  <li>Infants: 1.5-2.5 g/kg/day</li>
  <li>Children: 1.0-2.0 g/kg/day</li>
</ul>
<p>Monitor weekly and adjust as needed.</p>`;

  const sampleHTML2 = `<h3>Clinical Guidelines - Updated 2024</h3>
<p>Enhanced dosing protocol for pediatric patients with new evidence-based recommendations.</p>
<ul>
  <li>Premature Neonates: 2.5-3.5 g/kg/day</li>
  <li>Term Neonates: 2.0-3.0 g/kg/day</li>
  <li>Infants: 1.5-2.5 g/kg/day</li>
  <li>Children (1-10y): 1.0-2.0 g/kg/day</li>
  <li>Adolescents: 0.8-1.5 g/kg/day</li>
</ul>
<p>Monitor weekly with enhanced biomarkers. Consider nitrogen balance studies for optimization.</p>
<p><strong>New:</strong> Increase by 20% during critical illness or major surgery.</p>`;

  const minorDiff1 = `The patient requires careful monitoring of nutritional status.
Daily weights should be obtained.
Laboratory values should be checked weekly.
Adjust dosing based on clinical response.`;

  const minorDiff2 = `The patient requires careful monitoring of nutritional status.
Daily weights should be obtained.
Laboratory values should be checked twice weekly.
Adjust dosing based on clinical response and biomarkers.`;

  const identicalContent = `This content is exactly the same on both sides.
No differences will be shown.
Perfect match!`;
</script>

<Story 
  name="Default"
  args={{
    content1: sampleCode1,
    content2: sampleCode2,
    label1: 'Original',
    label2: 'Modified',
    outputFormat: 'side-by-side',
    diffStyle: 'word',
    minHeight: '400px',
    maxHeight: '600px'
  }}
/>

<Story 
  name="CodeComparison"
  args={{
    content1: sampleCode1,
    content2: sampleCode2,
    label1: 'Version 1.0',
    label2: 'Version 2.0',
    outputFormat: 'side-by-side',
    diffStyle: 'word',
    minHeight: '500px',
    maxHeight: '800px'
  }}
/>

<Story 
  name="HTMLComparison"
  args={{
    content1: sampleHTML1,
    content2: sampleHTML2,
    label1: '2023 Guidelines',
    label2: '2024 Guidelines',
    outputFormat: 'side-by-side',
    diffStyle: 'word',
    minHeight: '500px',
    maxHeight: '800px'
  }}
/>

<Story 
  name="UnifiedView"
  args={{
    content1: sampleHTML1,
    content2: sampleHTML2,
    label1: 'Before',
    label2: 'After',
    outputFormat: 'line-by-line',
    diffStyle: 'word',
    minHeight: '400px',
    maxHeight: '700px'
  }}
/>

<Story 
  name="CharacterLevelDiff"
  args={{
    content1: minorDiff1,
    content2: minorDiff2,
    label1: 'Original',
    label2: 'Revised',
    outputFormat: 'side-by-side',
    diffStyle: 'char',
    minHeight: '300px',
    maxHeight: '500px'
  }}
/>

<Story 
  name="MinorChanges"
  args={{
    content1: minorDiff1,
    content2: minorDiff2,
    label1: 'Draft 1',
    label2: 'Draft 2',
    outputFormat: 'side-by-side',
    diffStyle: 'word',
    minHeight: '300px',
    maxHeight: '500px'
  }}
/>

<Story 
  name="IdenticalContent"
  args={{
    content1: identicalContent,
    content2: identicalContent,
    label1: 'Left',
    label2: 'Right',
    outputFormat: 'side-by-side',
    diffStyle: 'word',
    minHeight: '200px',
    maxHeight: '400px'
  }}
/>

<Story 
  name="LargeContent"
  args={{
    content1: sampleHTML1 + '\n\n' + sampleCode1 + '\n\n' + minorDiff1,
    content2: sampleHTML2 + '\n\n' + sampleCode2 + '\n\n' + minorDiff2,
    label1: 'Complete Doc v1',
    label2: 'Complete Doc v2',
    outputFormat: 'side-by-side',
    diffStyle: 'word',
    minHeight: '600px',
    maxHeight: '900px'
  }}
/>

<Story 
  name="CompactView"
  args={{
    content1: 'Initial dose: 1.5 mg/kg',
    content2: 'Initial dose: 2.0 mg/kg',
    label1: 'Old',
    label2: 'New',
    outputFormat: 'line-by-line',
    diffStyle: 'word',
    minHeight: '150px',
    maxHeight: '300px'
  }}
/>