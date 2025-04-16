import { useState, useContext, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import ReactCountryFlag from 'react-country-flag';
import countryCodes from '../../data/countryCodesData';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneCountryCode: '+1',
    phoneNumber: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const countryDropdownRef = useRef(null);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phoneNumber') {
      // Only allow digits in phone number field
      if (value === '' || /^\d+$/.test(value)) {
        setFormData({
          ...formData,
          [name]: value
        });
        setPhoneError('');
      } else {
        setPhoneError('Phone number must contain only digits');
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
      
      // Clear name error when user starts typing in the name field
      if (name === 'name') {
        setNameError('');
      }
    }
  };

  const handleCountryCodeSelect = (code) => {
    setFormData({
      ...formData,
      phoneCountryCode: code
    });
    setShowCountryDropdown(false);
  };

  const toggleCountryDropdown = () => {
    setShowCountryDropdown(!showCountryDropdown);
  };

  // Close dropdown when clicking outside
  const handleClickOutside = (e) => {
    if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
      setShowCountryDropdown(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNameError('');
    setPhoneError('');
    
    // Validate name
    if (!formData.name.trim()) {
      setNameError('Name is required');
      return;
    }
    
    // Validate phone number (if provided)
    if (formData.phoneNumber && !/^\d+$/.test(formData.phoneNumber)) {
      setPhoneError('Phone number must contain only digits');
      return;
    }
    
    // Set loading state
    setIsLoading(true);
    
    // Create userData with name for backend
    const userData = {
      name: formData.name.trim(),
      email: formData.email,
      phoneCountryCode: formData.phoneCountryCode,
      phoneNumber: formData.phoneNumber,
      password: formData.password
    };
    
    try {
      const result = await register(userData);
      if (result.success && result.verificationPending) {
        navigate('/verify-email', { state: { email: formData.email } });
      } else if (result.success) {
        navigate('/');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get current selected country data
  const selectedCountry = countryCodes.find(c => c.code === formData.phoneCountryCode) || 
    { iso2: 'US', country: 'United States', code: '+1' };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="rounded-lg shadow-lg p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-primary-600">Create your account</h2>
            <p className="text-gray-600">to continue to course platform</p>
          </div>
          
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  name="name"
                  className={`input ${nameError ? 'border-red-500' : ''}`}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Smith"
                />
              </div>
              {nameError && (
                <p className="text-red-500 text-sm mt-1">{nameError}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone number
              </label>
              <div className="flex">
                <div className="relative" ref={countryDropdownRef}>
                  <button
                    type="button"
                    onClick={toggleCountryDropdown}
                    className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 w-24"
                  >
                    <span className="flex items-center">
                      <ReactCountryFlag 
                        countryCode={selectedCountry.iso2} 
                        svg 
                        style={{
                          width: '1.2em',
                          height: '1.2em',
                          marginRight: '0.5rem'
                        }}
                      />
                      <span>{selectedCountry.code}</span>
                    </span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>
                  
                  {showCountryDropdown && (
                    <div className="absolute z-10 mt-1 w-60 bg-white shadow-lg rounded-md max-h-60 overflow-auto">
                      {countryCodes.map((country) => (
                        <button
                          key={country.code + country.iso2}
                          type="button"
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                          onClick={() => handleCountryCodeSelect(country.code)}
                        >
                          <ReactCountryFlag 
                            countryCode={country.iso2} 
                            svg 
                            style={{
                              width: '1.2em',
                              height: '1.2em',
                              marginRight: '0.5rem'
                            }}
                          />
                          <span className="mr-2">{country.country}</span>
                          <span className="ml-auto text-gray-600">{country.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <input
                  type="text"
                  id="phoneNumber"
                  name="phoneNumber"
                  className={`input flex-1 rounded-l-none ${phoneError ? 'border-red-500' : ''}`}
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </div>
              {phoneError && (
                <p className="text-red-500 text-sm mt-1">{phoneError}</p>
              )}
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className="input"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 ${isLoading ? 'bg-primary-400' : 'bg-primary-600 hover:bg-primary-700'} text-white font-medium rounded-md transition-colors flex justify-center items-center`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  PROCESSING...
                </>
              ) : (
                'CONTINUE'
              )}
            </button>
          </form>
          
          <div className="text-center mt-6">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-800">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;