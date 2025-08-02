// Check localStorage for reference data
const storage = localStorage.getItem('referenceTexts');
if (storage) {
  const data = JSON.parse(storage);
  console.log('Found localStorage data:');
  console.log('- References:', Object.keys(data.referenceTexts || {}).length);
  console.log('- Sample keys:', Object.keys(data.referenceTexts || {}).slice(0, 5));
} else {
  console.log('No localStorage data found');
}
EOF < /dev/null
