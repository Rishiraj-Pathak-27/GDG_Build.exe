import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { matchingAPI } from '@/lib/api';

export interface BloodRequestData {
    id?: string;
    bloodType: string;
    urgency: 'critical' | 'high' | 'medium' | 'standard';
    hospital: string;
    location: string;
    requiredBy: string;
    units: number;
    contactNumber: string;
    additionalInfo?: string;
    createdAt?: any;

    // Extended Profile
    age?: number;
    gender?: string;
    patientWeight?: number;
    rhFactor?: string;

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

interface BloodRequestFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (data: BloodRequestData) => void;
}

const INITIAL_FORM_STATE = {
    bloodType: '',
    rhFactor: '',
    urgency: 'standard' as BloodRequestData['urgency'],
    hospital: '',
    location: '',
    requiredBy: '',
    units: 1,
    contactNumber: '',
    additionalInfo: '',
    age: '',
    gender: '',
    patientWeight: '',

    // Extended antigen requirements
    rhVariants: { C: false, c: false, E: false, e: false },
    kell: false,
    duffy: false,
    kidd: false,

    // Medical info
    diagnosisReason: '',
    transfusionHistory: '',
    allergies: '',
    currentMedications: '',

    // Special requirements
    irradiatedBlood: false,
    cmvNegative: false,
    washedCells: false,
    leukocyteReduced: false,
};

