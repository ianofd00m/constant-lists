import jwt from 'jsonwebtoken';

// Create a test JWT token for testing deck saving
const JWT_SECRET = 'your_jwt_secret_here';

const testPayload = {
  id: 'test-user-id-123',
  username: 'testuser',
  email: 'test@example.com',
  jti: 'test-jwt-id'
};

const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '1d' });

console.log('Generated test JWT token:');
console.log(token);
console.log('\nRun this in browser console to set the token:');
console.log(`localStorage.setItem('token', '${token}');`);

// Also verify the token works
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('\n✅ Token verification successful:', decoded);
} catch (err) {
  console.log('\n❌ Token verification failed:', err.message);
}
