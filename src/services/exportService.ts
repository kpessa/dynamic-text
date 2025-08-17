/**
 * Export Service
 * Handles exporting sections to various formats (JSON, configurator format, etc.)
 */

import { sanitizeHTML } from './codeExecutionService';

interface Section {
  id: string;
  type: 'static' | 'dynamic';
  content: string;
  testCases?: any[];
}

interface LineObject {
  id: string;
  text: string;
  editable: boolean;
  type: 'static' | 'dynamic';
  originalContent?: string;
}

/**
 * Convert sections to JSON format for export
 */
export function sectionsToJSON(sections: Section[]): any {
  return {
    version: '2.0',
    timestamp: new Date().toISOString(),
    sections: sections.map(section => ({
      id: section.id,
      type: section.type,
      content: section.content,
      testCases: section.testCases || []
    })),
    metadata: {
      totalSections: sections.length,
      staticSections: sections.filter(s => s.type === 'static').length,
      dynamicSections: sections.filter(s => s.type === 'dynamic').length,
      hasTests: sections.some(s => s.testCases && s.testCases.length > 0)
    }
  };
}

/**
 * Convert sections to line objects for configurator view
 */
export function sectionsToLineObjects(sections: Section[]): LineObject[] {
  const lines: LineObject[] = [];
  
  sections.forEach(section => {
    if (section.type === 'static') {
      // For static sections, each line becomes a line object
      const contentLines = section.content.split('\n');
      contentLines.forEach((line, index) => {
        lines.push({
          id: `${section.id}-${index}`,
          text: sanitizeHTML(line),
          editable: false,
          type: 'static',
          originalContent: line
        });
      });
    } else {
      // For dynamic sections, treat as single editable block
      lines.push({
        id: section.id,
        text: `[Dynamic: ${section.content.substring(0, 50)}...]`,
        editable: true,
        type: 'dynamic',
        originalContent: section.content
      });
    }
  });
  
  return lines;
}

/**
 * Export sections as HTML document
 */
export function exportAsHTML(sections: Section[], previewHTML: string): string {
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TPN Reference Export</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3 { color: #2c3e50; }
        .section { margin-bottom: 20px; }
        .dynamic-section {
            background-color: #f0f8ff;
            border-left: 4px solid #007bff;
            padding: 10px;
            margin: 10px 0;
        }
        .static-section {
            background-color: #f9f9f9;
            padding: 10px;
            margin: 10px 0;
        }
        .metadata {
            background-color: #e8e8e8;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="metadata">
        <strong>Exported:</strong> ${new Date().toLocaleString()}<br>
        <strong>Sections:</strong> ${sections.length} total 
        (${sections.filter(s => s.type === 'static').length} static, 
         ${sections.filter(s => s.type === 'dynamic').length} dynamic)
    </div>
    
    <div class="preview">
        ${previewHTML}
    </div>
    
    <hr>
    
    <h2>Source Sections</h2>
    ${sections.map(section => `
        <div class="section ${section.type}-section">
            <h3>${section.type === 'static' ? '📝' : '⚡'} ${section.type.toUpperCase()} Section</h3>
            <pre>${section.content}</pre>
        </div>
    `).join('')}
</body>
</html>
  `;
  
  return htmlTemplate;
}

/**
 * Export sections as Markdown
 */
export function exportAsMarkdown(sections: Section[]): string {
  let markdown = '# TPN Reference Export\n\n';
  markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  markdown += `**Total Sections:** ${sections.length}\n\n`;
  markdown += '---\n\n';
  
  sections.forEach((section, index) => {
    const icon = section.type === 'static' ? '📝' : '⚡';
    markdown += `## ${icon} Section ${index + 1} (${section.type})\n\n`;
    
    if (section.type === 'static') {
      markdown += section.content + '\n\n';
    } else {
      markdown += '```javascript\n';
      markdown += section.content;
      markdown += '\n```\n\n';
      
      if (section.testCases && section.testCases.length > 0) {
        markdown += '### Test Cases:\n\n';
        section.testCases.forEach((test, testIndex) => {
          markdown += `${testIndex + 1}. **${test.name}**\n`;
          if (test.variables && Object.keys(test.variables).length > 0) {
            markdown += '   - Variables: ' + JSON.stringify(test.variables) + '\n';
          }
          if (test.expectedOutput) {
            markdown += '   - Expected: ' + test.expectedOutput + '\n';
          }
        });
        markdown += '\n';
      }
    }
    
    markdown += '---\n\n';
  });
  
  return markdown;
}

/**
 * Import sections from JSON
 */
export function importFromJSON(jsonData: any): Section[] {
  // Handle both old and new formats
  if (Array.isArray(jsonData)) {
    // Old format - direct array of sections
    return jsonData.map((section) => ({
      id: section.id || crypto.randomUUID(),
      type: section.type || 'static',
      content: section.content || '',
      testCases: section.testCases || []
    }));
  } else if (jsonData.sections) {
    // New format with metadata
    return jsonData.sections.map((section: any) => ({
      id: section.id || crypto.randomUUID(),
      type: section.type || 'static',
      content: section.content || '',
      testCases: section.testCases || []
    }));
  } else {
    throw new Error('Invalid JSON format');
  }
}

/**
 * Validate import data
 */
export function validateImportData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data) {
    errors.push('No data provided');
    return { valid: false, errors };
  }
  
  let sections: any[] = [];
  
  if (Array.isArray(data)) {
    sections = data;
  } else if (data.sections && Array.isArray(data.sections)) {
    sections = data.sections;
  } else {
    errors.push('Data must be an array of sections or contain a sections array');
    return { valid: false, errors };
  }
  
  sections.forEach((section, index) => {
    if (!section.type || !['static', 'dynamic'].includes(section.type)) {
      errors.push(`Section ${index}: Invalid type "${section.type}"`);
    }
    if (typeof section.content !== 'string') {
      errors.push(`Section ${index}: Content must be a string`);
    }
    if (section.testCases && !Array.isArray(section.testCases)) {
      errors.push(`Section ${index}: Test cases must be an array`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}