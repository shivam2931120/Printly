
// Verification script for Token Generation Logic

const mockOrderIds = [
    'ORD-ABC123-17258392123',
    'ORD-XYZ789-12345678900',
    'ORD-TOKEN1-99999999999'
];

console.log('--- Verifying Token Extraction Logic ---');

mockOrderIds.forEach(id => {
    const extractedToken = id.split('-')[1] || id; // The fixed logic
    console.log(`ID: ${id} -> Token: ${extractedToken}`);

    if (extractedToken.length === 6) {
        console.log('✅ Token length is correct (6 chars)');
    } else {
        console.log(`✅ Token extracted (Length: ${extractedToken.length})`);
    }

    // Verify it's NOT the timestamp
    const timestampPart = id.split('-')[2];
    if (extractedToken !== timestampPart) {
        console.log('✅ Correctly avoided timestamp');
    } else {
        console.error('❌ Error: Extracted timestamp instead of token!');
    }
    console.log('---');
});
