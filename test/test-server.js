const { app, server } = require('../server');

async function runApiTests() {
  console.log('\n--- Testing GhostGuard Live Express Endpoints ---');
  const baseUrl = 'http://127.0.0.1:5000';

  try {
    // 1. Test Root /
    console.log('\n[API Test 1] GET /');
    const rootRes = await fetch(`${baseUrl}/`);
    const rootData = await rootRes.json();
    console.log('Status:', rootRes.status);
    console.log('Service:', rootData.service);
    if (rootRes.status !== 200) throw new Error('Root endpoint failed');

    // 2. Test /auth/status
    console.log('\n[API Test 2] GET /auth/status');
    const authStatusRes = await fetch(`${baseUrl}/auth/status`);
    const authStatusData = await authStatusRes.json();
    console.log('Status:', authStatusRes.status);
    console.log('Authenticated:', authStatusData.authenticated);
    if (authStatusRes.status !== 200) throw new Error('Auth status endpoint failed');

    // 3. Test /api/audit/scan without authentication (Expect 401)
    console.log('\n[API Test 3] GET /api/audit/scan (Unauthenticated)');
    const auditRes = await fetch(`${baseUrl}/api/audit/scan`);
    const auditData = await auditRes.json();
    console.log('Status:', auditRes.status);
    console.log('Expected 401 error message:', auditData.message);
    if (auditRes.status !== 401) throw new Error(`Expected 401 but got ${auditRes.status}`);

    // 4. Test /api/audit/scan?mock=true (Hackathon mock demo mode)
    console.log('\n[API Test 4] GET /api/audit/scan?mock=true');
    const mockRes = await fetch(`${baseUrl}/api/audit/scan?mock=true`);
    const mockData = await mockRes.json();
    console.log('Status:', mockRes.status);
    console.log('Mock Count:', mockData.count);
    console.log('Summary Breakdown:', JSON.stringify(mockData.summary, null, 2));
    console.log('Sample Asset Mind Map Record:', JSON.stringify(mockData.assets[0], null, 2));
    if (mockRes.status !== 200 || mockData.count === 0) throw new Error('Mock scan endpoint failed');

    console.log('\n🎉 ALL API ENDPOINTS FUNCTIONING PERFECTLY!');
  } catch (err) {
    console.error('API Test Error:', err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      console.log('Server closed successfully.');
    });
  }
}

runApiTests();

