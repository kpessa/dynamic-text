<script context="module">
  // Export form field components for easy reuse
  
  export function TextField(props) {
    const { 
      label = '',
      name = '',
      value = '',
      placeholder = '',
      type = 'text',
      required = false,
      disabled = false,
      error = '',
      onchange = () => {}
    } = props;
    
    return {
      label,
      name,
      value,
      placeholder,
      type,
      required,
      disabled,
      error,
      onchange
    };
  }
</script>

<script>
  // Text Input Component
  export let textFieldProps = {};
  
  let {
    label = '',
    name = '',
    value = $bindable(''),
    placeholder = '',
    type = 'text',
    required = false,
    disabled = false,
    error = '',
    variant = 'form',
    onchange = () => {}
  } = $props();
</script>

<!-- Text Field Component -->
{#if label}
  <label class="label" for={name}>
    <span>{label} {required ? '*' : ''}</span>
  </label>
{/if}
<input
  class="input variant-{variant}-material"
  class:input-error={error}
  {type}
  {name}
  id={name}
  {placeholder}
  {required}
  {disabled}
  bind:value
  on:change={onchange}
/>
{#if error}
  <span class="text-error-500 text-sm">{error}</span>
{/if}

<!-- Select Field Component -->
{#snippet SelectField(props)}
  {@const { label, name, value, options, required, disabled, error, onchange } = props}
  
  {#if label}
    <label class="label" for={name}>
      <span>{label} {required ? '*' : ''}</span>
    </label>
  {/if}
  <select
    class="select variant-form-material"
    class:select-error={error}
    {name}
    id={name}
    {required}
    {disabled}
    bind:value
    on:change={onchange}
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  {#if error}
    <span class="text-error-500 text-sm">{error}</span>
  {/if}
{/snippet}

<!-- Textarea Component -->
{#snippet TextArea(props)}
  {@const { label, name, value, placeholder, rows = 4, required, disabled, error, onchange } = props}
  
  {#if label}
    <label class="label" for={name}>
      <span>{label} {required ? '*' : ''}</span>
    </label>
  {/if}
  <textarea
    class="textarea variant-form-material"
    class:textarea-error={error}
    {name}
    id={name}
    {rows}
    {placeholder}
    {required}
    {disabled}
    bind:value
    on:change={onchange}
  />
  {#if error}
    <span class="text-error-500 text-sm">{error}</span>
  {/if}
{/snippet}

<!-- Checkbox Component -->
{#snippet Checkbox(props)}
  {@const { label, name, checked, disabled, onchange } = props}
  
  <label class="flex items-center space-x-2">
    <input
      class="checkbox"
      type="checkbox"
      {name}
      id={name}
      {disabled}
      bind:checked
      on:change={onchange}
    />
    <p>{label}</p>
  </label>
{/snippet}

<!-- Radio Group Component -->
{#snippet RadioGroup(props)}
  {@const { label, name, value, options, disabled, onchange } = props}
  
  {#if label}
    <label class="label">
      <span>{label}</span>
    </label>
  {/if}
  <div class="space-y-2">
    {#each options as option}
      <label class="flex items-center space-x-2">
        <input
          class="radio"
          type="radio"
          {name}
          value={option.value}
          {disabled}
          checked={value === option.value}
          on:change={onchange}
        />
        <p>{option.label}</p>
      </label>
    {/each}
  </div>
{/snippet}

<!-- Switch Component -->
{#snippet Switch(props)}
  {@const { label, name, checked, disabled, onchange } = props}
  
  <label class="flex items-center justify-between">
    <span>{label}</span>
    <input
      class="switch"
      type="checkbox"
      {name}
      id={name}
      {disabled}
      bind:checked
      on:change={onchange}
    />
  </label>
{/snippet}

<!-- Range Slider Component -->
{#snippet RangeSlider(props)}
  {@const { label, name, value, min = 0, max = 100, step = 1, disabled, onchange } = props}
  
  {#if label}
    <label class="label" for={name}>
      <span>{label}: {value}</span>
    </label>
  {/if}
  <input
    class="range"
    type="range"
    {name}
    id={name}
    {min}
    {max}
    {step}
    {disabled}
    bind:value
    on:change={onchange}
  />
{/snippet}