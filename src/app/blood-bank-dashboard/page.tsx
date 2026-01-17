'use client';

import { useState } from 'react';
import {
    Building2,
    Droplet,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Clock,
    Bell,
    Settings,
    LogOut,
    RefreshCw,
    Users,
    Calendar,
    ChevronRight,
    Activity
} from 'lucide-react';
import Link from 'next/link';

// Mock data for blood inventory
const inventoryData = [
    { type: 'A+', units: 45, status: 'adequate', maxCapacity: 100 },
    { type: 'A-', units: 12, status: 'low', maxCapacity: 50 },
    { type: 'B+', units: 38, status: 'adequate', maxCapacity: 80 },
    { type: 'B-', units: 5, status: 'critical', maxCapacity: 40 },
    { type: 'O+', units: 62, status: 'adequate', maxCapacity: 120 },
    { type: 'O-', units: 8, status: 'low', maxCapacity: 60 },
    { type: 'AB+', units: 22, status: 'adequate', maxCapacity: 50 },
    { type: 'AB-', units: 3, status: 'critical', maxCapacity: 30 },
];

// Mock data for shortage predictions
const shortagePredictions = [
    { bloodType: 'B-', daysUntilShortage: 3, confidence: 'High', trend: 'down', currentUnits: 5, predictedDemand: 12 },
    { bloodType: 'AB-', daysUntilShortage: 5, confidence: 'High', trend: 'down', currentUnits: 3, predictedDemand: 8 },
    { bloodType: 'O-', daysUntilShortage: 8, confidence: 'Medium', trend: 'down', currentUnits: 8, predictedDemand: 15 },
    { bloodType: 'A-', daysUntilShortage: 12, confidence: 'Medium', trend: 'stable', currentUnits: 12, predictedDemand: 18 },
];

// Mock donation trend data for the chart
const donationTrendData = [
    { month: 'Aug', donations: 145 },
    { month: 'Sep', donations: 132 },
    { month: 'Oct', donations: 168 },
    { month: 'Nov', donations: 155 },
    { month: 'Dec', donations: 121 },
    { month: 'Jan', donations: 98 },
];

export default function BloodBankDashboard() {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const bankName = "City Central Blood Bank"; // Would come from auth context

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'adequate': return 'bg-green-500';
            case 'low': return 'bg-yellow-500';
            case 'critical': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'adequate': return 'bg-green-50 border-green-200';
            case 'low': return 'bg-yellow-50 border-yellow-200';
            case 'critical': return 'bg-red-50 border-red-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const getConfidenceColor = (confidence: string) => {
        switch (confidence) {
            case 'High': return 'text-red-600 bg-red-100';
            case 'Medium': return 'text-yellow-600 bg-yellow-100';
            case 'Low': return 'text-green-600 bg-green-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const totalUnits = inventoryData.reduce((sum, item) => sum + item.units, 0);
    const criticalCount = inventoryData.filter(item => item.status === 'critical').length;
    const lowCount = inventoryData.filter(item => item.status === 'low').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-blue-100 sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Building2 className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">{bankName}</h1>
                                <p className="text-sm text-gray-500">Analytics Dashboard</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>
                            <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Settings className="h-5 w-5" />
                            </button>
                            <Link href="/auth/blood-bank-login" className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <LogOut className="h-5 w-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
                            <p className="text-blue-100">
                                Your predictive analytics are updated. Review the shortage alerts below.
                            </p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span>Refresh Data</span>
                        </button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Units</p>
                                <p className="text-3xl font-bold text-gray-900">{totalUnits}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Droplet className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Critical Types</p>
                                <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Low Stock Types</p>
                                <p className="text-3xl font-bold text-yellow-600">{lowCount}</p>
                            </div>
                            <div className="p-3 bg-yellow-100 rounded-full">
                                <TrendingDown className="h-6 w-6 text-yellow-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Active Donors</p>
                                <p className="text-3xl font-bold text-green-600">284</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <Users className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Inventory & Predictions */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Predictive Shortage Alerts - HIGHLIGHTED */}
                        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-lg">
                                            <Activity className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Predictive Shortage Alerts</h3>
                                            <p className="text-sm text-red-100">AI-powered demand forecasting</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-white/20 text-white text-sm rounded-full">
                                        {shortagePredictions.length} Alerts
                                    </span>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="space-y-3">
                                    {shortagePredictions.map((prediction, index) => (
                                        <div
                                            key={prediction.bloodType}
                                            className={`p-4 rounded-xl border ${prediction.daysUntilShortage <= 5
                                                    ? 'bg-red-50 border-red-200'
                                                    : 'bg-orange-50 border-orange-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${prediction.daysUntilShortage <= 5
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-orange-500 text-white'
                                                        }`}>
                                                        {prediction.bloodType}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-gray-900">
                                                                Shortage in {prediction.daysUntilShortage} days
                                                            </span>
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getConfidenceColor(prediction.confidence)}`}>
                                                                {prediction.confidence} Confidence
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            Current: {prediction.currentUnits} units • Predicted demand: {prediction.predictedDemand} units
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {prediction.trend === 'down' ? (
                                                        <TrendingDown className="h-5 w-5 text-red-500" />
                                                    ) : (
                                                        <TrendingUp className="h-5 w-5 text-green-500" />
                                                    )}
                                                    <button className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                                                        Request Donors
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Current Inventory */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-900">Current Inventory</h3>
                                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                                    Update Inventory <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {inventoryData.map((item) => (
                                    <div
                                        key={item.type}
                                        className={`p-4 rounded-xl border ${getStatusBg(item.status)}`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-2xl font-bold text-gray-900">{item.type}</span>
                                            <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`}></div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Units</span>
                                                <span className="font-semibold">{item.units}/{item.maxCapacity}</span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${getStatusColor(item.status)} rounded-full transition-all`}
                                                    style={{ width: `${(item.units / item.maxCapacity) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Trends & Actions */}
                    <div className="space-y-8">
                        {/* Donation Trends Chart Placeholder */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Donation Trends</h3>
                            <div className="h-48 flex items-end justify-between gap-2 border-b border-l border-gray-200 p-4">
                                {donationTrendData.map((data, index) => (
                                    <div key={data.month} className="flex flex-col items-center gap-2 flex-1">
                                        <div
                                            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all hover:from-blue-600 hover:to-blue-500"
                                            style={{ height: `${(data.donations / 180) * 100}%` }}
                                        ></div>
                                        <span className="text-xs text-gray-500">{data.month}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex items-center justify-between text-sm">
                                <span className="text-gray-500">Last 6 months</span>
                                <span className="text-red-500 font-medium flex items-center gap-1">
                                    <TrendingDown className="h-4 w-4" /> -19% from peak
                                </span>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <Users className="h-5 w-5 text-blue-600" />
                                        <span className="font-medium text-gray-900">Request Donors</span>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                </button>
                                <button className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <Droplet className="h-5 w-5 text-green-600" />
                                        <span className="font-medium text-gray-900">Update Inventory</span>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                                </button>
                                <button className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-5 w-5 text-purple-600" />
                                        <span className="font-medium text-gray-900">Schedule Drive</span>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                                </button>
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Upcoming Drives</h3>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Calendar className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Community Drive</p>
                                        <p className="text-sm text-gray-500">Jan 20, 2026 • City Hall</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Calendar className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Corporate Drive</p>
                                        <p className="text-sm text-gray-500">Jan 25, 2026 • Tech Park</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
