const crypto = require('crypto');

// Real secret key from database
const secret_key_hex = '373387871b6562fb1a1123346d4f47e5dc3850f1508f14e59c82d0dcd1d478f7';

// Test challenge (you'll replace this with a real one from API)
const challenge_hex = 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

console.log('=== HMAC-SHA256 Test ===\n');
console.log('Secret Key (hex):', secret_key_hex);
console.log('Challenge (hex): ', challenge_hex);

// Convert to buffers
const secretKeyBuffer = Buffer.from(secret_key_hex, 'hex');
const challengeBuffer = Buffer.from(challenge_hex, 'hex');

console.log('\nSecret Key length:', secretKeyBuffer.length, 'bytes');
console.log('Challenge length: ', challengeBuffer.length, 'bytes');

// Compute HMAC
const hmac = crypto.createHmac('sha256', secretKeyBuffer);
hmac.update(challengeBuffer);
const signature = hmac.digest();

console.log('\n=== Expected Signature ===');
console.log('Hex:    ', signature.toString('hex'));
console.log('Base64: ', signature.toString('base64'));
console.log('Length: ', signature.length, 'bytes');

console.log('\n=== For Testing ===');
console.log('curl -X POST http://localhost:3000/v1/auth/card \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"card_id":"695b9142dbc6d39a84263769","challenge":"' + challenge_hex + '","signature":"' + signature.toString('base64') + '"}\'');
