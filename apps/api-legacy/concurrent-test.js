const axios = require('axios');

const BASE = 'http://localhost:4001';
let authToken = '';
let bookingId = '';
let currentVersion = 1;

async function login() {
  const loginResp = await axios.post(`${BASE}/auth/login`, {
    companyCode: 'ENTRIP_MAIN',
    username: 'admin', 
    password: 'pass1234'
  });
  
  // Extract cookie from set-cookie header
  const cookies = loginResp.headers['set-cookie'];
  if (cookies && cookies[0]) {
    authToken = cookies[0].split(';')[0];
  }
  console.log('✅ Logged in');
}

async function createBooking() {
  const resp = await axios.post(
    `${BASE}/api/v1/bookings`,
    {
      customerName: 'Concurrent Test',
      teamName: 'Test Team',
      teamType: 'GROUP',
      bookingType: 'PACKAGE',
      origin: 'Seoul',
      destination: 'Busan',
      startDate: '2025-09-01T00:00:00Z',
      endDate: '2025-09-03T00:00:00Z',
      paxCount: 2,
      nights: 2,
      days: 3,
      totalPrice: 1000,
      currency: 'KRW',
      manager: 'System'
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authToken
      }
    }
  );
  
  bookingId = resp.data.id;
  currentVersion = resp.data.version;
  console.log(`✅ Created booking: ${bookingId} with version: ${currentVersion}`);
  return bookingId;
}

async function concurrentPatch() {
  console.log('\n🔄 Testing concurrent PATCH requests with same version...');
  
  // Both requests use the same version (1)
  const patch1 = axios.patch(
    `${BASE}/api/v1/bookings/${bookingId}`,
    { notes: 'Update 1' },
    {
      headers: {
        'Content-Type': 'application/json',
        'If-Match': '"1"',
        'Cookie': authToken
      }
    }
  ).then(resp => ({ 
    success: true, 
    status: resp.status, 
    version: resp.data.version,
    name: 'PATCH 1'
  })).catch(err => ({ 
    success: false, 
    status: err.response?.status,
    name: 'PATCH 1'
  }));
  
  const patch2 = axios.patch(
    `${BASE}/api/v1/bookings/${bookingId}`,
    { notes: 'Update 2' },
    {
      headers: {
        'Content-Type': 'application/json',
        'If-Match': '"1"',
        'Cookie': authToken
      }
    }
  ).then(resp => ({ 
    success: true, 
    status: resp.status,
    version: resp.data.version,
    name: 'PATCH 2'
  })).catch(err => ({ 
    success: false, 
    status: err.response?.status,
    name: 'PATCH 2'
  }));
  
  // Execute both requests concurrently
  const results = await Promise.all([patch1, patch2]);
  
  console.log('\nResults:');
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.name}: Status ${result.status} - Version updated to ${result.version}`);
    } else {
      console.log(`❌ ${result.name}: Status ${result.status} - Failed (expected - version conflict)`);
    }
  });
  
  // Check that exactly one succeeded and one failed
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success && r.status === 412).length;
  
  if (successCount === 1 && failCount === 1) {
    console.log('\n✅ ATOMIC UPDATE WORKS! One request succeeded, one failed with 412');
  } else {
    console.log('\n❌ ATOMIC UPDATE ISSUE: Expected 1 success and 1 failure');
  }
}

async function main() {
  try {
    await login();
    await createBooking();
    await concurrentPatch();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();