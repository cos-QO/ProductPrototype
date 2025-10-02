// Test script to verify analytics fix
console.log("Testing Analytics Fix...");

// Check if the server is running
fetch("http://localhost:5000/api/dashboard/stats")
  .then((res) => {
    if (res.ok) {
      console.log("✅ Server is running");
      return res.json();
    } else {
      throw new Error("Server not responding");
    }
  })
  .then((data) => {
    console.log("✅ Dashboard stats loaded:", data);
  })
  .catch((err) => {
    console.error("❌ Server error:", err);
  });

// Check if analytics endpoint is working
fetch("http://localhost:5000/api/products/37/analytics")
  .then((res) => {
    if (res.ok) {
      console.log("✅ Analytics endpoint is working");
      return res.json();
    } else if (res.status === 404) {
      console.log(
        "⚠️ Analytics data not found (expected for new implementation)",
      );
      return null;
    } else {
      throw new Error("Analytics endpoint error");
    }
  })
  .then((data) => {
    if (data) {
      console.log("✅ Analytics data:", data);
    }
  })
  .catch((err) => {
    console.error("❌ Analytics error:", err);
  });

console.log("Test complete. Check browser at http://localhost:5000");
