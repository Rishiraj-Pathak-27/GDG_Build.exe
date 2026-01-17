import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { get, ref, set, update, push as rtdbPush, push } from 'firebase/database';
import { auth, db, rtdb } from './firebase-config';
import { User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Base API URL
const API_BASE_URL = 'http://localhost:8082';

// Auth token management is handled by Firebase Authentication
const TOKEN_KEY = 'auth_token';

// Check if user is authenticated using Firebase Auth
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};

// Get current user info
export const getCurrentUser = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      return {
        ...userDoc.data(),
        uid: currentUser.uid,
        email: currentUser.email
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

// Authentication API
export const authAPI = {
  register: async (userData: any) => {
    try {
      const { email, password, ...profileData } = userData;

      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create a valid full name from first and last name
      const fullName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || 'Anonymous User';

      // Save profile data to Firestore with sanitized properties
      const sanitizedProfileData = {
        ...profileData,
        // Add these required fields with default values
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        name: fullName, // Explicitly add the name field
        email,
        createdAt: Timestamp.now(),
        role: userData.role || 'donor',
      };

      // Save to Firestore with the name field explicitly set
      await setDoc(doc(db, 'users', user.uid), sanitizedProfileData);

      // Save to Realtime DB for online status - explicitly set name
      const rtdbUserData = {
        name: fullName, // Use the same fullName value
        email,
        bloodType: profileData.bloodType || 'Unknown',
        online: true,
        lastActive: new Date().toISOString()
      };

      console.log("Saving user to RTDB with data:", rtdbUserData);
      await set(ref(rtdb, `users/${user.uid}`), rtdbUserData);

      // Add to blood type group (only if bloodType is defined)
      if (profileData.bloodType) {
        await set(ref(rtdb, `bloodGroups/${profileData.bloodType}/${user.uid}`), true);
      }

      return {
        user: {
          uid: user.uid,
          email: user.email
        }
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  login: async (credentials: { email: string; password: string }) => {
    try {
      // Add device info to the login request
      const deviceInfo = {
        ...getBrowserInfo()
      };

      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      const user = userCredential.user;

      // Update user's last login and device info
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: Timestamp.now(),
        lastDevice: deviceInfo
      });

      // Update online status in Realtime Database
      await update(ref(rtdb, `users/${user.uid}`), {
        online: true,
        lastActive: new Date().toISOString()
      });

      return {
        user: {
          uid: user.uid,
          email: user.email
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: async () => {
    const user = auth.currentUser;

    if (user) {
      // Update online status before signing out
      await update(ref(rtdb, `users/${user.uid}`), {
        online: false,
        lastActive: new Date().toISOString()
      });
    }

    return signOut(auth);
  }
};

// Helper function to get browser and device information
const getBrowserInfo = (): any => {
  if (typeof window === 'undefined') return { device: 'server' };

  const userAgent = window.navigator.userAgent;
  return {
    userAgent,
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    device: detectDevice(userAgent),
    time: new Date().toISOString()
  };
};

// Simple browser detection
const detectBrowser = (userAgent: string): string => {
  if (userAgent.indexOf("Firefox") > -1) return "Firefox";
  if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) return "Opera";
  if (userAgent.indexOf("Edge") > -1) return "Edge";
  if (userAgent.indexOf("Chrome") > -1) return "Chrome";
  if (userAgent.indexOf("Safari") > -1) return "Safari";
  if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident") > -1) return "Internet Explorer";
  return "Unknown";
};

// Simple OS detection
const detectOS = (userAgent: string): string => {
  if (userAgent.indexOf("Windows") > -1) return "Windows";
  if (userAgent.indexOf("Mac") > -1) return "MacOS";
  if (userAgent.indexOf("Linux") > -1) return "Linux";
  if (userAgent.indexOf("Android") > -1) return "Android";
  if (userAgent.indexOf("iOS") > -1 || userAgent.indexOf("iPhone") > -1 || userAgent.indexOf("iPad") > -1) return "iOS";
  return "Unknown";
};

// Simple device detection
const detectDevice = (userAgent: string): string => {
  if (userAgent.indexOf("Mobile") > -1) return "Mobile";
  if (userAgent.indexOf("Tablet") > -1) return "Tablet";
  return "Desktop";
};

// User API
export const userAPI = {
  getProfile: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('User profile not found');

    return {
      ...userDoc.data(),
      uid: user.uid,
      email: user.email
    };
  },

  getAllUsers: async () => {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  getDonorsByBloodType: async (bloodType: string) => {
    const donorsQuery = query(
      collection(db, 'users'),
      where('bloodType', '==', bloodType),
      where('role', '==', 'donor')
    );

    const donorsSnapshot = await getDocs(donorsQuery);
    return donorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  updateProfile: async (userData: any) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    // Update Firestore document
    await updateDoc(doc(db, 'users', user.uid), {
      ...userData,
      updatedAt: Timestamp.now()
    });

    // Update relevant fields in Realtime Database
    const rtdbUpdate: any = {};
    if (userData.name) rtdbUpdate.name = userData.name;
    if (userData.bloodType) rtdbUpdate.bloodType = userData.bloodType;

    await update(ref(rtdb, `users/${user.uid}`), rtdbUpdate);

    // If blood type changed, update blood group memberships
    if (userData.bloodType && userData.previousBloodType && userData.previousBloodType !== userData.bloodType) {
      // Remove from old blood group
      await set(ref(rtdb, `bloodGroups/${userData.previousBloodType}/${user.uid}`), null);
      // Add to new blood group
      await set(ref(rtdb, `bloodGroups/${userData.bloodType}/${user.uid}`), true);
    }

    return { success: true };
  },

  updateRole: async (role: 'donor' | 'recipient'): Promise<void> => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      // Standardize role to uppercase for consistency
      const roleUppercase = role.toUpperCase();

      // Update Firestore directly instead of using API endpoint
      await updateDoc(doc(db, 'users', user.uid), {
        role: roleUppercase,
        updatedAt: Timestamp.now()
      });

      // Update realtime database as well
      await update(ref(rtdb, `users/${user.uid}`), {
        role: roleUppercase,
        updatedAt: new Date().toISOString()
      });

      console.log(`User role updated to ${roleUppercase}`);

      // Also store local token for API auth if needed
      localStorage.setItem('userRole', roleUppercase);
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }
};

// Blood Request API
export const bloodRequestAPI = {
  getAllRequests: async () => {
    const requestsSnapshot = await getDocs(
      query(collection(db, 'requests'), orderBy('createdAt', 'desc'))
    );

    return requestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  createRequest: async (requestData: any) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const newRequest = {
      ...requestData,
      userId: user.uid,
      userEmail: user.email,
      status: 'pending',
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'requests'), newRequest);

    // Also add to realtime database for notifications
    await set(ref(rtdb, `requests/${docRef.id}`), {
      ...newRequest,
      id: docRef.id,
      createdAt: new Date().toISOString()
    });

    return {
      id: docRef.id,
      ...newRequest
    };
  },

  acceptRequest: async (requestId: string, donorId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    // Update request in Firestore
    await updateDoc(doc(db, 'requests', requestId), {
      status: 'accepted',
      donorId: donorId,
      acceptedAt: Timestamp.now()
    });

    // Update in Realtime Database
    await update(ref(rtdb, `requests/${requestId}`), {
      status: 'accepted',
      donorId: donorId,
      acceptedAt: new Date().toISOString()
    });

    return { success: true };
  },

  getMyRequests: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const myRequestsQuery = query(
      collection(db, 'requests'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const requestsSnapshot = await getDocs(myRequestsQuery);
    return requestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
};

// Donation API
export const donationAPI = {
  // Get all available donations - improved error handling
  getAvailableDonations: async () => {
    try {
      console.log("Getting available donations from Firestore");
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      // First check if the collection exists
      const donationsRef = collection(db, 'donations');
      const q = query(donationsRef, where('status', '==', 'available'), limit(100));

      console.log("Executing getAvailableDonations query...");
      const donationsSnapshot = await getDocs(q);

      console.log(`Found ${donationsSnapshot.size} available donations`);

      // Map the data with error handling
      const donations = donationsSnapshot.docs.map(doc => {
        try {
          const data = doc.data();
          return {
            id: doc.id,
            donorId: data.donorId || '',
            donorName: data.donorName || 'Anonymous',
            bloodType: data.bloodType || 'Unknown',
            contactNumber: data.contactNumber || 'N/A',
            availability: data.availability || 'N/A',
            location: data.location || 'N/A',
            additionalInfo: data.additionalInfo || '',
            status: data.status || 'available',
            recipientId: data.recipientId || '',
            createdAt: data.createdAt?.toDate?.() || new Date(),
            listedOn: data.listedOn || new Date().toISOString()
          };
        } catch (err) {
          console.error("Error processing donation document:", err, doc.id);
          return null;
        }
      }).filter(Boolean); // Remove any nulls

      console.log("Processed donations:", donations.length);
      return donations;
    } catch (error) {
      console.error("Error in getAvailableDonations:", error);
      throw error; // Rethrow to let the UI handle it
    }
  },

  // Get current user's donations (as donor) - with improved error handling
  getMyDonations: async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      console.log("Getting donations for user:", user.uid);

      // Query Firestore for donations where donorId equals the current user's ID
      const donationsRef = collection(db, 'donations');
      const q = query(
        donationsRef,
        where('donorId', '==', user.uid)
      );

      console.log("Executing Firestore query for user donations associated with uid:", user.uid);
      const querySnapshot = await getDocs(q);
      console.log("Query complete, documents found:", querySnapshot.size);

      if (querySnapshot.empty) {
        console.warn(`No donations found for donorId: ${user.uid}. Check if 'donorId' field matches.`);
      }

      // Convert query snapshot to array of donation objects with better error handling
      const donations = querySnapshot.docs.map(doc => {
        try {
          const data = doc.data();
          return {
            id: doc.id,
            donorId: data.donorId || '',
            donorName: data.donorName || 'Anonymous',
            bloodType: data.bloodType || 'Unknown',
            contactNumber: data.contactNumber || 'N/A',
            availability: data.availability || 'N/A',
            location: data.location || 'N/A',
            additionalInfo: data.additionalInfo || '',
            status: data.status || 'available',
            recipientId: data.recipientId || '',
            createdAt: data.createdAt?.toDate?.() || new Date(),
            listedOn: data.listedOn || new Date().toISOString()
          };
        } catch (err) {
          console.error("Error processing donation document:", err, doc.id);
          return null;
        }
      }).filter(Boolean); // Remove any null items

      console.log("Parsed donations:", donations.length);
      return donations;
    } catch (error) {
      console.error("Error getting user donations:", error);
      throw error; // Rethrow so UI knows it failed
    }
  },

  // Create a new donation listing - improved error handling and structure
  createDonation: async (donationData: any) => {
    try {
      // First check if the user is authenticated
      const user = auth.currentUser;
      if (!user) {
        console.error("Authentication error: No user is signed in");
        throw new Error('Not authenticated. Please sign in again.');
      }

      // Get user profile to check role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found. Please complete your profile first.');
      }

      const userData = userDoc.data();

      // Always update the role to DONOR before attempting to create a donation
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          role: 'DONOR',
          updatedAt: Timestamp.now()
        });
      } catch (roleError) {
        console.error("Error updating role:", roleError);
        // Continue anyway - the donation might still work
      }

      // Ensure we have all required fields
      if (!donationData.bloodType) throw new Error("Blood type is required");
      if (!donationData.contactNumber) throw new Error("Contact number is required");
      if (!donationData.availability) throw new Error("Availability is required");
      if (!donationData.location) throw new Error("Location is required");

      // Prepare donor name using first and last name if available
      const donorName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Anonymous';

      // Generate a unique clientId that combines multiple approaches to ensure uniqueness
      const clientId = donationData.submissionId ||
        `${user.uid}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create a hash of the donation data to detect duplicates with similar content
      const contentHash = hashDonationContent({
        bloodType: donationData.bloodType,
        contactNumber: donationData.contactNumber,
        availability: donationData.availability,
        location: donationData.location,
        additionalInfo: donationData.additionalInfo || "",
        donorId: user.uid
      });

      // Create the donation document with proper time fields
      // Exclude submissionId from the saved document
      const { submissionId, ...otherDonationData } = donationData;

      const newDonation = {
        ...otherDonationData, // Spread all other fields (age, gender, rhVariants, eligibility flags, etc.)
        status: 'available',
        donorId: user.uid,
        donorName: donorName,
        donorEmail: user.email,
        createdAt: Timestamp.now(),
        listedOn: new Date().toISOString(),
        updatedAt: Timestamp.now(),
        clientId: clientId,
        contentHash: contentHash
      };

      // Handle index errors more gracefully when checking for duplicates
      try {
        // Check for duplicates - first by clientId
        const donationsRef = collection(db, 'donations');

        console.log(`Checking for existing donation with clientId: ${clientId}`);
        let existingQuery = query(
          donationsRef,
          where('clientId', '==', clientId),
          limit(1)
        );

        let existingDocs = await getDocs(existingQuery);

        // If no duplicates by clientId, also check for contentHash for recent donations
        if (existingDocs.empty) {
          try {
            console.log(`Checking for similar donation with contentHash: ${contentHash}`);

            // Check donations from this user with the same content in the last 5 minutes
            const fiveMinutesAgo = new Date();
            fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

            existingQuery = query(
              donationsRef,
              where('donorId', '==', user.uid),
              where('contentHash', '==', contentHash),
              where('createdAt', '>', Timestamp.fromDate(fiveMinutesAgo)),
              limit(1)
            );

            existingDocs = await getDocs(existingQuery);
          } catch (indexError) {
            console.warn("Index error during content hash check - proceeding with creation:", indexError);
            // Skip the content hash check if the index isn't ready
            // Use a new query without the problematic filters to get a valid QuerySnapshot
            existingQuery = query(
              donationsRef,
              where('donorId', '==', user.uid),
              limit(0)
            );
            existingDocs = await getDocs(existingQuery);
          }
        }

        // Return existing donation if found to prevent duplicate
        if (!existingDocs.empty) {
          console.log("Duplicate donation detected, returning existing entry");
          const existingDoc = existingDocs.docs[0];
          return {
            id: existingDoc.id,
            ...existingDoc.data()
          };
        }
      } catch (indexError) {
        console.warn("Error during duplicate checks - proceeding with creation:", indexError);
        // Continue with donation creation even if the index checks fail
      }

      // Save to Firestore if no duplicate found or if duplicate checks failed
      console.log("Creating new donation document");
      const docRef = await addDoc(collection(db, 'donations'), newDonation);
      console.log("Donation document created with ID:", docRef.id);

      // Return the created document with ID and donor info
      return {
        id: docRef.id,
        ...newDonation
      };
    } catch (error: any) {
      console.error("Error creating donation:", error);
      throw error;
    }
  },

  // Request a donation as a recipient
  requestDonation: async (donationId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      // Get user data for the recipient name
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;

      // Update donation status to 'pending' instead of 'requested'
      await updateDoc(doc(db, 'donations', donationId), {
        status: 'pending', // Changed from 'requested' to 'pending'
        recipientId: user.uid,
        recipientEmail: user.email,
        recipientName: userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}` : user.displayName || 'Anonymous Recipient',
        requestedAt: Timestamp.now()
      });

      // Add a notification for the donor
      try {
        const donationDoc = await getDoc(doc(db, 'donations', donationId));
        if (donationDoc.exists()) {
          const donationData = donationDoc.data();
          const donorId = donationData.donorId;

          // Create notification in Firestore
          await addDoc(collection(db, 'notifications'), {
            userId: donorId,
            type: 'request',
            title: 'New Donation Request',
            message: `Someone has requested your ${donationData.bloodType} blood donation.`,
            donationId: donationId,
            read: false,
            createdAt: Timestamp.now()
          });

          // Also add to realtime database for immediate delivery
          await rtdbPush(ref(rtdb, `users/${donorId}/notifications`), {
            type: 'request',
            title: 'New Donation Request',
            message: `Someone has requested your ${donationData.bloodType} blood donation.`,
            donationId: donationId,
            read: false,
            createdAt: new Date().toISOString()
          });
        }

        // Dispatch event to refresh UI
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            console.log("Dispatching donation-data-changed event after request");
            window.dispatchEvent(new CustomEvent('donation-data-changed'));
          }
        }, 1000);
      } catch (error) {
        console.error("Error creating notification:", error);
        // Continue anyway since the request was successful
      }

      return { success: true };
    } catch (error) {
      console.error("Error requesting donation:", error);
      throw error;
    }
  },

  // Reject a donation request (donor rejects)
  rejectDonationRequest: async (donationId: string, recipientId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      // Verify user is the donor
      const donationDoc = await getDoc(doc(db, 'donations', donationId));
      if (!donationDoc.exists()) throw new Error('Donation not found');

      const donationData = donationDoc.data();
      if (donationData.donorId !== user.uid) throw new Error('Only the donor can reject this request');

      // Update donation status back to available
      await updateDoc(doc(db, 'donations', donationId), {
        status: 'available',
        recipientId: null,
        recipientEmail: null,
        recipientName: null,
        requestedAt: null
      });

      // Create notification for the recipient
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;
        const donorName = userData && userData.firstName ?
          `${userData.firstName} ${userData.lastName || ''}` :
          user.displayName || 'A donor';

        // Create notification in Firestore
        await addDoc(collection(db, 'notifications'), {
          userId: recipientId,
          type: 'rejected',
          title: 'Donation Request Rejected',
          message: `${donorName} has declined your blood donation request.`,
          donationId: donationId,
          read: false,
          createdAt: Timestamp.now()
        });

        // Also add to realtime database for immediate delivery
        await rtdbPush(ref(rtdb, `users/${recipientId}/notifications`), {
          type: 'rejected',
          title: 'Donation Request Rejected',
          message: `${donorName} has declined your blood donation request.`,
          donationId: donationId,
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error creating notification:", error);
        // Continue anyway since the rejection was successful
      }

      // Dispatch event to refresh UI
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          console.log("Dispatching donation-data-changed event");
          window.dispatchEvent(new CustomEvent('donation-data-changed'));
        }
      }, 1000);

      return { success: true };
    } catch (error) {
      console.error("Error rejecting donation request:", error);
      throw error;
    }
  },

  // Accept a donation request (donor accepts a recipient's request)
  acceptDonationRequest: async (donationId: string, recipientId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    // Verify user is the donor
    const donationDoc = await getDoc(doc(db, 'donations', donationId));
    if (!donationDoc.exists()) throw new Error('Donation not found');

    const donationData = donationDoc.data();
    if (donationData.donorId !== user.uid) throw new Error('Only the donor can accept this request');

    // Update donation status
    await updateDoc(doc(db, 'donations', donationId), {
      status: 'accepted',
      acceptedAt: Timestamp.now()
    });

    // Create notification for the recipient
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      const donorName = userData && userData.firstName ?
        `${userData.firstName} ${userData.lastName || ''}` :
        user.displayName || 'A donor';

      // Create notification in Firestore
      await addDoc(collection(db, 'notifications'), {
        userId: recipientId,
        type: 'accepted',
        title: 'Donation Request Accepted',
        message: `${donorName} has accepted your blood donation request.`,
        donationId: donationId,
        read: false,
        createdAt: Timestamp.now()
      });

      // Also add to realtime database for immediate delivery
      await rtdbPush(ref(rtdb, `users/${recipientId}/notifications`), {
        type: 'accepted',
        title: 'Donation Request Accepted',
        message: `${donorName} has accepted your blood donation request.`,
        donationId: donationId,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error creating notification:", error);
      // Continue anyway since the acceptance was successful
    }

    // Dispatch event to refresh UI
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        console.log("Dispatching donation-data-changed event");
        window.dispatchEvent(new CustomEvent('donation-data-changed'));
      }
    }, 1000);

    return { success: true };
  },

  // Confirm a donation (donor confirms)
  confirmDonation: async (donationId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    // Verify user is the donor
    const donationDoc = await getDoc(doc(db, 'donations', donationId));
    if (!donationDoc.exists()) throw new Error('Donation not found');

    const donationData = donationDoc.data();
    if (donationData.donorId !== user.uid) throw new Error('Only the donor can confirm this donation');

    await updateDoc(doc(db, 'donations', donationId), {
      status: 'completed',
      completedAt: Timestamp.now()
    });

    // Dispatch event to refresh UI
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        console.log("Dispatching donation-data-changed event");
        window.dispatchEvent(new CustomEvent('donation-data-changed'));
      }
    }, 1000);

    return { success: true };
  },

  // Cancel a donation request (recipient cancels)
  cancelRequest: async (donationId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    // Verify user is the recipient
    const donationDoc = await getDoc(doc(db, 'donations', donationId));
    if (!donationDoc.exists()) throw new Error('Donation not found');

    const donationData = donationDoc.data();
    if (donationData.recipientId !== user.uid) throw new Error('Only the recipient can cancel this request');

    await updateDoc(doc(db, 'donations', donationId), {
      status: 'available',
      recipientId: null,
      recipientEmail: null,
      requestedAt: null
    });

    // Dispatch event to refresh UI
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        console.log("Dispatching donation-data-changed event");
        window.dispatchEvent(new CustomEvent('donation-data-changed'));
      }
    }, 1000);

    return { success: true };
  },

  // Get user's notifications
  getNotifications: async () => {
    try {
      const user = auth.currentUser;
      if (!user) return []; // Return empty array if not authenticated

      console.log("Fetching notifications for user:", user.uid);

      // Try to get notifications from Firestore first
      try {
        // Simplify the query to avoid the need for a complex index
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          // Remove orderBy for now until the index is created
          limit(50)
        );

        const notificationsSnapshot = await getDocs(notificationsQuery);
        let notificationsData = notificationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Array<{ id: string; createdAt?: { toDate?: () => Date } } & Record<string, any>>;

        // Sort in memory instead (less efficient but works without index)
        notificationsData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime(); // descending (newest first)
        });

        return notificationsData;
      } catch (firestoreError) {
        console.error("Error fetching notifications from Firestore:", firestoreError);

        // If Firestore fails, try real-time database as fallback
        try {
          console.log("Attempting to fetch notifications from Realtime DB as fallback");
          const notificationsRef = ref(rtdb, `users/${user.uid}/notifications`);
          const snapshot = await get(notificationsRef);

          if (snapshot.exists()) {
            // Convert realtime DB format to array
            const notificationsObj = snapshot.val();
            return Object.keys(notificationsObj).map(key => ({
              id: key,
              ...notificationsObj[key],
              // Ensure createdAt is a Firestore timestamp for compatibility
              createdAt: {
                toDate: () => new Date(notificationsObj[key].createdAt)
              }
            }));
          }
        } catch (rtdbError) {
          console.error("Fallback also failed:", rtdbError);
        }

        // If all fails, return empty array
        return [];
      }
    } catch (error) {
      console.error("Error in getNotifications:", error);
      return []; // Return empty array on error
    }
  },

  // Mark notification as read
  markNotificationAsRead: async (notificationId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });

    return { success: true };
  },

  getHospitalAppointments: async (hospitalId: string) => {
    try {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('hospitalId', '==', hospitalId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(appointmentsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching hospital appointments:', error);
      throw error;
    }
  },

  createBloodRequest: async (requestData: any) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const docRef = await addDoc(collection(db, 'bloodRequests'), {
        ...requestData,
        createdAt: Timestamp.now(),
        status: 'active'
      });

      // Create notification for matching donors
      const notificationData = {
        type: requestData.urgency === 'emergency' ? 'emergency' : 'request',
        title: `${requestData.urgency.toUpperCase()} Blood Request`,
        message: `${requestData.units} units of ${requestData.bloodType} blood needed at ${requestData.location}`,
        requestId: docRef.id,
        createdAt: Date.now()
      };

      // Add to blood type specific notification channel
      await push(ref(rtdb, `notifications/bloodType/${requestData.bloodType}`), notificationData);

      return {
        id: docRef.id,
        ...requestData
      };
    } catch (error) {
      console.error('Error creating blood request:', error);
      throw error;
    }
  },

  updateAppointmentStatus: async (appointmentId: string, status: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: status,
        updatedAt: Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  }
};

