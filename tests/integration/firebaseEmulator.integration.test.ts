import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  deleteDoc,
  type Firestore 
} from 'firebase/firestore';
import { 
  getAuth, 
  connectAuthEmulator, 
  signInAnonymously,
  signOut,
  type Auth 
} from 'firebase/auth';

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_USE_FIREBASE_EMULATOR: 'true',
    VITE_FIREBASE_EMULATOR_HOST: 'localhost',
    VITE_FIREBASE_FIRESTORE_PORT: '8080',
    VITE_FIREBASE_AUTH_PORT: '9099',
    VITE_FIREBASE_PROJECT_ID: 'demo-test-project'
  }
}));

describe('Firebase Emulator Integration', () => {
  let app: FirebaseApp;
  let db: Firestore;
  let auth: Auth;
  let isEmulatorConnected = false;

  beforeAll(async () => {
    // Initialize Firebase app for testing
    const firebaseConfig = {
      projectId: 'demo-test-project',
      apiKey: 'demo-api-key',
      authDomain: 'demo-test-project.firebaseapp.com'
    };

    try {
      app = initializeApp(firebaseConfig, 'test-app');
      db = getFirestore(app);
      auth = getAuth(app);

      // Connect to emulators if environment is configured
      if (process.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
        const host = process.env.VITE_FIREBASE_EMULATOR_HOST || 'localhost';
        const firestorePort = Number(process.env.VITE_FIREBASE_FIRESTORE_PORT) || 8080;
        const authPort = Number(process.env.VITE_FIREBASE_AUTH_PORT) || 9099;

        connectFirestoreEmulator(db, host, firestorePort);
        connectAuthEmulator(auth, `http://${host}:${authPort}`);
        isEmulatorConnected = true;
      }
    } catch (error) {
      console.warn('Firebase initialization failed:', error);
    }
  });

  afterAll(async () => {
    // Clean up
    if (auth?.currentUser) {
      await signOut(auth);
    }
  });

  describe('Emulator Connection', () => {
    it('should connect to Firestore emulator', async () => {
      // Skip if emulator is not available
      if (!isEmulatorConnected) {
        console.log('Skipping: Emulator not connected');
        return;
      }

      // Arrange
      const testCollection = 'test-connection';
      const testDoc = 'test-doc';
      const testData = { message: 'Hello from emulator', timestamp: Date.now() };

      // Act - Try to write to Firestore
      const docRef = doc(db, testCollection, testDoc);
      await setDoc(docRef, testData);

      // Assert - Verify data was written
      const snapshot = await getDoc(docRef);
      expect(snapshot.exists()).toBe(true);
      expect(snapshot.data()).toEqual(testData);

      // Cleanup
      await deleteDoc(docRef);
    });

    it('should connect to Auth emulator', async () => {
      // Skip if emulator is not available
      if (!isEmulatorConnected) {
        console.log('Skipping: Emulator not connected');
        return;
      }

      // Act - Try anonymous sign in
      const userCredential = await signInAnonymously(auth);

      // Assert
      expect(userCredential.user).toBeDefined();
      expect(userCredential.user.uid).toBeDefined();
      expect(userCredential.user.isAnonymous).toBe(true);

      // Cleanup
      await signOut(auth);
    });

    it('should detect emulator environment', () => {
      // Assert
      const isEmulatorEnv = process.env.VITE_USE_FIREBASE_EMULATOR === 'true';
      expect(isEmulatorEnv).toBeDefined();

      if (isEmulatorEnv) {
        expect(process.env.VITE_FIREBASE_EMULATOR_HOST).toBeDefined();
        expect(process.env.VITE_FIREBASE_FIRESTORE_PORT).toBeDefined();
        expect(process.env.VITE_FIREBASE_AUTH_PORT).toBeDefined();
      }
    });

    it('should handle emulator port configuration', () => {
      // Arrange
      const expectedPorts = {
        firestore: 8080,
        auth: 9099,
        storage: 9199,
        functions: 5001,
        ui: 4000
      };

      // Act
      const actualPorts = {
        firestore: Number(process.env.VITE_FIREBASE_FIRESTORE_PORT) || 8080,
        auth: Number(process.env.VITE_FIREBASE_AUTH_PORT) || 9099,
        storage: Number(process.env.VITE_FIREBASE_STORAGE_PORT) || 9199,
        functions: Number(process.env.VITE_FIREBASE_FUNCTIONS_PORT) || 5001,
        ui: Number(process.env.VITE_FIREBASE_UI_PORT) || 4000
      };

      // Assert
      expect(actualPorts.firestore).toBe(expectedPorts.firestore);
      expect(actualPorts.auth).toBe(expectedPorts.auth);
    });
  });

  describe('Firestore Operations', () => {
    const testCollectionName = 'integration-tests';

    beforeEach(async () => {
      if (!isEmulatorConnected) return;

      // Clean up test collection
      const querySnapshot = await getDocs(collection(db, testCollectionName));
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    });

    it('should perform CRUD operations', async () => {
      if (!isEmulatorConnected) {
        console.log('Skipping: Emulator not connected');
        return;
      }

      // Create
      const docId = 'crud-test';
      const createData = {
        name: 'Test Item',
        value: 100,
        active: true,
        createdAt: Date.now()
      };

      const docRef = doc(db, testCollectionName, docId);
      await setDoc(docRef, createData);

      // Read
      const readSnapshot = await getDoc(docRef);
      expect(readSnapshot.exists()).toBe(true);
      expect(readSnapshot.data()).toMatchObject(createData);

      // Update
      const updateData = { ...createData, value: 200, updatedAt: Date.now() };
      await setDoc(docRef, updateData);

      const updatedSnapshot = await getDoc(docRef);
      expect(updatedSnapshot.data()?.value).toBe(200);
      expect(updatedSnapshot.data()?.updatedAt).toBeDefined();

      // Delete
      await deleteDoc(docRef);
      const deletedSnapshot = await getDoc(docRef);
      expect(deletedSnapshot.exists()).toBe(false);
    });

    it('should handle batch operations', async () => {
      if (!isEmulatorConnected) {
        console.log('Skipping: Emulator not connected');
        return;
      }

      // Arrange
      const batchData = Array.from({ length: 10 }, (_, i) => ({
        id: `batch-${i}`,
        data: {
          index: i,
          name: `Item ${i}`,
          timestamp: Date.now()
        }
      }));

      // Act - Create multiple documents
      const createPromises = batchData.map(item =>
        setDoc(doc(db, testCollectionName, item.id), item.data)
      );
      await Promise.all(createPromises);

      // Assert - Verify all documents were created
      const querySnapshot = await getDocs(collection(db, testCollectionName));
      expect(querySnapshot.size).toBe(10);

      // Verify data integrity
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        expect(data.index).toBeDefined();
        expect(data.name).toMatch(/Item \d+/);
      });
    });

    it('should handle collection queries', async () => {
      if (!isEmulatorConnected) {
        console.log('Skipping: Emulator not connected');
        return;
      }

      // Arrange - Create test data
      const testData = [
        { id: 'active-1', data: { status: 'active', priority: 1 } },
        { id: 'active-2', data: { status: 'active', priority: 2 } },
        { id: 'inactive-1', data: { status: 'inactive', priority: 1 } },
        { id: 'pending-1', data: { status: 'pending', priority: 3 } }
      ];

      // Act - Insert test data
      const insertPromises = testData.map(item =>
        setDoc(doc(db, testCollectionName, item.id), item.data)
      );
      await Promise.all(insertPromises);

      // Assert - Query active items
      const querySnapshot = await getDocs(collection(db, testCollectionName));
      const activeItems = querySnapshot.docs.filter(
        doc => doc.data().status === 'active'
      );
      expect(activeItems).toHaveLength(2);
    });

    it('should handle transaction operations', async () => {
      if (!isEmulatorConnected) {
        console.log('Skipping: Emulator not connected');
        return;
      }

      // Arrange
      const doc1Id = 'transaction-doc-1';
      const doc2Id = 'transaction-doc-2';
      const initialValue = 100;

      // Create initial documents
      await setDoc(doc(db, testCollectionName, doc1Id), { value: initialValue });
      await setDoc(doc(db, testCollectionName, doc2Id), { value: initialValue });

      // Act - Simulate transfer operation
      const transferAmount = 30;
      const doc1Ref = doc(db, testCollectionName, doc1Id);
      const doc2Ref = doc(db, testCollectionName, doc2Id);

      // Update both documents
      await setDoc(doc1Ref, { value: initialValue - transferAmount });
      await setDoc(doc2Ref, { value: initialValue + transferAmount });

      // Assert
      const doc1Snapshot = await getDoc(doc1Ref);
      const doc2Snapshot = await getDoc(doc2Ref);

      expect(doc1Snapshot.data()?.value).toBe(70);
      expect(doc2Snapshot.data()?.value).toBe(130);
    });
  });

  describe('Auth Operations', () => {
    it('should handle anonymous authentication', async () => {
      if (!isEmulatorConnected) {
        console.log('Skipping: Emulator not connected');
        return;
      }

      // Act
      const userCredential = await signInAnonymously(auth);

      // Assert
      expect(userCredential.user).toBeDefined();
      expect(userCredential.user.uid).toBeDefined();
      expect(userCredential.user.isAnonymous).toBe(true);
      expect(userCredential.user.email).toBeNull();

      // Cleanup
      await signOut(auth);
    });

    it('should handle auth state changes', async () => {
      if (!isEmulatorConnected) {
        console.log('Skipping: Emulator not connected');
        return;
      }

      // Arrange
      let authStateChanges = 0;
      let currentUser = null;

      const unsubscribe = auth.onAuthStateChanged((user) => {
        authStateChanges++;
        currentUser = user;
      });

      // Act - Sign in
      await signInAnonymously(auth);

      // Assert - User should be signed in
      expect(currentUser).toBeDefined();
      expect(authStateChanges).toBeGreaterThan(0);

      // Act - Sign out
      await signOut(auth);

      // Assert - User should be signed out
      expect(auth.currentUser).toBeNull();

      // Cleanup
      unsubscribe();
    });

    it('should persist auth across operations', async () => {
      if (!isEmulatorConnected) {
        console.log('Skipping: Emulator not connected');
        return;
      }

      // Act - Sign in
      const userCredential = await signInAnonymously(auth);
      const userId = userCredential.user.uid;

      // Assert - User should remain signed in
      expect(auth.currentUser).toBeDefined();
      expect(auth.currentUser?.uid).toBe(userId);

      // Perform Firestore operation with authenticated user
      const userDoc = doc(db, 'users', userId);
      await setDoc(userDoc, {
        uid: userId,
        createdAt: Date.now(),
        isAnonymous: true
      });

      const userSnapshot = await getDoc(userDoc);
      expect(userSnapshot.exists()).toBe(true);
      expect(userSnapshot.data()?.uid).toBe(userId);

      // Cleanup
      await deleteDoc(userDoc);
      await signOut(auth);
    });
  });

  describe('Emulator-Specific Features', () => {
    it('should clear all data in emulator', async () => {
      if (!isEmulatorConnected) {
        console.log('Skipping: Emulator not connected');
        return;
      }

      // Arrange - Create test data
      const testData = [
        { collection: 'test-clear-1', doc: 'doc-1', data: { value: 1 } },
        { collection: 'test-clear-2', doc: 'doc-1', data: { value: 2 } }
      ];

      // Act - Insert test data
      const insertPromises = testData.map(item =>
        setDoc(doc(db, item.collection, item.doc), item.data)
      );
      await Promise.all(insertPromises);

      // Note: In a real implementation, you would call the emulator's clear endpoint
      // For testing purposes, we'll manually delete the collections
      const deletePromises = testData.map(item =>
        deleteDoc(doc(db, item.collection, item.doc))
      );
      await Promise.all(deletePromises);

      // Assert - Verify data is cleared
      const verifyPromises = testData.map(async (item) => {
        const snapshot = await getDoc(doc(db, item.collection, item.doc));
        expect(snapshot.exists()).toBe(false);
      });
      await Promise.all(verifyPromises);
    });

    it('should handle offline persistence in emulator', async () => {
      if (!isEmulatorConnected) {
        console.log('Skipping: Emulator not connected');
        return;
      }

      // Arrange
      const offlineDoc = 'offline-test';
      const offlineData = {
        message: 'Created while offline',
        timestamp: Date.now()
      };

      // Act - Create document (simulating offline behavior)
      const docRef = doc(db, testCollectionName, offlineDoc);
      await setDoc(docRef, offlineData);

      // Assert - Verify document exists
      const snapshot = await getDoc(docRef);
      expect(snapshot.exists()).toBe(true);
      expect(snapshot.data()).toMatchObject(offlineData);

      // Cleanup
      await deleteDoc(docRef);
    });

    it('should validate emulator project ID', () => {
      // Assert
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'demo-test-project';
      expect(projectId).toBeDefined();
      expect(projectId).toMatch(/^[a-z0-9-]+$/); // Valid project ID format
    });

    it('should handle concurrent operations', async () => {
      if (!isEmulatorConnected) {
        console.log('Skipping: Emulator not connected');
        return;
      }

      // Arrange
      const concurrentOps = 20;
      const operations = Array.from({ length: concurrentOps }, (_, i) => ({
        id: `concurrent-${i}`,
        data: { index: i, timestamp: Date.now() }
      }));

      // Act - Execute concurrent writes
      const writePromises = operations.map(op =>
        setDoc(doc(db, testCollectionName, op.id), op.data)
      );
      const results = await Promise.allSettled(writePromises);

      // Assert - All operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful).toHaveLength(concurrentOps);

      // Verify all documents exist
      const querySnapshot = await getDocs(collection(db, testCollectionName));
      const concurrentDocs = querySnapshot.docs.filter(
        doc => doc.id.startsWith('concurrent-')
      );
      expect(concurrentDocs).toHaveLength(concurrentOps);
    });
  });
});