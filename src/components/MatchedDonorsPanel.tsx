'use client';

import { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Clock, AlertCircle, CheckCircle, Droplet, Heart, ArrowRight, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MatchedDonor {
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

export interface MatchingResult {
  requestId: string;
  recipientName: string;
  bloodTypeNeeded: string;
  urgency: string;
  matches: MatchedDonor[];
  totalMatchesFound: number;
  timestamp: string;
}

interface MatchedDonorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  matchingResult: MatchingResult | null;
  onContactDonor?: (donor: MatchedDonor) => void;
  onNotifyDonor?: (donor: MatchedDonor) => void;
}

export default function MatchedDonorsPanel({
  isOpen,
  onClose,
  matchingResult,
  onContactDonor,
  onNotifyDonor,
}: MatchedDonorsPanelProps) {
  const [selectedDonor, setSelectedDonor] = useState<MatchedDonor | null>(null);
  const [notifyingDonor, setNotifyingDonor] = useState<string | null>(null);

  if (!isOpen) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 font-semibold animate-pulse">Critical</span>;
      case 'high':
        return <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700 font-semibold">High</span>;
      case 'medium':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 font-semibold">Medium</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-semibold">Standard</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const handleNotifyDonor = async (donor: MatchedDonor) => {
    setNotifyingDonor(donor.donorId);
    if (onNotifyDonor) {
      await onNotifyDonor(donor);
    }
    setTimeout(() => setNotifyingDonor(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-red-100 max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-red-100 bg-gradient-to-r from-red-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-[#DC2626] flex items-center justify-center">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Matched Donors</h2>
              <p className="text-sm text-gray-500">
                AI-powered matching using Hugging Face model
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Request Summary */}
        {matchingResult && (
          <div className="p-4 bg-red-50/50 border-b border-red-100">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Droplet className="h-5 w-5 text-[#DC2626]" />
                <span className="font-bold text-[#DC2626] text-lg">{matchingResult.bloodTypeNeeded}</span>
                <span className="text-gray-600">needed</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">For: {matchingResult.recipientName}</span>
              </div>
              {getUrgencyBadge(matchingResult.urgency)}
              <div className="ml-auto text-sm text-gray-500">
                {matchingResult.totalMatchesFound} matches found
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!matchingResult ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-12 w-12 border-4 border-[#DC2626] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Finding matching donors...</p>
            </div>
          ) : matchingResult.matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Matching Donors Found</h3>
              <p className="text-gray-500 text-center max-w-md">
                No compatible donors are currently available for blood type {matchingResult.bloodTypeNeeded}.
                Please check back later or consider expanding the search criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matchingResult.matches.map((donor, index) => (
                <motion.div
                  key={donor.donorId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-all ${
                    selectedDonor?.donorId === donor.donorId ? 'ring-2 ring-[#DC2626]' : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Donor Info */}
                    <div className="flex items-start space-x-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#DC2626] font-bold text-lg">{donor.donorBloodType}</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">{donor.donorName}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(donor.priority)}`}>
                            {donor.priority.toUpperCase()} PRIORITY
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                          <span className="flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-1" />
                            {donor.donorLocation}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            {donor.donorAvailability}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Compatibility Score */}
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(donor.compatibilityScore)}`}>
                          {donor.compatibilityScore}%
                        </div>
                        <div className="text-xs text-gray-500">Compatibility</div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => handleNotifyDonor(donor)}
                          disabled={notifyingDonor === donor.donorId}
                          className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm rounded-md transition-colors flex items-center disabled:opacity-50"
                        >
                          {notifyingDonor === donor.donorId ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Notified!
                            </>
                          ) : (
                            <>
                              <Bell className="h-4 w-4 mr-1" />
                              Notify
                            </>
                          )}
                        </button>
                        {onContactDonor && (
                          <button
                            onClick={() => onContactDonor(donor)}
                            className="px-3 py-1.5 border border-[#DC2626] text-[#DC2626] hover:bg-red-50 text-sm rounded-md transition-colors flex items-center"
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            Contact
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Match Details */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Match Reasons */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Match Reasons</h4>
                        <div className="flex flex-wrap gap-1">
                          {donor.matchReasons.map((reason, i) => (
                            <span key={i} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Warnings */}
                      {donor.warnings.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Warnings</h4>
                          <div className="flex flex-wrap gap-1">
                            {donor.warnings.map((warning, i) => (
                              <span key={i} className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full flex items-center">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {warning}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Eligibility Status */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className={`flex items-center text-sm ${donor.isEligible ? 'text-green-600' : 'text-yellow-600'}`}>
                        {donor.isEligible ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Fully eligible to donate
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 mr-1" />
                            May require additional screening
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedDonor(selectedDonor?.donorId === donor.donorId ? null : donor)}
                        className="text-sm text-[#DC2626] hover:underline flex items-center"
                      >
                        {selectedDonor?.donorId === donor.donorId ? 'Hide' : 'View'} Contact Info
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>

                    {/* Expanded Contact Info */}
                    <AnimatePresence>
                      {selectedDonor?.donorId === donor.donorId && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3 pt-3 border-t border-gray-100"
                        >
                          <div className="bg-gray-50 p-3 rounded-md">
                            <h4 className="font-medium text-gray-700 mb-2">Contact Information</h4>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="flex items-center text-gray-600">
                                <Phone className="h-4 w-4 mr-2 text-[#DC2626]" />
                                {donor.donorContact}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-red-100 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Powered by <span className="font-medium text-[#DC2626]">bhyulljz/MLModelTwo</span> AI Model
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
