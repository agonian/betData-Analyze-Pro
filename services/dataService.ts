import { MatchData } from '../types';
import * as XLSX from 'xlsx';
import { upload } from '@vercel/blob/client';
import * as fflate from 'fflate';
import localforage from 'localforage';

const DATA_FILE_ZIP = 'main-data.zip';
const VERSION_FILE = 'version.json';

// Configure LocalForage
localforage.config({
  name: 'BetDataApp',
  storeName: 'matches'
});

export const dataService = {
  // Save Data: Zips the content, uploads it, and updates the version file
  saveData: async (data: MatchData[]): Promise<void> => {
    try {
      console.log("Sıkıştırma işlemi başlıyor...");
      const jsonString = JSON.stringify(data);
      
      // 1. Compress Data using fflate
      const zipData = await new Promise<Uint8Array>((resolve, reject) => {
        const bytes = fflate.strToU8(jsonString);
        fflate.zip({ 'data.json': bytes }, { level: 6 }, (err: Error | null, out: Uint8Array) => {
            if (err) reject(err);
            else resolve(out);
        });
      });

      // Cast zipData to any or BlobPart because TypeScript strictness might conflict with ArrayBufferLike types in some environments
      const zipFile = new File([zipData as any], DATA_FILE_ZIP, { type: 'application/zip' });
      
      console.log(`Veri sıkıştırıldı. Orijinal: ${(jsonString.length / 1024 / 1024).toFixed(2)}MB, Sıkıştırılmış: ${(zipFile.size / 1024 / 1024).toFixed(2)}MB`);

      // 2. Upload Zip
      await upload(DATA_FILE_ZIP, zipFile, {
        access: 'public',
        handleUploadUrl: '/api/data',
      });

      // 3. Upload Version File
      const newVersion = { timestamp: Date.now(), count: data.length };
      const versionFile = new File([JSON.stringify(newVersion)], VERSION_FILE, { type: 'application/json' });
      
      await upload(VERSION_FILE, versionFile, {
        access: 'public',
        handleUploadUrl: '/api/data',
      });

      // 4. Update local cache immediately
      // CLEAR old data first to avoid corruption or memory issues
      await localforage.clear(); 
      await localforage.setItem('dataVersion', newVersion.timestamp);
      await localforage.setItem('matchData', data);

      console.log("Veri ve versiyon bilgisi güncellendi.");
      return;
    } catch (error) {
      console.error("Save Error:", error);
      throw new Error("Veri sıkıştırılırken veya yüklenirken hata oluştu.");
    }
  },

  // Append Data: Downloads full data, unzips, appends, zips, uploads
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

  // Get All Data: Smart Fetching (Cache -> Version Check -> Download -> Unzip)
  // forceUpdate: Skips cache check and downloads fresh data
  getAllData: async (forceUpdate: boolean = false): Promise<MatchData[]> => {
    try {
      const timestamp = Date.now();
      
      // 1. Get Server Version
      const versionRes = await fetch(`/api/data?type=version&_t=${timestamp}`, { 
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      const serverVersionData = await versionRes.json();
      const serverTimestamp = serverVersionData.timestamp || 0;

      // 2. Check Local Cache (Only if NOT forced)
      if (!forceUpdate) {
          const localTimestamp = await localforage.getItem<number>('dataVersion');
          if (localTimestamp && localTimestamp === serverTimestamp) {
              const cachedData = await localforage.getItem<MatchData[]>('matchData');
              if (cachedData) {
                  console.log("Veriler yerel önbellekten yüklendi (Versiyon eşleşti).");
                  return cachedData;
              }
          }
      }

      console.log(forceUpdate ? "Zorla güncelleme istendi." : "Yeni veri indiriliyor...", "Sunucu Zamanı:", serverTimestamp);

      // 3. Download Zip - Add timestamp to force bypass cache
      const response = await fetch(`/api/data?_t=${timestamp}`, {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      
      if (response.status === 404) return [];
      
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // 4. Unzip
      const jsonString = await new Promise<string>((resolve, reject) => {
          fflate.unzip(uint8Array, (err: Error | null, unzipped: fflate.Unzipped) => {
              if (err) return reject(err);
              const fileContent = unzipped['data.json'];
              if (fileContent) {
                  resolve(fflate.strFromU8(fileContent));
              } else {
                  reject(new Error("Zip içinde data.json bulunamadı"));
              }
          });
      });

      const data = JSON.parse(jsonString);

      // 5. Update Cache (Clear first)
      await localforage.clear();
      await localforage.setItem('dataVersion', serverTimestamp);
      await localforage.setItem('matchData', data);
      
      console.log("Veri indirildi, açıldı ve önbelleklendi.");
      return Array.isArray(data) ? data : [];

    } catch (error) {
      console.error("Fetch/Unzip Error:", error);
      // Fallback: try to return cache even if error occurs, unless forced
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