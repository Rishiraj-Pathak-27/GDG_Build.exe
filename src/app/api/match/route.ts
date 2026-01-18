import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route for Blood Donor-Recipient Matching
 * Uses the Hugging Face model: bhyulljz/MLModelTwo
 */

// Blood type compatibility matrix
const BLOOD_COMPATIBILITY: Record<string, string[]> = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+'],
};

function getCompatibleDonorTypes(recipientBloodType: string): string[] {
    const compatibleTypes: string[] = [];
    for (const [donorType, canDonateTo] of Object.entries(BLOOD_COMPATIBILITY)) {
        if (canDonateTo.includes(recipientBloodType)) {
            compatibleTypes.push(donorType);
        }
    }
    return compatibleTypes;
}

function checkHardStopEligibility(donor: any): { eligible: boolean; reasons: string[] } {
    const reasons: string[] = [];
    if (donor.hivStatus) reasons.push('HIV positive status');
    if (donor.hepatitisB) reasons.push('Hepatitis B positive');
    if (donor.hepatitisC) reasons.push('Hepatitis C positive');
    if (donor.htlv) reasons.push('HTLV positive');
    if (donor.ivDrugUse) reasons.push('History of IV drug use');
    return { eligible: reasons.length === 0, reasons };
}

function checkTemporaryEligibility(donor: any): { eligible: boolean; warnings: string[] } {
    const warnings: string[] = [];
    if (donor.recentColdFlu) warnings.push('Recent cold/flu');
    if (donor.recentTattoo) warnings.push('Recent tattoo/piercing');
    if (donor.recentSurgery) warnings.push('Recent surgery');
    if (donor.pregnant) warnings.push('Pregnant or recent delivery');
    if (donor.recentVaccination) warnings.push('Recent vaccination');
    if (donor.recentTravel) warnings.push('Recent travel');

    if (donor.lastDonationDate) {
        const lastDonation = new Date(donor.lastDonationDate);
        const daysSinceLastDonation = Math.floor((Date.now() - lastDonation.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastDonation < 56) {
            warnings.push(`Last donation was ${daysSinceLastDonation} days ago (min 56 required)`);
        }
    }

    return { eligible: warnings.length === 0, warnings };
}

function calculateCompatibilityScore(donor: any, recipient: any): number {
    let score = 0;

    const compatibleTypes = getCompatibleDonorTypes(recipient.bloodType);
    if (compatibleTypes.includes(donor.bloodType)) {
        score += 40;
        if (donor.bloodType === recipient.bloodType) score += 10;
    } else {
        return 0;
    }

    const hardStop = checkHardStopEligibility(donor);
    if (!hardStop.eligible) return 0;

    const tempEligibility = checkTemporaryEligibility(donor);
    if (tempEligibility.eligible) {
        score += 20;
    } else {
        score += Math.max(0, 20 - (tempEligibility.warnings.length * 5));
    }

    // Antigen matching bonus
    if (recipient.rhVariants && donor.rhVariants) {
        let antigenMatches = 0;
        if (recipient.rhVariants.C && donor.rhVariants.C) antigenMatches++;
        if (recipient.rhVariants.c && donor.rhVariants.c) antigenMatches++;
        if (recipient.rhVariants.E && donor.rhVariants.E) antigenMatches++;
        if (recipient.rhVariants.e && donor.rhVariants.e) antigenMatches++;
        score += antigenMatches * 3;
    }

    if (recipient.kell && donor.kell) score += 3;
    if (recipient.duffy && donor.duffy) score += 3;
    if (recipient.kidd && donor.kidd) score += 3;

    // Location proximity
    if (donor.location && recipient.location) {
        const donorLoc = donor.location.toLowerCase();
        const recipientLoc = recipient.location.toLowerCase();
        if (donorLoc.includes(recipientLoc) || recipientLoc.includes(donorLoc)) {
            score += 10;
        }
    }

    // Emergency willingness
    if (donor.willingForEmergency && recipient.urgency === 'critical') {
        score += 5;
    }

    // Donation history
    if (donor.totalDonations) {
        score += Math.min(10, donor.totalDonations);
    }

    return Math.min(100, score);
}

// Python ML Model Server URL
const ML_MODEL_SERVER = 'http://localhost:5000';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { recipientRequest, availableDonors } = body;

        if (!recipientRequest || !availableDonors) {
            return NextResponse.json(
                { error: 'Missing required data: recipientRequest or availableDonors' },
                { status: 400 }
            );
        }

        // Skip ML Model Server for now - use built-in matching directly
        // The ML server can be enabled later when properly configured
        const USE_ML_SERVER = false;

        // Try to use the Python ML Model Server first with timeout
        if (USE_ML_SERVER) {
            try {
                console.log('Attempting to use ML Model Server at', ML_MODEL_SERVER);

                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

                const mlResponse = await fetch(`${ML_MODEL_SERVER}/match`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipientRequest, availableDonors }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (mlResponse.ok) {
                    const mlResult = await mlResponse.json();
                    console.log('ML Model Server response:', mlResult.totalMatchesFound, 'matches found using',
                        mlResult.modelUsed ? 'XGBoost model' : 'rule-based fallback');
                    return NextResponse.json({
                        ...mlResult,
                        modelSource: mlResult.modelUsed ? 'huggingface-xgboost' : 'python-rules'
                    });
                } else {
                    console.log('ML Model Server returned error status:', mlResponse.status);
                }
            } catch (mlError: any) {
                if (mlError.name === 'AbortError') {
                    console.log('ML Model Server request timed out, using built-in matching');
                } else {
                    console.log('ML Model Server not available, using built-in matching:', mlError.message);
                }
            }
        }

        // Fall back to built-in matching if ML server is not available
        console.log('Using built-in matching algorithm');

        const compatibleTypes = getCompatibleDonorTypes(recipientRequest.bloodType);
        const matches: any[] = [];

        for (const donor of availableDonors) {
            if (!compatibleTypes.includes(donor.bloodType)) continue;

            const hardStop = checkHardStopEligibility(donor);
            if (!hardStop.eligible) continue;

            const tempEligibility = checkTemporaryEligibility(donor);
            const score = calculateCompatibilityScore(donor, recipientRequest);

            if (score >= 40) {
                const matchReasons: string[] = [
                    `Blood type ${donor.bloodType} compatible with ${recipientRequest.bloodType}`,
                ];

                if (donor.bloodType === recipientRequest.bloodType) {
                    matchReasons.push('Exact blood type match');
                }

                // Add antigen matching reasons
                if (donor.rhVariants && recipientRequest.rhVariants) {
                    matchReasons.push('Rh antigen profile compatible');
                }
                if (donor.kell && recipientRequest.kell) {
                    matchReasons.push('Kell antigen matched');
                }
                if (donor.duffy && recipientRequest.duffy) {
                    matchReasons.push('Duffy antigen matched');
                }
                if (donor.kidd && recipientRequest.kidd) {
                    matchReasons.push('Kidd antigen matched');
                }

                // Location bonus
                if (donor.location && recipientRequest.location) {
                    const donorLoc = donor.location.toLowerCase();
                    const recipientLoc = recipientRequest.location.toLowerCase();
                    if (donorLoc.includes(recipientLoc) || recipientLoc.includes(donorLoc)) {
                        matchReasons.push('Nearby location');
                    }
                }

                // Emergency willingness
                if (donor.willingForEmergency && recipientRequest.urgency === 'critical') {
                    matchReasons.push('Available for emergency');
                }

                // Experienced donor
                if (donor.totalDonations && donor.totalDonations >= 5) {
                    matchReasons.push(`Experienced donor (${donor.totalDonations} donations)`);
                }

                const priority = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';

                matches.push({
                    // Core Donor Identity & Demographics
                    donorId: donor.id,
                    donorName: donor.donorName || 'Anonymous Donor',
                    donorLocation: donor.location,
                    donorContact: donor.contactNumber,
                    donorAvailability: donor.availability,
                    email: donor.email,
                    age: donor.age,
                    gender: donor.gender,

                    // Blood Type & Rh Factor (Essential)
                    donorBloodType: donor.bloodType,
                    rhPositive: donor.bloodType?.includes('+'),

                    // Extended Antigen Profile (Gold Standard)
                    rhVariants: donor.rhVariants,
                    kell: donor.kell,
                    duffy: donor.duffy,
                    kidd: donor.kidd,

                    // Donation History & Physiology
                    lastDonationDate: donor.lastDonationDate,
                    totalDonations: donor.totalDonations || 0,
                    hemoglobinLevel: donor.hemoglobinLevel,
                    weight: donor.weight,
                    deferralHistory: donor.deferralHistory,

                    // Absolute Eligibility Status (Hard Stop) - all should be false for eligible donors
                    eligibilityFactors: {
                        hivStatus: donor.hivStatus || false,
                        hepatitisB: donor.hepatitisB || false,
                        hepatitisC: donor.hepatitisC || false,
                        htlv: donor.htlv || false,
                        ivDrugUse: donor.ivDrugUse || false,
                    },

                    // Temporary Eligibility Factors
                    temporaryFactors: {
                        recentColdFlu: donor.recentColdFlu || false,
                        recentTattoo: donor.recentTattoo || false,
                        recentSurgery: donor.recentSurgery || false,
                        pregnant: donor.pregnant || false,
                        recentVaccination: donor.recentVaccination || false,
                        recentTravel: donor.recentTravel || false,
                    },

                    // Communication & Availability
                    willingForEmergency: donor.willingForEmergency || false,
                    preferredContactMethod: donor.preferredContactMethod,
                    responseRate: donor.responseRate,

                    // Matching Results
                    compatibilityScore: score,
                    matchReasons,
                    warnings: tempEligibility.warnings,
                    isEligible: tempEligibility.eligible,
                    priority,
                });
            }
        }

        // Sort by score descending
        matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

        const response = {
            requestId: recipientRequest.id,
            recipientName: recipientRequest.userName,
            bloodTypeNeeded: recipientRequest.bloodType,
            urgency: recipientRequest.urgency,
            matches,
            totalMatchesFound: matches.length,
            timestamp: new Date().toISOString(),
            modelSource: 'nextjs-rules' // Indicate this is the fallback
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Matching API error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        status: 'healthy',
        model: 'bhyulljz/MLModelTwo',
        description: 'Blood Donor-Recipient Matching API',
        endpoints: {
            POST: 'Submit recipient request and available donors for matching',
        },
    });
}
