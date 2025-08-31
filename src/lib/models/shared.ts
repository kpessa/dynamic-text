/**
 * Shared Type Definitions
 * 
 * Common types used across the ingredient and config models
 */

/**
 * Content section within an ingredient
 * 
 * @example
 * {
 *   id: 'section-1',
 *   type: 'javascript',
 *   content: 'return me.getValue("calcium");',
 *   order: 0
 * }
 */
export interface Section {
  /** Unique section identifier */
  id: string;
  
  /** Section type: 'html' or 'javascript' */
  type: 'html' | 'javascript';
  
  /** Section content (HTML or JavaScript code) */
  content: string;
  
  /** Display order */
  order: number;
  
  /** Optional section title */
  title?: string;
  
  /** Optional section description */
  description?: string;
  
  /** Whether section is enabled */
  enabled?: boolean;
}

/**
 * Test case definition
 * 
 * @example
 * {
 *   id: 'test-1',
 *   name: 'Normal Range Test',
 *   variables: { calcium: 2.5 },
 *   expected: 'Normal'
 * }
 */
export interface TestCase {
  /** Unique test identifier */
  id: string;
  
  /** Test name/description */
  name: string;
  
  /** Variable values for this test */
  variables: Record<string, any>;
  
  /** Expected output (optional) */
  expected?: string;
  
  /** Test description */
  description?: string;
  
  /** Whether test is enabled */
  enabled?: boolean;
  
  /** Test tags for categorization */
  tags?: string[];
}