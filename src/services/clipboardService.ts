/**
 * Clipboard Service
 * Handles clipboard operations and notifications
 */

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Copy JSON to clipboard with formatting
 */
export async function copyJSONToClipboard(data: any): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    return await copyToClipboard(jsonString);
  } catch (err) {
    console.error('Failed to copy JSON:', err);
    return false;
  }
}

/**
 * Copy code snippet to clipboard
 */
export async function copyCodeSnippet(template: string, key: string): Promise<boolean> {
  const snippet = template.replace('{{key}}', key);
  return await copyToClipboard(snippet);
}

/**
 * Read from clipboard
 */
export async function readFromClipboard(): Promise<string | null> {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (err) {
    console.error('Failed to read from clipboard:', err);
    return null;
  }
}

/**
 * Check if clipboard API is available
 */
export function isClipboardAvailable(): boolean {
  return !!navigator.clipboard && !!window.isSecureContext;
}

/**
 * Copy HTML to clipboard (rich text)
 */
export async function copyHTMLToClipboard(html: string): Promise<boolean> {
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const data = [new ClipboardItem({ 'text/html': blob })];
    await navigator.clipboard.write(data);
    return true;
  } catch (err) {
    // Fallback to plain text
    return await copyToClipboard(html);
  }
}