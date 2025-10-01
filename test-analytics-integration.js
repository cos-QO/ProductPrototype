// Simple test to verify analytics integration
// Run this in browser console on the product edit page

console.log("🧪 Testing Analytics Integration");

// Check if Chart.js is loaded
if (typeof Chart !== "undefined") {
  console.log("✅ Chart.js loaded successfully");
} else {
  console.log("❌ Chart.js not found");
}

// Check if React components are mounted
const dimensionsTab = document.querySelector('[data-testid="tab-dimensions"]');
if (dimensionsTab) {
  console.log("✅ Dimensions tab found in DOM");

  // Simulate click to test tab switching
  dimensionsTab.click();
  console.log("🔄 Clicked Dimensions tab");

  setTimeout(() => {
    const tabContent = document.querySelector('[role="tabpanel"]');
    if (tabContent && tabContent.textContent.includes("Analytics")) {
      console.log("✅ Analytics content loaded");
    } else {
      console.log("❌ Analytics content not found");
    }
  }, 1000);
} else {
  console.log("❌ Dimensions tab not found");
}

// Check for API calls
const originalFetch = window.fetch;
let apiCalls = [];

window.fetch = function (...args) {
  if (args[0].includes("/api/products/") && args[0].includes("analytics")) {
    apiCalls.push(args[0]);
    console.log("📡 Analytics API call:", args[0]);
  }
  return originalFetch.apply(this, args);
};

console.log(
  "🎯 Test setup complete. Navigate to a product edit page to continue testing.",
);
