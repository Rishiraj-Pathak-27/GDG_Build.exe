/**
 * Test Script for Blood Donor-Recipient UNMATCHING Scenarios
 * 
 * USAGE: Copy and paste this entire script into your browser console
 * on the dashboard page (http://localhost:3000/dashboard)
 */

// Blood type compatibility - who can RECEIVE FROM whom
const RECEIVE_FROM = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] // Universal recipient
};

// Blood type compatibility - who can DONATE TO whom
const CAN_DONATE_TO = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal donor
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'] // Can only donate to AB+
};

// Test donors
const testDonors = [
  { name: 'Utkarsh Patrikar', bloodType: 'A+', location: 'Nagpur' },
  { name: 'Rishiraj Pathak', bloodType: 'O-', location: 'Mumbai' },
  { name: 'Mayank Ninawe', bloodType: 'AB+', location: 'Nagpur' },
  { name: 'Priya Sharma', bloodType: 'B+', location: 'Delhi' },
  { name: 'Rahul Gupta', bloodType: 'A-', location: 'Nagpur', hivPositive: true },
  { name: 'Sneha Patel', bloodType: 'O+', location: 'Mumbai', hepatitisB: true },
  { name: 'Amit Kumar', bloodType: 'B-', location: 'Nagpur', recentTattoo: true },
];

// Test recipients
const testRecipients = [
  { name: 'Patient 1', bloodType: 'O-', hospital: 'City Hospital' },
  { name: 'Patient 2', bloodType: 'A+', hospital: 'Metro Hospital' },
  { name: 'Patient 3', bloodType: 'B+', hospital: 'General Hospital' },
  { name: 'Patient 4', bloodType: 'AB-', hospital: 'Care Hospital' },
  { name: 'Patient 5', bloodType: 'AB+', hospital: 'Apollo Hospital' },
];

function checkMatch(donor, recipient) {
  const reasons = [];
  let canMatch = true;

  // Check blood type
  const canReceiveFrom = RECEIVE_FROM[recipient.bloodType] || [];
  if (!canReceiveFrom.includes(donor.bloodType)) {
    canMatch = false;
    reasons.push(`❌ Blood type incompatible: ${recipient.bloodType} cannot receive from ${donor.bloodType}`);
    reasons.push(`   → ${recipient.bloodType} can only receive from: ${canReceiveFrom.join(', ')}`);
  }

  // Check hard stops
  if (donor.hivPositive) {
    canMatch = false;
    reasons.push('❌ HIV positive - permanent deferral');
  }
  if (donor.hepatitisB) {
    canMatch = false;
    reasons.push('❌ Hepatitis B - permanent deferral');
  }

  // Check warnings
  if (donor.recentTattoo) {
    reasons.push('⚠️ Recent tattoo - 6 month deferral');
  }

  return { canMatch, reasons };
}

console.log('═'.repeat(70));
console.log('🔬 BLOOD DONATION UNMATCHING TEST');
console.log('═'.repeat(70));

let matchCount = 0;
let unmatchCount = 0;

testRecipients.forEach(recipient => {
  console.log(`\n📋 RECIPIENT: ${recipient.name} (${recipient.bloodType})`);
  console.log(`   Hospital: ${recipient.hospital}`);
  console.log(`   Can receive from: ${RECEIVE_FROM[recipient.bloodType].join(', ')}`);
  console.log('─'.repeat(50));

  testDonors.forEach(donor => {
    const result = checkMatch(donor, recipient);
    const status = result.canMatch ? '✅' : '❌';
    
    console.log(`\n   ${status} ${donor.name} (${donor.bloodType}) - ${donor.location}`);
    result.reasons.forEach(r => console.log(`      ${r}`));
    
    if (result.canMatch) matchCount++;
    else unmatchCount++;
  });
});

console.log('\n' + '═'.repeat(70));
console.log('📊 SUMMARY');
console.log('═'.repeat(70));
console.log(`Total tests: ${matchCount + unmatchCount}`);
console.log(`✅ Can match: ${matchCount}`);
console.log(`❌ Cannot match: ${unmatchCount}`);

console.log('\n📝 WHY DONORS CANNOT MATCH:');
console.log('─'.repeat(50));
console.log(`
1. BLOOD TYPE INCOMPATIBILITY
   ┌─────────┬────────────────────────────────┐
   │ Type    │ Can Receive From               │
   ├─────────┼────────────────────────────────┤
   │ O-      │ O- only                        │
   │ O+      │ O-, O+                         │
   │ A-      │ O-, A-                         │
   │ A+      │ O-, O+, A-, A+                 │
   │ B-      │ O-, B-                         │
   │ B+      │ O-, O+, B-, B+                 │
   │ AB-     │ O-, A-, B-, AB-                │
   │ AB+     │ All (universal recipient)      │
   └─────────┴────────────────────────────────┘

2. PERMANENT DEFERRALS (HARD STOPS)
   • HIV positive
   • Hepatitis B or C
   • HTLV positive
   • IV drug use history

3. TEMPORARY DEFERRALS
   • Recent tattoo (6 months)
   • Recent surgery
   • Pregnancy
   • Recent vaccination
   • Low hemoglobin
   • Last donation < 56 days ago
`);

console.log('✨ Test complete! Paste this script in your browser console to run it.');
