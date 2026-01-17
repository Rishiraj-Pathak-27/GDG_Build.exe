'use client';

import { useState, useEffect } from 'react';
import { Building2, LogIn, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BloodBankLogin() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState<'success' | 'error'>('success');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        if (!email || !password) {
            setShowAlert(true);
            setAlertType('error');
            setErrorMessage('Please fill in all fields');
            return;
        }

        setIsLoading(true);

        // Simulate login (UI only for now)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Simulate success
        setShowAlert(true);
        setAlertType('success');
        setIsLoading(false);

        // Redirect to blood bank dashboard
        setTimeout(() => {
            router.push('/blood-bank-dashboard');
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-sm py-4 border-b border-blue-100">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center space-x-2 text-gray-900">
                        <Building2 className="h-6 w-6 text-blue-600" />
                        <span className="text-xl font-semibold">BloodConnect <span className="text-blue-600">for Banks</span></span>
                    </Link>
                    <Link
                        href="/"
                        className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Home</span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-md p-8 rounded-xl bg-white border border-blue-100 shadow-xl">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                            <Building2 className="h-8 w-8 text-blue-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Blood Bank Login</h1>
                        <p className="text-gray-600 mt-2">Access your analytics dashboard</p>
                    </div>

                    {/* Alert section */}
                    {showAlert && (
                        <div className="mb-6">
                            <div className={`rounded-lg p-4 border ${alertType === 'success'
                                    ? 'bg-green-50 border-green-500 text-green-700'
                                    : 'bg-red-50 border-red-500 text-red-700'
                                }`}>
                                <div className="flex items-center">
                                    {alertType === 'error' && <AlertTriangle className="h-5 w-5 mr-2" />}
                                    <p className="font-medium">
                                        {alertType === 'success'
                                            ? 'Login successful! Redirecting to dashboard...'
                                            : errorMessage || 'Invalid credentials. Please try again.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="admin@bloodbank.com"
                                className="w-full px-4 py-3 bg-white border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md text-gray-900 placeholder-gray-400"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <Link href="#" className="text-xs text-blue-600 hover:text-blue-700">
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder="Enter your password"
                                className="w-full px-4 py-3 bg-white border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md text-gray-900 placeholder-gray-400"
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                                Remember me
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn className="h-5 w-5" />
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-600">New blood bank?</span>
                        <Link href="/auth/blood-bank-register" className="ml-1 text-blue-600 hover:text-blue-700 font-medium">
                            Register here
                        </Link>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                        <Link href="/auth/login" className="text-sm text-gray-500 hover:text-gray-700">
                            Not a blood bank? Sign in as donor/recipient →
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
