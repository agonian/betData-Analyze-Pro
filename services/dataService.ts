import { MatchData } from '../types';

const DB_NAME = 'BetDataDB';
const DB_VERSION = 1;
const STORE_NAME = 'matches';

export const dataService = {
  openDB: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  },

  // Overwrite existing data
  saveData: async (data: MatchData[]): Promise<void> => {
    const db = await dataService.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        data.forEach(item => {
          store.put(item);
        });
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = (event) => {
        reject((event.target as IDBTransaction).error);
      };
    });
  },

  // Append to existing data
  appendData: async (newData: MatchData[]): Promise<void> => {
    const db = await dataService.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Get the current count to determine starting ID
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const currentCount = countRequest.result;
        
        newData.forEach((item, index) => {
            // Re-assign ID to ensure continuity
            const itemToSave = { ...item, id: currentCount + index };
            store.put(itemToSave);
        });
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = (event) => {
        reject((event.target as IDBTransaction).error);
      };
    });
  },

  getAllData: async (): Promise<MatchData[]> => {
    const db = await dataService.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  },

  clearData: async (): Promise<void> => {
    const db = await dataService.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // We don't need to listen to request.onsuccess here, 
      // transaction.oncomplete is safer for determining when the commit happens.
      store.clear();

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  },

  removeDuplicates: async (): Promise<{ removedCount: number }> => {
    const allData = await dataService.getAllData();
    const uniqueMap = new Map<string, MatchData>();
    let originalCount = allData.length;

    // Filter using a Map (Key = stringified content excluding ID)
    allData.forEach(item => {
        // Create a signature of the object excluding the ID
        const { id, ...rest } = item;
        const signature = JSON.stringify(rest);
        
        if (!uniqueMap.has(signature)) {
            uniqueMap.set(signature, item);
        }
    });

    const uniqueData = Array.from(uniqueMap.values());
    const removedCount = originalCount - uniqueData.length;

    if (removedCount > 0) {
        // Re-index IDs to be sequential (0 to N)
        const reIndexedData = uniqueData.map((item, index) => ({
            ...item,
            id: index
        }));
        
        // Save the clean data
        await dataService.saveData(reIndexedData);
    }

    return { removedCount };
  }
};