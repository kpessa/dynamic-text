import type { Section, NoteItem, ReferenceData, ConfigMetadata, ExportableConfig, ExportableIngredient } from './types.js';

/**
 * Convert sections format to NOTE array format for production export
 * This reverses the convertNotesToSections function
 */

/**
 * Convert sections to NOTE array format
 * @param sections - Array of section objects with type and content
 * @returns NOTE array with TEXT objects
 */
export function sectionsToNoteArray(sections: Section[]): NoteItem[] {
  if (!sections || !Array.isArray(sections)) {
    return [];
  }
  
  const noteArray: NoteItem[] = [];
  
  sections.forEach(section => {
    if (section.type === 'static') {
      // Static sections: split by newlines and create TEXT objects
      const lines = section.content.split('\n');
      lines.forEach(line => {
        noteArray.push({ TEXT: line });
      });
    } else if (section.type === 'dynamic') {
      // Dynamic sections: wrap with [f( and )]
      noteArray.push({ TEXT: '[f(' });
      
      // Split dynamic content by newlines
      const lines = section.content.split('\n');
      lines.forEach(line => {
        noteArray.push({ TEXT: line });
      });
      
      noteArray.push({ TEXT: ')]' });
    }
  });
  
  return noteArray;
}

/**
 * Convert sections to NOTE array string format (for display/export)
 * @param sections - Array of section objects
 * @returns Array of strings (simplified NOTE format)
 */
export function sectionsToNoteStrings(sections: Section[]): string[] {
  if (!sections || !Array.isArray(sections)) {
    return [];
  }
  
  const notes: string[] = [];
  
  sections.forEach(section => {
    if (section.type === 'static') {
      // Static sections: split by newlines
      const lines = section.content.split('\n');
      notes.push(...lines);
    } else if (section.type === 'dynamic') {
      // Dynamic sections: wrap with [f( and )]
      notes.push('[f(');
      const lines = section.content.split('\n');
      notes.push(...lines);
      notes.push(')]');
    }
  });
  
  return notes;
}

/**
 * Create a complete ingredient object in NOTE format
 * @param reference - Reference object with sections
 * @param ingredientData - Original ingredient data
 * @returns Complete ingredient in NOTE format
 */
export function createNoteFormatIngredient(
  reference: ReferenceData, 
  ingredientData: Partial<ExportableIngredient> = {}
): ExportableIngredient {
  const noteArray = sectionsToNoteArray(reference.sections || []);
  
  return {
    KEYNAME: (reference as any).ingredient || ingredientData.KEYNAME || '',
    DISPLAY: reference.name || ingredientData.DISPLAY || '',
    TYPE: ingredientData.TYPE || 'NORMAL',
    NOTE: noteArray,
    // Include other fields if present in original
    ...(ingredientData.UNITS && { UNITS: ingredientData.UNITS }),
    ...(ingredientData.MIN && { MIN: ingredientData.MIN }),
    ...(ingredientData.MAX && { MAX: ingredientData.MAX }),
    ...(ingredientData.DEFAULT && { DEFAULT: ingredientData.DEFAULT }),
    ...(ingredientData.CATEGORY && { CATEGORY: ingredientData.CATEGORY })
  };
}

/**
 * Export multiple references as a config in NOTE format
 * @param references - Array of reference objects
 * @param configMetadata - Config metadata (healthSystem, domain, etc.)
 * @returns Complete config object ready for export
 */
export function exportAsConfig(
  references: ReferenceData[], 
  configMetadata: ConfigMetadata = {} as ConfigMetadata
): ExportableConfig {
  const ingredients = references.map(ref => {
    return createNoteFormatIngredient(ref);
  });
  
  return {
    healthSystem: configMetadata.healthSystem || 'UNKNOWN',
    domain: configMetadata.domain || 'unknown',
    subdomain: configMetadata.subdomain || 'prod',
    version: configMetadata.version || 'adult',
    INGREDIENT: ingredients
  };
}

/**
 * Validate NOTE format structure
 * @param noteArray - NOTE array to validate
 * @returns True if valid NOTE format
 */
export function isValidNoteFormat(noteArray: unknown): noteArray is NoteItem[] {
  if (!Array.isArray(noteArray)) return false;
  
  return noteArray.every((item): item is NoteItem => {
    return item && typeof item === 'object' && 'TEXT' in item && typeof item.TEXT === 'string';
  });
}

/**
 * Convert a single reference to downloadable JSON
 * @param reference - Reference object with sections
 * @returns JSON string ready for download
 */
export function referenceToDownloadableJSON(reference: ReferenceData): string {
  const noteFormat = createNoteFormatIngredient(reference);
  return JSON.stringify(noteFormat, null, 2);
}

/**
 * Create a downloadable file from NOTE format data
 * @param data - Data in NOTE format
 * @param filename - Desired filename
 */
export function downloadNoteFormat(data: unknown, filename: string = 'export.json'): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
