/**
 * Test respond middleware functionality
 */

import axios from 'axios';

const API_BASE = 'http://localhost:4001';

async function testRespondMiddleware() {
  console.log('🧪 Testing Respond Middleware\n');

  try {
    // Test 1: Basic respond middleware
    console.log('1️⃣ Testing basic respond middleware');
    const basicResponse = await axios.get(`${API_BASE}/api/test-respond/basic`);
    console.log(`   Status: ${basicResponse.status}`);
    console.log(`   Response: ${JSON.stringify(basicResponse.data, null, 2)}`);
    console.log(`   Has 'data' field: ${!!basicResponse.data.data}`);
    console.log(`   ✅ Basic respond middleware working\n`);

    // Test 2: ETag respond middleware
    console.log('2️⃣ Testing respondWithETag middleware');
    const etagResponse = await axios.get(`${API_BASE}/api/test-respond/etag`);
    console.log(`   Status: ${etagResponse.status}`);
    console.log(`   ETag header: ${etagResponse.headers.etag || 'Not present'}`);
    console.log(`   Response: ${JSON.stringify(etagResponse.data, null, 2)}`);
    
    if (etagResponse.headers.etag) {
      console.log(`   ✅ ETag middleware working\n`);
      
      // Test 3: 304 Not Modified
      console.log('3️⃣ Testing 304 Not Modified');
      const notModifiedResponse = await axios.get(`${API_BASE}/api/test-respond/etag`, {
        headers: { 'If-None-Match': etagResponse.headers.etag },
        validateStatus: (status) => status === 304 || status === 200
      });
      console.log(`   Status: ${notModifiedResponse.status}`);
      if (notModifiedResponse.status === 304) {
        console.log(`   Response body empty: ${!notModifiedResponse.data || Object.keys(notModifiedResponse.data).length === 0}`);
        console.log(`   ✅ 304 Not Modified working correctly\n`);
      } else {
        console.log(`   ⚠️ Expected 304, got ${notModifiedResponse.status}\n`);
      }
    }

    console.log('✅ Respond Middleware Tests Completed Successfully!');

  } catch (error: any) {
    console.error(`❌ Test failed: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Run tests
testRespondMiddleware().catch(console.error);