<script>
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { javascript } from '@codemirror/lang-javascript';
  import { html } from '@codemirror/lang-html';
  import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
  import { tags as t } from '@lezer/highlight';
  
  export let value = '';
  export let language = 'javascript';
  export let onChange = () => {};
  
  let element;
  let view;
  
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
    const extensions = [
      basicSetup,
      notepadPlusPlusTheme,
      syntaxHighlighting(notepadPlusPlusHighlight),
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-content': { whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
        '.cm-content.cm-focused': { outline: 'none' },
        '.cm-editor.cm-focused': { outline: '2px solid #0066cc' },
        '.cm-line': { wordWrap: 'break-word' }
      }),
      EditorView.lineWrapping,
      EditorView.updateListener.of((v) => {
        if (v.docChanged) {
          const newValue = v.state.doc.toString();
          value = newValue;
          onChange(newValue);
        }
      })
    ];
    
    if (language === 'javascript') {
      extensions.push(javascript({ jsx: true }));
    } else if (language === 'html') {
      extensions.push(html());
    }
    
    view = new EditorView({
      doc: value,
      extensions,
      parent: element
    });
  });
  
  onDestroy(() => {
    if (view) {
      view.destroy();
    }
  });
  
  $: if (view && value !== view.state.doc.toString()) {
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value
      }
    });
  }
</script>

<div bind:this={element} class="code-editor"></div>

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