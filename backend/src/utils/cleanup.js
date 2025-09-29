const dbConnection = require('./database');

/**
 * Clean up legacy collections and data structures that are no longer needed
 */
class DatabaseCleanup {
  /**
   * Remove the empty participants collection since we moved to embedded participant data
   */
  static async removeParticipantsCollection() {
    try {
      const db = dbConnection.getDatabase();
      
      // Check if participants collection exists and is empty
      const participantsCount = await db.collection('participants').countDocuments();
      
      if (participantsCount === 0) {
        console.log('[Cleanup] Participants collection is empty, dropping it...');
        await db.collection('participants').drop();
        console.log('[Cleanup] ✅ Successfully dropped empty participants collection');
        return { success: true, message: 'Empty participants collection dropped' };
      } else {
        console.log(`[Cleanup] Participants collection has ${participantsCount} documents, skipping cleanup`);
        return { success: false, message: `Participants collection has ${participantsCount} documents` };
      }
    } catch (error) {
      if (error.message.includes('ns not found')) {
        console.log('[Cleanup] Participants collection does not exist, no cleanup needed');
        return { success: true, message: 'Participants collection does not exist' };
      }
      
      console.error('[Cleanup] Error removing participants collection:', error);
      throw error;
    }
  }

  /**
   * Remove any unused indexes that reference the participants collection
   */
  static async removeParticipantsIndexes() {
    try {
      const db = dbConnection.getDatabase();
      
      // List all collections to check if participants exists
      const collections = await db.listCollections({ name: 'participants' }).toArray();
      
      if (collections.length > 0) {
        console.log('[Cleanup] Dropping indexes for participants collection...');
        await db.collection('participants').dropIndexes();
        console.log('[Cleanup] ✅ Successfully dropped participants indexes');
      }
      
      return { success: true };
    } catch (error) {
      if (error.message.includes('ns not found')) {
        console.log('[Cleanup] Participants collection does not exist, no indexes to remove');
        return { success: true };
      }
      
      console.error('[Cleanup] Error removing participants indexes:', error);
      throw error;
    }
  }

  /**
   * Run all cleanup operations
   */
  static async runCleanup() {
    console.log('[Cleanup] Starting database cleanup...');
    
    try {
      // Remove participants indexes first
      await this.removeParticipantsIndexes();
      
      // Then remove the collection if empty
      await this.removeParticipantsCollection();
      
      console.log('[Cleanup] ✅ Database cleanup completed successfully');
      return { success: true };
    } catch (error) {
      console.error('[Cleanup] ❌ Database cleanup failed:', error);
      throw error;
    }
  }
}

module.exports = DatabaseCleanup;