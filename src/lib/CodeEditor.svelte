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
    onChange = (newValue: string) => {} 
  } = $props();
  
  const dispatch = createEventDispatcher();
  
  let element: HTMLDivElement;
  let view: EditorView | undefined;
  
  // Create a light theme similar to Notepad++
  const notepadPlusPlusTheme = EditorView.theme({
    '&': {
      color: '#000000',
      backgroundColor: '#ffffff'
    },
    '.cm-content': {
      caretColor: '#000000',
      lineHeight: '1.5'
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#000000' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#3399ff'
    },
    '.cm-activeLine': { backgroundColor: '#e8f2ff' },
    '.cm-activeLineGutter': { backgroundColor: '#e8f2ff' },
    '.cm-gutters': {
      backgroundColor: '#f5f5f5',
      color: '#666666',
      border: 'none'
    },
    '.cm-lineNumbers': {
      minWidth: '40px'
    }
  }, { dark: false });
  
  // Syntax highlighting colors similar to Notepad++
  const notepadPlusPlusHighlight = HighlightStyle.define([
    { tag: t.keyword, color: '#0000ff' },
    { tag: t.operator, color: '#000000' },
    { tag: t.variableName, color: '#000000' },
    { tag: t.function(t.variableName), color: '#000000' },
    { tag: t.string, color: '#a31515' },
    { tag: t.number, color: '#098658' },
    { tag: t.bool, color: '#0000ff' },
    { tag: t.null, color: '#0000ff' },
    { tag: t.comment, color: '#008000' },
    { tag: t.lineComment, color: '#008000' },
    { tag: t.blockComment, color: '#008000' },
    { tag: t.propertyName, color: '#000000' },
    { tag: t.tagName, color: '#800080' },
    { tag: t.attributeName, color: '#ff0000' },
    { tag: t.attributeValue, color: '#0000ff' },
    { tag: t.punctuation, color: '#000000' },
    { tag: t.bracket, color: '#000000' }
  ]);
  
  onMount(() => {
    // Build extensions array carefully to avoid conflicts
    const extensions = [];
    
    // Add basic setup first (this is an array of extensions)
    extensions.push(...basicSetup);
    
    // Add language-specific extensions first (before themes to avoid conflicts)
    if (language === 'javascript') {
      extensions.push(javascript({ jsx: true }));
    } else if (language === 'html') {
      extensions.push(html());
    }
    
    // Add theme extensions
    extensions.push(notepadPlusPlusTheme);
    extensions.push(syntaxHighlighting(notepadPlusPlusHighlight));
    
    // Add custom theme with higher specificity
    extensions.push(EditorView.theme({
      '&': { height: '100%' },
      '.cm-scroller': { overflow: 'auto' },
      '.cm-content': { whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
      '.cm-content.cm-focused': { outline: 'none' },
      '.cm-editor.cm-focused': { 
        outline: '3px solid #0066cc',
        outlineOffset: '2px'
      },
      '.cm-line': { wordWrap: 'break-word' }
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
          value = e.target.value;
          onChange(e.target.value);
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

<div bind:this={element} class="code-editor">
  <!-- Hidden helper text for screen readers -->
  <div id="js-editor-help" class="sr-only">
    JavaScript code editor. Use me.getValue('keyname') to access TPN values. Press Tab to move to next element.
  </div>
  <div id="html-editor-help" class="sr-only">
    HTML code editor. Type [f( to convert to dynamic JavaScript section. Press Tab to move to next element.
  </div>
</div>

<style>
  .code-editor {
    width: 100%;
    height: 100%;
    border-radius: 4px;
    overflow: hidden;
  }
  
  :global(.cm-editor) {
    height: 100%;
  }
</style>