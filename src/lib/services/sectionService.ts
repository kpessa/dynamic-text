/**
 * Section Service
 * Handles section management, drag & drop, section operations, and Firebase persistence
 */

import { sanitizeHTML } from './codeExecutionService';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db, getCurrentUser, signInAnonymouslyUser } from '../firebase';

export interface Section {
  id: string;
  type: 'static' | 'dynamic';
  content: string;
  isEditing?: boolean;
  testCases?: any[];
  activeTestCase?: any;
  testResults?: any;
  showTests?: boolean;
}

/**
 * Create a new section
 */
export function createSection(type: 'static' | 'dynamic'): Section {
  const section: Section = {
    id: crypto.randomUUID(),
    type,
    content: type === 'static' ? '' : '// Dynamic JavaScript\nreturn "Hello, World!";',
    isEditing: true,
    showTests: false
  };
  if (type === 'dynamic') {
    section.testCases = [];
  }
  return section;
}

/**
 * Update section content
 */
export function updateSectionContent(sections: Section[], sectionId: string, content: string): Section[] {
  return sections.map(section => 
    section.id === sectionId
      ? { ...section, content }
      : section
  );
}

/**
 * Delete a section
 */
export function deleteSection(sections: Section[], sectionId: string): Section[] {
  return sections.filter(section => section.id !== sectionId);
}

/**
 * Toggle section editing state
 */
export function toggleSectionEditing(sections: Section[], sectionId: string, isEditing: boolean): Section[] {
  return sections.map(section =>
    section.id === sectionId
      ? { ...section, isEditing }
      : section
  );
}

/**
 * Convert static section to dynamic
 */
export function convertToDynamic(sections: Section[], sectionId: string, content: string): Section[] {
  return sections.map(section => {
    if (section.id === sectionId) {
      // Extract any JavaScript from script tags
      const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      let dynamicContent = '';
      
      if (scriptMatch && scriptMatch[1]) {
        dynamicContent = scriptMatch[1].trim();
      } else {
        // Convert HTML to a return statement
        const sanitized = sanitizeHTML(content);
        dynamicContent = `// Converted from static HTML\nreturn \`${sanitized}\`;`;
      }
      
      return {
        ...section,
        type: 'dynamic',
        content: dynamicContent,
        testCases: [],
        showTests: false
      };
    }
    return section;
  });
}

/**
 * Reorder sections via drag and drop
 */
export function reorderSections(sections: Section[], fromIndex: number, toIndex: number): Section[] {
  const newSections = [...sections];
  const [movedSection] = newSections.splice(fromIndex, 1);
  if (movedSection) {
    newSections.splice(toIndex, 0, movedSection);
  }
  return newSections;
}

/**
 * Extract used keys from sections
 */
export function extractUsedKeys(sections: Section[]): string[] {
  const keySet = new Set<string>();
  
  sections.forEach(section => {
    if (section.type === 'dynamic') {
      // Extract me.getValue() calls
      const getValueRegex = /me\.getValue\(['"]([^'"]+)['"]\)/g;
      let match;
      const content = section.content || '';
      while ((match = getValueRegex.exec(content)) !== null) {
        if (match[1]) {
          keySet.add(match[1]);
        }
      }
      
      // Also check test variables
      if (section.testCases) {
        section.testCases.forEach(testCase => {
          if (testCase.variables) {
            Object.keys(testCase.variables).forEach(key => keySet.add(key));
          }
        });
      }
    }
  });
  
  return Array.from(keySet);
}

/**
 * Check if sections have unsaved changes
 */
export function hasUnsavedChanges(currentSections: Section[], savedSections: Section[]): boolean {
  if (currentSections.length !== savedSections.length) return true;
  
  return currentSections.some((section, index) => {
    const savedSection = savedSections[index];
    return !savedSection || 
           section.content !== savedSection.content ||
           section.type !== savedSection.type ||
           JSON.stringify(section.testCases) !== JSON.stringify(savedSection.testCases);
  });
}

/**
 * Migrate sections to ensure proper structure
 */
export function migrateSections(sections: any[]): Section[] {
  return sections.map(section => ({
    id: section.id || crypto.randomUUID(),
    type: section.type || 'static',
    content: section.content || '',
    isEditing: false,
    testCases: section.testCases || (section.type === 'dynamic' ? [] : undefined),
    activeTestCase: section.activeTestCase || null,
    testResults: section.testResults || null,
    showTests: section.showTests || false
  }));
}

/**
 * Count sections by type
 */
export function countSectionsByType(sections: Section[]): { static: number; dynamic: number } {
  return sections.reduce((counts, section) => {
    counts[section.type]++;
    return counts;
  }, { static: 0, dynamic: 0 });
}

/**
 * Generate preview HTML from sections
 */
