const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Generate trace ID for correlation
const traceId = uuidv4().replace(/-/g, '');

// Create axios instance with request/response interceptors
const api = axios.create({
  baseURL: 'http://localhost:4000',
  headers: {
    'Content-Type': 'application/json',
    'X-Trace-ID': traceId
  }
});

// Request interceptor to log all requests
api.interceptors.request.use(request => {
  console.log('\n=== REQUEST ===');
  console.log(`${request.method.toUpperCase()} ${request.url}`);
  console.log('Headers:', JSON.stringify(request.headers, null, 2));
  console.log('Body:', JSON.stringify(request.data, null, 2));
  console.log('Trace ID:', traceId);
  console.log('Timestamp:', new Date().toISOString());
  return request;
}, error => {
  console.error('Request Error:', error);
  return Promise.reject(error);
});

// Response interceptor to log all responses
api.interceptors.response.use(response => {
  console.log('\n=== RESPONSE ===');
  console.log(`Status: ${response.status} ${response.statusText}`);
  console.log('Headers:', JSON.stringify(response.headers, null, 2));
  console.log('Body:', JSON.stringify(response.data, null, 2));
  console.log('Response Time:', new Date().toISOString());
  return response;
}, error => {
  console.log('\n=== ERROR RESPONSE ===');
  if (error.response) {
    console.log(`Status: ${error.response.status} ${error.response.statusText}`);
    console.log('Headers:', JSON.stringify(error.response.headers, null, 2));
    console.log('Body:', JSON.stringify(error.response.data, null, 2));
  } else {
    console.error('Error:', error.message);
  }
  return Promise.reject(error);
});

async function testJWTAndBooking() {
  let jwtToken = null;
  
  try {
    // Step 1: Login to get JWT token
    console.log('\n\n========================================');
    console.log('STEP 1: LOGIN TO GET JWT TOKEN');
    console.log('========================================');
    
    const loginResponse = await api.post('/auth/login', {
      email: 'admin@entrip.com',
      password: 'admin'
    });
    
    jwtToken = loginResponse.data.token;
    console.log('\n✅ JWT Token obtained:', jwtToken);
    console.log('User:', loginResponse.data.user);
    
    // Store JWT token for reuse
    api.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
    
    // Step 2: Create a booking using the JWT token
    console.log('\n\n========================================');
    console.log('STEP 2: CREATE BOOKING WITH JWT TOKEN');
    console.log('========================================');
    
    const bookingData = {
      bookingNumber: `BK${Date.now()}`,
      customerName: '테스트 고객',
      teamName: 'JWT Test Team',
      bookingType: 'BUSINESS',
      destination: 'NRT',
      startDate: '2025-08-15',
      endDate: '2025-08-20',
      paxCount: 10,
      nights: 5,
      days: 6,
      status: 'PENDING',
      totalPrice: 25000000,
      currency: 'KRW',
      notes: 'Created with real JWT token from auth/login'
    };
    
    const bookingResponse = await api.post('/api/v1/bookings', bookingData);
    
    console.log('\n✅ Booking created successfully!');
    console.log('Booking ID:', bookingResponse.data.id);
    console.log('Booking Number:', bookingResponse.data.bookingNumber);
    
    // Step 3: Verify the booking was created by fetching it
    console.log('\n\n========================================');
    console.log('STEP 3: VERIFY BOOKING WITH GET REQUEST');
    console.log('========================================');
    
    const verifyResponse = await api.get(`/api/v1/bookings/${bookingResponse.data.id}`);
    
    console.log('\n✅ Booking verified!');
    console.log('Retrieved booking:', verifyResponse.data);
    
    // Summary
    console.log('\n\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log('✅ JWT Token:', jwtToken);
    console.log('✅ Trace ID:', traceId);
    console.log('✅ Booking ID:', bookingResponse.data.id);
    console.log('✅ Booking Number:', bookingResponse.data.bookingNumber);
    console.log('✅ All operations completed successfully!');
    
  } catch (error) {
    console.error('\n\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
console.log('Starting JWT and Booking test...');
console.log('API Base URL: http://localhost:4000');
console.log('Trace ID:', traceId);
console.log('Current Time:', new Date().toISOString());

testJWTAndBooking();