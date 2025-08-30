import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'strong', 'em', 'u', 'i', 'b', 
                   'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'code', 'pre', 'blockquote', 'table', 
                   'thead', 'tbody', 'tr', 'th', 'td', 'style'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'id', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  });
}

/**
 * Extract inline styles from HTML string
 * @param htmlString - HTML content
 * @returns Object with style properties
 */
export function extractStylesFromHTML(htmlString: string): Record<string, string> {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  const styles: Record<string, string> = {};
  
  // Find all elements with inline styles
  const elementsWithStyles = tempDiv.querySelectorAll('[style]');
  elementsWithStyles.forEach(element => {
    const styleAttr = element.getAttribute('style');
    if (styleAttr) {
      // Parse style attribute
      styleAttr.split(';').forEach(rule => {
        const [prop, value] = rule.split(':').map(s => s.trim());
        if (prop && value) {
          styles[prop] = value;
        }
      });
    }
  });
  
  return styles;
}

/**
 * Remove HTML tags to get plain text
 * @param html - HTML content
 * @returns Plain text content
 */
export function stripHTML(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
}