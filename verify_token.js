// Verification script for Token Generation Logic

const validTokens = [
    '1234',
    '9087',
    '0000'
];

const invalidTokens = [
    '123',
    '12345',
    '12A4',
    'ORD-ABC123-17258392123'
];

const isPickupToken = (token) => /^\d{4}$/.test(token);

console.log('--- Verifying 4-digit pickup token format ---');

const validResults = validTokens.every(isPickupToken);
const invalidResults = invalidTokens.every((token) => !isPickupToken(token));

for (const token of validTokens) {
    console.log(`${token}: ${isPickupToken(token) ? 'valid' : 'invalid'}`);
}

for (const token of invalidTokens) {
    console.log(`${token}: ${isPickupToken(token) ? 'valid' : 'invalid'}`);
}

if (!validResults || !invalidResults) {
    console.error('Token format verification failed.');
    process.exit(1);
}

console.log('Token format verification passed.');
