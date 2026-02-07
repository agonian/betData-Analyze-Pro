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
      const buf = new TextEncoder().encode(jsonString);
      
      // 1. Compress Data
      const zipData = await new Promise<Uint8Array>((resolve, reject) => {
        fflate.zip({ 'data.json': buf }, { level: 6 }, (err: Error | null, out: Uint8Array) => {
            if (err) return reject(err);
            resolve(out);
        });
      });

      // 2. Generate Dynamic Filename
      const timestamp = Date.now();
      const filename = `data_v${timestamp}.zip`;

      // TS FIX: Cast to 'any' to solve Uint8Array vs BlobPart mismatch
      const zipFile = new File([zipData as any], filename, { type: 'application/zip' });
      
      console.log(`Yükleniyor: ${filename} (${(zipFile.size / 1024 / 1024).toFixed(2)}MB)`);

      // 3. Upload to Vercel Blob
      await upload(filename, zipFile, {
        access: 'public',
        handleUploadUrl: '/api/data',
      });

      // 4. Update Local Cache
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

  // NUCLEAR OPTION: Wipes everything
  nukeData: async (): Promise<void> => {
      try {
          console.log("🔥 Nükleer temizlik başlatılıyor...");
          await localforage.clear();
          localStorage.removeItem('betdata_user_session'); // Optional: Keeps user logged in if commented out
          console.log("🔥 Yerel veri temizlendi.");
      } catch (e) {
          console.error("Nuke Error:", e);
      }
  },

  getAllData: async (forceUpdate: boolean = false): Promise<MatchData[]> => {
    try {
      const clientTimestamp = Date.now();
      let serverVersion = 0;

      // STEP 1: If NOT forcing, check version normally
      if (!forceUpdate) {
          try {
            const versionRes = await fetch(`/api/data?type=version&_t=${clientTimestamp}`, { 
                cache: 'no-store',
                headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
            });
            if (versionRes.ok) {
                const serverData = await versionRes.json();
                serverVersion = serverData.timestamp || 0;

                const localVersion = await localforage.getItem<number>('dataVersion');
                if (localVersion && localVersion === serverVersion) {
                    const cachedData = await localforage.getItem<MatchData[]>('matchData');
                    if (cachedData) {
                        console.log("Güncel veri önbellekten yüklendi.");
                        return cachedData;
                    }
                }
            }
          } catch (e) { console.warn("Versiyon kontrolü hatası, indirme deneniyor..."); }
      } else {
          console.log("⚡ FORCE MODE: Versiyon kontrolü atlanıyor, veritabanı temizleniyor...");
          // If forcing, clear DB *before* fetching to free up space on mobile
          await localforage.clear();
      }

      // STEP 2: Download Fresh Data
      console.log("Yeni veri indiriliyor...");
      const response = await fetch(`/api/data?_t=${clientTimestamp}`, {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      
      if (response.status === 404) return [];
      
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // STEP 3: Unzip
      const jsonString = await new Promise<string>((resolve, reject) => {
          fflate.unzip(uint8Array, (err: Error | null, unzipped: fflate.Unzipped) => {
              if (err) return reject(err);
              
              const fileContent = unzipped['data.json'];
              if (fileContent) {
                  const decoded = new TextDecoder().decode(fileContent);
                  resolve(decoded);
              } else {
                  reject(new Error("Zip arşivi bozuk veya data.json eksik."));
              }
          });
      });

      const data = JSON.parse(jsonString);

      // STEP 4: Save to Cache (Clear again to be safe)
      await localforage.clear();
      await localforage.setItem('dataVersion', serverVersion || clientTimestamp); // Use timestamp if serverVersion missing
      await localforage.setItem('matchData', data);
      
      console.log("Veri başarıyla güncellendi.");
      return Array.isArray(data) ? data : [];

    } catch (error) {
      console.error("Veri Çekme Hatası:", error);
      
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