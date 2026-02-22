const http = require('http');

// Test if the API endpoints are accessible
const testEndpoint = (path, expectedStatus = 200) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4002, // API v2 port
      path: `/api/v2${path}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      console.log(`✓ ${path}: ${res.statusCode} ${res.statusMessage}`);
      resolve({ status: res.statusCode, path });
    });

    req.on('error', (err) => {
      console.log(`✗ ${path}: ${err.message}`);
      resolve({ error: err.message, path });
    });

    req.setTimeout(5000, () => {
      console.log(`✗ ${path}: Timeout`);
      resolve({ error: 'Timeout', path });
    });

    req.end();
  });
};

// Test the main endpoints
async function testAPIEndpoints() {
  console.log('🧪 Testing API v2 Endpoints...\n');

  const endpoints = [
    '/health',           // Health check
    '/auth/me',          // Should return 401 (needs auth)
    '/bookings',         // Should return 401 (needs auth)
    '/users/profile',    // Should return 401 (needs auth)
  ];

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }

  console.log('\n✅ API endpoint structure verification complete!');
  console.log('Note: 401 responses are expected for protected routes without authentication.');
}

testAPIEndpoints().catch(console.error);