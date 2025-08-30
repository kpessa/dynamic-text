# Database Schema

## Firestore Document Structure

Since Firestore is a NoSQL document database, we define the schema as document structures:

```javascript
// Collection: references
{
  id: "auto-generated-id",
  name: "Calcium Gluconate Reference",
  userId: "firebase-auth-uid",  // Optional for anonymous
  populationType: "adult",
  healthSystem: "default",
  sections: [
    {
      id: "uuid-v4",
      type: "static",
      name: "Header",
      content: "<h1>Calcium Gluconate</h1>",
      order: 0,
      isActive: true
    },
    {
      id: "uuid-v4",
      type: "dynamic",
      name: "Dosage Calculation",
      content: "const dose = me.getValue('weight') * 2;\nreturn `Dose: ${dose} mg`;",
      order: 1,
      isActive: true,
      testCases: [
        {
          id: "test-uuid",
          name: "Standard Adult",
          variables: { weight: 70 },
          expectedOutput: "Dose: 140 mg",
          expectedStyles: "",
          result: "pass",
          actualOutput: "Dose: 140 mg"
        }
      ]
    }
  ],
  metadata: {
    version: "1.0.0",
    tags: ["calcium", "electrolyte"],
    description: "Reference for calcium gluconate administration"
  },
  createdAt: "2024-01-30T10:00:00Z",  // Firestore Timestamp
  updatedAt: "2024-01-30T14:30:00Z"   // Firestore Timestamp
}

// Collection: users/{userId}/preferences
{
  theme: "light",
  lastOpenedReference: "reference-id",
  defaultPopulationType: "adult",
  editorPreferences: {
    fontSize: 14,
    wordWrap: true,
    showLineNumbers: true
  }
}
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public references (read-only for all, write for owner)
    match /references/{referenceId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null 
        && request.auth.uid == resource.data.userId;
    }
    
    // User preferences (private)
    match /users/{userId}/preferences/{document=**} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }
    
    // User's private references
    match /users/{userId}/references/{referenceId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }
  }
}
```

## Indexes

```yaml
# firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "references",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "references",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "populationType", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## Local Storage Schema

For offline/anonymous mode:

```typescript
// localStorage keys and structures
{
  "tpn_current_reference": {
    // Same structure as Firestore document
  },
  "tpn_workspace_state": {
    activeSection: "section-id",
    sidebarCollapsed: false,
    previewVisible: true
  },
  "tpn_editor_preferences": {
    theme: "light",
    fontSize: 14,
    // ... other preferences
  }
}
```
