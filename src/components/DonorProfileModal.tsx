'use client';

import { useState } from 'react';
import { X, User, Phone, MapPin, Clock, Droplet, Heart, Calendar, CheckCircle, AlertCircle, AlertTriangle, Shield, Activity, Mail, Thermometer, Scale, Syringe, Globe, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DonorProfile {
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
    // Core Donor Identity & Demographics
    email?: string;
    age?: number;
    gender?: string;
    // Extended Antigen Profile (Gold Standard)
    rhPositive?: boolean;
    rhVariants?: { C?: boolean; c?: boolean; E?: boolean; e?: boolean };
    kell?: string;
    duffy?: string;
    kidd?: string;
    // Donation History & Physiology
    weight?: number;
    lastDonationDate?: string;
    totalDonations?: number;
    hemoglobinLevel?: number;
    deferralHistory?: string[];
    // Absolute Eligibility (Hard Stop)
    eligibilityFactors?: {
        hivStatus: boolean;
        hepatitisB: boolean;
        hepatitisC: boolean;
        htlv: boolean;
        ivDrugUse: boolean;
    };
    // Temporary Eligibility Factors
    temporaryFactors?: {
        recentColdFlu: boolean;
        recentTattoo: boolean;
        recentSurgery: boolean;
        pregnant: boolean;
        recentVaccination: boolean;
        recentTravel: boolean;
    };
    // Communication & Availability
    willingForEmergency?: boolean;
    preferredContactMethod?: string;
    responseRate?: number;
}

interface DonorProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    donor: DonorProfile | null;
    onContactDonor?: (donor: DonorProfile) => void;
    onNotifyDonor?: (donor: DonorProfile) => void;
}

