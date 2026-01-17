/**
 * Hugging Face Model Integration for Blood Donor-Recipient Matching
 * Model: bhyulljz/MLModelTwo (XGBoost-based blood matching model)
 */

// Types for donor and recipient data
export interface DonorProfile {
    id: string;
    donorName: string;
    bloodType: string;
    rhFactor?: string;
    age?: number;
    gender?: string;
    weight?: number;
    location: string;
    contactNumber: string;
    availability: string;

    // Extended Antigen Profile
    rhVariants?: {
        C?: boolean;
        c?: boolean;
        E?: boolean;
        e?: boolean;
    };
    kell?: boolean;
    duffy?: boolean;
    kidd?: boolean;

    // Eligibility Factors
    lastDonationDate?: string;
    hemoglobinLevel?: number;
    hasChronicIllness?: boolean;
    recentTravel?: boolean;
    recentTattoo?: boolean;
    recentSurgery?: boolean;

    // Absolute Eligibility (Safety)
    hivStatus?: boolean;
    hepatitisB?: boolean;
    hepatitisC?: boolean;
    htlv?: boolean;
    ivDrugUse?: boolean;

    // Temporary Eligibility
    recentColdFlu?: boolean;
    recentVaccination?: boolean;
    pregnant?: boolean;

    // Donation History
    totalDonations?: number;
    willingForEmergency?: boolean;
}

export interface RecipientRequest {
    id: string;
    userId: string;
    userName: string;
    bloodType: string;
    rhFactor?: string;
    urgency: 'critical' | 'high' | 'medium' | 'standard';
    hospital: string;
    location: string;
    requiredBy: string;
    units: number;
    contactNumber: string;

    // Patient Demographics
    age?: number;
    gender?: string;
    patientWeight?: number;

    // Extended Antigen Requirements
    rhVariants?: {
        C?: boolean;
        c?: boolean;
        E?: boolean;
        e?: boolean;
    };
    kell?: boolean;
    duffy?: boolean;
    kidd?: boolean;

    // Medical Requirements
    diagnosisReason?: string;
    transfusionHistory?: string;
    allergies?: string;
    currentMedications?: string;

    // Special Requirements
    irradiatedBlood?: boolean;
    cmvNegative?: boolean;
    washedCells?: boolean;
    leukocyteReduced?: boolean;
}

export interface MatchResult {
    donorId: string;
    donorName: string;
    donorBloodType: string;
    donorLocation: string;
    donorContact: string;
    donorAvailability: string;
    compatibilityScore: number;
    matchReasons: string[];
    warnings: string[];
    isEligible: boolean;
    priority: 'high' | 'medium' | 'low';
}

export interface MatchingResponse {
    requestId: string;
    recipientName: string;
    bloodTypeNeeded: string;
    urgency: string;
    matches: MatchResult[];
    totalMatchesFound: number;
    timestamp: string;
}

// Blood type compatibility matrix
const BLOOD_COMPATIBILITY: Record<string, string[]> = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal donor
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+'], // Universal recipient
};

// Get compatible blood types for a recipient
export function getCompatibleDonorTypes(recipientBloodType: string): string[] {
    // Find all blood types that can donate to this recipient
    const compatibleTypes: string[] = [];

    for (const [donorType, canDonateTo] of Object.entries(BLOOD_COMPATIBILITY)) {
        if (canDonateTo.includes(recipientBloodType)) {
            compatibleTypes.push(donorType);
        }
    }

    return compatibleTypes;
}

// Check hard-stop eligibility (permanent deferrals)
export function checkHardStopEligibility(donor: DonorProfile): { eligible: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (donor.hivStatus) reasons.push('HIV positive status');
    if (donor.hepatitisB) reasons.push('Hepatitis B positive');
    if (donor.hepatitisC) reasons.push('Hepatitis C positive');
    if (donor.htlv) reasons.push('HTLV positive');
    if (donor.ivDrugUse) reasons.push('History of IV drug use');

    return {
        eligible: reasons.length === 0,
        reasons
    };
}

