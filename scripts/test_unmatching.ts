/**
 * Test Script for Blood Donor-Recipient UNMATCHING Scenarios
 * 
 * This script tests various scenarios where donors CANNOT donate to recipients
 * and explains why they fail to match.
 * 
 * Run this script in your browser console on the dashboard page, or
 * execute with: npx ts-node scripts/test_unmatching.ts
 */

// Blood type compatibility matrix - who can DONATE TO whom
const BLOOD_COMPATIBILITY: Record<string, string[]> = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal donor
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+'], // Can only donate to AB+
};

// Who can RECEIVE FROM whom
const RECEIVE_FROM: Record<string, string[]> = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal recipient
};

interface Donor {
    id: string;
    name: string;
    bloodType: string;
    location: string;
    hivStatus?: boolean;
    hepatitisB?: boolean;
    hepatitisC?: boolean;
    recentTattoo?: boolean;
    recentSurgery?: boolean;
    pregnant?: boolean;
}

interface Recipient {
    id: string;
    name: string;
    bloodType: string;
    hospital: string;
    urgency: string;
}

interface UnmatchResult {
    donor: Donor;
    recipient: Recipient;
    canMatch: boolean;
    reasons: string[];
}

// Test donors with various blood types and conditions
const testDonors: Donor[] = [
    { id: 'd1', name: 'Utkarsh Patrikar', bloodType: 'A+', location: 'Nagpur' },
    { id: 'd2', name: 'Rishiraj Pathak', bloodType: 'O-', location: 'Mumbai' },
    { id: 'd3', name: 'Mayank Ninawe', bloodType: 'AB+', location: 'Nagpur' },
    { id: 'd4', name: 'Priya Sharma', bloodType: 'B+', location: 'Delhi' },
    { id: 'd5', name: 'Rahul Gupta', bloodType: 'A-', location: 'Nagpur', hivStatus: true }, // Hard stop
    { id: 'd6', name: 'Sneha Patel', bloodType: 'O+', location: 'Mumbai', hepatitisB: true }, // Hard stop
    { id: 'd7', name: 'Amit Kumar', bloodType: 'B-', location: 'Nagpur', recentTattoo: true }, // Temporary deferral
    { id: 'd8', name: 'Pooja Verma', bloodType: 'AB-', location: 'Delhi', pregnant: true }, // Temporary deferral
];

// Test recipients with various blood types
const testRecipients: Recipient[] = [
    { id: 'r1', name: 'Patient 1', bloodType: 'O-', hospital: 'City Hospital', urgency: 'critical' },
    { id: 'r2', name: 'Patient 2', bloodType: 'A+', hospital: 'Metro Hospital', urgency: 'high' },
    { id: 'r3', name: 'Patient 3', bloodType: 'B+', hospital: 'General Hospital', urgency: 'standard' },
    { id: 'r4', name: 'Patient 4', bloodType: 'AB-', hospital: 'Care Hospital', urgency: 'high' },
    { id: 'r5', name: 'Patient 5', bloodType: 'AB+', hospital: 'Apollo Hospital', urgency: 'medium' },
];

function checkHardStops(donor: Donor): string[] {
    const hardStops: string[] = [];
    if (donor.hivStatus) hardStops.push('HIV positive - permanent deferral');
    if (donor.hepatitisB) hardStops.push('Hepatitis B - permanent deferral');
    if (donor.hepatitisC) hardStops.push('Hepatitis C - permanent deferral');
    return hardStops;
}

function checkTemporaryDeferrals(donor: Donor): string[] {
    const deferrals: string[] = [];
    if (donor.recentTattoo) deferrals.push('Recent tattoo - 6 month deferral');
    if (donor.recentSurgery) deferrals.push('Recent surgery - temporary deferral');
    if (donor.pregnant) deferrals.push('Pregnant - cannot donate during pregnancy');
    return deferrals;
}

function checkBloodTypeCompatibility(donorType: string, recipientType: string): { compatible: boolean; reason: string } {
    const canDonateTo = BLOOD_COMPATIBILITY[donorType] || [];
    const compatible = canDonateTo.includes(recipientType);

    if (compatible) {
        return { compatible: true, reason: `${donorType} can donate to ${recipientType}` };
    } else {
        const whoRecipientCanReceiveFrom = RECEIVE_FROM[recipientType] || [];
        return {
            compatible: false,
            reason: `INCOMPATIBLE: ${donorType} cannot donate to ${recipientType}. ` +
                `${recipientType} can only receive from: ${whoRecipientCanReceiveFrom.join(', ')}`
        };
    }
}

