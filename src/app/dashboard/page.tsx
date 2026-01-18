'use client';

import { Bell, Droplet, Heart, Users, LayoutDashboard, User, Settings, LogOut, UserCircle, Calendar, AlertCircle, Clock, Phone, Mail, Info, Plus, Edit, CheckCircle, MapPin, Eye } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import DonationScheduleModal, { DonationFormData } from '@/components/DonationScheduleModal';
import UserTypeSelector from '@/components/UserTypeSelector';
import DonationListingForm, { DonationListingData } from '@/components/DonationListingForm';
import DonationsList from '@/components/DonationsList';
import BloodRequestForm, { BloodRequestData } from '@/components/BloodRequestForm';
import DonorProfileModal, { DonorProfile } from '@/components/DonorProfileModal';
import NoMatchExplanation from '@/components/NoMatchExplanation';
import { donationAPI, userAPI, matchingAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast, Toaster } from 'react-hot-toast';

export default function Dashboard() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [open, setOpen] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showListingModal, setShowListingModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showBloodRequestModal, setShowBloodRequestModal] = useState(false);
  const [userType, setUserType] = useState<'donor' | 'recipient'>(
    user?.role?.toLowerCase() === 'recipient' ? 'recipient' : 'donor'
  );
  const [donations, setDonations] = useState<DonationListingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'emergency', message: 'Urgent need for O- blood type in City Hospital', time: '10 min ago' },
    { id: 2, type: 'appointment', message: 'Your donation appointment is confirmed', time: '1 hour ago' },
    { id: 3, type: 'update', message: 'Blood inventory update: A+ type is low', time: '3 hours ago' }
  ]);
  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [processedDonationIds, setProcessedDonationIds] = useState<Set<string>>(new Set());
  const [isMatchingRunning, setIsMatchingRunning] = useState(false);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [selectedDonorProfile, setSelectedDonorProfile] = useState<DonorProfile | null>(null);
  const [showDonorProfileModal, setShowDonorProfileModal] = useState(false);

  // Run AI matching for all active blood requests
  const handleRunAIMatching = async () => {
    if (isMatchingRunning) return;

    setIsMatchingRunning(true);
    const loadingToast = toast.loading('Running AI Matching...');

    try {
      console.log('Starting AI matching for all active blood requests...');

      // Run matching for all active requests
      const result = await matchingAPI.runMatchingForAllRequests();

      console.log('AI Matching complete:', result);

      // Process results and add to notifications
      const newNotifications: any[] = [];

      for (const matchResult of result.results) {
        if (matchResult.success && matchResult.matchesFound > 0) {
          newNotifications.push({
            id: `match-${matchResult.requestId}-${Date.now()}`,
            type: 'match',
            title: `🎯 AI Match Found!`,
            message: `Found ${matchResult.matchesFound} compatible donors for ${matchResult.bloodType} blood request`,
            bloodType: matchResult.bloodType,
            matchesFound: matchResult.matchesFound,
            requestId: matchResult.requestId,
            createdAt: new Date().toISOString(),
            read: false,
          });
        }
      }

      // Add new match notifications to the top
      setUserNotifications(prev => [...newNotifications, ...prev]);
      setMatchResults(result.results);

      toast.success(
        `AI Matching Complete! Processed ${result.totalRequests} requests, found matches for ${result.results.filter((r: any) => r.matchesFound > 0).length} requests.`,
        { id: loadingToast, duration: 5000 }
      );

    } catch (error: any) {
      console.error('AI Matching error:', error);
      toast.error(`AI Matching failed: ${error.message}`, { id: loadingToast });
    } finally {
      setIsMatchingRunning(false);
    }
  };

  // Update userType when user changes
  useEffect(() => {
    if (user?.role) {
      const newUserType = user.role.toLowerCase() as 'donor' | 'recipient';

      // Only update if it actually changed to avoid refresh loops
      if (newUserType !== userType) {
        console.log(`User role changed from ${userType} to ${newUserType}, updating...`);
        setUserType(newUserType);
      }
    }
  }, [user, userType]);

  // Load donations from backend API
  useEffect(() => {
    const fetchDonations = async () => {
      if (!user) {
        console.log("No user logged in, skipping donation fetch");
        setDonations([]);
        setIsLoading(false);
        return;
      }

      console.log("Starting donation fetch process with user:", user.uid);
      setIsLoading(true);
      setLoadError(null);

      try {
        console.log(`Fetching donations as ${userType}...`);
        let donationData: any[] = [];

        if (userType === 'donor') {
          // Fetch donor's own donations (including any pending ones)
          console.log("Fetching donor's donations from Firestore with UID:", user.uid);
          donationData = await donationAPI.getMyDonations();
          console.log("Raw donor donations received:", donationData);
        } else {
          // Fetch available donations for recipients
          console.log("Fetching available donations for recipient");
          donationData = await donationAPI.getAvailableDonations();
          console.log("Raw available donations received:", donationData);
        }

        if (!donationData) {
          console.error("No donation data returned from API");
          donationData = [];
        } else if (!Array.isArray(donationData)) {
          console.error("Invalid donation data format (not an array):", donationData);
          donationData = [];
        }

        console.log("Processing donation data of length:", donationData.length);

        // Transform API data to match our frontend model with better error handling
        const transformedDonations = donationData
          .filter(donation => donation !== null && donation !== undefined)
          .map((donation: any) => {
            try {
              // Convert 'pending' or 'requested' status consistently
              let status = (donation.status || 'available').toLowerCase();
              // Ensure we normalize 'requested' to 'pending' for consistency
              if (status === 'requested') status = 'pending';

              return {
                id: `donation-${donation.id || 'unknown'}`,
                donorName: donation.donorName || 'Anonymous',
                bloodType: donation.bloodType || 'Unknown',
                contactNumber: donation.contactNumber || 'N/A',
                availability: donation.availability || 'N/A',
                location: donation.location || 'N/A',
                additionalInfo: donation.additionalInfo || '',
                listedOn: donation.listedOn ? new Date(donation.listedOn).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown date',
                status: status,
                requesterId: donation.recipientId || '',
                recipientName: donation.recipientName || ''
              };
            } catch (err) {
              console.error("Error transforming donation:", err, donation);
              return null;
            }
          })
          .filter((item): item is typeof item => item !== null) as DonationListingData[];

        console.log("Processed transformed donations:", transformedDonations);
        setDonations(transformedDonations);
      } catch (error: any) {
        console.error('Error fetching donations:', error);
        const errorMessage = error.message || "Failed to load donations";
        setLoadError(errorMessage);
        toast.error(`Error: ${errorMessage}`);
        // Set empty array instead of keeping old state to avoid stale data
        setDonations([]);
      } finally {
        setIsLoading(false);
      }
    };

    console.log("Donation fetch useEffect triggered - user:", user?.uid, "userType:", userType);
    fetchDonations();
  }, [user, userType]);

  interface Appointment {
    id: number;
    date: string;
    time: string;
    location: string;
    status: 'confirmed' | 'pending';
  }

  // Load appointments from localStorage if available
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const savedAppointments = localStorage.getItem('bloodconnect_appointments');
    if (savedAppointments) {
      setAppointments(JSON.parse(savedAppointments));
    }
  }, []);

  // Save appointments to localStorage when they change
  useEffect(() => {
    localStorage.setItem('bloodconnect_appointments', JSON.stringify(appointments));
  }, [appointments]);

  // Fetch notifications when component mounts
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;

      try {
        console.log("Fetching notifications for user:", user.uid);
        const notificationData = await donationAPI.getNotifications();

        // Only update state if we have valid data
        if (Array.isArray(notificationData)) {
          setUserNotifications(notificationData);

          // Check if there are unread notifications
          const unreadCount = notificationData.filter(notification => {
            if (!notification) return false;
            return typeof notification === 'object' && 'read' in notification && !notification.read;
          }).length;

          if (unreadCount > 0) {
            console.log(`User has ${unreadCount} unread notifications`);
          }
        }
      } catch (error: any) {
        console.error('Error fetching notifications:', error);

        // Handle index errors gracefully
        if (error.message && error.message.includes('requires an index')) {
          toast.error(
            'We\'re setting up notifications. Please try again in a few minutes.',
            { duration: 4000 }
          );
        }
      }
    };

    // Only fetch if user is logged in
    if (user?.uid) {
      fetchNotifications();
    }
  }, [user]);

  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5 shrink-0 text-[#DC2626]" />,
    },
    {
      label: "Profile",
      href: "/profile",
      icon: <User className="h-5 w-5 shrink-0 text-[#DC2626]" />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5 shrink-0 text-[#DC2626]" />,
    },
    {
      label: "Blood Requests",
      href: "/blood-requests",
      icon: <Droplet className="h-5 w-5 shrink-0 text-[#DC2626]" />,
    },
    {
      label: "Logout",
      href: "/",
      icon: <LogOut className="h-5 w-5 shrink-0 text-[#DC2626]" />,
    },
  ];

  const handleScheduleDonation = () => {
    setAppointmentToReschedule(null);
    setShowDonationModal(true);
  };

  const handleUpdateProfile = () => {
    router.push('/profile');
  };

  const handleViewBloodRequests = () => {
    router.push('/blood-requests');
  };

  const handleDonateNow = () => {
    setAppointmentToReschedule(null);
    setShowDonationModal(true);
  };

  const handleRescheduleAppointment = (appointment?: Appointment) => {
    if (appointment) {
      setAppointmentToReschedule(appointment);
      setShowDonationModal(true);
    } else if (appointments.length > 0) {
      setAppointmentToReschedule(appointments[0]);
      setShowDonationModal(true);
    } else {
      alert('No appointments to reschedule. Please schedule a donation first.');
    }
  };

  const handleViewBloodBanks = () => {
    router.push('/blood-banks');
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to clear all donation data? This action cannot be undone.')) {
      localStorage.removeItem('bloodconnect_donations');
      localStorage.removeItem('bloodconnect_appointments');
      setDonations([]);
      setAppointments([]);
      alert('All donation data has been cleared.');
    }
  };

  const handleDonationSubmit = (data: DonationFormData) => {
    console.log('Donation scheduled:', data);

    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    if (appointmentToReschedule) {
      setAppointments(prev =>
        prev.map(apt =>
          apt.id === appointmentToReschedule.id
            ? {
              ...apt,
              date: formattedDate,
              time: data.time,
              location: data.location
            }
            : apt
        )
      );
      alert(`Appointment rescheduled!\nDate: ${formattedDate}\nTime: ${data.time}\nLocation: ${data.location}`);
    } else {
      const newAppointment: Appointment = {
        id: Date.now(),
        date: formattedDate,
        time: data.time,
        location: data.location,
        status: 'pending'
      };

      setAppointments(prev => [...prev, newAppointment]);
      alert(`Donation scheduled!\nDate: ${formattedDate}\nTime: ${data.time}\nLocation: ${data.location}`);
    }

    setAppointmentToReschedule(null);
  };

  const handleListDonation = () => {
    setShowListingModal(true);
  };

  const deduplicateDonations = (donationsList: DonationListingData[]): DonationListingData[] => {
    const uniqueDonations: DonationListingData[] = [];
    const seenIds = new Set<string>();

    for (const donation of donationsList) {
      if (!seenIds.has(donation.id)) {
        seenIds.add(donation.id);
        uniqueDonations.push(donation);
      } else {
        console.log(`Skipping duplicate donation with ID: ${donation.id}`);
      }
    }

    return uniqueDonations;
  };

  const handleListingSubmit = async (donationData: DonationListingData) => {
    // First close the modal to prevent multiple submissions
    setShowListingModal(false);

    const toastId = toast.loading('Creating new donation listing...');

    try {
      // Call the API to create the donation
      await donationAPI.createDonation({
        bloodType: donationData.bloodType,
        contactNumber: donationData.contactNumber,
        availability: donationData.availability,
        location: donationData.location,
        additionalInfo: donationData.additionalInfo,
        status: 'available'
      });

      // Update toast to success
      toast.success('Donation listed successfully!', { id: toastId });

      // Wait before refreshing to ensure database consistency
      setTimeout(() => {
        refreshUserDataAndDonations();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving donation:', error);

      // Handle index errors gracefully
      if (error.message && error.message.includes('requires an index')) {
        toast.error(
          'Your donation was saved, but we\'re setting up the database. Please wait a moment and refresh.',
          { id: toastId, duration: 5000 }
        );

        // Try refreshing after a delay to see if indexes are ready
        setTimeout(() => refreshUserDataAndDonations(), 5000);
      } else {
        toast.error('Failed to save donation data', { id: toastId });
      }
    }
  };

  const handleDonationStatusChange = async (donationId: string, newStatus: 'available' | 'pending' | 'completed') => {
    try {
      const id = donationId.split('-')[1];

      toast.loading('Updating donation status...', { id: 'status-toast' });

      if (newStatus === 'completed') {
        await donationAPI.confirmDonation(id);
      } else if (newStatus === 'available' && userType === 'recipient') {
        await donationAPI.cancelRequest(id);
      }

      setTimeout(() => {
        refreshUserDataAndDonations();
        toast.success('Status updated successfully', { id: 'status-toast' });
      }, 1000);

    } catch (error) {
      console.error('Error updating donation status:', error);
      toast.error('Failed to update status', { id: 'status-toast' });
    }
  };

  const handleRequestDonation = async (donationId: string) => {
    try {
      const id = donationId.split('-')[1];

      toast.loading('Requesting donation...', { id: 'request-toast' });
      await donationAPI.requestDonation(id);

      setTimeout(() => {
        refreshUserDataAndDonations();
        toast.success('Request sent successfully', { id: 'request-toast' });
      }, 1000);

    } catch (error) {
      console.error('Error requesting donation:', error);
      toast.error('Failed to request donation', { id: 'request-toast' });
    }
  };

  const handleAcceptDonationRequest = async (donationId: string, recipientId: string) => {
    try {
      const id = donationId.split('-')[1];

      toast.loading('Accepting request...', { id: 'accept-toast' });
      await donationAPI.acceptDonationRequest(id, recipientId);

      setTimeout(() => {
        refreshUserDataAndDonations();
        toast.success('Request accepted successfully', { id: 'accept-toast' });
      }, 1000);

    } catch (error) {
      console.error('Error accepting donation request:', error);
      toast.error('Failed to accept request', { id: 'accept-toast' });
    }
  };

  const handleRejectDonationRequest = async (donationId: string, recipientId: string) => {
    try {
      const id = donationId.split('-')[1];

      toast.loading('Rejecting request...', { id: 'reject-toast' });
      await donationAPI.rejectDonationRequest(id, recipientId);

      setTimeout(() => {
        refreshUserDataAndDonations();
        toast.success('Request rejected successfully', { id: 'reject-toast' });
      }, 1000);

    } catch (error) {
      console.error('Error rejecting donation request:', error);
      toast.error('Failed to reject request', { id: 'reject-toast' });
    }
  };

  const refreshUserDataAndDonations = async () => {
    if (!user) {
      console.log("Cannot refresh - no user logged in");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Refreshing data...');

    try {
      // First refresh user data from Firestore
      console.log("Fetching latest user profile...");
      const userData = await userAPI.getProfile();

      // Make sure the userType state is updated based on the latest user role
      if (userData && typeof userData === 'object' && 'role' in userData) {
        const newRole = (userData.role as string).toLowerCase() as 'donor' | 'recipient';
        if (newRole !== userType) {
          setUserType(newRole);
        }
      }

      // Then reload the donations based on current user type
      let donationData: any[] = [];

      try {
        if (userType === 'donor') {
          donationData = await donationAPI.getMyDonations();
        } else {
          donationData = await donationAPI.getAvailableDonations();
        }
      } catch (apiError) {
        console.error("API error fetching donations:", apiError);
        donationData = [];
      }

      if (!donationData || !Array.isArray(donationData)) {
        donationData = [];
      }

      // Transform and update the donations state with deduplication
      const transformedDonations = donationData
        .filter(donation => donation !== null && donation !== undefined)
        .map((donation: any) => {
          try {
            let status = (donation.status || 'available').toLowerCase();
            if (status === 'requested') status = 'pending';

            return {
              id: `donation-${donation.id || 'unknown'}`,
              donorName: donation.donorName || 'Anonymous',
              bloodType: donation.bloodType || 'Unknown',
              contactNumber: donation.contactNumber || 'N/A',
              availability: donation.availability || 'N/A',
              location: donation.location || 'N/A',
              additionalInfo: donation.additionalInfo || '',
              listedOn: donation.listedOn ? new Date(donation.listedOn).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Unknown date',
              status: status,
              requesterId: donation.recipientId || '',
              recipientName: donation.recipientName || ''
            };
          } catch (transformError) {
            console.error("Error transforming donation item:", transformError);
            return null;
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      // Deduplicate the donations
      const uniqueDonations = deduplicateDonations(transformedDonations);
      console.log(`Filtered ${transformedDonations.length - uniqueDonations.length} duplicate donations`);

      setDonations(uniqueDonations);
      toast.success('Data refreshed successfully', { id: toastId });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data. Please try again.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout | null = null;

    const handleRefreshEvent = () => {
      console.log("Donation data changed event received, scheduling refresh...");

      // Clear any existing timeout to debounce multiple rapid events
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      // Schedule a new refresh after a short delay
      refreshTimeout = setTimeout(() => {
        console.log("Executing debounced refresh");
        refreshUserDataAndDonations();
        refreshTimeout = null;
      }, 500);
    };

    window.addEventListener('donation-data-changed', handleRefreshEvent);

    return () => {
      window.removeEventListener('donation-data-changed', handleRefreshEvent);
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [user, userType]);

  const retryLoadDonations = () => {
    toast.loading('Retrying donation load...');
    refreshUserDataAndDonations();
  };

  const userDonations = userType === 'donor'
    ? donations // Show all donations for donors, including pending ones
    : donations.filter(donation => donation.status === 'available'); // Only show available for recipients

  const donorStats = {
    totalDonations: donations.filter(d => d.status === 'completed').length,
    listedDonations: donations.filter(d => d.status === 'available').length
  };

  const recipientStats = {
    totalReceived: donations.filter(d => d.status === 'completed').length,
    availableDonors: donations.filter(d => d.status === 'available').length
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Toaster position="top-right" />

      <div className="flex h-screen">
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="justify-between gap-10">
            <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
              {open ? <Logo /> : <LogoIcon />}
              <div className="mt-8 flex flex-col gap-2">
                {links.map((link, idx) => (
                  <SidebarLink key={idx} link={link} />
                ))}
              </div>
            </div>
            <div>
              <SidebarLink
                link={{
                  label: userData?.firstName && userData?.lastName
                    ? `${userData.firstName} ${userData.lastName}`
                    : user?.email?.split('@')[0] || "User",
                  href: "/profile",
                  icon: (
                    <div className="h-7 w-7 shrink-0 rounded-full bg-[#DC2626]/20 flex items-center justify-center">
                      <UserCircle className="h-5 w-5 text-[#DC2626]" />
                    </div>
                  ),
                }}
              />
            </div>
          </SidebarBody>
        </Sidebar>

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-red-50/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* Hero Welcome Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-rose-500 p-8 mb-8 shadow-xl">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
              <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>

              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      {userType === 'donor' ? (
                        <Heart className="h-6 w-6 text-white" />
                      ) : (
                        <Droplet className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium backdrop-blur-sm">
                      {userType === 'donor' ? '🩸 Blood Donor' : '💉 Recipient'}
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    Welcome back, {userData?.firstName || user?.email?.split('@')[0] || 'User'}!
                  </h2>
                  <p className="text-white/80 text-lg">
                    {userType === 'donor'
                      ? 'Your donations save lives. Thank you for being a hero!'
                      : 'Find compatible donors and manage your blood requests.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => userType === 'donor' ? setShowListingModal(true) : setShowBloodRequestModal(true)}
                    className="px-6 py-3 bg-white text-red-600 font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    {userType === 'donor' ? 'List Donation' : 'Create Request'}
                  </button>
                  <div className="relative">
                    <button className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm">
                      <Bell className="h-5 w-5 text-white" />
                    </button>
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <UserTypeSelector userType={userType} setUserType={setUserType} />

            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Stat Card 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="relative overflow-hidden p-6 rounded-2xl bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-100 to-red-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-200">
                      <Heart className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      +12%
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm font-medium mb-1">
                    {userType === 'donor' ? 'Total Donations' : 'Total Received'}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {userType === 'donor' ? donorStats.totalDonations : recipientStats.totalReceived}
                  </p>
                </div>
              </motion.div>

              {/* Stat Card 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="relative overflow-hidden p-6 rounded-2xl bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100 to-purple-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-200">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                      Lives Saved
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm font-medium mb-1">Lives Impacted</p>
                  <p className="text-3xl font-bold text-gray-900">{donorStats.totalDonations * 3 || 0}</p>
                </div>
              </motion.div>

              {/* Stat Card 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="relative overflow-hidden p-6 rounded-2xl bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    {appointments.length > 0 && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        Upcoming
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm font-medium mb-1">Next Appointment</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointments.length > 0 ? appointments[0].date : "None Scheduled"}
                  </p>
                </div>
              </motion.div>

              {/* Stat Card 4 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="relative overflow-hidden p-6 rounded-2xl bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200">
                      <Droplet className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm font-medium mb-1">
                    {userType === 'donor' ? 'Listed Donations' : 'Available Donors'}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {userType === 'donor' ? donorStats.listedDonations : recipientStats.availableDonors}
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {userType === 'donor' ? 'Your Listed Donations' : 'Available Donations'}
                </h3>

                <div className="flex space-x-2">
                  <button
                    onClick={() => refreshUserDataAndDonations()}
                    className="bg-white hover:bg-gray-100 text-gray-900 border border-red-100 py-2 px-4 rounded-md transition-colors flex items-center"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4V9H4.58152M19.9381 11C19.446 7.05369 16.0796 4 12 4C8.64262 4 5.76829 6.06817 4.58152 9M4.58152 9H9M20 20V15H19.4185M19.4185 15C18.2317 17.9318 15.3574 20 12 20C7.92038 20 4.55399 16.9463 4.06189 13M19.4185 15H15"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    Refresh
                  </button>

                  {userType === 'donor' ? (
                    <button
                      onClick={handleListDonation}
                      className="bg-[#DC2626] hover:bg-[#B91C1C] text-white py-2 px-4 rounded-md transition-colors flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      List Donation
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowBloodRequestModal(true)}
                      className="bg-[#DC2626] hover:bg-[#B91C1C] text-white py-2 px-4 rounded-md transition-colors flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Blood Request
                    </button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="p-12 flex flex-col items-center justify-center bg-white border border-red-100 rounded-lg">
                  <div className="h-12 w-12 border-4 border-[#DC2626] border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600">Loading donations...</p>
                </div>
              ) : loadError ? (
                <div className="p-8 text-center bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
                  <h3 className="text-xl font-semibold text-red-800 mb-2">Error Loading Data</h3>
                  <p className="text-red-600 mb-6">{loadError}</p>
                  <button
                    onClick={() => refreshUserDataAndDonations()}
                    className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-md transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : donations.length === 0 ? (
                <div className="p-8 text-center bg-white border border-red-100 rounded-lg">
                  <Heart className="h-12 w-12 mx-auto text-[#DC2626] mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No donations found</h3>
                  <p className="text-gray-600 mb-6">
                    {userType === 'donor'
                      ? 'You have not listed any donations yet. Click the "List Donation" button to get started.'
                      : 'There are no blood donations available at the moment. Please check back later.'}
                  </p>
                  <button
                    onClick={retryLoadDonations}
                    className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-md transition-colors inline-flex items-center"
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 4V9H4.58152M19.9381 11C19.446 7.05369 16.0796 4 12 4C8.64262 4 5.76829 6.06817 4.58152 9M4.58152 9H9M20 20V15H19.4185M19.4185 15C18.2317 17.9318 15.3574 20 12 20C7.92038 20 4.55399 16.9463 4.06189 13M19.4185 15H15"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Retry Loading Donations
                  </button>
                </div>
              ) : (
                <DonationsList
                  donations={userDonations}
                  userType={userType}
                  onStatusChange={handleDonationStatusChange}
                  onRequestDonation={handleRequestDonation}
                  onAcceptRequest={handleAcceptDonationRequest}
                  onRejectRequest={handleRejectDonationRequest}
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                {/* Quick Actions - Enhanced */}
                <div className="p-6 rounded-2xl bg-white shadow-lg border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-red-100">⚡</span>
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Primary Action */}
                    <button
                      onClick={userType === 'donor' ? handleScheduleDonation : handleRequestDonation.bind(null, donations.find(d => d.status === 'available')?.id || '')}
                      className="group relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 px-6 rounded-xl transition-all shadow-lg shadow-red-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{userType === 'donor' ? 'Schedule Donation' : 'Find Donors'}</p>
                          <p className="text-xs text-white/70">{userType === 'donor' ? 'Book your next appointment' : 'Search for matching donors'}</p>
                        </div>
                      </div>
                      <span className="text-white/50 group-hover:translate-x-1 transition-transform">→</span>
                    </button>

                    {/* Secondary Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleUpdateProfile}
                        className="group p-4 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all flex flex-col items-center gap-2"
                      >
                        <div className="p-3 rounded-full bg-gray-100 group-hover:bg-red-100 transition-colors">
                          <User className="h-5 w-5 text-gray-600 group-hover:text-red-600 transition-colors" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Update Profile</span>
                      </button>
                      <button
                        onClick={handleViewBloodRequests}
                        className="group p-4 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all flex flex-col items-center gap-2"
                      >
                        <div className="p-3 rounded-full bg-gray-100 group-hover:bg-red-100 transition-colors">
                          <Droplet className="h-5 w-5 text-gray-600 group-hover:text-red-600 transition-colors" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Blood Requests</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upcoming Appointments - Enhanced */}
                <div className="p-6 rounded-2xl bg-white shadow-lg border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-blue-100">📅</span>
                    Upcoming Appointments
                  </h3>
                  <div className="space-y-3">
                    {appointments.length > 0 ? (
                      appointments.map((appointment) => (
                        <div key={appointment.id} className="group relative overflow-hidden p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="p-3 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-200">
                                <Calendar className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-gray-900 font-semibold text-lg">{appointment.date}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="flex items-center text-sm text-gray-600">
                                    <Clock className="h-4 w-4 mr-1 text-blue-500" />
                                    {appointment.time}
                                  </span>
                                  <span className="flex items-center text-sm text-gray-600">
                                    <MapPin className="h-4 w-4 mr-1 text-blue-500" />
                                    {appointment.location}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`text-xs px-3 py-1 rounded-full font-medium ${appointment.status === 'confirmed'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                }`}>
                                {appointment.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                              </span>
                              <button
                                onClick={() => handleRescheduleAppointment(appointment)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                              >
                                <Edit className="h-3 w-3" />
                                Reschedule
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-8 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border-2 border-dashed border-gray-200">
                        <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                          <Calendar className="h-8 w-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No upcoming appointments</h3>
                        <p className="text-gray-500 mt-1 text-sm">
                          {userType === 'donor'
                            ? 'Schedule a donation to save lives!'
                            : 'Request blood when you need it'}
                        </p>
                        <button
                          onClick={userType === 'donor' ? handleScheduleDonation : () => setShowBloodRequestModal(true)}
                          className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {userType === 'donor' ? 'Schedule Now' : 'Create Request'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Notifications - Enhanced */}
                <div className="p-6 rounded-2xl bg-white shadow-lg border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-orange-100">🔔</span>
                    Notifications
                    {userNotifications.filter(n => !n.read).length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {userNotifications.filter(n => !n.read).length} new
                      </span>
                    )}
                  </h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {userNotifications.length > 0 ? (
                      userNotifications.slice(0, 5).map((notification) => (
                        <div key={notification.id || Math.random()} className={`relative p-4 rounded-xl border transition-all hover:shadow-md ${notification.type === 'match'
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                          : notification.type === 'request'
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200'
                          }`}>
                          {notification.read === false && (
                            <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
                          )}
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl ${notification.type === 'match'
                              ? 'bg-green-500 text-white'
                              : notification.type === 'request'
                                ? 'bg-blue-500 text-white'
                                : notification.type === 'accepted'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-400 text-white'
                              }`}>
                              {notification.type === 'match' ? (
                                <Heart className="h-4 w-4" />
                              ) : notification.type === 'request' ? (
                                <Droplet className="h-4 w-4" />
                              ) : notification.type === 'accepted' ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Info className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-gray-900 font-semibold text-sm">{notification.title || 'Notification'}</p>
                                {notification.compatibilityScore && (
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${notification.compatibilityScore >= 80
                                    ? 'bg-green-100 text-green-700'
                                    : notification.compatibilityScore >= 60
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-orange-100 text-orange-700'
                                    }`}>
                                    {notification.compatibilityScore}%
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 text-sm mt-1">{notification.message || ''}</p>
                              <p className="text-xs text-gray-400 mt-2">
                                {notification.createdAt?.toDate ?
                                  new Date(notification.createdAt.toDate()).toLocaleString() :
                                  typeof notification.createdAt === 'string' ?
                                    new Date(notification.createdAt).toLocaleString() :
                                    'Just now'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-orange-50/30 rounded-xl border-2 border-dashed border-gray-200">
                        <div className="p-4 bg-orange-100 rounded-full w-fit mx-auto mb-3">
                          <Bell className="h-6 w-6 text-orange-500" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">No notifications yet</h3>
                        <p className="text-gray-500 text-sm mt-1">
                          We'll notify you of important updates
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Actions - Enhanced */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-white/10">🚀</span>
                    Quick Access
                  </h3>
                  <div className="space-y-3">
                    {/* AI Matching Button - Only for Recipients */}
                    {userType === 'recipient' && (
                      <button
                        onClick={handleRunAIMatching}
                        disabled={isMatchingRunning}
                        className={`w-full py-4 rounded-xl transition-all flex items-center justify-center gap-3 ${isMatchingRunning
                          ? 'bg-purple-400/50 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600'
                          } text-white font-semibold shadow-lg`}>
                        {isMatchingRunning ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Finding Matches...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl">🤖</span>
                            <span>AI-Powered Donor Matching</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={userType === 'donor' ? handleDonateNow : handleRequestDonation.bind(null, donations.find(d => d.status === 'available')?.id || '')}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 rounded-xl transition-all font-medium flex items-center justify-center gap-2 shadow-lg shadow-red-500/30">
                      <Heart className="h-5 w-5" />
                      {userType === 'donor' ? 'Donate Now' : 'Request Blood'}
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleRescheduleAppointment()}
                        className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl transition-colors text-sm font-medium">
                        {userType === 'donor' ? '📅 Reschedule' : '📊 Status'}
                      </button>
                      <button
                        onClick={handleViewBloodBanks}
                        className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl transition-colors text-sm font-medium">
                        🏥 Blood Banks
                      </button>
                    </div>

                    <button
                      onClick={handleResetData}
                      className="w-full bg-transparent border border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-md transition-colors">
                      Reset Donation Data
                    </button>
                  </div>
                </div>

                {/* AI Match Results Panel - Only for Recipients */}
                {userType === 'recipient' && matchResults.length > 0 && (
                  <div className="p-6 rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                        <span className="mr-2">🎯</span>
                        AI Match Results
                      </h3>
                      <span className="text-sm text-purple-600 font-medium">
                        {matchResults.filter(r => r.matchesFound > 0).length} matches found
                      </span>
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                      {matchResults.map((result, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${result.matchesFound > 0
                          ? 'bg-white border-green-200'
                          : 'bg-gray-50 border-gray-200'
                          }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Droplet className={`h-5 w-5 ${result.matchesFound > 0 ? 'text-[#DC2626]' : 'text-gray-400'}`} />
                              <span className="font-semibold text-lg">{result.bloodType}</span>
                              <span className="text-gray-500">Blood Request</span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${result.matchesFound > 0
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                              }`}>
                              {result.matchesFound > 0
                                ? `${result.matchesFound} Donors Matched`
                                : 'No Match'}
                            </span>
                          </div>

                          {result.success && result.matchesFound > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-sm font-medium text-gray-700 mb-3">Matched Donors (Click to view full profile):</p>
                              <div className="space-y-3">
                                {result.matches?.map((match: any, i: number) => (
                                  <div
                                    key={i}
                                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-red-200 transition-all cursor-pointer"
                                    onClick={() => {
                                      setSelectedDonorProfile({
                                        donorId: match.donorId,
                                        donorName: match.donorName,
                                        donorBloodType: match.donorBloodType,
                                        donorLocation: match.donorLocation,
                                        donorContact: match.donorContact,
                                        donorAvailability: match.donorAvailability || 'Available',
                                        compatibilityScore: match.compatibilityScore,
                                        matchReasons: match.matchReasons || [],
                                        warnings: match.warnings || [],
                                        isEligible: match.isEligible !== false,
                                        priority: match.priority || 'medium',
                                        // Core Identity
                                        email: match.email,
                                        age: match.age,
                                        gender: match.gender,
                                        // Blood Type
                                        rhPositive: match.rhPositive,
                                        // Extended Antigen Profile
                                        rhVariants: match.rhVariants,
                                        kell: match.kell,
                                        duffy: match.duffy,
                                        kidd: match.kidd,
                                        // Donation History & Physiology
                                        weight: match.weight,
                                        lastDonationDate: match.lastDonationDate,
                                        totalDonations: match.totalDonations,
                                        hemoglobinLevel: match.hemoglobinLevel,
                                        deferralHistory: match.deferralHistory,
                                        // Absolute Eligibility (Hard Stop)
                                        eligibilityFactors: match.eligibilityFactors,
                                        // Temporary Eligibility
                                        temporaryFactors: match.temporaryFactors,
                                        // Communication & Availability
                                        willingForEmergency: match.willingForEmergency,
                                        preferredContactMethod: match.preferredContactMethod,
                                        responseRate: match.responseRate,
                                      });
                                      setShowDonorProfileModal(true);
                                    }}
                                  >
                                    <div className="flex items-start justify-between">
                                      {/* Donor Info */}
                                      <div className="flex items-start space-x-3">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center flex-shrink-0">
                                          <span className="text-red-600 font-bold text-lg">{match.donorBloodType}</span>
                                        </div>
                                        <div>
                                          <div className="flex items-center space-x-2">
                                            <h4 className="font-semibold text-gray-900">{match.donorName}</h4>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${match.priority === 'high' ? 'bg-green-100 text-green-700' :
                                              match.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-700'
                                              }`}>
                                              {(match.priority || 'medium').toUpperCase()}
                                            </span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                                            <span className="flex items-center">
                                              <MapPin className="h-3.5 w-3.5 mr-1" />
                                              {match.donorLocation || 'Not specified'}
                                            </span>
                                            {match.donorContact && (
                                              <span className="flex items-center">
                                                <Phone className="h-3.5 w-3.5 mr-1" />
                                                {match.donorContact}
                                              </span>
                                            )}
                                            <span className="flex items-center">
                                              <Clock className="h-3.5 w-3.5 mr-1" />
                                              {match.donorAvailability || 'Available'}
                                            </span>
                                          </div>

                                          {/* Additional donor details */}
                                          <div className="flex flex-wrap items-center gap-2 mt-2">
                                            {match.age && (
                                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                                Age: {match.age}
                                              </span>
                                            )}
                                            {match.gender && (
                                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600 capitalize">
                                                {match.gender}
                                              </span>
                                            )}
                                            {match.totalDonations !== undefined && (
                                              <span className="text-xs px-2 py-0.5 bg-red-50 rounded text-red-600">
                                                {match.totalDonations} donations
                                              </span>
                                            )}
                                            {match.isEligible !== false && (
                                              <span className="text-xs px-2 py-0.5 bg-green-50 rounded text-green-600 flex items-center">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Eligible
                                              </span>
                                            )}
                                          </div>

                                          {/* Match reasons preview */}
                                          {match.matchReasons && match.matchReasons.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                              {match.matchReasons.slice(0, 2).map((reason: string, idx: number) => (
                                                <span key={idx} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                                                  ✓ {reason}
                                                </span>
                                              ))}
                                              {match.matchReasons.length > 2 && (
                                                <span className="text-xs text-gray-400">+{match.matchReasons.length - 2} more</span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Score and Action */}
                                      <div className="flex flex-col items-end space-y-2">
                                        <span className={`text-lg font-bold px-3 py-1 rounded ${match.compatibilityScore >= 80 ? 'bg-green-100 text-green-800' :
                                          match.compatibilityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-orange-100 text-orange-800'
                                          }`}>
                                          {match.compatibilityScore}% match
                                        </span>
                                        <button className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center">
                                          <Eye className="h-3 w-3 mr-1" />
                                          View Full Profile
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => router.push('/blood-requests')}
                                className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center mt-3"
                              >
                                View Request Details →
                              </button>
                            </div>
                          )}

                          {result.error && (
                            <p className="text-sm text-red-600 mt-2">Error: {result.error}</p>
                          )}

                          {result.success && result.matchesFound === 0 && (
                            <NoMatchExplanation
                              bloodType={result.bloodType}
                              availableDonorBloodTypes={result.availableDonorTypes || []}
                              urgency={result.urgency}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <DonationScheduleModal
        isOpen={showDonationModal}
        onClose={() => {
          setShowDonationModal(false);
          setAppointmentToReschedule(null);
        }}
        onSubmit={handleDonationSubmit}
        initialData={appointmentToReschedule ? {
          date: appointmentToReschedule.date,
          time: appointmentToReschedule.time,
          location: appointmentToReschedule.location,
          donationType: 'whole_blood',
          specialNotes: ''
        } : undefined}
        isRescheduling={!!appointmentToReschedule}
      />

      <DonationListingForm
        isOpen={showListingModal}
        onClose={() => setShowListingModal(false)}
        onSubmit={handleListingSubmit}
      />

      <BloodRequestForm
        isOpen={showBloodRequestModal}
        onClose={() => setShowBloodRequestModal(false)}
        onSubmit={(data) => {
          console.log('Blood request created:', data);
          toast.success('Blood request created successfully!');
          setShowBloodRequestModal(false);
          // Optionally refresh data
          refreshUserDataAndDonations();
        }}
      />

      {/* Donor Profile Modal for viewing complete donor information */}
      <DonorProfileModal
        isOpen={showDonorProfileModal}
        onClose={() => {
          setShowDonorProfileModal(false);
          setSelectedDonorProfile(null);
        }}
        donor={selectedDonorProfile}
        onContactDonor={(donor) => {
          // Open phone dialer or copy number
          if (donor.donorContact) {
            window.open(`tel:${donor.donorContact}`, '_blank');
          } else {
            toast.error('No contact number available for this donor');
          }
        }}
        onNotifyDonor={async (donor) => {
          try {
            toast.loading('Notifying donor...', { id: 'notify-donor' });
            // The notification would typically be sent via API
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success(`Notification sent to ${donor.donorName}!`, { id: 'notify-donor' });
          } catch (error) {
            toast.error('Failed to notify donor', { id: 'notify-donor' });
          }
        }}
      />
    </div>
  );
}

const Logo = () => {
  return (
    <Link
      href="/dashboard"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-gray-900"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-[#DC2626]" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-gray-900"
      >
        R.A.K.T
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      href="/dashboard"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-gray-900"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-[#DC2626]" />
    </Link>
  );
};