export default function DonorProfileModal({
    isOpen,
    onClose,
    donor,
    onContactDonor,
    onNotifyDonor,
}: DonorProfileModalProps) {
    const [isNotifying, setIsNotifying] = useState(false);

    if (!isOpen || !donor) return null;

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-yellow-600 bg-yellow-100';
        return 'text-orange-600 bg-orange-100';
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'high':
                return <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700 font-semibold">High Priority</span>;
            case 'medium':
                return <span className="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 font-semibold">Medium Priority</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 font-semibold">Standard Priority</span>;
        }
    };

    const handleNotify = async () => {
        setIsNotifying(true);
        if (onNotifyDonor) {
            await onNotifyDonor(donor);
        }
        setTimeout(() => setIsNotifying(false), 2000);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Not available';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Check if all hard stop factors are clear
    const allHardStopsClear = donor.eligibilityFactors
        ? !Object.values(donor.eligibilityFactors).some(v => v === true)
        : true;

    // Count temporary eligibility issues
    const tempIssueCount = donor.temporaryFactors
        ? Object.values(donor.temporaryFactors).filter(v => v === true).length
        : 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex items-center space-x-4">
                            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                                <span className="text-2xl font-bold">{donor.donorBloodType}</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{donor.donorName}</h2>
                                <p className="text-white/80 flex items-center mt-1">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {donor.donorLocation || 'Location not specified'}
                                </p>
                            </div>
                        </div>

                        {/* Compatibility Score */}
                        <div className="absolute top-6 right-16">
                            <div className={`px-4 py-2 rounded-lg ${getScoreColor(donor.compatibilityScore)}`}>
                                <span className="text-2xl font-bold">{donor.compatibilityScore}%</span>
                                <span className="text-sm ml-1">Match</span>
                            </div>
                        </div>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 space-y-6">

                        {/* Priority & Eligibility Summary */}
                        <div className="flex items-center justify-between">
                            {getPriorityBadge(donor.priority)}
                            <div className={`flex items-center text-sm ${donor.isEligible ? 'text-green-600' : 'text-yellow-600'}`}>
                                {donor.isEligible ? (
                                    <>
                                        <CheckCircle className="h-5 w-5 mr-1" />
                                        Fully Eligible to Donate
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="h-5 w-5 mr-1" />
                                        May Require Additional Screening
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 1. Core Donor Identity & Demographics */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
                                <User className="h-4 w-4 mr-2 text-red-600" />
                                1. Core Donor Identity & Demographics
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500">Name</p>
                                    <p className="font-medium text-gray-900">{donor.donorName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Contact</p>
                                    <p className="font-medium text-gray-900">{donor.donorContact || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Location</p>
                                    <p className="font-medium text-gray-900">{donor.donorLocation || 'N/A'}</p>
                                </div>
                                {donor.age && (
                                    <div>
                                        <p className="text-xs text-gray-500">Age</p>
                                        <p className="font-medium text-gray-900">{donor.age} years</p>
                                    </div>
                                )}
                                {donor.gender && (
                                    <div>
                                        <p className="text-xs text-gray-500">Gender</p>
                                        <p className="font-medium text-gray-900 capitalize">{donor.gender}</p>
                                    </div>
                                )}
                                {donor.email && (
                                    <div>
                                        <p className="text-xs text-gray-500">Email</p>
                                        <p className="font-medium text-gray-900 text-sm">{donor.email}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Absolute Eligibility (Hard Stop) */}
                        <div className={`rounded-lg p-4 ${allHardStopsClear ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
                                <Shield className="h-4 w-4 mr-2 text-red-600" />
                                2. Absolute Eligibility (Hard Stop)
                                {allHardStopsClear && (
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded-full">All Clear</span>
                                )}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {[
                                    { key: 'hivStatus', label: 'HIV Status', icon: '🛡️' },
                                    { key: 'hepatitisB', label: 'Hepatitis B', icon: '🏥' },
                                    { key: 'hepatitisC', label: 'Hepatitis C', icon: '🏥' },
                                    { key: 'htlv', label: 'HTLV', icon: '🔬' },
                                    { key: 'ivDrugUse', label: 'IV Drug Use', icon: '💉' },
                                ].map(({ key, label, icon }) => {
                                    const value = donor.eligibilityFactors?.[key as keyof typeof donor.eligibilityFactors];
                                    return (
                                        <div key={key} className={`p-2 rounded text-center ${value ? 'bg-red-100' : 'bg-white'}`}>
                                            <span className="text-lg">{icon}</span>
                                            <p className="text-xs text-gray-600 mt-1">{label}</p>
                                            <p className={`text-sm font-bold ${value ? 'text-red-600' : 'text-green-600'}`}>
                                                {value ? '⚠️ Positive' : '✓ Clear'}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Temporary Eligibility Factors */}
                        <div className={`rounded-lg p-4 ${tempIssueCount === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
                                <Thermometer className="h-4 w-4 mr-2 text-red-600" />
                                3. Temporary Eligibility Factors
                                {tempIssueCount === 0 ? (
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded-full">All Clear</span>
                                ) : (
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full">{tempIssueCount} Issue(s)</span>
                                )}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                    { key: 'recentColdFlu', label: 'Recent Cold/Flu', icon: '🤒' },
                                    { key: 'recentTattoo', label: 'Recent Tattoo/Piercing', icon: '🎨' },
                                    { key: 'recentSurgery', label: 'Recent Surgery', icon: '🏥' },
                                    { key: 'pregnant', label: 'Pregnancy', icon: '🤰' },
                                    { key: 'recentVaccination', label: 'Recent Vaccination', icon: '💉' },
                                    { key: 'recentTravel', label: 'Recent Travel', icon: '✈️' },
                                ].map(({ key, label, icon }) => {
                                    const value = donor.temporaryFactors?.[key as keyof typeof donor.temporaryFactors];
                                    return (
                                        <div key={key} className={`p-2 rounded flex items-center gap-2 ${value ? 'bg-yellow-100' : 'bg-white'}`}>
                                            <span className="text-lg">{icon}</span>
                                            <div>
                                                <p className="text-xs text-gray-600">{label}</p>
                                                <p className={`text-sm font-medium ${value ? 'text-yellow-700' : 'text-green-600'}`}>
                                                    {value ? '⏳ Pending' : '✓ Clear'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 4. Blood Type & Rh Factor */}
                        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
                                <Droplet className="h-4 w-4 mr-2 text-red-600" />
                                4. Blood Type & Rh Factor (Essential)
                            </h3>
                            <div className="flex items-center gap-6">
                                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-white">{donor.donorBloodType}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">ABO Group</p>
                                        <p className="font-bold text-gray-900 text-lg">{donor.donorBloodType?.replace(/[+-]/, '')}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Rh D Type</p>
                                        <p className="font-bold text-gray-900 text-lg">
                                            {donor.donorBloodType?.includes('+') ? 'Positive (+)' : 'Negative (-)'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5. Extended Antigen Profile */}
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
                                <Activity className="h-4 w-4 mr-2 text-purple-600" />
                                5. Extended Antigen Profile (Gold Standard)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-3 rounded">
                                    <p className="text-xs text-gray-500">Rh Variants</p>
                                    {donor.rhVariants ? (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {Object.entries(donor.rhVariants).map(([key, value]) => (
                                                value && <span key={key} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-sm">{key}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="font-medium text-gray-600">Not tested</p>
                                    )}
                                </div>
                                <div className="bg-white p-3 rounded">
                                    <p className="text-xs text-gray-500">Kell Antigen</p>
                                    <p className="font-medium text-gray-900">{donor.kell || 'Not tested'}</p>
                                </div>
                                <div className="bg-white p-3 rounded">
                                    <p className="text-xs text-gray-500">Duffy Antigen</p>
                                    <p className="font-medium text-gray-900">{donor.duffy || 'Not tested'}</p>
                                </div>
                                <div className="bg-white p-3 rounded">
                                    <p className="text-xs text-gray-500">Kidd Antigen</p>
                                    <p className="font-medium text-gray-900">{donor.kidd || 'Not tested'}</p>
                                </div>
                            </div>
                        </div>

                        {/* 6. Donation History & Physiology */}
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
                                <Heart className="h-4 w-4 mr-2 text-blue-600" />
                                6. Donation History & Physiology
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-3 rounded text-center">
                                    <p className="text-3xl font-bold text-blue-600">{donor.totalDonations || 0}</p>
                                    <p className="text-xs text-gray-500">Total Donations</p>
                                </div>
                                <div className="bg-white p-3 rounded">
                                    <p className="text-xs text-gray-500">Last Donation</p>
                                    <p className="font-medium text-gray-900 text-sm">{formatDate(donor.lastDonationDate)}</p>
                                </div>
                                {donor.hemoglobinLevel && (
                                    <div className="bg-white p-3 rounded">
                                        <p className="text-xs text-gray-500">Hemoglobin Level</p>
                                        <p className="font-medium text-gray-900">{donor.hemoglobinLevel} g/dL</p>
                                    </div>
                                )}
                                {donor.weight && (
                                    <div className="bg-white p-3 rounded">
                                        <p className="text-xs text-gray-500">Weight</p>
                                        <p className="font-medium text-gray-900">{donor.weight} kg</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 7. Communication & Availability */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
                                <Bell className="h-4 w-4 mr-2 text-red-600" />
                                7. Communication & Availability
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500">Availability</p>
                                    <p className="font-medium text-gray-900">{donor.donorAvailability || 'Available'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Emergency Availability</p>
                                    <p className={`font-medium ${donor.willingForEmergency ? 'text-green-600' : 'text-gray-600'}`}>
                                        {donor.willingForEmergency ? '✓ Available for Emergencies' : 'Standard only'}
                                    </p>
                                </div>
                                {donor.preferredContactMethod && (
                                    <div>
                                        <p className="text-xs text-gray-500">Preferred Contact</p>
                                        <p className="font-medium text-gray-900 capitalize">{donor.preferredContactMethod}</p>
                                    </div>
                                )}
                                {donor.responseRate !== undefined && (
                                    <div>
                                        <p className="text-xs text-gray-500">Response Rate</p>
                                        <p className="font-medium text-gray-900">{donor.responseRate}%</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Match Reasons */}
                        {donor.matchReasons && donor.matchReasons.length > 0 && (
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    AI Matching Factors
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {donor.matchReasons.map((reason, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1.5 bg-white text-green-700 rounded-full text-sm flex items-center border border-green-200"
                                        >
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Warnings */}
                        {donor.warnings && donor.warnings.length > 0 && (
                            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
                                    <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                                    Warnings
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {donor.warnings.map((warning, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1.5 bg-white text-yellow-700 rounded-full text-sm flex items-center border border-yellow-200"
                                        >
                                            <AlertCircle className="h-4 w-4 mr-1" />
                                            {warning}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-gray-100 p-4 bg-gray-50 flex justify-between items-center">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Close
                        </button>
                        <div className="flex space-x-3">
                            {onContactDonor && (
                                <button
                                    onClick={() => onContactDonor(donor)}
                                    className="px-4 py-2 border border-red-600 text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center"
                                >
                                    <Phone className="h-4 w-4 mr-2" />
                                    Contact Donor
                                </button>
                            )}
                            <button
                                onClick={handleNotify}
                                disabled={isNotifying}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center disabled:opacity-50"
                            >
                                {isNotifying ? (
                                    <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Notified!
                                    </>
                                ) : (
                                    <>
                                        <Heart className="h-4 w-4 mr-2" />
                                        Notify Donor
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