export function generatePreviewHTML(sections: Section[], evaluator: (code: string, vars?: any) => string): string {
  return sections.map(section => {
    if (section.type === 'static') {
      return sanitizeHTML(section.content);
    } else {
      try {
        return evaluator(section.content, section.activeTestCase?.variables || null);
      } catch (error) {
        return `<span style="color: red;">Error: ${(error as Error).message}</span>`;
      }
    }
  }).join('\n');
}

// ============================================================================
// Firebase Integration
// ============================================================================

export interface SectionDocument {
  id: string;
  name: string;
  sections: Section[];
  userId: string;
  createdAt: any; // serverTimestamp
  modifiedAt: any; // serverTimestamp
  version: number;
  metadata?: {
    sectionCount: number;
    dynamicSectionCount: number;
    staticSectionCount: number;
    hasTestCases: boolean;
  };
}

class SectionFirebaseService {
  private currentDocumentId: string | null = null;

  /**
   * Initialize service and ensure user is authenticated
   */
  private async ensureAuthenticated() {
    if (!getCurrentUser()) {
      await signInAnonymouslyUser();
    }
  }

  /**
   * Save sections to Firebase as a reference document
   */
  async saveDocument(sections: Section[], name?: string, documentId?: string): Promise<string> {
    try {
      await this.ensureAuthenticated();
      
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const user = getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use provided documentId or generate new one
      const docId = documentId || this.currentDocumentId || `doc_${Date.now()}_${user.uid.substring(0, 8)}`;
      
      // Get existing document to check version
      let version = 1;
      if (documentId || this.currentDocumentId) {
        const existingDoc = await this.loadDocument(docId);
        if (existingDoc) {
          version = (existingDoc.version || 0) + 1;
        }
      }

      // Calculate metadata
      const metadata = {
        sectionCount: sections.length,
        dynamicSectionCount: sections.filter(s => s.type === 'dynamic').length,
        staticSectionCount: sections.filter(s => s.type === 'static').length,
        hasTestCases: sections.some(s => s.testCases && s.testCases.length > 0)
      };

      const documentData: SectionDocument = {
        id: docId,
        name: name || `Document ${new Date().toLocaleString()}`,
        sections: sections,
        userId: user.uid,
        createdAt: version === 1 ? serverTimestamp() : undefined,
        modifiedAt: serverTimestamp(),
        version,
        metadata
      };

      // Remove undefined createdAt for updates
      if (version > 1) {
        delete documentData.createdAt;
      }

      // Save to references collection
      const documentRef = doc(db, 'references', docId);
      await setDoc(documentRef, documentData, { merge: version > 1 });

      // Update current document ID
      this.currentDocumentId = docId;

      console.log('Document saved successfully:', docId);
      return docId;
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }

  /**
   * Load a document by ID
   */
  async loadDocument(documentId: string): Promise<SectionDocument | null> {
    try {
      await this.ensureAuthenticated();
      
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const user = getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const documentRef = doc(db, 'references', documentId);
      const documentDoc = await getDoc(documentRef);

      if (!documentDoc.exists()) {
        console.warn('Document not found:', documentId);
        return null;
      }

      const data = documentDoc.data() as SectionDocument;
      
      // Security check: Verify user owns this document (only if enforcement is enabled)
      const enforceOwnership = import.meta.env.VITE_ENFORCE_OWNERSHIP === 'true';
      
      if (enforceOwnership && data.userId !== user.uid) {
        console.error('Unauthorized access attempt to document:', documentId);
        throw new Error('You do not have permission to access this document');
      }
      
      // Update current document ID
      this.currentDocumentId = documentId;
      
      console.log('Document loaded successfully:', documentId);
      return data;
    } catch (error) {
      console.error('Error loading document:', error);
      throw error;
    }
  }

  /**
   * List all documents for the current user
   */
  async listDocuments(): Promise<SectionDocument[]> {
    try {
      await this.ensureAuthenticated();
      
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const user = getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const q = query(
        collection(db, 'references'),
        where('userId', '==', user.uid),
        orderBy('modifiedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const documents: SectionDocument[] = [];

      snapshot.forEach((doc) => {
        documents.push(doc.data() as SectionDocument);
      });

      console.log(`Loaded ${documents.length} documents for user`);
      return documents;
    } catch (error) {
      // If orderBy fails due to missing index, try without ordering
      if (error instanceof Error && error.message.includes('index')) {
        console.warn('Index not available, fetching without ordering');
        
        if (!db) throw new Error('Firebase not initialized');
        const user = getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const q = query(
          collection(db, 'references'),
          where('userId', '==', user.uid)
        );
        
        const snapshot = await getDocs(q);
        const documents: SectionDocument[] = [];
        
        snapshot.forEach((doc) => {
          documents.push(doc.data() as SectionDocument);
        });
        
        // Sort client-side
        documents.sort((a, b) => {
          const aTime = a.modifiedAt?.seconds || 0;
          const bTime = b.modifiedAt?.seconds || 0;
          return bTime - aTime;
        });
        
        return documents;
      }
      
      console.error('Error listing documents:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await this.ensureAuthenticated();
      
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const user = getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify ownership before deletion
      const existingDoc = await this.loadDocument(documentId);
      if (!existingDoc) {
        throw new Error('Document not found');
      }
      
      if (existingDoc.userId !== user.uid) {
        throw new Error('Not authorized to delete this document');
      }

      const documentRef = doc(db, 'references', documentId);
      await deleteDoc(documentRef);

      // Clear current document ID if it was deleted
      if (this.currentDocumentId === documentId) {
        this.currentDocumentId = null;
      }

      console.log('Document deleted successfully:', documentId);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get the last saved timestamp for a document
   */
  async getLastSavedTimestamp(documentId?: string): Promise<Date | null> {
    try {
      const docId = documentId || this.currentDocumentId;
      if (!docId) return null;

      const document = await this.loadDocument(docId);
      if (!document || !document.modifiedAt) {
        return null;
      }

      // Convert Firebase timestamp to Date
      if (document.modifiedAt.toDate) {
        return document.modifiedAt.toDate();
      }
      
      if (document.modifiedAt.seconds) {
        return new Date(document.modifiedAt.seconds * 1000);
      }

      return null;
    } catch (error) {
      console.error('Error getting last saved timestamp:', error);
      return null;
    }
  }

  /**
   * Get current document ID
   */
  getCurrentDocumentId(): string | null {
    return this.currentDocumentId;
  }

  /**
   * Set current document ID
   */
  setCurrentDocumentId(documentId: string | null): void {
    this.currentDocumentId = documentId;
  }

  /**
   * Create a new document (clears current document ID)
   */
  createNewDocument(): void {
    this.currentDocumentId = null;
    console.log('Created new document session');
  }

  /**
   * Subscribe to real-time updates for a document
   */
  subscribeToDocument(
    documentId: string, 
    callback: (document: SectionDocument | null) => void,
    errorCallback?: (error: Error) => void
  ): Unsubscribe {
    if (!db) {
      const error = new Error('Firebase not initialized');
      if (errorCallback) errorCallback(error);
      return () => {};
    }

    const documentRef = doc(db, 'references', documentId);
    
    const unsubscribe = onSnapshot(
      documentRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }

        const data = snapshot.data() as SectionDocument;
        
        // Check ownership if enforcement is enabled
        const user = getCurrentUser();
        const enforceOwnership = import.meta.env.VITE_ENFORCE_OWNERSHIP === 'true';
        
        if (user && enforceOwnership && data.userId !== user.uid) {
          if (errorCallback) {
            errorCallback(new Error('You do not have permission to access this document'));
          }
          return;
        }

        // Update current document ID
        this.currentDocumentId = documentId;
        
        callback(data);
      },
      (error) => {
        console.error('Error in document subscription:', error);
        if (errorCallback) errorCallback(error);
      }
    );

    return unsubscribe;
  }

  /**
   * Subscribe to real-time updates for user's documents list
   */
  subscribeToUserDocuments(
    callback: (documents: SectionDocument[]) => void,
    errorCallback?: (error: Error) => void
  ): Unsubscribe {
    if (!db) {
      const error = new Error('Firebase not initialized');
      if (errorCallback) errorCallback(error);
      return () => {};
    }

    const user = getCurrentUser();
    if (!user) {
      const error = new Error('User not authenticated');
      if (errorCallback) errorCallback(error);
      return () => {};
    }

    const q = query(
      collection(db, 'references'),
      where('userId', '==', user.uid),
      orderBy('modifiedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const documents: SectionDocument[] = [];
        snapshot.forEach((doc) => {
          documents.push(doc.data() as SectionDocument);
        });
        callback(documents);
      },
      (error) => {
        // If orderBy fails due to missing index, try without ordering
        if (error.message.includes('index')) {
          console.warn('Index not available, subscribing without ordering');
          
          const simpleQuery = query(
            collection(db, 'references'),
            where('userId', '==', user.uid)
          );
          
          return onSnapshot(
            simpleQuery,
            (snapshot) => {
              const documents: SectionDocument[] = [];
              snapshot.forEach((doc) => {
                documents.push(doc.data() as SectionDocument);
              });
              
              // Sort client-side
              documents.sort((a, b) => {
                const aTime = a.modifiedAt?.seconds || 0;
                const bTime = b.modifiedAt?.seconds || 0;
                return bTime - aTime;
              });
              
              callback(documents);
            },
            errorCallback
          );
        }
        
        console.error('Error in documents subscription:', error);
        if (errorCallback) errorCallback(error);
      }
    );

    return unsubscribe;
  }
}

// Export singleton instance
export const sectionFirebaseService = new SectionFirebaseService();