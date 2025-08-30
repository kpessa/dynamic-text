# 7. API Specifications

## REST API Endpoints

### AI Test Generation
```http
POST /api/generate-tests
Content-Type: application/json
Authorization: Bearer {firebase-token}

{
  "code": "string",
  "sectionName": "string",
  "context": {
    "tpnValues": {},
    "populationType": "string"
  }
}

Response: 200 OK
{
  "tests": [
    {
      "name": "string",
      "variables": {},
      "expected": "string"
    }
  ]
}
```

## Firebase Operations
```typescript
// Save Reference
async function saveReference(userId: string, reference: Reference) {
  const docRef = doc(db, 'users', userId, 'references', reference.id)
  await setDoc(docRef, {
    ...reference,
    lastModified: serverTimestamp()
  })
}

// Load References
async function loadReferences(userId: string): Promise<Reference[]> {
  const q = query(
    collection(db, 'users', userId, 'references'),
    orderBy('lastModified', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data())
}
```
