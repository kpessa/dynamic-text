<script>
  let { 
    title = '',
    subtitle = '',
    variant = 'ghost',
    color = 'surface',
    padding = 'p-4',
    class: customClass = '',
    children,
    footer = null,
    actions = null
  } = $props();

  $: cardClass = `card variant-${variant}-${color} ${padding} ${customClass}`;
</script>

<div class={cardClass}>
  {#if title || subtitle}
    <header class="card-header">
      {#if title}
        <h3 class="h3 font-bold">{title}</h3>
      {/if}
      {#if subtitle}
        <p class="text-sm opacity-75">{subtitle}</p>
      {/if}
    </header>
  {/if}
  
  <section class="p-4">
    {@render children?.()}
  </section>
  
  {#if footer || actions}
    <footer class="card-footer">
      {#if footer}
        <div class="flex-1">
          {@render footer()}
        </div>
      {/if}
      {#if actions}
        <div class="flex gap-2">
          {@render actions()}
        </div>
      {/if}
    </footer>
  {/if}
</div>