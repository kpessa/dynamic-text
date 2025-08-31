// Quick check for environment variables
console.log('Environment Variables Check:');
console.log('VITE_FIREBASE_API_KEY:', import.meta.env?.VITE_FIREBASE_API_KEY || 'NOT FOUND');
console.log('VITE_FIREBASE_PROJECT_ID:', import.meta.env?.VITE_FIREBASE_PROJECT_ID || 'NOT FOUND');
console.log('All VITE_ vars:', Object.keys(import.meta.env || {}).filter(key => key.startsWith('VITE_')));
