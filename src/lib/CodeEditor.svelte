<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { EditorView } from '@codemirror/view';
  import { EditorState } from '@codemirror/state';
  import { basicSetup } from 'codemirror';
  import { javascript } from '@codemirror/lang-javascript';
  import { html } from '@codemirror/lang-html';
  import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
  import { tags as t } from '@lezer/highlight';
  
  let { 
    value = '', 
    language = 'javascript', 
    onChange = (_newValue: string) => {} 
  } = $props();
  
  const dispatch = createEventDispatcher();
  
  let element: HTMLDivElement;
  let view: EditorView | undefined;
  
  // Medical-grade code editor theme
  const medicalCodeTheme = EditorView.theme({
    '&': {
      color: 'var(--color-text-primary)',
      backgroundColor: 'var(--color-surface)',
      fontSize: 'var(--font-size-sm)',
      fontFamily: 'var(--font-mono, "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace)'
    },
    '.cm-content': {
      caretColor: 'var(--color-primary)',
      lineHeight: 'var(--line-height-relaxed)',
      padding: 'var(--space-4)',
      minHeight: '200px'
    },
    '.cm-cursor, .cm-dropCursor': { 
      borderLeftColor: 'var(--color-primary)',
      borderLeftWidth: '2px'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'var(--color-primary-200)'
    },
    '.cm-activeLine': { 
      backgroundColor: 'var(--color-primary-50)'
    },
    '.cm-activeLineGutter': { 
      backgroundColor: 'var(--color-primary-100)'
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-surface-elevated)',
      color: 'var(--color-text-tertiary)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-base) 0 0 var(--radius-base)'
    },
    '.cm-lineNumbers': {
      minWidth: '48px',
      fontSize: 'var(--font-size-xs)',
      color: 'var(--color-text-muted)'
    },
    '.cm-foldGutter': {
      width: '20px'
    }
  }, { dark: false });
  
  // Medical-appropriate syntax highlighting (clear and professional)
  const medicalSyntaxHighlight = HighlightStyle.define([
    { tag: t.keyword, color: 'var(--color-primary-700)', fontWeight: 'var(--font-weight-semibold)' },
    { tag: t.operator, color: 'var(--color-text-primary)' },
    { tag: t.variableName, color: 'var(--color-text-primary)' },
    { tag: t.function(t.variableName), color: 'var(--color-info-600)', fontWeight: 'var(--font-weight-medium)' },
    { tag: t.string, color: 'var(--color-success-700)' },
    { tag: t.number, color: 'var(--color-warning-700)' },
    { tag: t.bool, color: 'var(--color-primary-600)' },
    { tag: t.null, color: 'var(--color-primary-600)' },
    { tag: t.comment, color: 'var(--color-text-muted)', fontStyle: 'italic' },
    { tag: t.lineComment, color: 'var(--color-text-muted)', fontStyle: 'italic' },
    { tag: t.blockComment, color: 'var(--color-text-muted)', fontStyle: 'italic' },
    { tag: t.propertyName, color: 'var(--color-info-700)' },
    { tag: t.tagName, color: 'var(--color-danger-600)', fontWeight: 'var(--font-weight-medium)' },
    { tag: t.attributeName, color: 'var(--color-primary-600)' },
    { tag: t.attributeValue, color: 'var(--color-success-600)' },
    { tag: t.punctuation, color: 'var(--color-text-secondary)' },
    { tag: t.bracket, color: 'var(--color-text-secondary)' },
    { tag: t.brace, color: 'var(--color-text-secondary)' },
    { tag: t.paren, color: 'var(--color-text-secondary)' }
  ]);
  
  onMount(() => {
    // Build extensions array carefully to avoid conflicts
    const extensions: any[] = [];
    
    // Add basic setup first (this is an array of extensions)
    extensions.push(basicSetup);
    
    // Add language-specific extensions first (before themes to avoid conflicts)
    if (language === 'javascript') {
      extensions.push(javascript({ jsx: true }));
    } else if (language === 'html') {
      extensions.push(html());
    }
    
    // Add medical theme extensions
    extensions.push(medicalCodeTheme);
    extensions.push(syntaxHighlighting(medicalSyntaxHighlight));
    
    // Add medical-grade accessibility and styling
    extensions.push(EditorView.theme({
      '&': { 
        height: '100%',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      },
      '.cm-scroller': { 
        overflow: 'auto',
        '-webkit-overflow-scrolling': 'touch'
      },
      '.cm-content': { 
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        padding: 'var(--space-4)'
      },
      '.cm-content.cm-focused': { outline: 'none' },
      '.cm-editor.cm-focused': { 
        outline: 'var(--focus-ring-width) solid var(--focus-ring-color)',
        outlineOffset: 'var(--focus-ring-offset)',
        borderColor: 'var(--color-primary)',
        boxShadow: 'var(--shadow-md), 0 0 0 3px var(--color-focus-ring)'
      },
      '.cm-line': { wordWrap: 'break-word' },
      '.cm-searchMatch': {
        backgroundColor: 'var(--color-warning-200)',
        color: 'var(--color-gray-900)',
        border: '1px solid var(--color-warning-400)'
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'var(--color-warning-300)',
        borderColor: 'var(--color-warning-500)'
      }
    }));
    
    // Add line wrapping
    extensions.push(EditorView.lineWrapping);
    
    // Add update listener
    extensions.push(EditorView.updateListener.of((v) => {
      if (v.docChanged) {
        const newValue = v.state.doc.toString();
        value = newValue;
        onChange(newValue);
        
        // Check if "[f(" was typed in HTML mode
        if (language === 'html' && newValue.includes('[f(')) {
          dispatch('convertToDynamic', { content: newValue });
        }
      }
    }));
    
    try {
      const state = EditorState.create({
        doc: value,
        extensions
      });
      
      view = new EditorView({
        state,
        parent: element
      });
    } catch (error) {
      console.error('CodeMirror initialization error:', error);
      console.error('Extensions that caused the error:', extensions);
      
      // Fallback: try with minimal extensions
      try {
        console.log('Attempting fallback with minimal extensions...');
        const fallbackState = EditorState.create({
          doc: value,
          extensions: [
            ...basicSetup,
            EditorView.lineWrapping,
            language === 'javascript' ? javascript({ jsx: true }) : html(),
            EditorView.updateListener.of((v) => {
              if (v.docChanged) {
                const newValue = v.state.doc.toString();
                value = newValue;
                onChange(newValue);
                
                if (language === 'html' && newValue.includes('[f(')) {
                  dispatch('convertToDynamic', { content: newValue });
                }
              }
            })
          ]
        });
        
        view = new EditorView({
          state: fallbackState,
          parent: element
        });
        console.log('Fallback successful');
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        // Create a simple textarea as last resort
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.width = '100%';
        textarea.style.height = '100%';
        textarea.style.border = 'none';
        textarea.style.resize = 'none';
        textarea.addEventListener('input', (e) => {
          const target = e.target as HTMLTextAreaElement;
          value = target.value;
          onChange(target.value);
        });
        element.appendChild(textarea);
      }
    }
    
    // Add accessibility attributes to the editor
    const editorElement = element.querySelector('.cm-editor');
    if (editorElement) {
      editorElement.setAttribute('role', 'textbox');
      editorElement.setAttribute('aria-multiline', 'true');
      editorElement.setAttribute('aria-label', `${language} code editor`);
      if (language === 'javascript') {
        editorElement.setAttribute('aria-describedby', 'js-editor-help');
      } else if (language === 'html') {
        editorElement.setAttribute('aria-describedby', 'html-editor-help');
      }
    }
  });
  
  onDestroy(() => {
    if (view) {
      view.destroy();
    }
  });
  
  $effect(() => {
    if (view && value !== view.state.doc.toString()) {
      try {
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: value
          }
        });
      } catch (error) {
        console.error('CodeMirror update error:', error);
        // If we have a textarea fallback, update it directly
        const textarea = element.querySelector('textarea');
        if (textarea) {
          textarea.value = value;
        }
      }
    }
  });
