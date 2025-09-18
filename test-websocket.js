#!/usr/bin/env node

const WebSocket = require('ws');

console.log('Testing WebSocket connections...\n');

// Test 1: Connection with token (should fail with 400)
console.log('Test 1: Connection with token parameter');
const ws1 = new WebSocket('ws://localhost:5000/ws?token=XHpIK0GfmrOM');

ws1.on('open', () => {
  console.log('✓ Token connection opened (unexpected!)');
  ws1.close();
});

ws1.on('error', (error) => {
  console.log('✗ Token connection error (expected):', error.message);
});

ws1.on('close', (code, reason) => {
  console.log(`✓ Token connection closed: ${code} - ${reason.toString()}\n`);
  
  // Test 2: Connection with correct parameters (should work)
  console.log('Test 2: Connection with sessionId and userId');
  const ws2 = new WebSocket('ws://localhost:5000/ws?sessionId=test-session-123&userId=test-user-456');
  
  ws2.on('open', () => {
    console.log('✓ Correct parameters connection opened');
    ws2.close();
  });
  
  ws2.on('error', (error) => {
    console.log('✗ Correct parameters connection error:', error.message);
  });
  
  ws2.on('close', (code, reason) => {
    console.log(`✓ Correct parameters connection closed: ${code} - ${reason.toString()}\n`);
    
    // Test 3: Connection with missing parameters (should fail with 1008)
    console.log('Test 3: Connection with missing parameters');
    const ws3 = new WebSocket('ws://localhost:5000/ws');
    
    ws3.on('open', () => {
      console.log('✗ Missing parameters connection opened (unexpected!)');
      ws3.close();
    });
    
    ws3.on('error', (error) => {
      console.log('✓ Missing parameters connection error (expected):', error.message);
    });
    
    ws3.on('close', (code, reason) => {
      console.log(`✓ Missing parameters connection closed: ${code} - ${reason.toString()}`);
      process.exit(0);
    });
  });
});

// Test 4: Connection to wrong path (should fail with 400)
setTimeout(() => {
  console.log('Test 4: Connection to wrong path');
  const ws4 = new WebSocket('ws://localhost:5000/?token=XHpIK0GfmrOM');
  
  ws4.on('open', () => {
    console.log('✗ Wrong path connection opened (unexpected!)');
    ws4.close();
  });
  
  ws4.on('error', (error) => {
    console.log('✓ Wrong path connection error (expected):', error.message);
  });
  
  ws4.on('close', (code, reason) => {
    console.log(`✓ Wrong path connection closed: ${code} - ${reason.toString()}`);
  });
}, 1000);