const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

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

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = Date.now() + 3 * 60 * 1000; // 3 minutes

    // Create user (unverified)
    const user = await User.create({
      name,
      email,
      phoneCountryCode,
      phoneNumber,
      password,
      verificationCode,
      verificationCodeExpires,
      isVerified: false
    });

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: 'Verify your email',
        text: `Your verification code is: ${verificationCode}`,
        html: `<p>Your verification code is: <b>${verificationCode}</b></p>`
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with registration even if email fails
    }

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
        isVerified: user.isVerified,
        verificationPending: true
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify email code
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    if (
      !user.verificationCode ||
      user.verificationCode !== code ||
      !user.verificationCodeExpires ||
      Date.now() > user.verificationCodeExpires
    ) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resend verification code
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: 'User already verified' });
    }
    if (user.verificationCodeExpires && Date.now() < user.verificationCodeExpires) {
      return res.status(400).json({ message: 'Please wait until the timer expires before resending the code.' });
    }
    // Generate new code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = Date.now() + 3 * 60 * 1000; // 3 minutes
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;
    await user.save();
    // Send email
    await sendEmail({
      to: email,
      subject: 'Your new verification code',
      text: `Your new verification code is: ${verificationCode}`,
      html: `<p>Your new verification code is: <b>${verificationCode}</b></p>`
    });
    res.json({ message: 'Verification code resent' });
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

// @desc    Forgot password - send reset code
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal if the email exists or not
      return res.json({ message: 'If your email is registered, you will receive a reset code shortly.' });
    }
    
    // Generate reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    // Save reset code to user
    user.resetPasswordCode = resetCode;
    user.resetPasswordCodeExpires = resetCodeExpires;
    await user.save();
    
    // Send email with reset code
    await sendEmail({
      to: email,
      subject: 'Password Reset Code',
      text: `Your password reset code is: ${resetCode}. This code will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Password Reset Code</h2>
          <p>You requested a password reset for your account.</p>
          <p>Your password reset code is: <b style="font-size: 18px;">${resetCode}</b></p>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this reset, please ignore this email or contact support if you have concerns.</p>
        </div>
      `
    });
    
    res.json({ message: 'If your email is registered, you will receive a reset code shortly.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'An error occurred while processing your request.' });
  }
};

// @desc    Verify reset code
// @route   POST /api/auth/verify-reset-code
// @access  Public
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }
    
    // Verify reset code
    if (
      !user.resetPasswordCode ||
      user.resetPasswordCode !== code ||
      !user.resetPasswordCodeExpires ||
      Date.now() > user.resetPasswordCodeExpires
    ) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }
    
    res.json({ message: 'Reset code verified successfully.' });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ message: 'An error occurred while processing your request.' });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }
    
    // Verify reset code
    if (
      !user.resetPasswordCode ||
      user.resetPasswordCode !== code ||
      !user.resetPasswordCodeExpires ||
      Date.now() > user.resetPasswordCodeExpires
    ) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }
    
    // Set new password
    user.password = newPassword;
    user.resetPasswordCode = null;
    user.resetPasswordCodeExpires = null;
    await user.save();
    
    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'An error occurred while processing your request.' });
  }
};