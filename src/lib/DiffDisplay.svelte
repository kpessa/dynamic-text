<script>
  import * as Diff2Html from 'diff2html';
  import 'diff2html/bundles/css/diff2html.min.css';
  import { createPatch } from 'diff';
  
  let {
    content1 = '',
    content2 = '',
    label1 = 'Original',
    label2 = 'Modified',
    outputFormat = 'side-by-side', // 'side-by-side' or 'line-by-line'
    diffStyle = 'word', // 'word' or 'char'
    showLineNumbers = true,
    synchronisedScroll = true,
    highlight = true,
    colorScheme = 'light',
    minHeight = '400px',
    maxHeight = '800px'
  } = $props();
  
  // Create unified diff format from two texts using the diff library
  function createUnifiedDiff(text1, text2, label1, label2) {
    // Convert HTML to plain text for better diffing
    const plainText1 = text1.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
    const plainText2 = text2.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
    
    // Use the diff library to create a proper unified diff
    const unifiedDiff = createPatch(
      label1,  // fileName
      plainText1,  // oldStr
      plainText2,  // newStr
      label1,  // oldHeader
      label2,  // newHeader
      { context: 3 }  // number of context lines
    );
    
    return unifiedDiff;
  }
  
  // Generate diff HTML using diff2html
  function generateDiffHtml(content1, content2, label1, label2) {
    const unifiedDiff = createUnifiedDiff(content1, content2, label1, label2);
    
    if (!unifiedDiff || unifiedDiff.trim() === '') {
      return '<div class="no-differences">No differences found</div>';
    }
    
    try {
      const diffJson = Diff2Html.parse(unifiedDiff);
      const diffHtml = Diff2Html.html(diffJson, {
        inputFormat: 'diff',
        outputFormat: outputFormat,
        showFiles: false,
        matching: 'lines',
        matchWordsThreshold: 0.25,
        matchingMaxComparisons: 2500,
        maxLineLengthHighlight: 10000,
        diffStyle: diffStyle,
        renderNothingWhenEmpty: false,
        synchronisedScroll: synchronisedScroll,
        highlight: highlight,
        colorScheme: colorScheme,
        drawFileList: false
      });
      
      return diffHtml || '<div class="no-differences">No differences found</div>';
    } catch (error) {
      console.error('Error generating diff:', error);
      return '<div class="diff-error">Error generating diff display</div>';
    }
  }
  
  let diffHtml = $derived(generateDiffHtml(content1, content2, label1, label2));
  
  // Calculate similarity percentage
  let similarity = $derived(() => {
    const plainText1 = content1.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
    const plainText2 = content2.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
    
    const lines1 = plainText1.split('\n');
    const lines2 = plainText2.split('\n');
    
    const maxLines = Math.max(lines1.length, lines2.length);
    let matchingLines = 0;
    
    for (let i = 0; i < Math.min(lines1.length, lines2.length); i++) {
      if (lines1[i] === lines2[i]) {
        matchingLines++;
      }
    }
    
    return maxLines > 0 ? ((matchingLines / maxLines) * 100).toFixed(1) : '0';
  });
</script>

<div class="diff-display-container" style="--min-height: {minHeight}; --max-height: {maxHeight};">
  <div class="diff-header">
    <div class="diff-labels">
      <span class="label label-original">{label1}</span>
      <span class="vs">vs</span>
      <span class="label label-modified">{label2}</span>
    </div>
    <div class="diff-stats">
      <span class="similarity">{similarity()}% similar</span>
    </div>
  </div>
  
  <div class="diff-content">
    {@html diffHtml}
  </div>
</div>

<style>
  .diff-display-container {
    display: flex;
    flex-direction: column;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    min-height: var(--min-height);
    max-height: var(--max-height);
    height: 100%;
    position: relative;
  }
  
  .diff-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    flex-shrink: 0;
  }
  
  .diff-labels {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .label {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-weight: 500;
    font-size: 0.9rem;
  }
  
  .label-original {
    background-color: #e3f2fd;
    color: #1976d2;
  }
  
  .label-modified {
    background-color: #f3e5f5;
    color: #7b1fa2;
  }
  
  .vs {
    color: #666;
    font-weight: 500;
  }
  
  .diff-stats {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .similarity {
    font-size: 0.9rem;
    color: #28a745;
    font-weight: 500;
  }
  
  .diff-content {
    flex: 1;
    overflow: auto;
    padding: 0;
    min-height: 0; /* Important for flex shrinking */
  }
  
  /* No differences message */
  .diff-content :global(.no-differences) {
    padding: 2rem;
    text-align: center;
    color: #666;
    font-style: italic;
  }
  
  .diff-content :global(.diff-error) {
    padding: 2rem;
    text-align: center;
    color: #dc3545;
  }
  
  /* diff2html customization */
  .diff-content :global(.d2h-wrapper) {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
    font-size: 0.875rem;
    min-height: 100%;
  }
  
  .diff-content :global(.d2h-file-header) {
    display: none; /* Hide file headers since we show our own */
  }
  
  .diff-content :global(.d2h-file-wrapper) {
    border: none;
    border-radius: 0;
    margin: 0;
  }
  
  .diff-content :global(.d2h-diff-table) {
    font-size: 0.875rem;
    width: 100%;
  }
  
  .diff-content :global(.d2h-code-line) {
    padding: 0 10px;
    min-height: 20px;
  }
  
  .diff-content :global(.d2h-code-line-ctn) {
    word-wrap: break-word;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-width: 100%;
  }
  
  /* Enhanced diff colors for better visibility */
  .diff-content :global(.d2h-ins) {
    background-color: #e8f5e9;
    border-color: #4caf50;
  }
  
  .diff-content :global(.d2h-del) {
    background-color: #ffebee;
    border-color: #f44336;
  }
  
  .diff-content :global(.d2h-ins .d2h-change) {
    background-color: #a5d6a7;
    color: #1b5e20;
  }
  
  .diff-content :global(.d2h-del .d2h-change) {
    background-color: #ef9a9a;
    color: #b71c1c;
  }
  
  /* Side-by-side specific styles */
  .diff-content :global(.d2h-file-side-diff) {
    width: 100%;
    table-layout: fixed;
  }
  
  .diff-content :global(.d2h-file-side-diff .d2h-code-side-line) {
    padding: 0 5px;
    width: 50%;
  }
  
  /* Line numbers */
  .diff-content :global(.d2h-code-linenumber) {
    min-width: 3.5em;
    background-color: #f5f5f5;
    color: #666;
    border-right: 1px solid #ddd;
    user-select: none;
  }
  
  /* Ensure proper sizing for side-by-side view */
  .diff-content :global(.d2h-file-side-diff) {
    display: table;
    width: 100%;
  }
  
  .diff-content :global(.d2h-file-side-diff tbody) {
    display: table-row-group;
  }
  
  .diff-content :global(.d2h-file-side-diff tr) {
    display: table-row;
  }
  
  .diff-content :global(.d2h-file-side-diff td) {
    display: table-cell;
    vertical-align: top;
  }
  
  /* Make sure content takes full height */
  .diff-content :global(.d2h-wrapper),
  .diff-content :global(.d2h-file-list-wrapper),
  .diff-content :global(.d2h-file-wrapper) {
    height: 100%;
  }
  
  /* Scrollbar styling */
  .diff-content {
    scrollbar-width: thin;
    scrollbar-color: #888 #f1f1f1;
  }
  
  .diff-content::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .diff-content::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  
  .diff-content::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  
  .diff-content::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>