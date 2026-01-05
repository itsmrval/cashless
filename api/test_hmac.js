const crypto = require('crypto');

// Test HMAC-SHA256 signature verification
const secret_key = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';  // Example 64 hex chars
const challenge = 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234';  // 64 hex chars (32 bytes)

console.log('Secret Key:', secret_key);
console.log('Challenge:', challenge);

// Convert hex strings to buffers
const secretKeyBuffer = Buffer.from(secret_key, 'hex');
const challengeBuffer = Buffer.from(challenge, 'hex');

console.log('\nSecret Key Buffer length:', secretKeyBuffer.length, 'bytes');
console.log('Challenge Buffer length:', challengeBuffer.length, 'bytes');

// Create HMAC signature
const hmac = crypto.createHmac('sha256', secretKeyBuffer);
hmac.update(challengeBuffer);
const signature = hmac.digest();

console.log('\nGenerated Signature (hex):', signature.toString('hex'));
console.log('Generated Signature (base64):', signature.toString('base64'));
console.log('Signature length:', signature.length, 'bytes');

// Verify signature
const hmac2 = crypto.createHmac('sha256', secretKeyBuffer);
hmac2.update(challengeBuffer);
const expectedSignature = hmac2.digest();

const isValid = crypto.timingSafeEqual(signature, expectedSignature);
console.log('\nVerification:', isValid ? '✅ PASS' : '❌ FAIL');