// Check temporary eligibility deferrals
export function checkTemporaryEligibility(donor: DonorProfile): { eligible: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (donor.recentColdFlu) warnings.push('Recent cold/flu - may need to wait');
    if (donor.recentTattoo) warnings.push('Recent tattoo/piercing - 3-12 month deferral may apply');
    if (donor.recentSurgery) warnings.push('Recent surgery - verify recovery period');
    if (donor.pregnant) warnings.push('Pregnant or recent delivery - deferral applies');
    if (donor.recentVaccination) warnings.push('Recent vaccination - verify waiting period');
    if (donor.recentTravel) warnings.push('Recent travel - verify no malaria risk areas');

    // Check last donation date (minimum 56 days for whole blood)
    if (donor.lastDonationDate) {
        const lastDonation = new Date(donor.lastDonationDate);
        const daysSinceLastDonation = Math.floor((Date.now() - lastDonation.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastDonation < 56) {
            warnings.push(`Last donation was ${daysSinceLastDonation} days ago (minimum 56 days required)`);
        }
    }

    // Check hemoglobin level (minimum 12.5 g/dL for women, 13.0 g/dL for men)
    if (donor.hemoglobinLevel) {
        const minLevel = donor.gender?.toLowerCase() === 'female' ? 12.5 : 13.0;
        if (donor.hemoglobinLevel < minLevel) {
            warnings.push(`Hemoglobin level ${donor.hemoglobinLevel} g/dL is below minimum ${minLevel} g/dL`);
        }
    }

    return {
        eligible: warnings.length === 0,
        warnings
    };
}

// Check antigen compatibility
export function checkAntigenCompatibility(
    donor: DonorProfile,
    recipient: RecipientRequest
): { compatible: boolean; matchReasons: string[]; warnings: string[] } {
    const matchReasons: string[] = [];
    const warnings: string[] = [];

    // Check Rh variants if recipient has specific requirements
    if (recipient.rhVariants) {
        const donorRh = donor.rhVariants || {};

        if (recipient.rhVariants.C && !donorRh.C) {
            warnings.push('Recipient requires C antigen positive donor');
        } else if (recipient.rhVariants.C && donorRh.C) {
            matchReasons.push('C antigen match');
        }

        if (recipient.rhVariants.c && !donorRh.c) {
            warnings.push('Recipient requires c antigen positive donor');
        } else if (recipient.rhVariants.c && donorRh.c) {
            matchReasons.push('c antigen match');
        }

        if (recipient.rhVariants.E && !donorRh.E) {
            warnings.push('Recipient requires E antigen positive donor');
        } else if (recipient.rhVariants.E && donorRh.E) {
            matchReasons.push('E antigen match');
        }

        if (recipient.rhVariants.e && !donorRh.e) {
            warnings.push('Recipient requires e antigen positive donor');
        } else if (recipient.rhVariants.e && donorRh.e) {
            matchReasons.push('e antigen match');
        }
    }

    // Check Kell antigen
    if (recipient.kell && !donor.kell) {
        warnings.push('Recipient requires Kell positive donor');
    } else if (recipient.kell && donor.kell) {
        matchReasons.push('Kell antigen match');
    }

    // Check Duffy antigen
    if (recipient.duffy && !donor.duffy) {
        warnings.push('Recipient requires Duffy positive donor');
    } else if (recipient.duffy && donor.duffy) {
        matchReasons.push('Duffy antigen match');
    }

    // Check Kidd antigen
    if (recipient.kidd && !donor.kidd) {
        warnings.push('Recipient requires Kidd positive donor');
    } else if (recipient.kidd && donor.kidd) {
        matchReasons.push('Kidd antigen match');
    }

    return {
        compatible: warnings.length === 0,
        matchReasons,
        warnings
    };
}

// Calculate compatibility score (0-100)
export function calculateCompatibilityScore(
    donor: DonorProfile,
    recipient: RecipientRequest
): number {
    let score = 0;
    const maxScore = 100;

    // Blood type compatibility (40 points)
    const compatibleTypes = getCompatibleDonorTypes(recipient.bloodType);
    if (compatibleTypes.includes(donor.bloodType)) {
        score += 40;

        // Exact match bonus
        if (donor.bloodType === recipient.bloodType) {
            score += 10;
        }
    } else {
        return 0; // Not compatible at all
    }

    // Hard stop eligibility (must pass)
    const hardStop = checkHardStopEligibility(donor);
    if (!hardStop.eligible) {
        return 0;
    }

    // Temporary eligibility (20 points)
    const tempEligibility = checkTemporaryEligibility(donor);
    if (tempEligibility.eligible) {
        score += 20;
    } else {
        score += Math.max(0, 20 - (tempEligibility.warnings.length * 5));
    }

    // Antigen compatibility (15 points)
    const antigenMatch = checkAntigenCompatibility(donor, recipient);
    if (antigenMatch.compatible) {
        score += 15;
    } else {
        score += Math.max(0, 15 - (antigenMatch.warnings.length * 3));
    }
    score += antigenMatch.matchReasons.length * 2; // Bonus for each antigen match

    // Location proximity bonus (10 points) - simplified
    if (donor.location && recipient.location) {
        const donorLoc = donor.location.toLowerCase();
        const recipientLoc = recipient.location.toLowerCase();
        if (donorLoc.includes(recipientLoc) || recipientLoc.includes(donorLoc)) {
            score += 10;
        }
    }

    // Availability for emergency (5 points)
    if (donor.willingForEmergency && recipient.urgency === 'critical') {
        score += 5;
    }

    // Donation history bonus (up to 10 points)
    if (donor.totalDonations) {
        score += Math.min(10, donor.totalDonations);
    }

    return Math.min(maxScore, score);
}

// Determine match priority based on score and urgency
export function determineMatchPriority(
    score: number,
    urgency: string
): 'high' | 'medium' | 'low' {
    const urgencyMultiplier = {
        'critical': 1.5,
        'high': 1.2,
        'medium': 1.0,
        'standard': 0.8
    };

    const adjustedScore = score * (urgencyMultiplier[urgency as keyof typeof urgencyMultiplier] || 1.0);

    if (adjustedScore >= 80) return 'high';
    if (adjustedScore >= 50) return 'medium';
    return 'low';
}

// Main matching function
export async function findMatchingDonors(
    request: RecipientRequest,
    availableDonors: DonorProfile[]
): Promise<MatchingResponse> {
    const matches: MatchResult[] = [];

    // Get compatible blood types for this recipient
    const compatibleTypes = getCompatibleDonorTypes(request.bloodType);

    for (const donor of availableDonors) {
        // Skip if blood type not compatible
        if (!compatibleTypes.includes(donor.bloodType)) {
            continue;
        }

        // Check hard-stop eligibility
        const hardStop = checkHardStopEligibility(donor);
        if (!hardStop.eligible) {
            continue; // Skip ineligible donors entirely
        }

        // Check temporary eligibility
        const tempEligibility = checkTemporaryEligibility(donor);

        // Check antigen compatibility
        const antigenMatch = checkAntigenCompatibility(donor, request);

        // Calculate compatibility score
        const compatibilityScore = calculateCompatibilityScore(donor, request);

        // Only include donors with score > 40
        if (compatibilityScore >= 40) {
            const allMatchReasons: string[] = [
                `Blood type ${donor.bloodType} compatible with ${request.bloodType}`,
                ...antigenMatch.matchReasons
            ];

            const allWarnings: string[] = [
                ...tempEligibility.warnings,
                ...antigenMatch.warnings
            ];

            matches.push({
                donorId: donor.id,
                donorName: donor.donorName,
                donorBloodType: donor.bloodType,
                donorLocation: donor.location,
                donorContact: donor.contactNumber,
                donorAvailability: donor.availability,
                compatibilityScore,
                matchReasons: allMatchReasons,
                warnings: allWarnings,
                isEligible: tempEligibility.eligible && antigenMatch.compatible,
                priority: determineMatchPriority(compatibilityScore, request.urgency)
            });
        }
    }

    // Sort by compatibility score (descending)
    matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    return {
        requestId: request.id,
        recipientName: request.userName,
        bloodTypeNeeded: request.bloodType,
        urgency: request.urgency,
        matches,
        totalMatchesFound: matches.length,
        timestamp: new Date().toISOString()
    };
}

// Hugging Face API integration for model inference
// Since the model is an XGBoost pickle file, we need to call an inference endpoint
export const HUGGING_FACE_MODEL = 'bhyulljz/MLModelTwo';
export const HUGGING_FACE_API_URL = `https://api-inference.huggingface.co/models/${HUGGING_FACE_MODEL}`;

// Prepare features for ML model
export function prepareMLFeatures(donor: DonorProfile, recipient: RecipientRequest): Record<string, any> {
    // Extract features that the XGBoost model might use
    return {
        // Donor features
        donor_blood_type: donor.bloodType,
        donor_age: donor.age || 0,
        donor_gender: donor.gender === 'Male' ? 1 : donor.gender === 'Female' ? 0 : 2,
        donor_weight: donor.weight || 0,
        donor_hemoglobin: donor.hemoglobinLevel || 0,
        donor_total_donations: donor.totalDonations || 0,
        donor_willing_emergency: donor.willingForEmergency ? 1 : 0,
        donor_rh_C: donor.rhVariants?.C ? 1 : 0,
        donor_rh_c: donor.rhVariants?.c ? 1 : 0,
        donor_rh_E: donor.rhVariants?.E ? 1 : 0,
        donor_rh_e: donor.rhVariants?.e ? 1 : 0,
        donor_kell: donor.kell ? 1 : 0,
        donor_duffy: donor.duffy ? 1 : 0,
        donor_kidd: donor.kidd ? 1 : 0,

        // Recipient features
        recipient_blood_type: recipient.bloodType,
        recipient_age: recipient.age || 0,
        recipient_gender: recipient.gender === 'Male' ? 1 : recipient.gender === 'Female' ? 0 : 2,
        recipient_weight: recipient.patientWeight || 0,
        recipient_units_needed: recipient.units,
        recipient_urgency: ['standard', 'medium', 'high', 'critical'].indexOf(recipient.urgency),
        recipient_rh_C: recipient.rhVariants?.C ? 1 : 0,
        recipient_rh_c: recipient.rhVariants?.c ? 1 : 0,
        recipient_rh_E: recipient.rhVariants?.E ? 1 : 0,
        recipient_rh_e: recipient.rhVariants?.e ? 1 : 0,
        recipient_kell: recipient.kell ? 1 : 0,
        recipient_duffy: recipient.duffy ? 1 : 0,
        recipient_kidd: recipient.kidd ? 1 : 0,
        recipient_irradiated: recipient.irradiatedBlood ? 1 : 0,
        recipient_cmv_negative: recipient.cmvNegative ? 1 : 0,
        recipient_washed_cells: recipient.washedCells ? 1 : 0,
        recipient_leukocyte_reduced: recipient.leukocyteReduced ? 1 : 0,
    };
}

// Call Hugging Face inference API (if the model has inference enabled)
export async function callHuggingFaceModel(
    donor: DonorProfile,
    recipient: RecipientRequest,
    apiToken?: string
): Promise<{ score: number; prediction: any }> {
    try {
        const features = prepareMLFeatures(donor, recipient);

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (apiToken) {
            headers['Authorization'] = `Bearer ${apiToken}`;
        }

        const response = await fetch(HUGGING_FACE_API_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                inputs: features,
            }),
        });

        if (!response.ok) {
            // If API fails, fall back to rule-based matching
            console.warn('Hugging Face API not available, using rule-based matching');
            const score = calculateCompatibilityScore(donor, recipient);
            return { score, prediction: null };
        }

        const result = await response.json();
        return {
            score: result.score || result[0]?.score || calculateCompatibilityScore(donor, recipient),
            prediction: result
        };
    } catch (error) {
        console.error('Error calling Hugging Face API:', error);
        // Fall back to rule-based matching
        const score = calculateCompatibilityScore(donor, recipient);
        return { score, prediction: null };
    }
}
