# Firebase Integration for Dynamic Text Editor

This document describes the new Firebase-powered ingredient-centric reference management system.

## Overview

The Dynamic Text Editor now supports Firebase Firestore as a backend for storing and managing reference texts. The system has been redesigned with **ingredients as the central organizing principle**, making it easier to:

- Track variations across patient populations
- Compare reference texts (diff functionality)
- Share configurations across health systems
- Collaborate in real-time

## Key Features

### 1. Ingredient-Centric Organization
- Each ingredient (e.g., MultiVitamin, Calcium, etc.) is now a top-level entity
- References are organized under their respective ingredients
- Easy navigation between different population-specific versions

### 2. Population Type Support
References can be categorized by patient population:
- **Neonatal** - For newborns and infants
- **Pediatric** - For children
- **Adolescent** - For teenagers
- **Adult** - For adult patients

### 3. Diff Viewer
- Compare reference texts across different populations
- Visual highlighting of differences
- Collapse identical content automatically
- Export diff reports

### 4. Real-time Sync
- Changes sync across all users instantly
- Offline support with automatic sync when reconnected
- Conflict resolution for concurrent edits

## Setup Instructions

### 1. Firebase Project Setup

1. Create a new Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Create a web app and copy the configuration

### 2. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase credentials in `.env`:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

### 3. Firestore Security Rules

Add these basic security rules to your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to all users
    match /{document=**} {
      allow read: if true;
    }
    
    // Allow write access to authenticated users
    match /{document=**} {
      allow write: if request.auth != null;
    }
  }
}
```

## Using the New Features

### Accessing Firebase Features

When Firebase is configured, you'll see two new buttons in the navbar:
- **📦 Ingredients** - Opens the Ingredient Manager
- **🚀 Migrate** - Opens the migration tool for localStorage data

### Ingredient Manager

The Ingredient Manager provides:
- Centralized view of all ingredients
- Filtering by category, health system, or differences
- Visual indicators showing which populations have references
- Quick access to create or edit references

### Creating References

1. Open the Ingredient Manager
2. Find or search for your ingredient
3. Click "Add Reference" for the desired population type
4. The editor will open with the ingredient pre-filled

### Comparing References

1. In the Ingredient Manager, click on an ingredient that has multiple population references
2. The expanded view shows all population variants
3. Click on any reference to edit it
4. Ingredients with differences are marked with a ⚡ indicator

### Data Migration

If you have existing data in localStorage:

1. Click the **🚀 Migrate** button
2. Review the data preview
3. Select the default population type for your references
4. Click "Start Migration"

Your data will be:
- Organized by ingredients
- Tagged with the selected population type
- Preserved in localStorage (not deleted)

## Data Structure

### Firestore Collections

```
ingredients/
  {ingredientId}/
    - name: "MultiVitamin"
    - category: "ADDITIVES"
    - description: "..."
    - references/
      {referenceId}/
        - populationType: "adult"
        - healthSystem: "UHS"
        - sections: [...]
        - version: "1.0"
```

### Categories

Ingredients are automatically categorized:
- BASIC_PARAMETERS
- MACRONUTRIENTS
- ELECTROLYTES
- ADDITIVES
- PREFERENCES
- CALCULATED_VOLUMES
- CLINICAL_CALCULATIONS
- WEIGHT_CALCULATIONS
- OTHER

## Best Practices

1. **Consistent Naming**: Use the same ingredient names across references
2. **Population Types**: Always specify the appropriate population type
3. **Version Control**: Update version numbers when making significant changes
4. **Health Systems**: Tag references with the correct health system
5. **Regular Backups**: Use the export feature to backup important references

## Troubleshooting

### Firebase Not Configured
If you see "Firebase is not configured" messages:
1. Check your `.env` file has all required values
2. Restart the development server after adding credentials
3. Verify your Firebase project is set up correctly

### Migration Issues
If migration fails:
1. Export a backup first using the backup button
2. Check the browser console for detailed error messages
3. Ensure you have write permissions in Firestore

### Sync Issues
If changes aren't syncing:
1. Check your internet connection
2. Verify Firebase authentication is working
3. Look for any Firestore quota limits

## Future Enhancements

- User authentication and permissions
- Audit trail for all changes
- Bulk import/export functionality
- Advanced diff algorithms
- Template library for common references