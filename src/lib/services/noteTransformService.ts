import type { Section } from '$lib/types';

/**
 * Service for transforming between Section format and NOTE array format
 * Section format: Used in the editor UI for rich editing
 * NOTE array format: Schema-compliant format for TPN configurations ({ TEXT: "" } objects)
 */

export interface NoteObject {
  TEXT: string;
}

export class NoteTransformService {
  /**
   * Converts an array of Sections to a NOTE array format
   * @param sections - Array of Section objects from the editor
   * @returns Array of { TEXT: string } objects for TPN schema compliance
   */
  sectionsToNoteArray(sections: Section[]): NoteObject[] {
    if (!sections || sections.length === 0) {
      return [];
    }

    // Transform each section's content to a NOTE object
    return sections.map(section => ({
      TEXT: this.extractSectionContent(section)
    }));
  }

  /**
   * Converts a NOTE array to Section format for editing
   * @param noteArray - Array of { TEXT: string } objects from TPN config
   * @param ingredientKey - The key name of the ingredient these notes belong to
   * @returns Array of Section objects for the editor
   */
  noteArrayToSections(noteArray: NoteObject[] | undefined, ingredientKey: string): Section[] {
    if (!noteArray || noteArray.length === 0) {
      return [];
    }

    // Transform each NOTE object to a Section
    return noteArray.map((note, index) => this.createSectionFromNote(note, ingredientKey, index));
  }

  /**
   * Extracts the content from a section based on its type
   * @param section - Section object to extract content from
   * @returns The text content of the section
   */
  private extractSectionContent(section: Section): string {
    // Handle different section types
    if (section.type === 'static') {
      return section.content || '';
    }
    
    if (section.type === 'dynamic') {
      // For dynamic sections, we return the code content
      // This preserves the JavaScript code in the NOTE
      return section.content || '';
    }

    // Default fallback
    return section.content || '';
  }

  /**
   * Creates a Section object from a NOTE object
   * @param note - NOTE object containing TEXT field
   * @param ingredientKey - The key name of the ingredient
   * @param index - Index of the note in the array
   * @returns Section object for the editor
   */
  private createSectionFromNote(note: NoteObject, ingredientKey: string, index: number): Section {
    const content = note.TEXT || '';
    
    // Detect if content looks like JavaScript code
    const isDynamic = this.isLikelyDynamicContent(content);
    
    return {
      id: `${ingredientKey}_note_${index}_${Date.now()}`,
      name: `Note ${index + 1}`,
      type: isDynamic ? 'dynamic' : 'static',
      content: content,
      isExpanded: false,
      metadata: {
        sourceIngredient: ingredientKey,
        originalIndex: index
      }
    };
  }

  /**
   * Determines if content is likely dynamic (JavaScript) code
   * @param content - Text content to analyze
   * @returns true if content appears to be JavaScript code
   */
  private isLikelyDynamicContent(content: string): boolean {
    if (!content) return false;
    
    // Check for common JavaScript patterns
    const jsPatterns = [
      /\bfunction\s*\(/,
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /\bvar\s+\w+\s*=/,
      /\bif\s*\(/,
      /\bfor\s*\(/,
      /\bwhile\s*\(/,
      /\breturn\s+/,
      /\bme\./,  // TPN-specific object access
      /=>/, // Arrow functions
      /\{\s*\n/, // Opening braces with newline (code blocks)
    ];
    
    return jsPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Validates that a NOTE array is properly formatted
   * @param noteArray - Array to validate
   * @returns true if valid NOTE array format
   */
  validateNoteArray(noteArray: any): noteArray is NoteObject[] {
    if (!Array.isArray(noteArray)) {
      return false;
    }
    
    return noteArray.every(item => 
      typeof item === 'object' &&
      item !== null &&
      'TEXT' in item &&
      typeof item.TEXT === 'string'
    );
  }

  /**
   * Preserves section metadata during transformation
   * This ensures we don't lose important information during round-trip conversions
   * @param sections - Original sections with metadata
   * @param noteArray - Transformed NOTE array
   * @returns NOTE array with preserved metadata as comments (if applicable)
   */
  preserveMetadata(sections: Section[], noteArray: NoteObject[]): NoteObject[] {
    // For now, we maintain a 1:1 mapping
    // Future enhancement: embed metadata as structured comments if needed
    return noteArray;
  }

  /**
   * Merges imported NOTE arrays with existing sections
   * @param existingSections - Current sections in the editor
   * @param importedNotes - NOTE array from imported config
   * @param ingredientKey - The ingredient key for context
   * @returns Merged array of sections
   */
  mergeWithExisting(
    existingSections: Section[], 
    importedNotes: NoteObject[], 
    ingredientKey: string
  ): Section[] {
    // Convert imported notes to sections
    const newSections = this.noteArrayToSections(importedNotes, ingredientKey);
    
    // For now, we replace entirely. Future: implement smart merge
    return newSections;
  }
}

// Export singleton instance
export const noteTransformService = new NoteTransformService();