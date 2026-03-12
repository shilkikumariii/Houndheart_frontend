import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, useGoogleOneTapLogin } from '@react-oauth/google';
import HoundHeartLogo from '../assets/images/Houndheart_logo.svg';
import apiService from '../services/apiService';
import toastService from '../services/toastService';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const SignupPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isVisible, setIsVisible] = useState({});
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    fullName: '',
    email: '',
    password: ''
  });
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  // Scroll animation effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll('[data-animate]');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'password') {
      if (!passwordTouched) {
        setPasswordTouched(true);
      }
      setIsPasswordValid(passwordRegex.test(value));
    }
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'fullName':
        if (!value.trim()) {
          return 'Full Name is required';
        }
        return '';
      case 'email':
        if (!value.trim()) {
          return 'Email is required';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Invalid Email Format';
        }
        return '';
      case 'password':
        if (!value || value === '••••••••••') {
          return 'Password is required';
        }
        if (!passwordRegex.test(value)) {
          return 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
        }
        return '';
      default:
        return '';
    }
  };

  const validateForm = () => {
    const errors = {
      fullName: validateField('fullName', formData.fullName),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password)
    };
    
    setFieldErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form fields
    if (!validateForm()) {
      return;
    }

    // Check terms acceptance
    if (!agreeToTerms) {
      toastService.error('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setIsLoading(true);

    try {
      // Call your .NET 8 API
      const response = await apiService.registerUser({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        isTermsAccepted: agreeToTerms
      });

      console.log('Registration successful:', response);
      
      // Fetch traits after successful registration
      try {
        console.log('🔄 Fetching traits after registration...');
        await Promise.all([
          apiService.getAllUserTraits(),
          apiService.getAllDogTraits()
        ]);
        console.log('✅ Traits fetched successfully');
      } catch (traitsError) {
        console.log('⚠️ Traits fetch failed (will be fetched on ProfileSetupPage):', traitsError);
      }
      
      // Show success toast with API message
      toastService.success(response.message || 'Account created successfully! Welcome to HoundHeart.');
      
      // Navigate after showing toast
      setTimeout(() => {
        navigate('/profile-setup');
      }, 1500);
      
    } catch (error) {
      console.error('Signup error:', error);
      
      // Show error toast with API message
      toastService.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleClose = () => {
    navigate('/');
  };

  // Google OAuth login handler - handles id_token from OneTap or GoogleLogin component
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      console.log('credentialResponse', credentialResponse);
      // credentialResponse from useGoogleOneTapLogin or GoogleLogin component
      // Both provide: { credential: "id_token_string" }
      const idToken = credentialResponse?.credential;
      
      if (!idToken) {
        toastService.error('No Google credential received');
        return;
      }

      // Call your backend Google login endpoint with id_token
      const result = await apiService.googleLogin(idToken);
      console.log('result', result);
      
      if (result?.data) {
        const d = result.data;
        const token = d.Token || d.token;
        const userId = d.UserId || d.userId;
        const email = d.Email || d.email;
        console.log('token', token);
        console.log('userId', userId);
        if (token) localStorage.setItem('token', token);
        
        if (userId) localStorage.setItem('userId', userId);
        localStorage.setItem('user', JSON.stringify({ 
          userId, 
          email,
          fullName: d.FullName || d.fullName || d.profileName
        }));
        localStorage.setItem('isAuthenticated', 'true');
      }

      // Fetch user profile to get full details including photos and dog info
      try {
        const profileResponse = await apiService.getUserProfile();
        try {
          const pr = profileResponse?.data || profileResponse || {};
          if (pr.userId) localStorage.setItem('userId', pr.userId);
        } catch {}
        
        localStorage.setItem('UserprofilPhotoUrl', profileResponse.profilePhoto || '');
        localStorage.setItem('DogprofilPhotoUrl', profileResponse.dog?.profilePhoto || '');
        localStorage.setItem('dogName', profileResponse.dog?.dogName || '');
        
        const profileData = profileResponse.data || profileResponse;
        const isProfileSetupCompleted = profileData?.isProfileSetupCompleted || profileData?.IsProfileSetupCompleted;
        
        // Update the 'user' object in localStorage with more complete data
        try {
          const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
          const updatedUser = {
            ...existingUser,
            userId: profileData.userId || existingUser.userId,
            email: profileData.email || existingUser.email,
            fullName: profileData?.fullName || profileData?.profileName || existingUser.fullName || 'User',
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch {}

        if (isProfileSetupCompleted) {
          // User has completed profile setup - fetch bonded score before redirecting
          console.log('✅ Profile setup completed - fetching bonded score...');
          
          try {
            const userId = profileData?.userId || profileData?.UserId || localStorage.getItem('userId');
            const dogId = profileData?.dog?.dogId || profileData?.dog?.DogId;
            
            if (userId && dogId) {
              const bondedScoreResponse = await apiService.calculateBondedScore(userId, dogId);
              const bondedScore = bondedScoreResponse?.data?.bondedScore || bondedScoreResponse?.data?.BondedScore || 0;
              
              // Store bonded score in localStorage
              localStorage.setItem('bondedScore', bondedScore.toString());
              console.log('✅ Bonded score fetched and stored:', bondedScore);
            } else {
              console.warn('⚠️ Missing userId or dogId, cannot fetch bonded score');
            }
          } catch (bondedScoreError) {
            console.error('⚠️ Error fetching bonded score:', bondedScoreError);
            // Don't block login if bonded score fails
          }
          
          // Redirect to dashboard
          toastService.success('Welcome back! Redirecting to dashboard...');
          setTimeout(() => navigate('/dashboard', { replace: true }), 800);
        } else {
          toastService.success('Welcome! Please complete your profile setup.');
          setTimeout(() => navigate('/profile-setup', { replace: true }), 800);
        }
      } catch (profileError) {
        console.error('Profile fetch failed after Google login:', profileError);
        toastService.info('Logged in with Google. Please complete profile setup.');
        setTimeout(() => navigate('/profile-setup', { replace: true }), 800);
      }
    } catch (err) {
      console.error('Google login error:', err);
      toastService.error(err?.message || 'Google login failed');
    }
  };

  const handleGoogleLoginError = () => {
    toastService.error('Google login failed. Please try again.');
  };

  // Use Google One Tap Login (optional - shows automatic prompt)
  // This provides id_token directly and is perfect for your backend
  useGoogleOneTapLogin({
    onSuccess: handleGoogleLoginSuccess,
    onError: handleGoogleLoginError,
  });

  return (
    <div className="min-h-screen bg-black bg-opacity-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Modal Card */}
      <div 
        id="signup-modal"
        data-animate
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-slideUp"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div 
          id="modal-header"
          data-animate
          className={`text-center mb-8 transition-all duration-1000 delay-200 ${
            isVisible['modal-header'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl font-bold text-purple-600 mb-2">Join HoundHeart™</h2>
          <p className="text-gray-600">Begin your spiritual journey</p>
        </div>


        {/* Form */}
        <form 
          id="signup-form"
          data-animate
          onSubmit={handleSubmit} 
          className={`space-y-6 transition-all duration-1000 delay-400 ${
            isVisible['signup-form'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Full Name Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            <input
              type="text"
              name="fullName"
              placeholder="Enter your name"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-blue-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 ${
                fieldErrors.fullName ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            </div>
            {fieldErrors.fullName && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-blue-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 ${
                fieldErrors.email ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            </div>
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
          <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength={8}
              className={`w-full pl-10 pr-12 py-3 border rounded-lg bg-blue-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 ${
                fieldErrors.password ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
            )}
            {passwordTouched && (
              <p
                className={`mt-1 text-sm ${
                  isPasswordValid ? 'text-green-600' : 'text-red-600'
                }`}
              >
                Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.
              </p>
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="terms"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="text-sm text-gray-600">
              I accept the{' '}
              <button onClick={() => navigate('/terms-of-use')} className="text-purple-500 hover:text-purple-600 font-medium">
                Terms of Service
              </button>
              {' '}and{' '}
              <button onClick={() => navigate('/privacy-policy')} className="text-purple-500 hover:text-purple-600 font-medium">
                Privacy Policy
              </button>
            </label>
          </div>

          {/* Create Account Button */}
          <button
            type="submit"
            disabled={isLoading || !agreeToTerms}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-300 transform shadow-lg ${
              isLoading || !agreeToTerms
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:scale-105'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </div>
            ) : !agreeToTerms ? (
              'Accept Terms to Continue'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Sign In Link */}
        <div 
          id="signin-link"
          data-animate
          className={`text-center mt-6 transition-all duration-1000 delay-600 ${
            isVisible['signin-link'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={handleSignIn}
              className="text-purple-500 hover:text-purple-600 font-medium"
            >
              Sign In
            </button>
          </p>
        </div>

        {/* Separator */}
        <div 
          id="separator"
          data-animate
          className={`relative my-8 transition-all duration-1000 delay-800 ${
            isVisible['separator'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Social Login Buttons */}
        <div 
          id="social-buttons"
          data-animate
          className={`flex space-x-3 transition-all duration-1000 delay-1000 ${
            isVisible['social-buttons'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Google Button - Using GoogleLogin component from @react-oauth/google */}
          <div className="flex-1">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
              useOneTap={false} // We're using useGoogleOneTapLogin separately for automatic prompt
              render={({ onClick, disabled }) => (
                <button
                  onClick={onClick}
                  disabled={disabled}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-gray-700 font-medium">Google</span>
                </button>
              )}
            />
          </div>

          {/* Apple Button - Commented out */}
          {/* <button className="flex-1 flex items-center justify-center px-4 py-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors shadow-sm">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <span className="text-gray-700 font-medium">Apple</span>
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
