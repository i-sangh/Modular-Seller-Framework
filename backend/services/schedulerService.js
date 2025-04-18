const { cleanupUnverifiedUsers } = require('../utils/userCleanupService');

/**
 * Scheduler service to run periodic tasks
 */
class SchedulerService {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
    
    // Configuration
    this.CLEANUP_THRESHOLD_MINUTES = 10; // Time after which unverified users are deleted
    this.CLEANUP_INTERVAL_MINUTES = 10;  // How often to run the cleanup job
  }

  /**
   * Start the scheduler service
   */
  start() {
    if (this.isRunning) return;
    
    console.log('Starting scheduler service...');
    this.isRunning = true;
    
    // Schedule the cleanup job
    const cleanupJob = setInterval(() => {
      console.log(`Running scheduled cleanup for unverified users older than ${this.CLEANUP_THRESHOLD_MINUTES} minutes`);
      cleanupUnverifiedUsers(this.CLEANUP_THRESHOLD_MINUTES);
    }, this.CLEANUP_INTERVAL_MINUTES * 60 * 1000);
    
    this.jobs.push(cleanupJob);
    
    // Run immediately on startup to clean any existing unverified users
    console.log(`Initial cleanup for unverified users older than ${this.CLEANUP_THRESHOLD_MINUTES} minutes`);
    cleanupUnverifiedUsers(this.CLEANUP_THRESHOLD_MINUTES);
    
    console.log(`Scheduler service started with cleanup interval of ${this.CLEANUP_INTERVAL_MINUTES} minutes`);
  }

  /**
   * Stop the scheduler service and clear all jobs
   */
  stop() {
    if (!this.isRunning) return;
    
    console.log('Stopping scheduler service...');
    
    // Clear all interval jobs
    this.jobs.forEach(job => clearInterval(job));
    this.jobs = [];
    this.isRunning = false;
    
    console.log('Scheduler service stopped');
  }
}

// Create a singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService;