function testUnmatch(donor: Donor, recipient: Recipient): UnmatchResult {
    const reasons: string[] = [];
    let canMatch = true;

    // Check blood type compatibility
    const bloodCheck = checkBloodTypeCompatibility(donor.bloodType, recipient.bloodType);
    if (!bloodCheck.compatible) {
        canMatch = false;
        reasons.push(bloodCheck.reason);
    }

    // Check hard stops (permanent deferrals)
    const hardStops = checkHardStops(donor);
    if (hardStops.length > 0) {
        canMatch = false;
        reasons.push(...hardStops);
    }

    // Check temporary deferrals (warnings but still might be able to donate later)
    const temporaryDeferrals = checkTemporaryDeferrals(donor);
    if (temporaryDeferrals.length > 0) {
        reasons.push(...temporaryDeferrals.map(d => `⚠️ WARNING: ${d}`));
    }

    return {
        donor,
        recipient,
        canMatch,
        reasons: reasons.length > 0 ? reasons : ['✅ Match possible - blood types compatible and no deferrals']
    };
}

function runUnmatchingTests(): void {
    console.log('='.repeat(80));
    console.log('🔬 BLOOD DONATION UNMATCHING TEST SCRIPT');
    console.log('='.repeat(80));
    console.log('Testing scenarios where donors CANNOT donate to recipients\n');

    let totalTests = 0;
    let unmatchedCount = 0;
    let matchedCount = 0;

    // Test each donor against each recipient
    for (const recipient of testRecipients) {
        console.log(`\n📋 RECIPIENT: ${recipient.name}`);
        console.log(`   Blood Type: ${recipient.bloodType}`);
        console.log(`   Hospital: ${recipient.hospital}`);
        console.log(`   Can receive from: ${RECEIVE_FROM[recipient.bloodType]?.join(', ')}`);
        console.log('-'.repeat(60));

        for (const donor of testDonors) {
            totalTests++;
            const result = testUnmatch(donor, recipient);

            const status = result.canMatch ? '✅ MATCH' : '❌ NO MATCH';
            console.log(`\n   Donor: ${donor.name} (${donor.bloodType}) from ${donor.location}`);
            console.log(`   Status: ${status}`);

            for (const reason of result.reasons) {
                console.log(`   → ${reason}`);
            }

            if (result.canMatch) {
                matchedCount++;
            } else {
                unmatchedCount++;
            }
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total tests: ${totalTests}`);
    console.log(`Matched: ${matchedCount} (${((matchedCount / totalTests) * 100).toFixed(1)}%)`);
    console.log(`Unmatched: ${unmatchedCount} (${((unmatchedCount / totalTests) * 100).toFixed(1)}%)`);

    console.log('\n📝 UNMATCHING REASONS EXPLAINED:');
    console.log('-'.repeat(50));
    console.log('1. BLOOD TYPE INCOMPATIBILITY');
    console.log('   - O- can only receive O-');
    console.log('   - O+ can receive O-, O+');
    console.log('   - A- can receive O-, A-');
    console.log('   - A+ can receive O-, O+, A-, A+');
    console.log('   - B- can receive O-, B-');
    console.log('   - B+ can receive O-, O+, B-, B+');
    console.log('   - AB- can receive O-, A-, B-, AB-');
    console.log('   - AB+ can receive ALL (universal recipient)');

    console.log('\n2. PERMANENT DEFERRALS (Hard Stops)');
    console.log('   - HIV positive');
    console.log('   - Hepatitis B or C positive');
    console.log('   - HTLV positive');
    console.log('   - History of IV drug use');

    console.log('\n3. TEMPORARY DEFERRALS');
    console.log('   - Recent tattoo/piercing (6 months)');
    console.log('   - Recent surgery');
    console.log('   - Pregnancy/recent delivery');
    console.log('   - Recent vaccination');
    console.log('   - Recent cold/flu');
    console.log('   - Recent travel to malaria zones');
    console.log('   - Last donation within 56 days');
}

// Run the tests
runUnmatchingTests();

// Export for use in browser console
if (typeof window !== 'undefined') {
    (window as any).testUnmatching = {
        runTests: runUnmatchingTests,
        testDonors,
        testRecipients,
        checkBloodTypeCompatibility,
        BLOOD_COMPATIBILITY,
        RECEIVE_FROM
    };
    console.log('\n💡 TIP: You can access test functions via window.testUnmatching');
}

export { runUnmatchingTests, testUnmatch, testDonors, testRecipients };
