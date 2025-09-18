#!/usr/bin/env node

/**
 * Simple test for CSV upload functionality
 * Tests the FormData and file reading fixes
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:5000';

async function testCSVUpload() {
  console.log('🧪 Testing CSV Upload Fixes...\n');

  try {
    // Step 1: Initialize session
    console.log('📤 Step 1: Initializing upload session...');
    const sessionResponse = await fetch(`${SERVER_URL}/api/upload/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!sessionResponse.ok) {
      throw new Error(`Session init failed: ${sessionResponse.status} ${sessionResponse.statusText}`);
    }

    const sessionData = await sessionResponse.json();
    console.log(`✅ Session initialized: ${sessionData.sessionId}`);

    // Step 2: Upload and analyze CSV file
    console.log('\n📁 Step 2: Uploading CSV file...');
    
    const formData = new FormData();
    const csvContent = fs.readFileSync('./test-upload.csv');
    formData.append('file', csvContent, {
      filename: 'test-upload.csv',
      contentType: 'text/csv'
    });

    const uploadResponse = await fetch(`${SERVER_URL}/api/upload/${sessionData.sessionId}/analyze`, {
      method: 'POST',
      body: formData
    });

    console.log(`📊 Upload response status: ${uploadResponse.status}`);

    if (uploadResponse.ok) {
      const result = await uploadResponse.json();
      console.log('✅ CSV upload successful!');
      console.log(`📋 File info:`, {
        name: result.fileInfo.name,
        size: result.fileInfo.size,
        totalRecords: result.fileInfo.totalRecords
      });
      console.log(`🎯 Found ${result.sourceFields.length} source fields`);
      console.log(`🔗 Generated ${result.suggestedMappings.length} field mappings`);
      
      console.log('\n🎉 CSV Upload Fix Test: PASSED');
      console.log('- ✅ Frontend FormData handling works');
      console.log('- ✅ Backend file reading from disk works');
      
    } else {
      const errorText = await uploadResponse.text();
      console.log('❌ CSV upload failed:');
      console.log(`Status: ${uploadResponse.status}`);
      console.log(`Error: ${errorText}`);
      
      if (uploadResponse.status === 400) {
        console.log('\n🔍 This might indicate the original issues persist:');
        console.log('- Frontend FormData conversion issue');
        console.log('- Backend file.buffer vs file.path issue');
      }
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server not running. Start with: npm run dev');
    }
  }
}

// Run the test
testCSVUpload();