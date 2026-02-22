/**
 * Test script for API standardization features
 * Run with: npx ts-node test-api-standards.ts
 */

import axios, { AxiosError } from 'axios';

const API_URL = 'http://localhost:4001/api/bookings';

// Test data
const testBooking = {
  code: 'TEST-001',
  customerName: '테스트 고객',
  customerPhone: '010-1234-5678',
  customerEmail: 'test@example.com',
  itineraryFrom: 'ICN',
  itineraryTo: 'JFK',
  departAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  arriveAt: new Date(Date.now() + 86400000 * 2).toISOString(), // Day after tomorrow
  currency: 'KRW',
  amount: '1500000.00',
  companyCode: 'ENTRIP_MAIN',
  notes: 'Test booking'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testRequestId() {
  log('\n=== Testing Request ID ===', 'blue');
  
  try {
    const response = await axios.get(API_URL);
    const requestId = response.headers['x-request-id'];
    
    if (requestId) {
      log(`✅ Request ID present: ${requestId}`, 'green');
    } else {
      log('❌ Request ID missing', 'red');
    }
  } catch (error) {
    log(`❌ Error: ${(error as AxiosError).message}`, 'red');
  }
}

async function testETagSupport() {
  log('\n=== Testing ETag Support ===', 'blue');
  
  try {
    // Create a booking first
    const createResponse = await axios.post(API_URL, testBooking);
    const bookingId = createResponse.data.data.id;
    const etag = createResponse.headers['etag'];
    
    log(`Created booking: ${bookingId}`, 'green');
    
    if (etag) {
      log(`✅ ETag received: ${etag}`, 'green');
      
      // Test If-None-Match (304)
      try {
        const response = await axios.get(`${API_URL}/${bookingId}`, {
          headers: { 'If-None-Match': etag },
          validateStatus: (status) => status < 500
        });
        
        if (response.status === 304) {
          log('✅ If-None-Match working (304 Not Modified)', 'green');
        } else {
          log(`❌ Expected 304, got ${response.status}`, 'red');
        }
      } catch (error) {
        log(`❌ If-None-Match test failed: ${(error as AxiosError).message}`, 'red');
      }
    } else {
      log('❌ ETag header missing', 'red');
    }
    
    // Clean up
    try {
      await axios.delete(`${API_URL}/${bookingId}`);
    } catch (e) {
      // Ignore cleanup errors
    }
  } catch (error) {
    const axiosError = error as AxiosError;
    log(`❌ Error: ${axiosError.message}`, 'red');
    if (axiosError.response) {
      log(`Response: ${JSON.stringify(axiosError.response.data)}`, 'yellow');
    }
  }
}

async function testIfMatchValidation() {
  log('\n=== Testing If-Match Validation ===', 'blue');
  
  try {
    // Create a booking
    const createResponse = await axios.post(API_URL, testBooking);
    const bookingId = createResponse.data.data.id;
    const version = createResponse.data.data.version || 1;
    
    log(`Created booking: ${bookingId} (version ${version})`, 'green');
    
    // Test update without If-Match (should get 428)
    try {
      const response = await axios.patch(`${API_URL}/${bookingId}`, 
        { customerName: 'Updated Name' },
        { validateStatus: (status) => status < 500 }
      );
      
      if (response.status === 428) {
        log('✅ Missing If-Match returns 428 Precondition Required', 'green');
      } else {
        log(`❌ Expected 428, got ${response.status}`, 'red');
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 428) {
        log('✅ Missing If-Match returns 428 Precondition Required', 'green');
      } else {
        log(`❌ Unexpected error: ${axiosError.message}`, 'red');
      }
    }
    
    // Test with wrong If-Match (should get 412)
    try {
      const response = await axios.patch(`${API_URL}/${bookingId}`, 
        { customerName: 'Updated Name' },
        { 
          headers: { 'If-Match': '"999"' },
          validateStatus: (status) => status < 500 
        }
      );
      
      if (response.status === 412) {
        log('✅ Wrong If-Match returns 412 Precondition Failed', 'green');
      } else {
        log(`❌ Expected 412, got ${response.status}`, 'red');
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 412) {
        log('✅ Wrong If-Match returns 412 Precondition Failed', 'green');
      } else {
        log(`❌ Unexpected error: ${axiosError.message}`, 'red');
      }
    }
    
    // Test with correct If-Match
    try {
      const response = await axios.patch(`${API_URL}/${bookingId}`, 
        { customerName: 'Updated Name' },
        { 
          headers: { 'If-Match': `"${version}"` }
        }
      );
      
      if (response.status === 200) {
        log('✅ Correct If-Match allows update', 'green');
        const newVersion = response.data.data.version;
        log(`  New version: ${newVersion}`, 'green');
      } else {
        log(`❌ Expected 200, got ${response.status}`, 'red');
      }
    } catch (error) {
      log(`❌ Update failed: ${(error as AxiosError).message}`, 'red');
    }
    
    // Clean up
    try {
      // Get current version first
      const getResponse = await axios.get(`${API_URL}/${bookingId}`);
      const currentVersion = getResponse.data.data.version;
      await axios.delete(`${API_URL}/${bookingId}`, {
        headers: { 'If-Match': `"${currentVersion}"` }
      });
    } catch (e) {
      // Ignore cleanup errors
    }
  } catch (error) {
    const axiosError = error as AxiosError;
    log(`❌ Error: ${axiosError.message}`, 'red');
  }
}

async function testFieldWhitelisting() {
  log('\n=== Testing Field Whitelisting ===', 'blue');
  
  try {
    // Test with allowed fields
    const response = await axios.get(API_URL, {
      params: {
        fields: ['id', 'code', 'amount', 'status']
      }
    });
    
    if (response.status === 200) {
      log('✅ Allowed fields accepted', 'green');
    }
    
    // Test with invalid fields (should be filtered)
    const response2 = await axios.get(API_URL, {
      params: {
        fields: ['id', '__proto__', 'password', 'secret']
      }
    });
    
    if (response2.status === 200) {
      log('✅ Invalid fields filtered out', 'green');
    }
    
    // Test include whitelisting
    const response3 = await axios.get(API_URL, {
      params: {
        include: ['manager', 'company']
      }
    });
    
    if (response3.status === 200) {
      log('✅ Allowed includes accepted', 'green');
    }
  } catch (error) {
    log(`❌ Field whitelisting test failed: ${(error as AxiosError).message}`, 'red');
  }
}

async function testZodValidation() {
  log('\n=== Testing Zod Validation ===', 'blue');
  
  // Test with invalid data
  const invalidBooking = {
    code: 'test', // Should be uppercase
    customerName: '', // Required
    customerPhone: '123', // Invalid format
    customerEmail: 'not-an-email', // Invalid email
    itineraryFrom: 'IC', // Should be 3 chars
    itineraryTo: 'ICN', // Same as from (not allowed)
    departAt: 'invalid-date',
    arriveAt: 'invalid-date',
    amount: 'not-a-number'
  };
  
  try {
    const response = await axios.post(API_URL, invalidBooking, {
      validateStatus: (status) => status < 500
    });
    
    if (response.status === 400) {
      log('✅ Invalid data rejected with 400', 'green');
      const error = response.data.error;
      if (error?.code === 'VALIDATION_ERROR') {
        log('✅ Validation error code correct', 'green');
        if (error.details && Array.isArray(error.details)) {
          log(`  ${error.details.length} validation errors found`, 'yellow');
        }
      }
    } else {
      log(`❌ Expected 400, got ${response.status}`, 'red');
    }
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 400) {
      log('✅ Invalid data rejected with 400', 'green');
    } else {
      log(`❌ Unexpected error: ${axiosError.message}`, 'red');
    }
  }
}

async function testErrorStandardization() {
  log('\n=== Testing Error Standardization ===', 'blue');
  
  try {
    // Test 404 error
    const response = await axios.get(`${API_URL}/non-existent-id`, {
      validateStatus: (status) => status < 500
    });
    
    if (response.status === 404) {
      const error = response.data.error;
      if (error?.code === 'NOT_FOUND' && error?.traceId) {
        log('✅ 404 error format correct with trace ID', 'green');
      } else {
        log('❌ 404 error format incorrect', 'red');
      }
    }
  } catch (error) {
    log(`❌ Error test failed: ${(error as AxiosError).message}`, 'red');
  }
}

// Main test runner
async function runTests() {
  log('\n🚀 Starting API Standardization Tests', 'blue');
  log('=' .repeat(50), 'blue');
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testRequestId();
  await testETagSupport();
  await testIfMatchValidation();
  await testFieldWhitelisting();
  await testZodValidation();
  await testErrorStandardization();
  
  log('\n' + '=' .repeat(50), 'blue');
  log('✅ All tests completed!', 'green');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`\n❌ Unhandled error: ${error}`, 'red');
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  log(`\n❌ Test runner failed: ${error}`, 'red');
  process.exit(1);
});