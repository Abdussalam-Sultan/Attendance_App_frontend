/**
 * Offline Service
 * Manages local storage (IndexedDB) and synchronization queue for offline capabilities.
 */

const DB_NAME = 'CheckoutOfflineDB';
const DB_VERSION = 1;

export interface SyncAction {
  id: string;
  url: string;
  method: string;
  body: any;
  headers: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

class OfflineService {
  private db: IDBDatabase | null = null;

  async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        
        // Store for queued actions (mutations like clock-in)
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
        
        // Store for data caching (GET requests)
        if (!db.objectStoreNames.contains('apiCache')) {
          db.createObjectStore('apiCache', { keyPath: 'url' });
        }
      };
    });
  }

  /**
   * Caches data from a GET request
   */
  async cacheData(url: string, data: any) {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['apiCache'], 'readwrite');
      const store = transaction.objectStore('apiCache');
      const request = store.put({ url, data, timestamp: Date.now() });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves cached data for a URL
   */
  async getCachedData(url: string): Promise<any | null> {
    const db = await this.initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(['apiCache'], 'readonly');
      const store = transaction.objectStore('apiCache');
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Queues an action to be performed when online
   */
  async queueAction(url: string, method: string, body: any, headers: Record<string, string>) {
    const db = await this.initDB();
    const action: SyncAction = {
      id: crypto.randomUUID(),
      url,
      method,
      body,
      headers,
      timestamp: Date.now(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.add(action);
      request.onsuccess = () => resolve(action);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Gets all pending sync actions
   */
  async getPendingActions(): Promise<SyncAction[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Removes an action from the queue
   */
  async removeAction(id: string) {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Processes the sync queue
   */
  async processSyncQueue(onProgress?: (action: SyncAction, success: boolean) => void) {
    if (!navigator.onLine) return;
    
    const actions = await this.getPendingActions();
    if (actions.length === 0) return;

    for (const action of actions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: JSON.stringify(action.body)
        });

        if (response.ok) {
          await this.removeAction(action.id);
          if (onProgress) onProgress(action, true);
        } else {
          // If it's a 4xx error (user error), we might want to remove it
          // If it's a 5xx error (server error), we keep it for retry
          if (response.status < 500) {
            await this.removeAction(action.id);
            if (onProgress) onProgress(action, false);
          }
        }
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        // Still offline or transient error, keep in queue
      }
    }
  }
}

export const offlineService = new OfflineService();
