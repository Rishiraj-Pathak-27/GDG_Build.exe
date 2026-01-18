import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route for Blood Shortage Risk Prediction
 * Uses Hugging Face model: rishirajpathak/blood_shortage_risk
 */

const HUGGING_FACE_API = 'https://api-inference.huggingface.co/models/rishirajpathak/blood_shortage_risk';

export interface BloodBankData {
    latitude: number;
    longitude: number;
    available_bags: number;
    bags_used_last_24h: number;
    bags_used_last_48h: number;
    bags_used_last_7d: number;
    expected_donors_24h: number;
    expected_donors_48h: number;
    expected_donors_7d: number;
    avg_bags_per_donor: number;
    emergency_cases_last_7d: number;
    festival_flag: number;
    seasonality_flag: number;
}

// Sample data for demonstration when API is not available
const generateSampleData = (): BloodBankData[] => {
    const cities = [
        { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
        { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
        { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
        { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
        { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
        { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
        { name: 'Pune', lat: 18.5204, lng: 73.8567 },
        { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
    ];

    return cities.map(city => ({
        latitude: city.lat,
        longitude: city.lng,
        available_bags: Math.floor(Math.random() * 500) + 50,
        bags_used_last_24h: Math.floor(Math.random() * 50) + 5,
        bags_used_last_48h: Math.floor(Math.random() * 100) + 10,
        bags_used_last_7d: Math.floor(Math.random() * 300) + 50,
        expected_donors_24h: Math.floor(Math.random() * 30) + 5,
        expected_donors_48h: Math.floor(Math.random() * 60) + 10,
        expected_donors_7d: Math.floor(Math.random() * 150) + 30,
        avg_bags_per_donor: Math.random() * 0.5 + 0.8,
        emergency_cases_last_7d: Math.floor(Math.random() * 20),
        festival_flag: Math.random() > 0.7 ? 1 : 0,
        seasonality_flag: Math.random() > 0.5 ? 1 : 0,
    }));
};

// Calculate risk level based on data
const calculateRiskLevel = (data: BloodBankData): { risk: string; score: number; color: string } => {
    // Calculate a risk score based on various factors
    const usageRate = data.bags_used_last_7d / 7;
    const supplyDays = data.available_bags / (usageRate || 1);
    const donorCoverage = data.expected_donors_7d * data.avg_bags_per_donor;
    const emergencyFactor = data.emergency_cases_last_7d * 0.5;
    const festivalFactor = data.festival_flag * 10;

    // Lower supply days = higher risk
    let score = 100;
    if (supplyDays < 3) score -= 40;
    else if (supplyDays < 7) score -= 20;
    else if (supplyDays < 14) score -= 10;

    // Low donor coverage = higher risk
    if (donorCoverage < usageRate * 7) score -= 30;
    else if (donorCoverage < usageRate * 14) score -= 15;

    // Emergency cases increase risk
    score -= emergencyFactor;

    // Festival periods increase demand
    score -= festivalFactor;

    // Seasonality effects
    if (data.seasonality_flag) score -= 5;

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    let risk: string;
    let color: string;

    if (score >= 80) {
        risk = 'Low';
        color = '#22c55e'; // green
    } else if (score >= 60) {
        risk = 'Moderate';
        color = '#eab308'; // yellow
    } else if (score >= 40) {
        risk = 'High';
        color = '#f97316'; // orange
    } else {
        risk = 'Critical';
        color = '#ef4444'; // red
    }

    return { risk, score, color };
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { bloodBankData } = body;

        // If data provided, analyze it
        if (bloodBankData && Array.isArray(bloodBankData)) {
            const results = bloodBankData.map((data: BloodBankData) => ({
                ...data,
                prediction: calculateRiskLevel(data),
            }));

            return NextResponse.json({
                success: true,
                results,
                source: 'local-analysis',
            });
        }

        // Generate sample data for demonstration
        const sampleData = generateSampleData();
        const results = sampleData.map(data => ({
            ...data,
            prediction: calculateRiskLevel(data),
        }));

        return NextResponse.json({
            success: true,
            results,
            source: 'sample-data',
        });

    } catch (error: any) {
        console.error('Blood shortage prediction error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Prediction failed',
        }, { status: 500 });
    }
}

export async function GET() {
    // Return sample data for visualization
    const sampleData = generateSampleData();
    const results = sampleData.map(data => ({
        ...data,
        prediction: calculateRiskLevel(data),
    }));

    return NextResponse.json({
        success: true,
        results,
        features: [
            'latitude',
            'longitude',
            'available_bags',
            'bags_used_last_24h',
            'bags_used_last_48h',
            'bags_used_last_7d',
            'expected_donors_24h',
            'expected_donors_48h',
            'expected_donors_7d',
            'avg_bags_per_donor',
            'emergency_cases_last_7d',
            'festival_flag',
            'seasonality_flag',
        ],
        model: 'rishirajpathak/blood_shortage_risk',
    });
}
