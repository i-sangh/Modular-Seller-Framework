const User = require('../models/userModel');

/**
 * Deletes unverified first-time users who haven't verified their email within the specified time
 * @param {number} minutes - Time in minutes after which unverified users should be deleted
 */
const cleanupUnverifiedUsers = async (minutes = 10) => {
  try {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    
    // Find and delete users who:
    // 1. Are not verified (isVerified: false)
    // 2. Were created more than 'minutes' ago
    // 3. Still have a verification code (meaning they haven't completed verification)
    const result = await User.deleteMany({
      isVerified: false,
      createdAt: { $lt: cutoffTime },
      verificationCode: { $ne: null }
    });
    
    console.log(`Cleanup Service: Checked for unverified users older than ${minutes} minutes`);
    if (result.deletedCount > 0) {
      console.log(`Cleanup Service: Deleted ${result.deletedCount} unverified user accounts`);
    } else {
      console.log('Cleanup Service: No accounts to delete');
    }
    
    // For debugging: Find unverified accounts that weren't deleted
    const remainingUnverified = await User.find({
      isVerified: false,
      verificationCode: { $ne: null }
    });
    
    if (remainingUnverified.length > 0) {
      console.log(`Cleanup Service: Found ${remainingUnverified.length} unverified accounts that were not deleted`);
      remainingUnverified.forEach(user => {
        const accountAge = (Date.now() - new Date(user.createdAt).getTime()) / (60 * 1000);
        console.log(`- User ${user.email} created ${accountAge.toFixed(1)} minutes ago`);
      });
    }
  } catch (error) {
    console.error('Error in user cleanup service:', error);
  }
};

module.exports = {
  cleanupUnverifiedUsers
};