// Matching API - Uses Hugging Face model bhyulljz/MLModelTwo
export const matchingAPI = {
  // Find matching donors for a blood request
  findMatchingDonors: async (bloodRequest: any) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      console.log('Finding matching donors for blood request:', bloodRequest.id);
      console.log('Request blood type:', bloodRequest.bloodType);

      // Get all donations from Firestore (try multiple status values)
      const donationsRef = collection(db, 'donations');

      // First try to get available donations
      let donationsSnapshot = await getDocs(query(donationsRef, limit(100)));

      console.log(`Found ${donationsSnapshot.docs.length} total donations in database`);

      // Map donations to donor format
      const availableDonors = donationsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        console.log('Donation data:', docSnapshot.id, data.bloodType, data.status);
        return {
          id: docSnapshot.id,
          donorId: data.donorId || data.userId,
          donorName: data.donorName || data.name || 'Anonymous',
          bloodType: data.bloodType,
          location: data.location || data.city || '',
          contactNumber: data.contactNumber || data.phone || '',
          availability: data.availability || 'Available',
          age: data.age,
          gender: data.gender,
          weight: data.weight,
          rhVariants: data.rhVariants,
          kell: data.kell,
          duffy: data.duffy,
          kidd: data.kidd,
          lastDonationDate: data.lastDonationDate,
          hemoglobinLevel: data.hemoglobinLevel,
          totalDonations: data.totalDonations,
          willingForEmergency: data.willingForEmergency,
          // Hard stop eligibility factors
          hivStatus: data.hivStatus || false,
          hepatitisB: data.hepatitisB || false,
          hepatitisC: data.hepatitisC || false,
          htlv: data.htlv || false,
          ivDrugUse: data.ivDrugUse || false,
          // Temporary eligibility
          recentColdFlu: data.recentColdFlu || false,
          recentTattoo: data.recentTattoo || false,
          recentSurgery: data.recentSurgery || false,
          pregnant: data.pregnant || false,
          recentVaccination: data.recentVaccination || false,
          recentTravel: data.recentTravel || false,
        };
      }).filter(donor => donor.bloodType); // Only include donors with blood type

      console.log(`Found ${availableDonors.length} donors with blood types to check`);
      availableDonors.forEach(d => console.log(`  - ${d.donorName}: ${d.bloodType} at ${d.location}`));

      // If no donations, also check users collection for donors
      if (availableDonors.length === 0) {
        console.log('No donations found, checking users collection for donors...');
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(query(usersRef, where('role', '==', 'donor'), limit(100)));

        usersSnapshot.docs.forEach(docSnapshot => {
          const data = docSnapshot.data();
          if (data.bloodType) {
            availableDonors.push({
              id: docSnapshot.id,
              donorId: docSnapshot.id,
              donorName: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Anonymous',
              bloodType: data.bloodType,
              location: data.location || data.city || '',
              contactNumber: data.contactNumber || data.phone || '',
              availability: 'Available',
              age: data.age,
              gender: data.gender,
              weight: data.weight,
              rhVariants: data.rhVariants,
              kell: data.kell,
              duffy: data.duffy,
              kidd: data.kidd,
              lastDonationDate: data.lastDonationDate,
              hemoglobinLevel: data.hemoglobinLevel,
              totalDonations: data.totalDonations,
              willingForEmergency: data.willingForEmergency,
              hivStatus: false,
              hepatitisB: false,
              hepatitisC: false,
              htlv: false,
              ivDrugUse: false,
              recentColdFlu: false,
              recentTattoo: false,
              recentSurgery: false,
              pregnant: false,
              recentVaccination: false,
              recentTravel: false,
            });
          }
        });
        console.log(`Added ${availableDonors.length} donors from users collection`);
      }

      console.log(`Total ${availableDonors.length} available donors to match against`);

      // Call the matching API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientRequest: {
            id: bloodRequest.id,
            userId: bloodRequest.userId,
            userName: bloodRequest.userName,
            bloodType: bloodRequest.bloodType,
            urgency: bloodRequest.urgency,
            hospital: bloodRequest.hospital,
            location: bloodRequest.location,
            requiredBy: bloodRequest.requiredBy,
            units: bloodRequest.units,
            contactNumber: bloodRequest.contactNumber,
            age: bloodRequest.age,
            gender: bloodRequest.gender,
            patientWeight: bloodRequest.patientWeight,
            rhVariants: bloodRequest.rhVariants,
            kell: bloodRequest.kell,
            duffy: bloodRequest.duffy,
            kidd: bloodRequest.kidd,
            irradiatedBlood: bloodRequest.irradiatedBlood,
            cmvNegative: bloodRequest.cmvNegative,
            washedCells: bloodRequest.washedCells,
            leukocyteReduced: bloodRequest.leukocyteReduced,
          },
          availableDonors,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Matching API failed');
      }

      const matchingResult = await response.json();
      console.log('Matching result:', matchingResult);

      return matchingResult;
    } catch (error) {
      console.error('Error finding matching donors:', error);
      throw error;
    }
  },

  // Store match result in database
  storeMatchResult: async (matchResult: any) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      // Store in Firestore matches collection
      const matchDoc = await addDoc(collection(db, 'matches'), {
        ...matchResult,
        createdAt: Timestamp.now(),
        createdBy: user.uid,
        status: 'pending',
      });

      console.log('Match result stored with ID:', matchDoc.id);

      return { id: matchDoc.id, ...matchResult };
    } catch (error) {
      console.error('Error storing match result:', error);
      throw error;
    }
  },

  // Send notification to matched donors
  notifyMatchedDonor: async (
    donorId: string,
    bloodRequest: any,
    matchDetails: any
  ) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      // Create notification in Firestore with donor profile details
      await addDoc(collection(db, 'notifications'), {
        userId: donorId,
        type: 'match',
        title: 'Blood Donation Match',
        message: `You are a match for a ${bloodRequest.urgency} ${bloodRequest.bloodType} blood request at ${bloodRequest.hospital}.`,
        requestId: bloodRequest.id,
        compatibilityScore: matchDetails.compatibilityScore,
        priority: matchDetails.priority,
        matchReasons: matchDetails.matchReasons || [],
        // Include donor profile for display
        donorProfile: {
          bloodType: matchDetails.donorBloodType,
          location: matchDetails.donorLocation,
          availability: matchDetails.donorAvailability,
        },
        // Include recipient/request info
        requestDetails: {
          bloodType: bloodRequest.bloodType,
          hospital: bloodRequest.hospital,
          location: bloodRequest.location,
          urgency: bloodRequest.urgency,
          requiredBy: bloodRequest.requiredBy,
          units: bloodRequest.units,
          contactNumber: bloodRequest.contactNumber,
        },
        read: false,
        createdAt: Timestamp.now(),
      });

      // Also add to realtime database for immediate delivery
      await rtdbPush(ref(rtdb, `users/${donorId}/notifications`), {
        type: 'match',
        title: 'Blood Donation Match',
        message: `You are a match for a ${bloodRequest.urgency} ${bloodRequest.bloodType} blood request at ${bloodRequest.hospital}.`,
        requestId: bloodRequest.id,
        compatibilityScore: matchDetails.compatibilityScore,
        read: false,
        createdAt: new Date().toISOString(),
      });

      console.log('Notification sent to donor:', donorId);
      return { success: true };
    } catch (error) {
      console.error('Error notifying donor:', error);
      throw error;
    }
  },

  // Send notification to reception about matches
  notifyReception: async (bloodRequest: any, matchResult: any) => {
    try {
      // Create a notification for reception/admin with detailed donor profiles
      await addDoc(collection(db, 'reception_notifications'), {
        type: 'blood_request_matched',
        title: 'New Blood Request Matched',
        message: `${matchResult.totalMatchesFound} donors matched for ${bloodRequest.bloodType} blood request from ${bloodRequest.userName}.`,
        requestId: bloodRequest.id,
        urgency: bloodRequest.urgency,
        // Include request details
        requestDetails: {
          bloodType: bloodRequest.bloodType,
          hospital: bloodRequest.hospital,
          location: bloodRequest.location,
          requiredBy: bloodRequest.requiredBy,
          units: bloodRequest.units,
          patientName: bloodRequest.userName,
          contactNumber: bloodRequest.contactNumber,
        },
        // Include full donor profiles for top matches
        matches: matchResult.matches.slice(0, 10).map((m: any) => ({
          donorId: m.donorId,
          donorName: m.donorName,
          donorBloodType: m.donorBloodType,
          donorLocation: m.donorLocation,
          donorContact: m.donorContact,
          donorAvailability: m.donorAvailability,
          compatibilityScore: m.compatibilityScore,
          priority: m.priority,
          isEligible: m.isEligible,
          matchReasons: m.matchReasons || [],
          warnings: m.warnings || [],
        })),
        read: false,
        createdAt: Timestamp.now(),
      });

      // Also push to realtime database for immediate notification
      await rtdbPush(ref(rtdb, 'reception/notifications'), {
        type: 'blood_request_matched',
        title: 'New Blood Request Matched',
        message: `${matchResult.totalMatchesFound} donors matched for ${bloodRequest.bloodType}`,
        requestId: bloodRequest.id,
        urgency: bloodRequest.urgency,
        matchCount: matchResult.totalMatchesFound,
        // Include top donor profiles for quick view
        topMatches: matchResult.matches.slice(0, 5).map((m: any) => ({
          donorId: m.donorId,
          donorName: m.donorName,
          bloodType: m.donorBloodType,
          location: m.donorLocation,
          contact: m.donorContact,
          availability: m.donorAvailability,
          score: m.compatibilityScore,
          priority: m.priority,
          isEligible: m.isEligible,
        })),
        requestDetails: {
          bloodType: bloodRequest.bloodType,
          hospital: bloodRequest.hospital,
          patientName: bloodRequest.userName,
        },
        createdAt: new Date().toISOString(),
      });

      console.log('Reception notified about matches');
      return { success: true };
    } catch (error) {
      console.error('Error notifying reception:', error);
      throw error;
    }
  },

  // Get all matches for a blood request
  getMatchesForRequest: async (requestId: string) => {
    try {
      const matchesQuery = query(
        collection(db, 'matches'),
        where('requestId', '==', requestId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const matchesSnapshot = await getDocs(matchesQuery);
      if (matchesSnapshot.empty) return null;

      const matchDoc = matchesSnapshot.docs[0];
      return { id: matchDoc.id, ...matchDoc.data() };
    } catch (error) {
      console.error('Error getting matches:', error);
      throw error;
    }
  },

  // Get reception notifications
  getReceptionNotifications: async () => {
    try {
      const notificationsQuery = query(
        collection(db, 'reception_notifications'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(notificationsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting reception notifications:', error);
      throw error;
    }
  },

  // Mark reception notification as read
  markReceptionNotificationRead: async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'reception_notifications', notificationId), {
        read: true,
        readAt: Timestamp.now(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Run matching for all active blood requests
  runMatchingForAllRequests: async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      console.log('Running matching for all blood requests...');

      // Get all blood requests (not filtering by status since it may not be set)
      const requestsRef = collection(db, 'blood_requests');
      const requestsSnapshot = await getDocs(query(requestsRef, limit(50)));

      console.log(`Found ${requestsSnapshot.docs.length} blood requests in database`);

      const results = [];

      for (const requestDoc of requestsSnapshot.docs) {
        const requestData = requestDoc.data();
        const bloodRequest = {
          id: requestDoc.id,
          ...requestData
        };

        console.log(`Processing request ${bloodRequest.id}: ${requestData.bloodType}`);

        try {
          // Find matching donors
          const matchResult = await matchingAPI.findMatchingDonors(bloodRequest);

          if (matchResult.totalMatchesFound > 0) {
            // Try to store match result (may fail due to permissions)
            try {
              await matchingAPI.storeMatchResult(matchResult);
            } catch (storeError) {
              console.warn('Could not store match result:', storeError);
            }

            // Try to notify reception (may fail due to permissions)
            try {
              await matchingAPI.notifyReception(bloodRequest, matchResult);
            } catch (notifyError) {
              console.warn('Could not notify reception:', notifyError);
            }

            results.push({
              requestId: bloodRequest.id,
              bloodType: requestData.bloodType,
              matchesFound: matchResult.totalMatchesFound,
              matches: matchResult.matches, // Include actual matches data
              success: true
            });
          } else {
            results.push({
              requestId: bloodRequest.id,
              bloodType: requestData.bloodType,
              matchesFound: 0,
              success: true,
              message: 'No compatible donors found'
            });
          }
        } catch (matchError: any) {
          console.error(`Error matching request ${bloodRequest.id}:`, matchError);
          results.push({
            requestId: bloodRequest.id,
            bloodType: requestData.bloodType,
            success: false,
            error: matchError.message
          });
        }
      }

      console.log('Matching complete for all requests:', results);
      return {
        totalRequests: requestsSnapshot.docs.length,
        results
      };
    } catch (error) {
      console.error('Error running batch matching:', error);
      throw error;
    }
  },

  // Get all active blood requests with their match status
  getActiveRequestsWithMatches: async () => {
    try {
      const requestsRef = collection(db, 'blood_requests');
      const requestsSnapshot = await getDocs(query(requestsRef, where('status', '==', 'active')));

      const requests = await Promise.all(
        requestsSnapshot.docs.map(async (requestDoc) => {
          const data = requestDoc.data();

          // Try to get existing matches for this request
          let matches: any = null;
          try {
            matches = await matchingAPI.getMatchesForRequest(requestDoc.id);
          } catch (e) {
            // No matches yet
          }

          return {
            id: requestDoc.id,
            ...data,
            hasMatches: !!matches,
            matchCount: (matches as any)?.matches?.length || 0
          };
        })
      );

      return requests;
    } catch (error) {
      console.error('Error getting active requests:', error);
      throw error;
    }
  }
};

// Helper function to create a content hash for deduplication
function hashDonationContent(data: any): string {
  // Simple string-based hash
  const normalizedString = Object.entries(data)
    .filter(([key, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}:${value}`)
    .sort()
    .join('|')
    .toLowerCase();

  // Basic hash function
  let hash = 0;
  for (let i = 0; i < normalizedString.length; i++) {
    const char = normalizedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return hash.toString(16);
}