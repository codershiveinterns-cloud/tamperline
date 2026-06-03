/**
 * Firebase Client - Handles data sync and restoration
 * This library provides methods to backup and restore Tamperline data from Firebase
 */

class TamperlineFirebaseClient {
  constructor(serverUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000') {
    this.serverUrl = serverUrl;
    this.userId = this.getUserId();
  }

  /**
   * Generate or retrieve a unique user ID
   */
  getUserId() {
    let userId = localStorage.getItem('tl_user_id');
    if (!userId) {
      userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('tl_user_id', userId);
    }
    return userId;
  }

  /**
   * Sync all local data to Firebase
   */
  async syncToFirebase() {
    try {
      const tlData = this.getLocalData();
      const response = await fetch(`${this.serverUrl}/backup-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          bookings: tlData.bookings || [],
          inventory: tlData.inventory || [],
          batches: tlData.batches || []
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('[Firebase] Sync successful:', result.message);
        return { success: true, message: result.message };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('[Firebase] Sync failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore all data from Firebase to local storage
   */
  async restoreFromFirebase() {
    try {
      const response = await fetch(`${this.serverUrl}/get-backup/${this.userId}`);
      const result = await response.json();

      if (!result.success || !result.backup) {
        console.log('[Firebase] No backup found');
        return { success: false, message: 'No backup found' };
      }

      const backup = result.backup;
      const tlData = this.getLocalData();

      // Merge or replace data
      tlData.bookings = backup.bookings || tlData.bookings;
      tlData.inventory = backup.inventory || tlData.inventory;
      tlData.batches = backup.batches || tlData.batches;

      localStorage.setItem('_tamperline_data', JSON.stringify(tlData));
      console.log('[Firebase] Restore successful');
      return { success: true, data: tlData, message: 'Data restored from Firebase' };
    } catch (error) {
      console.error('[Firebase] Restore failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get local Tamperline data from localStorage
   */
  getLocalData() {
    const rawData = localStorage.getItem('_tamperline_data') || '{}';
    try {
      return JSON.parse(rawData);
    } catch {
      return {};
    }
  }

  /**
   * Check Firebase connectivity
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.serverUrl}/health`);
      const result = await response.json();
      console.log('[Firebase] Health check:', result);
      return result.status === 'ok';
    } catch (error) {
      console.error('[Firebase] Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Auto-sync data every N minutes
   */
  enableAutoSync(intervalMinutes = 5) {
    const intervalMs = intervalMinutes * 60 * 1000;
    setInterval(() => {
      console.log('[Firebase] Auto-syncing data...');
      this.syncToFirebase();
    }, intervalMs);
    console.log(`[Firebase] Auto-sync enabled every ${intervalMinutes} minutes`);
  }
}

// Initialize and export
const FirebaseClient = new TamperlineFirebaseClient();
