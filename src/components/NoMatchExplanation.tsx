'use client';

import { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, Loader2 } from 'lucide-react';

interface NoMatchExplanationProps {
    bloodType: string;
    availableDonorBloodTypes?: string[];
    recipientLocation?: string;
    urgency?: string;
}

export default function NoMatchExplanation({
    bloodType,
    availableDonorBloodTypes = [],
    recipientLocation,
    urgency
}: NoMatchExplanationProps) {
    const [explanation, setExplanation] = useState<string[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [source, setSource] = useState<'gemini' | 'fallback' | null>(null);

    useEffect(() => {
        const fetchExplanation = async () => {
            setIsLoading(true);

            try {
                const response = await fetch('/api/explain-no-match', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        bloodTypeNeeded: bloodType,
                        availableDonorBloodTypes,
                        recipientLocation,
                        urgency,
                    }),
                });

                const data = await response.json();

                if (data.success && data.explanation) {
                    // Parse bullet points from the response
                    const points = parseBulletPoints(data.explanation);
                    setExplanation(points);
                    setSource(data.source);
                } else {
                    // Use fallback
                    setExplanation(getBasicFallback(bloodType, availableDonorBloodTypes));
                    setSource('fallback');
                }
            } catch (err) {
                console.error('Error fetching explanation:', err);
                setExplanation(getBasicFallback(bloodType, availableDonorBloodTypes));
                setSource('fallback');
            } finally {
                setIsLoading(false);
            }
        };

        fetchExplanation();
    }, [bloodType, availableDonorBloodTypes, recipientLocation, urgency]);

    // Parse text into bullet points
    const parseBulletPoints = (text: string): string[] => {
        // Split by newlines, bullet characters, or numbered points
        const lines = text
            .split(/[\n\r]+/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                // Remove leading bullets, dashes, asterisks, or numbers
                return line.replace(/^[\-\*\•\◦\▪\▸\→\➤\➢\◆\○\●\►]\s*/, '')
                    .replace(/^\d+[\.\)]\s*/, '')
                    .trim();
            })
            .filter(line => line.length > 0);

        // If we only have one line, split by periods to create bullet points
        if (lines.length === 1) {
            return lines[0]
                .split(/\.\s+/)
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .map(s => s.endsWith('.') ? s : s + '.');
        }

        return lines;
    };

    const getBasicFallback = (bloodType: string, availableTypes: string[]): string[] => {
        const compatibilityMap: Record<string, string[]> = {
            'O-': ['O-'],
            'O+': ['O-', 'O+'],
            'A-': ['A-', 'O-'],
            'A+': ['A+', 'A-', 'O+', 'O-'],
            'B-': ['B-', 'O-'],
            'B+': ['B+', 'B-', 'O+', 'O-'],
            'AB-': ['AB-', 'A-', 'B-', 'O-'],
            'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
        };

        const compatibleTypes = compatibilityMap[bloodType] || [];
        const points: string[] = [];

        // Point 1: Blood type compatibility
        points.push(`Blood type ${bloodType} can only receive donations from: ${compatibleTypes.join(', ')}.`);

        // Point 2: Available donors analysis
        if (availableTypes.length === 0) {
            points.push('No donors are currently registered in the system.');
        } else {
            const compatibleAvailable = availableTypes.filter(t => compatibleTypes.includes(t));
            if (compatibleAvailable.length === 0) {
                points.push(`Available donors have blood types ${availableTypes.join(', ')}, which are not compatible with ${bloodType}.`);
            } else {
                points.push(`Some compatible donors exist but may not meet other eligibility criteria.`);
            }
        }

        // Point 3: Reason for no match
        if (bloodType === 'O-') {
            points.push('O-negative is the rarest blood type and can only receive from O- donors.');
        } else if (bloodType === 'AB+') {
            points.push('Despite AB+ being a universal recipient, no donors are currently available.');
        } else {
            points.push('The donor pool may lack compatible blood types or eligible donors at this time.');
        }

        // Point 4: Suggestion
        points.push('Consider contacting nearby blood banks or hospitals for additional donor sources.');

        return points;
    };

    return (
        <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
                {source === 'gemini' ? (
                    <Sparkles className="h-4 w-4 text-purple-500" />
                ) : (
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700">
                    Why no matches?
                    {source === 'gemini' && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                            AI Analysis
                        </span>
                    )}
                </span>
            </div>

            {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    <span>Analyzing with AI...</span>
                </div>
            ) : explanation && explanation.length > 0 ? (
                <div className={`p-3 rounded-lg ${source === 'gemini'
                        ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100'
                        : 'bg-gray-50 border border-gray-100'
                    }`}>
                    <ul className="space-y-2">
                        {explanation.map((point, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${source === 'gemini' ? 'bg-purple-500' : 'bg-gray-400'
                                    }`} />
                                <span className="leading-relaxed">{point}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
