import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HoundHeartLogo from '../assets/images/Houndheart_logo.svg';
import apiService from '../services/apiService';
import toastService from '../services/toastService';

const ProfileSettingsPage = () => {
  console.log('ProfileSettingsPage component rendered');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isYearlyPlan, setIsYearlyPlan] = useState(true);
  const [userProfilePhoto, setUserProfilePhoto] = useState('');
  const [dogProfilePhoto, setDogProfilePhoto] = useState('');
  const [formData, setFormData] = useState({
    yourName: '',
    email: '',
    dogName: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [tempFormData, setTempFormData] = useState({});
  const [userPhotoBase64, setUserPhotoBase64] = useState(null);
  const [dogPhotoBase64, setDogPhotoBase64] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [originalUserPhoto, setOriginalUserPhoto] = useState('');
  const [originalDogPhoto, setOriginalDogPhoto] = useState('');
  const [notificationSettings, setNotificationSettings] = useState({
    ritualReminders: true,
    communityUpdates: true,
    weeklyDigest: false,
    premiumOffers: true
  });
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Journey Statistics — dynamic, defaults to 0 for new users
  const [journeyStats, setJourneyStats] = useState({
    bondedScore: 0,
    ritualsCompleted: 0,
    journalEntries: 0
  });

  // Test if component is working
  if (window.location.pathname === '/profile-settings') {
    console.log('Successfully navigated to profile-settings page');
  }

  // Fetch Journey Statistics on mount
  useEffect(() => {
    const fetchJourneyStats = async () => {
      try {
        const userId = apiService.getCurrentUserId();
        if (!userId) return;

        const dogId = localStorage.getItem('dogId') || '00000000-0000-0000-0000-000000000000';

        // Fetch all 3 metrics in parallel
        const [summaryRes, journalRes, bondedRes] = await Promise.allSettled([
          apiService.getDashboardSummary(userId),
          apiService.getUserJournalEntries(userId, 1, 1),
          apiService.calculateBondedScore(userId, dogId)
        ]);

        const stats = { bondedScore: 0, ritualsCompleted: 0, journalEntries: 0 };

        // Bonded Score from dashboard summary
        if (summaryRes.status === 'fulfilled' && summaryRes.value) {
          const s = summaryRes.value;
          stats.bondedScore = Math.round(s.BondedScore ?? s.bondedScore ?? 0);
        }

        // Journal Entries total count
        if (journalRes.status === 'fulfilled' && journalRes.value) {
          const j = journalRes.value;
          stats.journalEntries = j.TotalCount ?? j.totalCount ?? 0;
        }

        // Rituals Completed from bonded score response
        if (bondedRes.status === 'fulfilled' && bondedRes.value) {
          const b = bondedRes.value?.data || bondedRes.value || {};
          stats.ritualsCompleted = b.RitualDaysCount ?? b.ritualDaysCount ?? 0;
        }

        setJourneyStats(stats);
      } catch (error) {
        console.error('Error fetching journey stats:', error);
      }
    };

    fetchJourneyStats();
  }, []);


  // Load profile photos from localStorage
  useEffect(() => {
    const sanitize = (v) => (!v || v === 'null' || v === 'undefined') ? '' : v;
    const userPhoto = sanitize(localStorage.getItem('UserprofilPhotoUrl'));
    console.log('userProfilePhoto', userPhoto);
    setUserProfilePhoto(userPhoto);

    const dogPhoto = sanitize(localStorage.getItem('DogprofilPhotoUrl'));
    console.log('dogProfilePhoto', dogPhoto);
    setDogProfilePhoto(dogPhoto);
    const handleClickOutside = (event) => {
      if (showProfileDropdown &&
        !event.target.closest('.profile-dropdown-container') &&
        !event.target.closest('[data-profile-button]')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  // Load user profile details (name, email, dog) from API/localStorage
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await apiService.getUserProfile();
        const data = profile?.data || profile || {};
        const fullName = data.fullName || data.profileName || data.name || '';
        const email = data.email || '';
        const dogName = data?.dog?.dogName || localStorage.getItem('dogName') || '';
        const sanitize = (v) => (!v || v === 'null' || v === 'undefined') ? '' : v;
        const userPhoto = sanitize(data.profilePhoto || localStorage.getItem('UserprofilPhotoUrl'));
        const dogPhoto = sanitize(data?.dog?.profilePhoto || localStorage.getItem('DogprofilPhotoUrl'));

        setFormData(prev => ({
          ...prev,
          yourName: fullName,
          email: email,
          dogName: dogName,
        }));
        if (userPhoto) setUserProfilePhoto(userPhoto);
        if (dogPhoto) setDogProfilePhoto(dogPhoto);
      } catch (_) {
        // Fallback from localStorage if API fails
        const dogName = localStorage.getItem('dogName') || '';
        setFormData(prev => ({ ...prev, dogName }));
      }
    };
    loadProfile();
  }, []);

  const handleUpgrade = () => {
    console.log('Upgrade clicked');
    setShowPremiumModal(true);
  };

  const handleClosePremiumModal = () => {
    setShowPremiumModal(false);
  };

  const handleUpgradeClick = () => {
    console.log('Upgrade to Premium clicked');
    setShowPricingModal(true);
  };

  const handleClosePricingModal = () => {
    setShowPricingModal(false);
  };

  const handlePlanToggle = () => {
    setIsYearlyPlan(!isYearlyPlan);
  };

  const handleGetStarted = () => {
    navigate('/signup');
  };

  const handleProfileClick = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const handleProfileOption = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Profile option clicked, navigating to profile-settings');
    setShowProfileDropdown(false);
    // Already on profile settings page, so just close dropdown
  };

  const handleLogout = () => {
    // Close the dropdown first
    setShowProfileDropdown(false);

    // Clear all localStorage and sessionStorage on logout
    localStorage.clear();
    sessionStorage.clear();

    // Show logout message
    console.log('User logged out successfully');

    // Force redirect to landing page with replace to prevent back navigation
    setTimeout(() => {
      console.log('Redirecting to landing page');
      navigate('/', { replace: true });
      console.log('Redirected to landing page1');
      // Force a page reload to ensure clean state
      window.location.href = '/';
      console.log('Redirected to landing page3');

    }, 100);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (isEditing) {
      setTempFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePhotoUpload = (photoType, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        if (photoType === 'userPhoto') {
          setUserPhotoBase64(base64);
          setUserProfilePhoto(base64); // Update preview immediately
        } else if (photoType === 'dogPhoto') {
          setDogPhotoBase64(base64);
          setDogProfilePhoto(base64); // Update preview immediately
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const triggerPhotoUpload = (photoType) => {
    const input = document.getElementById(`${photoType}-input`);
    if (input) {
      input.click();
    }
  };

  const handleEdit = () => {
    setTempFormData({ ...formData });
    setOriginalUserPhoto(userProfilePhoto); // Store original photos
    setOriginalDogPhoto(dogProfilePhoto);
    setUserPhotoBase64(null); // Reset photo changes when starting edit
    setDogPhotoBase64(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Prepare data for API
      const profileData = {
        profileName: tempFormData.yourName || formData.yourName || null,
        email: tempFormData.email || formData.email || null,
        base64Image: userPhotoBase64 || null,
        dogName: tempFormData.dogName || formData.dogName || null,
        dogBase64Image: dogPhotoBase64 || null
      };

      // Call API to update profile
      const response = await apiService.setupProfile(profileData);

      // Update local state with saved data
      setFormData({ ...tempFormData });
      setIsEditing(false);

      // Clear photo base64 states after successful save
      setUserPhotoBase64(null);
      setDogPhotoBase64(null);

      // Update profile photos from response if available
      if (response?.data) {
        if (response.data.ProfilePhoto) {
          setUserProfilePhoto(response.data.ProfilePhoto);
        }
        if (response.data.Dog?.DogProfilePhoto) {
          setDogProfilePhoto(response.data.Dog.DogProfilePhoto);
        }
      }

      toastService.success('Profile updated successfully!');
      console.log('Profile information saved:', tempFormData);
    } catch (error) {
      console.error('Error saving profile:', error);
      toastService.error(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTempFormData({});
    setUserPhotoBase64(null); // Clear photo changes
    setDogPhotoBase64(null);
    setUserProfilePhoto(originalUserPhoto); // Revert to original photos
    setDogProfilePhoto(originalDogPhoto);
    setIsEditing(false);
  };

  const handleSaveChanges = () => {
    console.log('Saving changes:', formData);
    // Here you would typically save to backend
    alert('Changes saved successfully!');
  };

  const handleNotificationToggle = (setting) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };


  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'privacy', label: 'Privacy' }
  ];

  const handlePrivacy = () => {
    navigate('/terms-of-use')
  }

  // Derived user info for header avatar and dropdown
  const headerName = (() => {
    if (formData.yourName && formData.yourName.trim()) return formData.yourName;
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.fullName || u.profileName || u.name || '';
    } catch { return ''; }
  })();
  const headerEmail = (() => {
    if (formData.email && formData.email.trim()) return formData.email;
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.email || '';
    } catch { return ''; }
  })();
  const headerInitials = (() => {
    const n = headerName || '';
    const initials = n.split(' ').filter(Boolean).map(w => w.charAt(0)).join('').toUpperCase();
    return (initials || 'U').slice(0, 2);
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-sky-50 to-blue-100">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img src={HoundHeartLogo} alt="HoundHeart" className="h-8 w-8" />
            <span className="text-2xl font-bold text-gray-900">HoundHeart™</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-purple-600 transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/journal')}
              className="text-gray-600 hover:text-purple-600 transition-colors"
            >
              Journal
            </button>
            <button
              onClick={() => navigate('/rituals')}
              className="text-gray-600 hover:text-purple-600 transition-colors"
            >
              Rituals
            </button>
            {/* <button 
              onClick={() => navigate('/community')}
              className="text-gray-600 hover:text-purple-600 transition-colors"
            >
              Community
            </button> */}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleUpgrade}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>Upgrade</span>
            </button>
            <div className="relative profile-dropdown-container">
              <button
                onClick={handleProfileClick}
                className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105"
              >
                <span className="text-white font-bold text-lg">{headerInitials}</span>
              </button>

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="text-lg font-semibold text-gray-900">{headerName || 'User'}</div>
                    <div className="text-sm text-gray-500">{headerEmail}</div>
                  </div>

                  {/* Menu Options */}
                  <div className="py-2">
                    <button
                      onClick={handleProfileOption}
                      data-profile-button
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-gray-700">Profile</span>
                    </button>

                    <button
                      onClick={() => console.log('Upgrade clicked')}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-gray-700">Upgrade to Premium</span>
                    </button>
                  </div>

                  {/* Logout Section */}
                  <div className="border-t border-gray-200 py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors text-red-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-purple-900 mb-2">Profile Settings</h1>
            <p className="text-gray-600">Manage your account and spiritual journey preferences</p>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-gray-100 rounded-lg mb-6 p-2">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-2 font-medium text-sm transition-all duration-200 rounded-full ${activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            {activeTab === 'profile' && (
              <div>
                {/* Personal Information Section */}
                <div className="mb-8">
                  <div className="flex items-center mb-6">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                    <div className="ml-auto">
                      {!isEditing ? (
                        <button
                          onClick={handleEdit}
                          className="text-gray-400 hover:text-gray-600 transition-colors duration-200 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="text-sm">Edit</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleCancel}
                          className="text-gray-400 hover:text-gray-600 transition-colors duration-200 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="text-sm">Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-6">
                    {/* Profile Picture */}
                    <div className="relative">
                      {userProfilePhoto ? (
                        <img
                          src={userProfilePhoto}
                          alt="User Profile"
                          className="w-20 h-20 rounded-full object-cover border-2 border-purple-500"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-2xl">😀</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => triggerPhotoUpload('userPhoto')}
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors duration-200"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>

                    {/* Form Fields */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="yourName"
                            value={tempFormData.yourName || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="text-gray-900">{formData.yourName}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        {isEditing ? (
                          <input
                            type="email"
                            name="email"
                            value={tempFormData.email || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="text-gray-900">{formData.email}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dog Information Section */}
                <div className="mb-8">
                  <div className="flex items-center mb-6">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Dog Information</h2>
                  </div>

                  <div className="flex items-start space-x-6">
                    {/* Dog Profile Picture */}
                    <div className="relative">
                      {dogProfilePhoto ? (
                        <img
                          src={dogProfilePhoto}
                          alt="Dog Profile"
                          className="w-20 h-20 rounded-full object-cover border-2 border-teal-400"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-blue-400 rounded-full flex items-center justify-center">
                          <span className="text-white text-2xl">🐶</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => triggerPhotoUpload('dogPhoto')}
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors duration-200"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>

                    {/* Form Fields */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Dog's Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="dogName"
                            value={tempFormData.dogName || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="text-gray-900">{formData.dogName}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Only show when editing */}
                {isEditing && (
                  <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className={`px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Hidden File Inputs */}
                <input
                  id="userPhoto-input"
                  type="file"
                  accept="image/*"
                  capture="camera"
                  onChange={(e) => handlePhotoUpload('userPhoto', e)}
                  className="hidden"
                />
                <input
                  id="dogPhoto-input"
                  type="file"
                  accept="image/*"
                  capture="camera"
                  onChange={(e) => handlePhotoUpload('dogPhoto', e)}
                  className="hidden"
                />

              </div>
            )}

            {activeTab === 'subscription' && (
              <div>
                {/* Membership Status Section */}
                <div className="mb-8">
                  <div className="flex items-center mb-6">
                    <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Membership Status</h2>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Member</h3>
                        <p className="text-gray-600 mb-2">Limited access to features</p>
                        <p className="text-sm text-gray-500">Member since 28/08/2025</p>
                      </div>
                      <button
                        onClick={handleUpgradeClick}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>Upgrade Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                {/* Notification Preferences Section */}
                <div className="mb-8">
                  <div className="flex items-center mb-6">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L16 7l-6 6-6-6z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
                  </div>

                  {/* Notification Categories */}
                  <div className="space-y-6">
                    {/* Ritual Reminders */}
                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Ritual Reminders</h3>
                        <p className="text-sm text-gray-600">Daily reminders for your chakra practices</p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle('ritualReminders')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${notificationSettings.ritualReminders ? 'bg-purple-600' : 'bg-gray-200'
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationSettings.ritualReminders ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Community Updates */}
                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Community Updates</h3>
                        <p className="text-sm text-gray-600">New healing circles and community posts</p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle('communityUpdates')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${notificationSettings.communityUpdates ? 'bg-purple-600' : 'bg-gray-200'
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationSettings.communityUpdates ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Weekly Digest */}
                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Weekly Digest</h3>
                        <p className="text-sm text-gray-600">Summary of your progress and insights</p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle('weeklyDigest')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${notificationSettings.weeklyDigest ? 'bg-purple-600' : 'bg-gray-200'
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationSettings.weeklyDigest ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Premium Offers */}
                    <div className="flex items-center justify-between py-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Premium Offers</h3>
                        <p className="text-sm text-gray-600">Special discounts and premium features</p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle('premiumOffers')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${notificationSettings.premiumOffers ? 'bg-purple-600' : 'bg-gray-200'
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationSettings.premiumOffers ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div>
                {/* Privacy & Data Section */}
                <div className="mb-6">
                  <div className="flex items-center mb-6">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Privacy & Data</h2>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    {/* Export My Data */}
                    <button className="w-full flex items-center justify-between py-4 px-4 mb-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-gray-900 font-medium">Export My Data</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    </button>

                    {/* Privacy Settings */}
                    <button className="w-full flex items-center justify-between py-4 px-4 mb-6 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <span className="text-gray-900 font-medium">Privacy Settings</span>
                      </div>
                    </button>

                    {/* Danger Zone */}
                    <div>
                      <h3 className="text-red-600 font-semibold mb-3 text-sm">Danger Zone</h3>
                      <button className="w-full flex items-center space-x-3 py-4 px-4 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="font-medium">Delete Account</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Data Usage Section */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Usage</h3>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    We use your data to personalize your spiritual journey and improve our services.
                    Your journal entries and personal information are encrypted and never shared.
                  </p>
                  <div className="flex space-x-6">
                    <button onClick={handlePrivacy} className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
                      Privacy Policy &  Terms of Service
                    </button>

                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Journey Statistics Section - Only show on Profile tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Journey Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{journeyStats.bondedScore}</div>
                  <div className="text-sm text-gray-600">Current Bonded Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">{journeyStats.ritualsCompleted}</div>
                  <div className="text-sm text-gray-600">Rituals Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{journeyStats.journalEntries}</div>
                  <div className="text-sm text-gray-600">Journal Entries</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={handleClosePremiumModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl p-6 lg:p-8 relative animate-slideUp max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleClosePremiumModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-orange-500">Upgrade to Premium</h2>
              </div>
              <p className="text-gray-600 text-lg">Unlock the full potential of your spiritual journey with your dog</p>
            </div>

            {/* Plan Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-100 rounded-full p-1 flex relative">
                <button
                  onClick={() => setIsYearlyPlan(false)}
                  className={`px-8 py-3 rounded-full font-medium transition-all duration-300 text-lg ${!isYearlyPlan ? 'bg-white text-gray-900 shadow-md' : 'text-gray-600'
                    }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsYearlyPlan(true)}
                  className={`px-8 py-3 rounded-full font-medium transition-all duration-300 relative text-lg ${isYearlyPlan ? 'bg-white text-gray-900 shadow-md' : 'text-gray-600'
                    }`}
                >
                  Yearly
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-sm px-2 py-1 rounded-full">
                    Save 17%
                  </span>
                </button>
              </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Monthly Plan */}
              <div className={`border-2 rounded-xl p-6 ${!isYearlyPlan ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Monthly Plan</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">$19.99<span className="text-xl font-normal">/month</span></div>
                <p className="text-base text-gray-600">Billed monthly, cancel anytime</p>
              </div>

              {/* Yearly Plan */}
              <div className={`border-2 rounded-xl p-6 relative ${isYearlyPlan ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                {isYearlyPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-500 text-white text-sm px-3 py-1 rounded-full font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Yearly Plan</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">$199.99<span className="text-xl font-normal">/year</span></div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-xl text-gray-500 line-through">$239.00</span>
                  <span className="text-base text-green-600 font-medium">Save $30.00</span>
                </div>
                <p className="text-base text-gray-600">Billed yearly, cancel anytime</p>
              </div>
            </div>

            {/* Premium Features */}
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Premium Features</h3>
              <div className="space-y-4">
                {/* Feature 1 */}
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-lg mb-1">Unlimited Chakra Rituals</h4>
                    <p className="text-base text-gray-600">Access to all 7 chakra alignment practices and advanced guided meditations</p>
                  </div>
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-lg mb-1">Exclusive Healing Circles</h4>
                    <p className="text-base text-gray-600">Monthly premium group sessions and workshops with expert facilitators</p>
                  </div>
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-lg mb-1">Advanced Aura Tracking</h4>
                    <p className="text-base text-gray-600">Deep energy field analysis and detailed bonded score insights</p>
                  </div>
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-lg mb-1">Legacy Export & Archive</h4>
                    <p className="text-base text-gray-600">Download your complete journal as a beautiful PDF and backup all memories</p>
                  </div>
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Upgrade Button */}
            <div className="text-center">
              <button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-12 py-4 rounded-full text-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg w-full"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-orange-600">Upgrade to Premium</h2>
              </div>
              <button
                onClick={handleClosePricingModal}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Subtitle */}
              <p className="text-center text-gray-600 mb-8">
                Unlock the full potential of your spiritual journey with your dog
              </p>

              {/* Pricing Toggle */}
              <div className="flex justify-center mb-8">
                <div className="flex items-center space-x-4">
                  <span className={`text-sm font-medium ${!isYearlyPlan ? 'text-gray-900' : 'text-gray-500'}`}>
                    Monthly
                  </span>
                  <button
                    onClick={handlePlanToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isYearlyPlan ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isYearlyPlan ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${isYearlyPlan ? 'text-gray-900' : 'text-gray-500'}`}>
                      Yearly
                    </span>
                    {isYearlyPlan && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        Save 17%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Monthly Plan */}
                <div className={`border-2 rounded-xl p-6 ${!isYearlyPlan ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Monthly Plan</h3>
                  <div className="text-3xl font-bold text-gray-900 mb-1">$19.99<span className="text-lg font-normal">/month</span></div>
                  <p className="text-sm text-gray-600">Billed monthly, cancel anytime</p>
                </div>

                {/* Yearly Plan */}
                <div className={`border-2 rounded-xl p-6 relative ${isYearlyPlan ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                  {isYearlyPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-purple-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Yearly Plan</h3>
                  <div className="text-3xl font-bold text-gray-900 mb-1">$199.99<span className="text-lg font-normal">/year</span></div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg text-gray-500 line-through">$239.00</span>
                    <span className="text-sm text-green-600 font-medium">Save $30.00</span>
                  </div>
                  <p className="text-sm text-gray-600">Billed yearly, cancel anytime</p>
                </div>
              </div>

              {/* Premium Features */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-center text-gray-900 mb-6">Premium Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Unlimited Chakra Rituals */}
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-500 border-2 border-white rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900">Unlimited Chakra Rituals</h4>
                          <div className="w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">Access to all 7 chakra alignment practices and advanced guided meditations</p>
                      </div>
                    </div>

                    {/* Exclusive Healing Circles */}
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-500 border-2 border-white rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900">Exclusive Healing Circles</h4>
                          <div className="w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">Monthly premium group sessions and workshops with expert facilitators</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Advanced Aura Tracking */}
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-500 border-2 border-white rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900">Advanced Aura Tracking</h4>
                          <div className="w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">Deep energy field analysis and detailed bonded score insights</p>
                      </div>
                    </div>

                    {/* Legacy Export & Archive */}
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-500 border-2 border-white rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900">Legacy Export & Archive</h4>
                          <div className="w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">Download your complete journal as a beautiful PDF and backup all memories</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleClosePricingModal}
                  className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Maybe Later
                </button>
                <button className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg">
                  {isYearlyPlan ? 'Start Yearly Plan' : 'Start Monthly Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettingsPage;
