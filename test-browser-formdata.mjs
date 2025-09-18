#!/usr/bin/env node

/**
 * Test that mimics browser FormData behavior more closely
 */

import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:5000';

async function testBrowserLikeUpload() {
  console.log('🌐 Testing Browser-like FormData Upload...\n');

  try {
    // Step 1: Initialize session
    const sessionResponse = await fetch(`${SERVER_URL}/api/upload/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const sessionData = await sessionResponse.json();
    console.log(`✅ Session: ${sessionData.sessionId}\n`);

    // Step 2: Create FormData exactly like browser would
    const formData = new FormData();
    
    // Read file and create a stream (more like browser behavior)
    const fileStream = fs.createReadStream('./test-upload.csv');
    const fileStats = fs.statSync('./test-upload.csv');
    
    formData.append('file', fileStream, {
      filename: 'test-upload.csv',
      contentType: 'text/csv',
      knownLength: fileStats.size
    });

    console.log('📤 Uploading with streaming FormData...');

    const uploadResponse = await fetch(`${SERVER_URL}/api/upload/${sessionData.sessionId}/analyze`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders() // This adds the proper multipart headers
    });

    console.log(`📊 Status: ${uploadResponse.status}`);

    if (uploadResponse.ok) {
      const result = await uploadResponse.json();
      console.log('🎉 SUCCESS! CSV upload working correctly');
      console.log(`📋 Records found: ${result.fileInfo.totalRecords}`);
      console.log(`🔗 Mappings generated: ${result.suggestedMappings.length}`);
    } else {
      const errorText = await uploadResponse.text();
      console.log('❌ Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBrowserLikeUpload();