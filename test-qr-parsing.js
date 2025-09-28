// QR Code Analysis Script
const fs = require('fs');

// Sample QR data from the database (first registration)
const qrCodeBase64 = "data:image/png;base64,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";

console.log('QR Code from database (Base64):');
console.log(qrCodeBase64.substring(0, 100) + '...');

// The QR code is a PNG image encoded as base64
// We would need a QR code decoder library to extract the actual text content
// Let's create test QR data to see what format should be used

const testQRFormats = [
    // Format 1: Just the registration ID
    '68d8ef2841a67890c8b2a3e3',
    
    // Format 2: JSON with registration data
    JSON.stringify({
        registrationId: '68d8ef2841a67890c8b2a3e3',
        type: 'YAH_REGISTRATION',
        participant: {
            firstName: 'Mariama',
            lastName: 'Ndamisa'
        },
        event: 'Young African Hub Summit 2024'
    }),
    
    // Format 3: Simple key-value
    'registrationId:68d8ef2841a67890c8b2a3e3'
];

console.log('\n=== Testing QR Format Parsing ===\n');

function parseQRCode(qrText) {
    console.log('Parsing QR code:', qrText);
    
    try {
        // Try to parse as JSON first (structured QR codes)
        const qrData = JSON.parse(qrText);
        console.log('Parsed QR JSON:', qrData);
        
        // Extract registration ID from different possible structures
        if (qrData.registrationId) {
            return qrData.registrationId;
        } else if (qrData.id) {
            return qrData.id;
        } else if (qrData._id) {
            return qrData._id;
        }
        
        console.warn('No registration ID found in QR JSON structure');
        return null;
    } catch (e) {
        console.log('QR is not JSON, trying direct ID parsing...');
        
        // Try to extract ID from plain text patterns
        // Pattern 1: Just the ID
        if (/^[a-f0-9]{24}$/i.test(qrText.trim())) {
            return qrText.trim();
        }
        
        // Pattern 2: URL with ID parameter
        const urlMatch = qrText.match(/[?&](?:id|registrationId)=([a-f0-9]{24})/i);
        if (urlMatch) {
            return urlMatch[1];
        }
        
        // Pattern 3: Key-value format
        const kvMatch = qrText.match(/(?:registrationId|id):\s*([a-f0-9]{24})/i);
        if (kvMatch) {
            return kvMatch[1];
        }
        
        console.warn('Could not extract registration ID from QR code:', qrText);
        return null;
    }
}

// Test all formats
testQRFormats.forEach((format, index) => {
    console.log(`\nTesting Format ${index + 1}:`);
    const result = parseQRCode(format);
    console.log('Result:', result);
    console.log('---');
});