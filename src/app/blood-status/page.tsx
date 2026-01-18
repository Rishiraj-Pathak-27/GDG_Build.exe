'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    ArrowLeft,
    Droplet,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Users,
    Calendar,
    MapPin,
    Activity,
    RefreshCw,
    Shield,
    Heart
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

interface BloodBankData {
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
    prediction: {
        risk: string;
        score: number;
        color: string;
    };
}

const cityNames = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Nagpur', 'Pune', 'Hyderabad'];

export default function BloodBankStatusPage() {
    const router = useRouter();
    const [data, setData] = useState<BloodBankData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCity, setSelectedCity] = useState<number | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/blood-shortage');
            const result = await response.json();
            if (result.success) {
                setData(result.results);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getOverallStats = () => {
        if (data.length === 0) return { total: 0, critical: 0, high: 0, moderate: 0, low: 0 };

        return {
            total: data.reduce((sum, d) => sum + d.available_bags, 0),
            critical: data.filter(d => d.prediction.risk === 'Critical').length,
            high: data.filter(d => d.prediction.risk === 'High').length,
            moderate: data.filter(d => d.prediction.risk === 'Moderate').length,
            low: data.filter(d => d.prediction.risk === 'Low').length,
        };
    };

    const stats = getOverallStats();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-white" />
                        </button>
                        {/* R.A.K.T. Logo */}
                        <Image
                            src="/rakt-logo-simple.png"
                            alt="R.A.K.T."
                            width={120}
                            height={40}
                            className="h-10 w-auto"
                        />
                        <div className="border-l border-white/20 pl-4">
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                Blood Bank Status
                            </h1>
                            <p className="text-gray-400 text-xs">Revolutionary Access Platform • AI-Powered Analysis</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Hero Banner with R.A.K.T. Logo */}
                <div className="relative mb-8 p-8 rounded-2xl overflow-hidden">
                    <Image
                        src="/rakt-logo.jpg"
                        alt="R.A.K.T. Background"
                        fill
                        className="object-cover opacity-30"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent"></div>
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="hidden md:block">
                            <Image
                                src="/rakt-logo.jpg"
                                alt="R.A.K.T."
                                width={200}
                                height={150}
                                className="rounded-xl shadow-2xl"
                            />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-2">
                                R.A.K.T. Blood Shortage Analytics
                            </h2>
                            <p className="text-gray-300 text-lg mb-4">
                                Revolutionary Access Platform for intelligent blood supply management
                            </p>
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-purple-600/30 border border-purple-500/50 rounded-full text-purple-300 text-sm">
                                    🤖 Model: rishirajpathak/blood_shortage_risk
                                </span>
                                <span className="px-3 py-1 bg-blue-600/30 border border-blue-500/50 rounded-full text-blue-300 text-sm">
                                    📊 13 Features Analyzed
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 shadow-xl"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-red-200 text-sm">Total Blood Bags</p>
                                <p className="text-4xl font-bold text-white mt-1">{stats.total.toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Droplet className="h-8 w-8 text-white" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-red-800 to-red-900 shadow-xl border border-red-500/50"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-red-300 text-sm">Critical Risk</p>
                                <p className="text-4xl font-bold text-white mt-1">{stats.critical}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-400" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-700 shadow-xl"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-200 text-sm">High Risk</p>
                                <p className="text-4xl font-bold text-white mt-1">{stats.high}</p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-orange-300" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-yellow-600 to-yellow-700 shadow-xl"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-yellow-200 text-sm">Moderate Risk</p>
                                <p className="text-4xl font-bold text-white mt-1">{stats.moderate}</p>
                            </div>
                            <Activity className="h-8 w-8 text-yellow-300" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-green-600 to-green-700 shadow-xl"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-200 text-sm">Low Risk</p>
                                <p className="text-4xl font-bold text-white mt-1">{stats.low}</p>
                            </div>
                            <Shield className="h-8 w-8 text-green-300" />
                        </div>
                    </motion.div>
                </div>

                {/* Blood Bag Visual Representation */}
                <div className="mb-8 p-6 rounded-2xl bg-black/30 backdrop-blur border border-white/10">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-500" />
                        Blood Supply Overview
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {data.map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => setSelectedCity(selectedCity === index ? null : index)}
                                className={`relative cursor-pointer transition-all ${selectedCity === index ? 'scale-110 z-10' : 'hover:scale-105'}`}
                            >
                                {/* Blood Bag SVG */}
                                <svg width="60" height="80" viewBox="0 0 60 80" className="drop-shadow-lg">
                                    {/* Bag body */}
                                    <rect x="5" y="15" width="50" height="60" rx="8" fill={item.prediction.color} opacity="0.9" />
                                    {/* Tube */}
                                    <rect x="25" y="0" width="10" height="20" rx="3" fill={item.prediction.color} />
                                    {/* Fill level indicator */}
                                    <rect
                                        x="10"
                                        y={75 - (item.available_bags / 500 * 55)}
                                        width="40"
                                        height={item.available_bags / 500 * 55}
                                        rx="5"
                                        fill="rgba(255,255,255,0.3)"
                                    />
                                    {/* Label */}
                                    <text x="30" y="50" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                                        {item.available_bags}
                                    </text>
                                </svg>
                                <p className="text-xs text-center text-white/80 mt-1">{cityNames[index]}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Detailed City Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {data.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-5 rounded-2xl bg-black/40 backdrop-blur border transition-all cursor-pointer ${selectedCity === index
                                ? 'border-red-500 ring-2 ring-red-500/30'
                                : 'border-white/10 hover:border-white/30'
                                }`}
                            onClick={() => setSelectedCity(selectedCity === index ? null : index)}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-red-500" />
                                    <h3 className="font-semibold text-white">{cityNames[index]}</h3>
                                </div>
                                <span
                                    className="px-2 py-1 rounded-full text-xs font-bold"
                                    style={{ backgroundColor: `${item.prediction.color}30`, color: item.prediction.color }}
                                >
                                    {item.prediction.risk}
                                </span>
                            </div>

                            {/* Risk Score Bar */}
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Risk Score</span>
                                    <span>{item.prediction.score}%</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.prediction.score}%` }}
                                        transition={{ duration: 1, delay: index * 0.1 }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: item.prediction.color }}
                                    />
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="p-2 bg-white/5 rounded-lg">
                                    <p className="text-gray-400 text-xs">Available</p>
                                    <p className="text-white font-semibold">{item.available_bags} bags</p>
                                </div>
                                <div className="p-2 bg-white/5 rounded-lg">
                                    <p className="text-gray-400 text-xs">Used (24h)</p>
                                    <p className="text-white font-semibold">{item.bags_used_last_24h}</p>
                                </div>
                                <div className="p-2 bg-white/5 rounded-lg">
                                    <p className="text-gray-400 text-xs">Expected Donors</p>
                                    <p className="text-white font-semibold">{item.expected_donors_24h}</p>
                                </div>
                                <div className="p-2 bg-white/5 rounded-lg">
                                    <p className="text-gray-400 text-xs">Emergencies</p>
                                    <p className="text-white font-semibold">{item.emergency_cases_last_7d}</p>
                                </div>
                            </div>

                            {/* Flags */}
                            <div className="flex gap-2 mt-3">
                                {item.festival_flag === 1 && (
                                    <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded text-xs">
                                        🎉 Festival Season
                                    </span>
                                )}
                                {item.seasonality_flag === 1 && (
                                    <span className="px-2 py-0.5 bg-blue-500/30 text-blue-300 rounded text-xs">
                                        📅 Seasonal Effect
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Feature Visualization */}
                <div className="p-6 rounded-2xl bg-black/30 backdrop-blur border border-white/10">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-green-500" />
                        Feature Analysis (7-Day Trends)
                    </h2>

                    {data.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Usage Trend */}
                            <div className="p-4 bg-white/5 rounded-xl">
                                <h3 className="text-gray-300 mb-3 text-sm">Blood Bag Usage</h3>
                                <div className="space-y-2">
                                    {data.slice(0, 4).map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 w-16">{cityNames[idx]}</span>
                                            <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                                                    style={{ width: `${Math.min(100, item.bags_used_last_7d / 3)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-400">{item.bags_used_last_7d}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Donor Expectations */}
                            <div className="p-4 bg-white/5 rounded-xl">
                                <h3 className="text-gray-300 mb-3 text-sm">Expected Donors (7d)</h3>
                                <div className="space-y-2">
                                    {data.slice(0, 4).map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 w-16">{cityNames[idx]}</span>
                                            <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                                                    style={{ width: `${Math.min(100, item.expected_donors_7d / 1.5)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-400">{item.expected_donors_7d}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Emergency Cases */}
                            <div className="p-4 bg-white/5 rounded-xl">
                                <h3 className="text-gray-300 mb-3 text-sm">Emergency Cases (7d)</h3>
                                <div className="space-y-2">
                                    {data.slice(0, 4).map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 w-16">{cityNames[idx]}</span>
                                            <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-yellow-500 to-red-500 rounded-full"
                                                    style={{ width: `${Math.min(100, item.emergency_cases_last_7d * 5)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-400">{item.emergency_cases_last_7d}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="mt-6 p-4 rounded-xl bg-black/20 border border-white/10">
                    <p className="text-gray-400 text-sm">
                        <strong className="text-white">AI Model:</strong> This analysis uses the{' '}
                        <code className="px-1 py-0.5 bg-white/10 rounded text-purple-300">rishirajpathak/blood_shortage_risk</code>{' '}
                        model to predict blood shortage risks based on 13 critical features including location data,
                        historical usage patterns, donor expectations, emergency cases, and seasonal factors.
                    </p>
                </div>
            </div>
        </div>
    );
}