export default function BloodRequestForm({ isOpen, onClose, onSubmit }: BloodRequestFormProps) {
    const { user, userData } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
        if (apiError) setApiError(null);
    };

    const handleBooleanChange = (name: string, value: boolean) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
        if (apiError) setApiError(null);
    };

    const handleRhVariantChange = (key: 'C' | 'c' | 'E' | 'e', value: boolean) => {
        setFormData(prev => ({
            ...prev,
            rhVariants: { ...prev.rhVariants, [key]: value },
        }));
        if (apiError) setApiError(null);
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.bloodType) newErrors.bloodType = 'Blood type is required';
        if (!formData.hospital) newErrors.hospital = 'Hospital name is required';
        if (!formData.location) newErrors.location = 'Location is required';
        if (!formData.requiredBy) newErrors.requiredBy = 'Required by date is required';
        if (!formData.contactNumber) newErrors.contactNumber = 'Contact number is required';
        if (formData.units < 1) newErrors.units = 'At least 1 unit is required';

        // Validate date is not in the past
        const selectedDate = new Date(formData.requiredBy);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
            newErrors.requiredBy = 'Date cannot be in the past';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting) return;

        if (!validateForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        if (!user) {
            toast.error('You must be logged in to create a blood request');
            return;
        }

        setIsSubmitting(true);
        setApiError(null);

        const submissionData = { ...formData };
        const submissionId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        const toastId = toast.loading('Creating blood request...');

        try {
            setFormData(INITIAL_FORM_STATE);
            onClose();

            console.log(`Submitting blood request (ID: ${submissionId}):`, submissionData);

            // Build the blood request data, filtering out empty/undefined values
            const bloodRequestData: Record<string, any> = {
                bloodType: submissionData.bloodType,
                urgency: submissionData.urgency,
                hospital: submissionData.hospital,
                location: submissionData.location,
                requiredBy: submissionData.requiredBy,
                units: Number(submissionData.units),
                contactNumber: submissionData.contactNumber,
                userId: user.uid,
                userEmail: user.email,
                userName: userData?.firstName && userData?.lastName
                    ? `${userData.firstName} ${userData.lastName}`
                    : user.email,
                status: 'active',
                postedOn: new Date().toISOString(),
                distance: 'N/A',
                createdAt: Timestamp.now(),
                submissionId,
            };

            // Only add optional fields if they have values (Firestore doesn't accept undefined)
            if (submissionData.age && submissionData.age !== '') {
                bloodRequestData.age = Number(submissionData.age);
            }
            if (submissionData.patientWeight && submissionData.patientWeight !== '') {
                bloodRequestData.patientWeight = Number(submissionData.patientWeight);
            }
            if (submissionData.gender && submissionData.gender !== '') {
                bloodRequestData.gender = submissionData.gender;
            }
            if (submissionData.additionalInfo && submissionData.additionalInfo !== '') {
                bloodRequestData.additionalInfo = submissionData.additionalInfo;
            }
            if (submissionData.diagnosisReason && submissionData.diagnosisReason !== '') {
                bloodRequestData.diagnosisReason = submissionData.diagnosisReason;
            }
            if (submissionData.transfusionHistory && submissionData.transfusionHistory !== '') {
                bloodRequestData.transfusionHistory = submissionData.transfusionHistory;
            }
            if (submissionData.allergies && submissionData.allergies !== '') {
                bloodRequestData.allergies = submissionData.allergies;
            }
            if (submissionData.currentMedications && submissionData.currentMedications !== '') {
                bloodRequestData.currentMedications = submissionData.currentMedications;
            }
            
            // Add boolean fields only if true
            if (submissionData.rhVariants) {
                bloodRequestData.rhVariants = submissionData.rhVariants;
            }
            if (submissionData.kell) bloodRequestData.kell = true;
            if (submissionData.duffy) bloodRequestData.duffy = true;
            if (submissionData.kidd) bloodRequestData.kidd = true;
            if (submissionData.irradiatedBlood) bloodRequestData.irradiatedBlood = true;
            if (submissionData.cmvNegative) bloodRequestData.cmvNegative = true;
            if (submissionData.washedCells) bloodRequestData.washedCells = true;
            if (submissionData.leukocyteReduced) bloodRequestData.leukocyteReduced = true;

            const docRef = await addDoc(collection(db, 'blood_requests'), bloodRequestData);

            console.log('Blood request created successfully:', docRef.id);

            // Update toast to show matching in progress
            toast.loading('Finding matching donors...', { id: toastId });

            // Trigger AI matching to find compatible donors
            try {
                const requestWithId = {
                    ...bloodRequestData,
                    id: docRef.id,
                };

                console.log('Starting AI donor matching for request:', docRef.id);
                
                // Find matching donors using the Hugging Face model
                const matchResult = await matchingAPI.findMatchingDonors(requestWithId);
                
                console.log('Matching complete:', matchResult.totalMatchesFound, 'donors found');

                if (matchResult.totalMatchesFound > 0) {
                    // Store the match result in database
                    await matchingAPI.storeMatchResult(matchResult);
                    
                    // Send notification to reception with matched donor profiles
                    await matchingAPI.notifyReception(requestWithId, matchResult);
                    
                    // Notify top matched donors (high priority matches only)
                    const highPriorityMatches = matchResult.matches.filter(
                        (m: any) => m.priority === 'high' && m.isEligible
                    );
                    
                    for (const match of highPriorityMatches.slice(0, 3)) {
                        try {
                            // Get the actual donor user ID from the donation
                            if (match.donorId) {
                                await matchingAPI.notifyMatchedDonor(
                                    match.donorId,
                                    requestWithId,
                                    match
                                );
                            }
                        } catch (notifyError) {
                            console.warn('Failed to notify donor:', match.donorId, notifyError);
                        }
                    }

                    toast.success(
                        `Blood request created! Found ${matchResult.totalMatchesFound} matching donors. Reception has been notified.`,
                        { id: toastId, duration: 5000 }
                    );
                } else {
                    toast.success(
                        'Blood request created! No immediate matches found. We will notify you when donors become available.',
                        { id: toastId, duration: 5000 }
                    );
                }

                // Dispatch event to refresh dashboard data
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('blood-request-matched', {
                        detail: { requestId: docRef.id, matchResult }
                    }));
                }
            } catch (matchError) {
                console.error('Matching failed, but request was created:', matchError);
                toast.success(
                    'Blood request created! Matching will be processed shortly.',
                    { id: toastId }
                );
            }

            if (onSubmit) {
                // Type-safe submission data with proper number conversions
                const submitData: BloodRequestData = {
                    ...submissionData,
                    id: docRef.id,
                    age: submissionData.age ? Number(submissionData.age) : undefined,
                    patientWeight: submissionData.patientWeight ? Number(submissionData.patientWeight) : undefined,
                    units: Number(submissionData.units),
                };
                onSubmit(submitData);
            }
        } catch (error: any) {
            console.error('Error creating blood request:', error);
            const errorMessage = error.message || 'Failed to create blood request. Please try again.';
            setApiError(errorMessage);
            toast.error('Failed to create blood request. Please try again', { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#ffffff] rounded-lg shadow-xl w-full max-w-3xl border border-[#fecaca] max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-[#fecaca]">
                    <h2 className="text-xl font-semibold text-gray-900">Create Blood Request</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Display API errors */}
                    {apiError && (
                        <div className="bg-red-900/20 border border-red-800 rounded-md p-3 flex items-start">
                            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-red-400 text-sm">{apiError}</p>
                        </div>
                    )}

                    {/* Blood Type and Rh Factor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="bloodType" className="block text-sm font-medium text-gray-600">
                                Blood Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="bloodType"
                                name="bloodType"
                                value={formData.bloodType}
                                onChange={handleChange}
                                className={`w-full bg-[#f9fafb] border ${errors.bloodType ? 'border-red-800' : 'border-[#fecaca]'} rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]`}
                            >
                                <option value="">Select Blood Type</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                            </select>
                            {errors.bloodType && <p className="text-red-500 text-xs mt-1">{errors.bloodType}</p>}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="urgency" className="block text-sm font-medium text-gray-600">
                                Urgency Level <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="urgency"
                                name="urgency"
                                value={formData.urgency}
                                onChange={handleChange}
                                className="w-full bg-[#f9fafb] border border-[#fecaca] rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]"
                            >
                                <option value="standard">Standard</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                    </div>

                    {/* Hospital and Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="hospital" className="block text-sm font-medium text-gray-600">
                                Hospital Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="hospital"
                                name="hospital"
                                type="text"
                                value={formData.hospital}
                                onChange={handleChange}
                                placeholder="e.g., City General Hospital"
                                className={`w-full bg-[#f9fafb] border ${errors.hospital ? 'border-red-800' : 'border-[#fecaca]'} rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]`}
                            />
                            {errors.hospital && <p className="text-red-500 text-xs mt-1">{errors.hospital}</p>}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="location" className="block text-sm font-medium text-gray-600">
                                Location <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="location"
                                name="location"
                                type="text"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="City, State"
                                className={`w-full bg-[#f9fafb] border ${errors.location ? 'border-red-800' : 'border-[#fecaca]'} rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]`}
                            />
                            {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
                        </div>
                    </div>

                    {/* Required By, Units, and Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="requiredBy" className="block text-sm font-medium text-gray-600">
                                Required By <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="requiredBy"
                                name="requiredBy"
                                type="date"
                                value={formData.requiredBy}
                                onChange={handleChange}
                                min={new Date().toISOString().split('T')[0]}
                                className={`w-full bg-[#f9fafb] border ${errors.requiredBy ? 'border-red-800' : 'border-[#fecaca]'} rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]`}
                            />
                            {errors.requiredBy && <p className="text-red-500 text-xs mt-1">{errors.requiredBy}</p>}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="units" className="block text-sm font-medium text-gray-600">
                                Units <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="units"
                                name="units"
                                type="number"
                                value={formData.units}
                                onChange={handleChange}
                                min="1"
                                placeholder="Number of units"
                                className={`w-full bg-[#f9fafb] border ${errors.units ? 'border-red-800' : 'border-[#fecaca]'} rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]`}
                            />
                            {errors.units && <p className="text-red-500 text-xs mt-1">{errors.units}</p>}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-600">
                                Contact <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="contactNumber"
                                name="contactNumber"
                                type="tel"
                                value={formData.contactNumber}
                                onChange={handleChange}
                                placeholder="Your contact number"
                                className={`w-full bg-[#f9fafb] border ${errors.contactNumber ? 'border-red-800' : 'border-[#fecaca]'} rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]`}
                            />
                            {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>}
                        </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* Patient Demographics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="age" className="block text-sm font-medium text-gray-600">
                                Patient Age
                            </label>
                            <input
                                id="age"
                                name="age"
                                type="number"
                                value={formData.age}
                                onChange={handleChange}
                                placeholder="Years"
                                className="w-full bg-[#f9fafb] border border-[#fecaca] rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-600">
                                Gender
                            </label>
                            <select
                                id="gender"
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="w-full bg-[#f9fafb] border border-[#fecaca] rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]"
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="patientWeight" className="block text-sm font-medium text-gray-600">
                                Weight (kg)
                            </label>
                            <input
                                id="patientWeight"
                                name="patientWeight"
                                type="number"
                                value={formData.patientWeight}
                                onChange={handleChange}
                                placeholder="kg"
                                className="w-full bg-[#f9fafb] border border-[#fecaca] rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]"
                            />
                        </div>
                    </div>

                    {/* Extended Antigen Requirements */}
                    <div className="bg-blue-50 p-4 rounded-md space-y-3 border border-blue-200">
                        <h3 className="text-sm font-semibold text-blue-800">Extended Antigen Requirements (Optional)</h3>
                        <p className="text-xs text-blue-600 mb-2">Select if specific antigens are required for the transfusion.</p>

                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Rh Variants</span>
                            <div className="flex flex-wrap gap-4">
                                {['C', 'c', 'E', 'e'].map((variant) => (
                                    <label key={variant} className="flex items-center space-x-1 cursor-pointer bg-white px-3 py-1 rounded border border-blue-100 shadow-sm">
                                        <input
                                            type="checkbox"
                                            checked={formData.rhVariants[variant as 'C' | 'c' | 'E' | 'e']}
                                            onChange={(e) => handleRhVariantChange(variant as 'C' | 'c' | 'E' | 'e', e.target.checked)}
                                            className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                        />
                                        <span className="text-sm font-medium text-gray-700">{variant}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-2">Other Antigens</span>
                            <div className="flex flex-wrap gap-4">
                                {[
                                    { key: 'kell', label: 'Kell (K)' },
                                    { key: 'duffy', label: 'Duffy' },
                                    { key: 'kidd', label: 'Kidd' }
                                ].map(({ key, label }) => (
                                    <label key={key} className="flex items-center space-x-1 cursor-pointer bg-white px-3 py-1 rounded border border-blue-100 shadow-sm">
                                        <input
                                            type="checkbox"
                                            checked={formData[key as keyof typeof formData] as boolean}
                                            onChange={(e) => handleBooleanChange(key, e.target.checked)}
                                            className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                        />
                                        <span className="text-sm font-medium text-gray-700">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Special Requirements */}
                    <div className="bg-yellow-50 p-4 rounded-md space-y-3 border border-yellow-200">
                        <h3 className="text-sm font-semibold text-yellow-800">Special Processing Requirements</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                { key: 'irradiatedBlood', label: 'Irradiated Blood' },
                                { key: 'cmvNegative', label: 'CMV Negative' },
                                { key: 'washedCells', label: 'Washed Cells' },
                                { key: 'leukocyteReduced', label: 'Leukocyte Reduced' },
                            ].map(({ key, label }) => (
                                <label key={key} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData[key as keyof typeof formData] as boolean}
                                        onChange={(e) => handleBooleanChange(key, e.target.checked)}
                                        className="rounded border-yellow-300 text-yellow-600 focus:ring-yellow-500 h-4 w-4"
                                    />
                                    <span className="text-sm text-gray-700">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Medical Information */}
                    <div className="bg-gray-50 p-4 rounded-md space-y-3 border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-800">Medical Information</h3>

                        <div className="space-y-2">
                            <label htmlFor="diagnosisReason" className="block text-sm font-medium text-gray-600">
                                Diagnosis/Reason for Transfusion
                            </label>
                            <input
                                id="diagnosisReason"
                                name="diagnosisReason"
                                type="text"
                                value={formData.diagnosisReason}
                                onChange={handleChange}
                                placeholder="e.g., Anemia, Surgery, Trauma"
                                className="w-full bg-white border border-[#fecaca] rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="transfusionHistory" className="block text-sm font-medium text-gray-600">
                                    Previous Transfusion History
                                </label>
                                <input
                                    id="transfusionHistory"
                                    name="transfusionHistory"
                                    type="text"
                                    value={formData.transfusionHistory}
                                    onChange={handleChange}
                                    placeholder="e.g., Last transfusion date"
                                    className="w-full bg-white border border-[#fecaca] rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="allergies" className="block text-sm font-medium text-gray-600">
                                    Known Allergies
                                </label>
                                <input
                                    id="allergies"
                                    name="allergies"
                                    type="text"
                                    value={formData.allergies}
                                    onChange={handleChange}
                                    placeholder="Any known allergies"
                                    className="w-full bg-white border border-[#fecaca] rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="currentMedications" className="block text-sm font-medium text-gray-600">
                                Current Medications
                            </label>
                            <input
                                id="currentMedications"
                                name="currentMedications"
                                type="text"
                                value={formData.currentMedications}
                                onChange={handleChange}
                                placeholder="List current medications"
                                className="w-full bg-white border border-[#fecaca] rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-600">
                            Additional Information <span className="text-gray-500">(optional)</span>
                        </label>
                        <textarea
                            id="additionalInfo"
                            name="additionalInfo"
                            value={formData.additionalInfo}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Any additional details about the request"
                            className="w-full bg-[#f9fafb] border border-[#fecaca] rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]"
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-[#fecaca] rounded-md text-gray-900 hover:bg-[#f9fafb] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-md transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Create Request
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
