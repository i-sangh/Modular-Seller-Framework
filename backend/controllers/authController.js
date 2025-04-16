const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phoneCountryCode, phoneNumber } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phoneCountryCode,
      phoneNumber,
      password
    });

    if (user) {
      // Generate token
      const token = generateToken(user._id);

      // Set cookie
      res.cookie('jwt', token, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'strict'
      });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneCountryCode: user.phoneCountryCode,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    
    // Check if user exists and password is correct
    if (user && (await user.matchPassword(password))) {
      // Generate token
      const token = generateToken(user._id);

      // Set cookie
      res.cookie('jwt', token, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'strict'
      });

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneCountryCode: user.phoneCountryCode,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0)
  });
  res.status(200).json({ message: 'Logged out successfully' });
};