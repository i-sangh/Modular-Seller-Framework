const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Route to register a new user
router.post('/register', registerUser);

// Route to login a user
router.post('/login', loginUser);

// Route to logout a user
router.post('/logout', protect, logoutUser);

module.exports = router;