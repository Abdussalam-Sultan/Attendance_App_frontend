import { useState, useEffect } from 'react';
import { offlineService, SyncAction } from '../lib/offline';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      sync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = async () => {
    const actions = await offlineService.getPendingActions();
    setPendingCount(actions.length);
  };

  const sync = async () => {
    if (isSyncing || !navigator.onLine) return;
    
    setIsSyncing(true);
    try {
      await offlineService.processSyncQueue((action, success) => {
        console.log(`Sync action ${action.id}: ${success ? 'Success' : 'Failed'}`);
      });
      await updatePendingCount();
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Wrapper for fetch that handles offline caching and queuing
   */
  const smartFetch = async (url: string, options: RequestInit = {}) => {
    const method = options.method || 'GET';
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

    if (!navigator.onLine) {
      if (isMutation) {
        // Queue mutation for later
        const headers: Record<string, string> = {};
        if (options.headers) {
          const h = new Headers(options.headers);
          h.forEach((value, key) => {
            headers[key] = value;
          });
        }

        let body = null;
        if (options.body) {
          try {
            body = JSON.parse(options.body as string);
          } catch (e) {
            body = options.body;
          }
        }

        await offlineService.queueAction(url, method, body, headers);
        await updatePendingCount();
        
        // Return a mock successful response for the UI to continue
        return {
          ok: true,
          status: 202, // Accepted
          json: async () => ({ success: true, offline: true, message: 'Action queued for sync' })
        } as Response;
      } else {
        // Try to get from cache for GET requests
        const cachedData = await offlineService.getCachedData(url);
        if (cachedData) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: cachedData, offline: true, cached: true })
          } as Response;
        }
        
        throw new Error('No internet connection and data is not cached');
      }
    }

    // Online: proceed as normal
    const response = await fetch(url, options);
    
    // Cache successful GET requests
    if (response.ok && method === 'GET') {
      const clonedResponse = response.clone();
      try {
        const json = await clonedResponse.json();
        // Extract data wrapper if present
        const dataToCache = json.data || json;
        await offlineService.cacheData(url, dataToCache);
      } catch (e) {
        // Ignore JSON parse errors for non-JSON content
      }
    }

    return response;
  };

  return {
    isOnline,
    isSyncing,
    pendingCount,
    sync,
    smartFetch,
    updatePendingCount
  };
}
