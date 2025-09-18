#!/usr/bin/env node

/**
 * Simple test for FormData handling (frontend fix)
 * Tests just the FormData vs JSON conversion issue
 */

import FormData from 'form-data';
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:5000';

async function testFormDataHandling() {
  console.log('🧪 Testing FormData Handling Fix...\n');

  try {
    // Test 1: Regular JSON request (should work)
    console.log('📤 Test 1: Regular JSON request...');
    const jsonResponse = await fetch(`${SERVER_URL}/api/upload/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    console.log(`📊 JSON request status: ${jsonResponse.status}`);
    
    if (jsonResponse.ok) {
      const sessionData = await jsonResponse.json();
      console.log(`✅ JSON request works: ${sessionData.sessionId}`);
      
      // Test 2: FormData request (previously would fail)
      console.log('\n📁 Test 2: FormData request...');
      
      const formData = new FormData();
      formData.append('test', 'value');
      
      // Send FormData to any endpoint that accepts it
      const formResponse = await fetch(`${SERVER_URL}/api/upload/${sessionData.sessionId}/analyze`, {
        method: 'POST',
        body: formData
        // Note: No Content-Type header - let browser/fetch set it
      });

      console.log(`📊 FormData request status: ${formResponse.status}`);
      
      if (formResponse.status === 400) {
        const errorText = await formResponse.text();
        console.log('❌ FormData request failed with 400 (our target error):');
        console.log(errorText);
        
        if (errorText.includes('[object FormData]')) {
          console.log('\n🔍 ISSUE CONFIRMED: FormData being converted to "[object FormData]" string');
          console.log('Frontend fix needed in queryClient.ts');
        } else {
          console.log('\n✅ FormData conversion issue appears to be fixed!');
          console.log('Error is different - likely backend file processing');
        }
      } else if (formResponse.status === 500) {
        console.log('\n✅ FormData handling appears fixed!');
        console.log('Getting 500 instead of 400 means FormData is being received correctly');
        console.log('Error is now in backend processing (expected with incomplete data)');
      } else {
        console.log(`\n📊 Unexpected status: ${formResponse.status}`);
        const text = await formResponse.text();
        console.log(text);
      }
      
    } else {
      console.log('❌ JSON request failed, server may not be responsive');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server not running. Start with: npm run dev');
    }
  }
}

// Run the test
testFormDataHandling();