'use client';

import { useState } from 'react';
import { Building2, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BloodBankRegister() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formData, setFormData] = useState({
        bankName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        licenseNumber: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.bankName) newErrors.bankName = 'Bank name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        if (!formData.password) newErrors.password = 'Password is required';
        if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!formData.phone) newErrors.phone = 'Phone number is required';
        if (!formData.address) newErrors.address = 'Address is required';
        if (!formData.city) newErrors.city = 'City is required';
        if (!formData.state) newErrors.state = 'State is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);

        // Simulate API call (UI only for now)
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setShowSuccess(true);

        // Redirect to login after success
        setTimeout(() => {
            router.push('/auth/blood-bank-login');
        }, 2000);
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
            <main className="flex-1 flex items-center justify-center p-4 py-8">
                <div className="w-full max-w-2xl p-8 rounded-xl bg-white border border-blue-100 shadow-xl">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                            <Building2 className="h-8 w-8 text-blue-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Register Your Blood Bank</h1>
                        <p className="text-gray-600 mt-2">Join our network to access advanced predictive analytics</p>
                    </div>

                    {showSuccess ? (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-green-700 mb-2">Registration Successful!</h2>
                            <p className="text-gray-600">Redirecting to login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Bank Name */}
                            <div>
                                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">
                                    Blood Bank Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="bankName"
                                    name="bankName"
                                    type="text"
                                    value={formData.bankName}
                                    onChange={handleChange}
                                    placeholder="e.g., City Central Blood Bank"
                                    className={`w-full px-4 py-3 bg-white border ${errors.bankName ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md text-gray-900 placeholder-gray-400`}
                                />
                                {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
                            </div>

                            {/* Email & Phone Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="admin@bloodbank.com"
                                        className={`w-full px-4 py-3 bg-white border ${errors.email ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md text-gray-900 placeholder-gray-400`}
                                    />
                                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+91 98765 43210"
                                        className={`w-full px-4 py-3 bg-white border ${errors.phone ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md text-gray-900 placeholder-gray-400`}
                                    />
                                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                                </div>
                            </div>

                            {/* Password Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Min 6 characters"
                                        className={`w-full px-4 py-3 bg-white border ${errors.password ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md text-gray-900 placeholder-gray-400`}
                                    />
                                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                                </div>
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                        Confirm Password <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Re-enter password"
                                        className={`w-full px-4 py-3 bg-white border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md text-gray-900 placeholder-gray-400`}
                                    />
                                    {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="address"
                                    name="address"
                                    type="text"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Street address, building, landmark"
                                    className={`w-full px-4 py-3 bg-white border ${errors.address ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md text-gray-900 placeholder-gray-400`}
                                />
                                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                            </div>

                            {/* City & State Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                                        City <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="city"
                                        name="city"
                                        type="text"
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="e.g., Mumbai"
                                        className={`w-full px-4 py-3 bg-white border ${errors.city ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md text-gray-900 placeholder-gray-400`}
                                    />
                                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                                </div>
                                <div>
                                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                                        State <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="state"
                                        name="state"
                                        type="text"
                                        value={formData.state}
                                        onChange={handleChange}
                                        placeholder="e.g., Maharashtra"
                                        className={`w-full px-4 py-3 bg-white border ${errors.state ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md text-gray-900 placeholder-gray-400`}
                                    />
                                    {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                                </div>
                            </div>

                            {/* License Number (Optional) */}
                            <div>
                                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                                    License Number <span className="text-gray-400">(Optional)</span>
                                </label>
                                <input
                                    id="licenseNumber"
                                    name="licenseNumber"
                                    type="text"
                                    value={formData.licenseNumber}
                                    onChange={handleChange}
                                    placeholder="For verification purposes"
                                    className="w-full px-4 py-3 bg-white border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md text-gray-900 placeholder-gray-400"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Registering...</span>
                                    </>
                                ) : (
                                    <>
                                        <Building2 className="h-5 w-5" />
                                        <span>Register Blood Bank</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-600">Already registered?</span>
                        <Link href="/auth/blood-bank-login" className="ml-1 text-blue-600 hover:text-blue-700 font-medium">
                            Sign in here
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
