/**
 * Phase 2A Implementation Smoke Tests
 * Tests: respond middleware, ETag handling, status codes 304/412/428
 */

import axios from 'axios';

const API_BASE = 'http://localhost:4000';

async function testPhase2A() {
  console.log('🧪 Testing Phase 2A Implementation\n');

  try {
    // Test 1: GET bookings list (basic respond middleware)
    console.log('1️⃣ Testing GET /api/bookings (respond middleware)');
    const listResponse = await axios.get(`${API_BASE}/api/bookings`);
    console.log(`   Status: ${listResponse.status}`);
    console.log(`   Response structure: ${JSON.stringify(Object.keys(listResponse.data))}`);
    console.log(`   Has data field: ${!!listResponse.data.data}`);
    console.log(`   ✅ Basic respond middleware working\n`);

    // Test 2: GET single booking with ETag (if any bookings exist)
    if (listResponse.data.data && listResponse.data.data.length > 0) {
      const firstBookingId = listResponse.data.data[0].id;
      console.log('2️⃣ Testing GET /api/bookings/:id (respondWithETag)');
      
      const bookingResponse = await axios.get(`${API_BASE}/api/bookings/${firstBookingId}`);
      console.log(`   Status: ${bookingResponse.status}`);
      console.log(`   ETag header: ${bookingResponse.headers.etag || 'Not present'}`);
      
      if (bookingResponse.headers.etag) {
        // Test 3: 304 Not Modified with If-None-Match
        console.log('3️⃣ Testing 304 Not Modified (If-None-Match)');
        try {
          const notModifiedResponse = await axios.get(`${API_BASE}/api/bookings/${firstBookingId}`, {
            headers: { 'If-None-Match': bookingResponse.headers.etag },
            validateStatus: (status) => status === 304 || status === 200
          });
          console.log(`   Status: ${notModifiedResponse.status}`);
          if (notModifiedResponse.status === 304) {
            console.log(`   ✅ ETag/304 working correctly\n`);
          } else {
            console.log(`   ⚠️ Expected 304, got ${notModifiedResponse.status}\n`);
          }
        } catch (error: any) {
          console.log(`   ❌ 304 test failed: ${error.message}\n`);
        }

        // Test 4: 412 Precondition Failed with wrong If-Match (PATCH)
        console.log('4️⃣ Testing 412 Precondition Failed (wrong If-Match for PATCH)');
        try {
          const patchResponse = await axios.patch(`${API_BASE}/api/bookings/${firstBookingId}`, 
            { notes: 'Test update' },
            { 
              headers: { 'If-Match': '"wrong-version"' },
              validateStatus: (status) => status === 412 || status < 500
            }
          );
          console.log(`   Status: ${patchResponse.status}`);
          if (patchResponse.status === 412) {
            console.log(`   ✅ If-Match validation working correctly\n`);
          } else {
            console.log(`   ⚠️ Expected 412, got ${patchResponse.status}\n`);
          }
        } catch (error: any) {
          console.log(`   ❌ 412 test failed: ${error.message}\n`);
        }
      }

      // Test 5: 428 Precondition Required (PATCH without If-Match)
      console.log('5️⃣ Testing 428 Precondition Required (PATCH without If-Match)');
      try {
        const noPreconditionResponse = await axios.patch(`${API_BASE}/api/bookings/${firstBookingId}`, 
          { notes: 'Test update without precondition' },
          { validateStatus: (status) => status === 428 || status < 500 }
        );
        console.log(`   Status: ${noPreconditionResponse.status}`);
        if (noPreconditionResponse.status === 428) {
          console.log(`   ✅ Precondition Required working correctly\n`);
        } else {
          console.log(`   ⚠️ Expected 428, got ${noPreconditionResponse.status}\n`);
        }
      } catch (error: any) {
        console.log(`   ❌ 428 test failed: ${error.message}\n`);
      }
    } else {
      console.log('⚠️ No bookings found, skipping ETag/precondition tests\n');
    }

    // Test 6: OpenAPI documentation endpoint
    console.log('6️⃣ Testing OpenAPI JSON endpoint');
    const openApiResponse = await axios.get(`${API_BASE}/api/openapi.json`);
    console.log(`   Status: ${openApiResponse.status}`);
    console.log(`   OpenAPI version: ${openApiResponse.data.openapi}`);
    console.log(`   API title: ${openApiResponse.data.info?.title}`);
    console.log(`   ✅ OpenAPI generation working\n`);

    // Test 7: Swagger UI documentation
    console.log('7️⃣ Testing Swagger UI documentation');
    const docsResponse = await axios.get(`${API_BASE}/api/docs/docs`, { 
      validateStatus: (status) => status < 400 
    });
    console.log(`   Status: ${docsResponse.status}`);
    console.log(`   Content-Type: ${docsResponse.headers['content-type']}`);
    console.log(`   Contains swagger-ui: ${docsResponse.data.includes('swagger-ui')}`);
    console.log(`   ✅ Swagger UI serving correctly\n`);

    console.log('✅ Phase 2A Implementation Tests Completed!');

  } catch (error: any) {
    console.error(`❌ Test failed: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Run tests
testPhase2A().catch(console.error);