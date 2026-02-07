import { MatchData } from '../types';
import * as XLSX from 'xlsx';
import { upload } from '@vercel/blob/client';
import * as fflate from 'fflate';
import localforage from 'localforage';

// Configure LocalForage
localforage.config({
  name: 'BetDataApp',
  storeName: 'matches'
});

export const dataService = {
  // Save Data: Zips content with a timestamped filename and uploads it
  saveData: async (data: MatchData[]): Promise<void> => {
    try {
      console.log("Veri sıkıştırılıyor...");
      const jsonString = JSON.stringify(data);
      
      // 1. Compress Data using fflate
      const zipData = await new Promise<Uint8Array>((resolve, reject) => {
        const bytes = fflate.strToU8(jsonString);
        // data.json is the internal file name inside the zip
        fflate.zip({ 'data.json': bytes }, { level: 6 }, (err: Error | null, out: Uint8Array) => {
            if (err) reject(err);
            else resolve(out);
        });
      });

      // 2. Generate Dynamic Filename (data_v{TIMESTAMP}.zip)
      // This ensures the URL is always unique, bypassing all cache layers
      const timestamp = Date.now();
      const filename = `data_v${timestamp}.zip`;

      const zipFile = new File([zipData], filename, { type: 'application/zip' });
      
      console.log(`Yükleniyor: ${filename} (${(zipFile.size / 1024 / 1024).toFixed(2)}MB)`);

      // 3. Upload to Vercel Blob
      await upload(filename, zipFile, {
        access: 'public',
        handleUploadUrl: '/api/data',
      });

      // 4. Update Local Cache Immediately
      // We clear first to prevent "QuotaExceededError" on phones
      await localforage.clear(); 
      await localforage.setItem('dataVersion', timestamp);
      await localforage.setItem('matchData', data);

      console.log("Yükleme ve önbellekleme tamamlandı.");
      return;
    } catch (error) {
      console.error("Save Error:", error);
      throw new Error("Veri sıkıştırılırken veya yüklenirken hata oluştu.");
    }
  },

  appendData: async (newData: MatchData[]): Promise<void> => {
    try {
      const currentData = await dataService.getAllData();
      
      const startId = currentData.length > 0 ? Math.max(...currentData.map(d => d.id)) + 1 : 0;
      const preparedNewData = newData.map((item, index) => ({
          ...item,
          id: startId + index
      }));

      const combinedData = [...currentData, ...preparedNewData];
      await dataService.saveData(combinedData);
    } catch (error) {
       console.error("Append Error:", error);
       throw error;
    }
  },

  // Get All Data: Checks version, if new version exists on server, deletes local DB and fetches new one
  getAllData: async (forceUpdate: boolean = false): Promise<MatchData[]> => {
    try {
      const clientTimestamp = Date.now();
      
      // 1. Get Server Version (Dynamic)
      // We request 'type=version' which makes the server check the latest file
      const versionRes = await fetch(`/api/data?type=version&_t=${clientTimestamp}`, { 
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      
      if (!versionRes.ok) return [];
      
      const serverData = await versionRes.json();
      const serverVersion = serverData.timestamp || 0;

      // 2. Check Local Cache (Only if NOT forced)
      if (!forceUpdate) {
          const localVersion = await localforage.getItem<number>('dataVersion');
          if (localVersion && localVersion === serverVersion) {
              const cachedData = await localforage.getItem<MatchData[]>('matchData');
              if (cachedData) {
                  console.log("Güncel veri önbellekten yüklendi.");
                  return cachedData;
              }
          }
      }

      console.log(forceUpdate ? "Zorla güncelleme yapılıyor." : "Yeni versiyon bulundu, indiriliyor...", serverVersion);

      // 3. Download Latest Zip
      // The API redirects to the actual blob url of the latest file
      const response = await fetch(`/api/data?_t=${clientTimestamp}`, {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      
      if (response.status === 404) return [];
      
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // 4. Unzip (Typed strictly)
      const jsonString = await new Promise<string>((resolve, reject) => {
          fflate.unzip(uint8Array, (err: Error | null, unzipped: fflate.Unzipped) => {
              if (err) return reject(err);
              
              const fileContent = unzipped['data.json'];
              if (fileContent) {
                  // fflate.strFromU8 converts Uint8Array to string
                  resolve(fflate.strFromU8(fileContent));
              } else {
                  reject(new Error("Zip arşivi bozuk veya data.json eksik."));
              }
          });
      });

      const data = JSON.parse(jsonString);

      // 5. Update Cache (Critical: Clear first)
      await localforage.clear();
      await localforage.setItem('dataVersion', serverVersion);
      await localforage.setItem('matchData', data);
      
      console.log("Veri güncellendi.");
      return Array.isArray(data) ? data : [];

    } catch (error) {
      console.error("Veri Çekme Hatası:", error);
      
      // Fallback: If network fails, try to return whatever is in cache
      if (!forceUpdate) {
        const cached = await localforage.getItem<MatchData[]>('matchData');
        return cached || [];
      }
      throw error;
    }
  },

  clearData: async (): Promise<void> => {
     await dataService.saveData([]);
  },

  removeDuplicates: async (): Promise<{ removedCount: number }> => {
    const allData = await dataService.getAllData();
    const uniqueMap = new Map<string, MatchData>();
    let originalCount = allData.length;

    allData.forEach(item => {
        const { id, ...rest } = item;
        const signature = JSON.stringify(rest);
        if (!uniqueMap.has(signature)) {
            uniqueMap.set(signature, item);
        }
    });

    const uniqueData = Array.from(uniqueMap.values());
    const removedCount = originalCount - uniqueData.length;

    if (removedCount > 0) {
        const reIndexedData = uniqueData.map((item, index) => ({
            ...item,
            id: index
        }));
        await dataService.saveData(reIndexedData);
    }

    return { removedCount };
  },

  exportToExcel: async (fileName: string = 'BetData_Export.xlsx'): Promise<void> => {
    const data = await dataService.getAllData();
    if (data.length === 0) return;

    const cleanData = data.map(({ id, ...rest }) => rest);
    const worksheet = XLSX.utils.json_to_sheet(cleanData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Maç Verileri");
    XLSX.writeFile(workbook, fileName);
  }
};