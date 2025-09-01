// Test script to verify KPT button functionality
console.log("Testing KPT button and functions...");

// First, check if the KPT button exists in the navbar
const kptButton = document.querySelector('button[title*="KPT"]');
if (kptButton) {
  console.log("✓ KPT button found in navbar");
  console.log("  Button text:", kptButton.textContent);
  console.log("  Button classes:", kptButton.className);
  
  // Try clicking the button
  console.log("  Attempting to click KPT button...");
  kptButton.click();
  
  // Check if KPT reference panel opened
  setTimeout(() => {
    const kptPanel = document.querySelector('.kpt-reference-panel');
    if (kptPanel) {
      console.log("✓ KPT reference panel opened successfully");
    } else {
      console.log("✗ KPT reference panel not found after clicking button");
    }
  }, 500);
} else {
  console.log("✗ KPT button not found in navbar");
  console.log("  Looking for any button with 'KPT' text...");
  const allButtons = document.querySelectorAll('button');
  allButtons.forEach(btn => {
    if (btn.textContent.includes('KPT')) {
      console.log("  Found button with KPT text:", btn.textContent, "title:", btn.title);
    }
  });
}

// Also test if me.kpt functions are available in the worker
console.log("\nTesting KPT functions in worker context...");
console.log("Copy this to test in a dynamic section:");
console.log("me.kpt.formatNumber(123.456, 2)");
