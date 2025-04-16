import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

const TIMER_DURATION = 3 * 60; // 3 minutes in seconds
const SUCCESS_MESSAGE_DURATION = 3000; // 3 seconds

function getExpiry(email) {
  const expiry = localStorage.getItem(`verify_expiry_${email}`);
  return expiry ? parseInt(expiry, 10) : null;
}

function setExpiry(email, expiry) {
  localStorage.setItem(`verify_expiry_${email}`, expiry);
}

const EmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(TIMER_DURATION);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const intervalRef = useRef(null);
  const successTimeoutRef = useRef(null);

  // Clear any existing timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!email) {
      navigate('/register');
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Initialize or restore timer from localStorage
    let expiry = getExpiry(email);
    if (!expiry || expiry < Date.now()) {
      expiry = Date.now() + TIMER_DURATION * 1000;
      setExpiry(email, expiry);
    }

    const updateTimer = () => {
      const secondsLeft = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setTimer(secondsLeft);
      setResendDisabled(secondsLeft > 0);
      if (secondsLeft === 0) {
        clearInterval(intervalRef.current);
      }
    };

    updateTimer();
    intervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [email, navigate]);

  // Auto-dismiss success messages
  useEffect(() => {
    if (success && success !== 'Email verified! Redirecting...') {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      
      successTimeoutRef.current = setTimeout(() => {
        setSuccess('');
      }, SUCCESS_MESSAGE_DURATION);
    }
    
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, [success]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/verify-email', { email, code });
      setSuccess('Email verified! Redirecting...');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setIsResending(true);
    
    try {
      await api.post('/auth/resend-verification', { email });
      
      // Reset the timer and update localStorage
      const newExpiry = Date.now() + TIMER_DURATION * 1000;
      setExpiry(email, newExpiry);
      
      // Clear any existing interval and start a new one
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Reset timer state
      setTimer(TIMER_DURATION);
      setResendDisabled(true);
      
      // Start new timer interval
      intervalRef.current = setInterval(() => {
        const secondsLeft = Math.max(0, Math.floor((newExpiry - Date.now()) / 1000));
        setTimer(secondsLeft);
        setResendDisabled(secondsLeft > 0);
        if (secondsLeft === 0) {
          clearInterval(intervalRef.current);
        }
      }, 1000);
      
      setSuccess('Verification code resent!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-primary-600 mb-4 text-center">Verify Your Email</h2>
        <p className="mb-4 text-gray-600 text-center">
          Enter the 6-digit code sent to <span className="font-medium">{email}</span>.
        </p>
        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300 text-center text-lg tracking-widest"
            placeholder="Enter code"
            required
          />
          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700 transition"
          >
            Verify
          </button>
        </form>
        <div className="flex flex-col items-center mt-4">
          <span className="text-gray-500 text-sm mb-2">
            {timer > 0
              ? `Resend code in ${Math.floor(timer / 60)}:${('0' + (timer % 60)).slice(-2)}`
              : 'Didn\'t receive the code?'}
          </span>
          <button
            onClick={handleResend}
            disabled={resendDisabled || isResending}
            className={`w-full py-2 rounded flex justify-center items-center ${
              resendDisabled || isResending 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-primary-500 text-white hover:bg-primary-700 transition'
            }`}
          >
            {isResending ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              'Resend Verification Code'
            )}
          </button>
        </div>
        {error && <div className="text-red-500 text-center mt-2">{error}</div>}
        {success && <div className="text-green-600 text-center mt-2">{success}</div>}
      </div>
    </div>
  );
};

export default EmailVerification;
