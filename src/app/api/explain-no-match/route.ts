import { NextRequest, NextResponse } from 'next/server';

// Gemini API endpoint
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

interface NoMatchExplanationRequest {
    bloodTypeNeeded: string;
    availableDonorBloodTypes: string[];
    recipientLocation?: string;
    urgency?: string;
    additionalContext?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: NoMatchExplanationRequest = await request.json();
        const { bloodTypeNeeded, availableDonorBloodTypes, recipientLocation, urgency, additionalContext } = body;

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            // Return a fallback explanation if API key is not configured
            return NextResponse.json({
                success: true,
                explanation: generateFallbackExplanation(bloodTypeNeeded, availableDonorBloodTypes),
                source: 'fallback'
            });
        }

        // Build the prompt for Gemini
        const prompt = buildPrompt(bloodTypeNeeded, availableDonorBloodTypes, recipientLocation, urgency, additionalContext);

        // Call Gemini API
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 600,
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            }),
        });

        if (!response.ok) {
            console.error('Gemini API error:', response.status, await response.text());
            return NextResponse.json({
                success: true,
                explanation: generateFallbackExplanation(bloodTypeNeeded, availableDonorBloodTypes),
                source: 'fallback'
            });
        }

        const data = await response.json();

        // Extract the generated text from Gemini response
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            return NextResponse.json({
                success: true,
                explanation: generateFallbackExplanation(bloodTypeNeeded, availableDonorBloodTypes),
                source: 'fallback'
            });
        }

        return NextResponse.json({
            success: true,
            explanation: generatedText.trim(),
            source: 'gemini'
        });

    } catch (error) {
        console.error('Error generating no-match explanation:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to generate explanation',
            explanation: generateFallbackExplanation('Unknown', [])
        }, { status: 500 });
    }
}

function buildPrompt(
    bloodTypeNeeded: string,
    availableDonorBloodTypes: string[],
    recipientLocation?: string,
    urgency?: string,
    additionalContext?: string
): string {
    const donorTypesStr = availableDonorBloodTypes.length > 0
        ? availableDonorBloodTypes.join(', ')
        : 'none currently available';

    return `You are a medical assistant specializing in blood donation matching. A patient needs blood type ${bloodTypeNeeded} but no matching donors were found.

Current situation:
- Blood type needed: ${bloodTypeNeeded}
- Available donor blood types in the system: ${donorTypesStr}
${recipientLocation ? `- Patient location: ${recipientLocation}` : ''}
${urgency ? `- Urgency level: ${urgency}` : ''}
${additionalContext ? `- Additional context: ${additionalContext}` : ''}

Provide the explanation in EXACTLY 4-5 bullet points. Each point should be on a new line starting with "• ".

Format your response EXACTLY like this:
• [Blood type compatibility explanation - which blood types can donate to ${bloodTypeNeeded}]
• [Analysis of why available donors don't match]
• [Specific reason for no match based on the current situation]
• [What makes ${bloodTypeNeeded} special or challenging to match]
• [Practical next step suggestion]

Keep each bullet point to 1-2 sentences. Be medically accurate but easy to understand.`;
}

function generateFallbackExplanation(bloodTypeNeeded: string, availableDonorBloodTypes: string[]): string {
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

    const compatibleTypes = compatibilityMap[bloodTypeNeeded] || [];
    const compatibleStr = compatibleTypes.join(', ');

    const points: string[] = [];

    // Point 1: Compatibility
    points.push(`• Blood type ${bloodTypeNeeded} can only receive donations from: ${compatibleStr}.`);

    // Point 2: Available donors analysis
    if (availableDonorBloodTypes.length === 0) {
        points.push(`• No donors are currently registered in the system.`);
    } else {
        points.push(`• Available donors have blood types ${availableDonorBloodTypes.join(', ')}, which are not compatible with ${bloodTypeNeeded}.`);
    }

    // Point 3: Special info about blood type
    if (bloodTypeNeeded === 'O-') {
        points.push(`• O-negative is the rarest blood type (about 7% of population) and can only receive from O- donors.`);
    } else if (bloodTypeNeeded === 'AB+') {
        points.push(`• Although AB+ is a universal recipient, no compatible donors are currently available in the system.`);
    } else if (bloodTypeNeeded === 'B-' || bloodTypeNeeded === 'AB-') {
        points.push(`• ${bloodTypeNeeded} is a relatively rare blood type, making it harder to find compatible donors.`);
    } else {
        points.push(`• The current donor pool lacks compatible blood types for this request.`);
    }

    // Point 4: Suggestion
    points.push(`• Consider contacting nearby blood banks, hospitals, or blood donation centers for additional donor sources.`);

    return points.join('\n');
}
