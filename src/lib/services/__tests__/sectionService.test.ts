import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  sectionFirebaseService,
  createSection, 
  updateSectionContent, 
  deleteSection,
  hasUnsavedChanges,
  type Section,
  type SectionDocument 
} from '../sectionService';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _: 'serverTimestamp' })),
  deleteDoc: vi.fn()
}));

vi.mock('../../firebase', () => ({
  db: { _mockDb: true },
  getCurrentUser: vi.fn(() => ({ uid: 'test-user-123' })),
  signInAnonymouslyUser: vi.fn(() => ({ uid: 'test-user-123' }))
}));

describe('Section Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Section Management', () => {
    it('should create a static section with default content', () => {
      const section = createSection('static');
      
      expect(section.type).toBe('static');
      expect(section.content).toBe('');
      expect(section.id).toBeDefined();
      expect(section.isEditing).toBe(true);
    });

    it('should create a dynamic section with default JavaScript', () => {
      const section = createSection('dynamic');
      
      expect(section.type).toBe('dynamic');
      expect(section.content).toContain('return "Hello, World!"');
      expect(section.testCases).toEqual([]);
      expect(section.showTests).toBe(false);
    });

    it('should update section content', () => {
      const sections: Section[] = [
        { id: '1', type: 'static', content: 'old content' }
      ];
      
      const updated = updateSectionContent(sections, '1', 'new content');
      
      expect(updated[0].content).toBe('new content');
      expect(updated[0].id).toBe('1');
    });

    it('should delete a section', () => {
      const sections: Section[] = [
        { id: '1', type: 'static', content: 'content1' },
        { id: '2', type: 'dynamic', content: 'content2' }
      ];
      
      const updated = deleteSection(sections, '1');
      
      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBe('2');
    });

    it('should detect unsaved changes', () => {
      const current: Section[] = [
        { id: '1', type: 'static', content: 'new content' }
      ];
      const saved: Section[] = [
        { id: '1', type: 'static', content: 'old content' }
      ];
      
      expect(hasUnsavedChanges(current, saved)).toBe(true);
    });

    it('should not detect changes when content is the same', () => {
      const current: Section[] = [
        { id: '1', type: 'static', content: 'same content' }
      ];
      const saved: Section[] = [
        { id: '1', type: 'static', content: 'same content' }
      ];
      
      expect(hasUnsavedChanges(current, saved)).toBe(false);
    });
  });

  describe('Firebase Integration', () => {
    const mockSections: Section[] = [
      { id: '1', type: 'static', content: 'HTML content' },
      { id: '2', type: 'dynamic', content: 'return "JS content"', testCases: [] }
    ];

    it('should save document to Firebase', async () => {
      const { setDoc } = await import('firebase/firestore');
      const setDocMock = vi.mocked(setDoc);
      setDocMock.mockResolvedValue(undefined);

      const documentId = await sectionFirebaseService.saveDocument(mockSections, 'Test Document');
      
      expect(documentId).toBeDefined();
      expect(documentId).toContain('doc_');
      expect(setDocMock).toHaveBeenCalled();
      
      const callArgs = setDocMock.mock.calls[0][1] as SectionDocument;
      expect(callArgs.name).toBe('Test Document');
      expect(callArgs.sections).toEqual(mockSections);
      expect(callArgs.userId).toBe('test-user-123');
      expect(callArgs.metadata?.sectionCount).toBe(2);
      expect(callArgs.metadata?.dynamicSectionCount).toBe(1);
      expect(callArgs.metadata?.staticSectionCount).toBe(1);
    });

    it('should load document from Firebase', async () => {
      const { getDoc } = await import('firebase/firestore');
      const getDocMock = vi.mocked(getDoc);
      
      const mockDocument: SectionDocument = {
        id: 'doc_123',
        name: 'Loaded Document',
        sections: mockSections,
        userId: 'test-user-123',
        createdAt: { seconds: 1000, nanoseconds: 0 },
        modifiedAt: { seconds: 2000, nanoseconds: 0 },
        version: 1,
        metadata: {
          sectionCount: 2,
          dynamicSectionCount: 1,
          staticSectionCount: 1,
          hasTestCases: false
        }
      };
      
      getDocMock.mockResolvedValue({
        exists: () => true,
        data: () => mockDocument,
        id: 'doc_123',
        ref: {} as any,
        metadata: {} as any
      });

      const document = await sectionFirebaseService.loadDocument('doc_123');
      
      expect(document).toBeDefined();
      expect(document?.name).toBe('Loaded Document');
      expect(document?.sections).toEqual(mockSections);
      expect(getDocMock).toHaveBeenCalled();
    });

    it('should return null when document does not exist', async () => {
      const { getDoc } = await import('firebase/firestore');
      const getDocMock = vi.mocked(getDoc);
      
      getDocMock.mockResolvedValue({
        exists: () => false,
        data: () => undefined,
        id: 'doc_404',
        ref: {} as any,
        metadata: {} as any
      });

      const document = await sectionFirebaseService.loadDocument('doc_404');
      
      expect(document).toBeNull();
    });

    it('should throw error when user does not own the document (with enforcement enabled)', async () => {
      // Mock the environment variable to enable ownership enforcement
      const originalEnv = import.meta.env.VITE_ENFORCE_OWNERSHIP;
      import.meta.env.VITE_ENFORCE_OWNERSHIP = 'true';
      
      const { getDoc } = await import('firebase/firestore');
      const getDocMock = vi.mocked(getDoc);
      
      const mockDocument: SectionDocument = {
        id: 'doc_123',
        name: 'Unauthorized Document',
        sections: [],
        userId: 'different-user-456', // Different user ID
        createdAt: { seconds: 1000, nanoseconds: 0 },
        modifiedAt: { seconds: 2000, nanoseconds: 0 },
        version: 1,
        metadata: {
          sectionCount: 0,
          dynamicSectionCount: 0,
          staticSectionCount: 0,
          hasTestCases: false
        }
      };
      
      getDocMock.mockResolvedValue({
        exists: () => true,
        data: () => mockDocument,
        id: 'doc_123',
        ref: {} as any,
        metadata: {} as any
      });

      await expect(
        sectionFirebaseService.loadDocument('doc_123')
      ).rejects.toThrow('You do not have permission to access this document');
      
      // Restore original environment variable
      import.meta.env.VITE_ENFORCE_OWNERSHIP = originalEnv;
    });

    it('should allow loading any document when enforcement is disabled', async () => {
      // Mock the environment variable to disable ownership enforcement
      const originalEnv = import.meta.env.VITE_ENFORCE_OWNERSHIP;
      import.meta.env.VITE_ENFORCE_OWNERSHIP = 'false';
      
      const { getDoc } = await import('firebase/firestore');
      const getDocMock = vi.mocked(getDoc);
      
      const mockDocument: SectionDocument = {
        id: 'doc_123',
        name: 'Another Users Document',
        sections: [],
        userId: 'different-user-456', // Different user ID
        createdAt: { seconds: 1000, nanoseconds: 0 },
        modifiedAt: { seconds: 2000, nanoseconds: 0 },
        version: 1,
        metadata: {
          sectionCount: 0,
          dynamicSectionCount: 0,
          staticSectionCount: 0,
          hasTestCases: false
        }
      };
      
      getDocMock.mockResolvedValue({
        exists: () => true,
        data: () => mockDocument,
        id: 'doc_123',
        ref: {} as any,
        metadata: {} as any
      });

      const document = await sectionFirebaseService.loadDocument('doc_123');
      
      expect(document).toBeDefined();
      expect(document?.name).toBe('Another Users Document');
      expect(document?.userId).toBe('different-user-456');
      
      // Restore original environment variable
      import.meta.env.VITE_ENFORCE_OWNERSHIP = originalEnv;
    });

    it('should list documents for current user', async () => {
      const { getDocs } = await import('firebase/firestore');
      const getDocsMock = vi.mocked(getDocs);
      
      const mockDocuments = [
        {
          id: 'doc_1',
          name: 'Document 1',
          sections: [],
          userId: 'test-user-123',
          modifiedAt: { seconds: 3000, nanoseconds: 0 }
        },
        {
          id: 'doc_2',
          name: 'Document 2',
          sections: [],
          userId: 'test-user-123',
          modifiedAt: { seconds: 2000, nanoseconds: 0 }
        }
      ];
      
      getDocsMock.mockResolvedValue({
        docs: mockDocuments.map(doc => ({
          data: () => doc,
          id: doc.id,
          ref: {} as any,
          exists: () => true,
          metadata: {} as any
        })),
        size: 2,
        empty: false,
        forEach: vi.fn((callback) => {
          mockDocuments.forEach(doc => callback({
            data: () => doc
          } as any));
        })
      } as any);

      const documents = await sectionFirebaseService.listDocuments();
      
      expect(documents).toHaveLength(2);
      expect(documents[0].name).toBe('Document 1');
      expect(documents[1].name).toBe('Document 2');
    });

    it('should delete document from Firebase', async () => {
      const { deleteDoc, getDoc } = await import('firebase/firestore');
      const deleteDocMock = vi.mocked(deleteDoc);
      const getDocMock = vi.mocked(getDoc);
      
      // Mock existing document
      getDocMock.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'doc_123',
          name: 'To Delete',
          sections: [],
          userId: 'test-user-123'
        }),
        id: 'doc_123',
        ref: {} as any,
        metadata: {} as any
      });
      
      deleteDocMock.mockResolvedValue(undefined);

      await sectionFirebaseService.deleteDocument('doc_123');
      
      expect(deleteDocMock).toHaveBeenCalled();
      expect(sectionFirebaseService.getCurrentDocumentId()).toBeNull();
    });

    it('should handle save errors gracefully', async () => {
      const { setDoc } = await import('firebase/firestore');
      const setDocMock = vi.mocked(setDoc);
      
      setDocMock.mockRejectedValue(new Error('Firebase error'));

      await expect(
        sectionFirebaseService.saveDocument(mockSections, 'Test Document')
      ).rejects.toThrow('Firebase error');
    });

    it('should handle load errors gracefully', async () => {
      const { getDoc } = await import('firebase/firestore');
      const getDocMock = vi.mocked(getDoc);
      
      getDocMock.mockRejectedValue(new Error('Network error'));

      await expect(
        sectionFirebaseService.loadDocument('doc_123')
      ).rejects.toThrow('Network error');
    });

    it('should update document version on save', async () => {
      const { setDoc, getDoc } = await import('firebase/firestore');
      const setDocMock = vi.mocked(setDoc);
      const getDocMock = vi.mocked(getDoc);
      
      // Mock existing document with version 1
      getDocMock.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'doc_123',
          name: 'Existing Document',
          sections: [],
          userId: 'test-user-123',
          version: 1
        }),
        id: 'doc_123',
        ref: {} as any,
        metadata: {} as any
      });
      
      setDocMock.mockResolvedValue(undefined);
      sectionFirebaseService.setCurrentDocumentId('doc_123');

      await sectionFirebaseService.saveDocument(mockSections, 'Updated Document', 'doc_123');
      
      const callArgs = setDocMock.mock.calls[0][1] as SectionDocument;
      expect(callArgs.version).toBe(2);
    });

    it('should get last saved timestamp', async () => {
      const { getDoc } = await import('firebase/firestore');
      const getDocMock = vi.mocked(getDoc);
      
      const timestamp = { seconds: 1234567890, nanoseconds: 0 };
      getDocMock.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'doc_123',
          name: 'Document',
          sections: [],
          userId: 'test-user-123',
          modifiedAt: timestamp
        }),
        id: 'doc_123',
        ref: {} as any,
        metadata: {} as any
      });

      const lastSaved = await sectionFirebaseService.getLastSavedTimestamp('doc_123');
      
      expect(lastSaved).toBeInstanceOf(Date);
      expect(lastSaved?.getTime()).toBe(timestamp.seconds * 1000);
    });
  });
});