</script>

<div bind:this={element} class="medical-code-editor">
  <!-- Hidden helper text for screen readers -->
  <div id="js-editor-help" class="sr-only">
    Medical JavaScript code editor. Use me.getValue('keyname') to access TPN values. Press Tab to move to next element. This editor supports TPN calculation functions.
  </div>
  <div id="html-editor-help" class="sr-only">
    Medical HTML content editor. Type [f( to convert to dynamic JavaScript section. Press Tab to move to next element. Use this for static medical content.
  </div>
</div>

<style lang="scss">
  @use '../styles/abstracts/variables' as *;
  @use '../styles/abstracts/mixins' as *;

  .medical-code-editor {
    width: 100%;
    height: 100%;
    min-height: 300px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    font-family: var(--font-mono);
    background-color: var(--color-surface);
    box-shadow: var(--shadow-sm);
    transition: 
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);
    position: relative;
    overflow: hidden;
    
    &:hover {
      border-color: var(--color-border-hover);
      box-shadow: var(--shadow-md);
    }
    
    &:focus-within {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-lg);
      outline: 2px solid var(--color-primary);
      outline-offset: -1px;
    }
    
    // Mobile optimization
    @include mobile {
      min-height: 200px;
      
      :global(.cm-content) {
        padding: var(--space-3) !important;
        min-height: 180px !important;
      }
      
      :global(.cm-editor) {
        font-size: 16px !important; // Prevent iOS zoom
      }
    }
  }
  
  // Global CodeMirror overrides using our design system
  :global(.medical-code-editor) {
    .cm-editor {
      height: 100% !important;
      font-size: var(--font-size-sm) !important;
      line-height: 1.6 !important;
      
      &.cm-focused {
        outline: none !important;
      }
    }
    
    .cm-content {
      padding: var(--space-4) !important;
      min-height: 250px !important;
      font-family: var(--font-mono) !important;
    }
    
    .cm-gutters {
      font-family: var(--font-mono) !important;
      background: var(--color-surface-alt);
      border-right: 1px solid var(--color-border);
    }
    
    .cm-lineNumbers {
      font-family: var(--font-mono) !important;
      user-select: none;
      
      .cm-gutterElement {
        padding: 0 var(--space-2);
      }
    }
    
    // Scrollbar styling
    .cm-scroller {
      font-family: var(--font-mono);
      scrollbar-width: thin;
      scrollbar-color: var(--color-border) transparent;
      
      &::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      
      &::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: var(--radius-sm);
        
        &:hover {
          background: var(--color-border-hover);
        }
      }
    }
    
    // Error indication for medical safety
    .cm-diagnostic-error {
      border-left: 3px solid var(--color-danger);
      background-color: var(--color-danger-alpha-10);
      padding-left: var(--space-2);
    }
  }
  
  // Accessibility improvements
  @media (prefers-reduced-motion: reduce) {
    .medical-code-editor {
      transition: none;
    }
  }
  
  @media (prefers-contrast: high) {
    .medical-code-editor {
      border-width: 2px;
      border-color: var(--color-text);
    }
  }
</style>