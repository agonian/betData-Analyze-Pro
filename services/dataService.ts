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
  // Save Data
  saveData: async (data: MatchData[]): Promise<void> => {
    try {
      console.log(`Veri sıkıştırılıyor (${data.length} satır)...`);
      
      const jsonString = JSON.stringify(data);
      const buf = new TextEncoder().encode(jsonString);
      
      const zipData = await new Promise<Uint8Array>((resolve, reject) => {
        try {
          fflate.zip({ 'data.json': buf }, { level: 6 }, (err: Error | null, out: Uint8Array) => {
              if (err) return reject(err);
              resolve(out);
          });
        } catch (e) {
          reject(e);
        }
      });

      const timestamp = Date.now();
      const filename = `data_v${timestamp}.zip`;

      const zipFile = new File([zipData as any], filename, { type: 'application/zip' });
      
      console.log(`Yükleniyor: ${filename} (${(zipFile.size / 1024 / 1024).toFixed(2)}MB)`);

      await upload(filename, zipFile, {
        access: 'public',
        handleUploadUrl: '/api/data',
      });

      // Update Local Cache Immediately
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
      console.log("Mevcut veri sunucudan indiriliyor (Birleştirme için)...");
      // CRITICAL FIX: Always force update (true) to ensure we have the absolute latest data from server
      // before appending. relying on cache here causes data overwrite issues.
      let currentData: MatchData[] = [];
      try {
          currentData = await dataService.getAllData(true);
      } catch (e) {
          console.warn("Mevcut veri çekilemedi, boş liste ile başlanıyor.", e);
          currentData = [];
      }
      
      const startId = currentData.length > 0 ? Math.max(...currentData.map(d => d.id)) + 1 : 0;
      const preparedNewData = newData.map((item, index) => ({
          ...item,
          id: startId + index
      }));

      const combinedData = [...currentData, ...preparedNewData];
      console.log(`Birleştirme tamamlandı. Eski: ${currentData.length}, Yeni: ${preparedNewData.length}, Toplam: ${combinedData.length}`);
      
      await dataService.saveData(combinedData);
    } catch (error) {
       console.error("Append Error:", error);
       throw error;
    }
  },

  // NUCLEAR OPTION
  nukeData: async (): Promise<void> => {
      try {
          console.log("🔥 Nükleer temizlik başlatılıyor...");
          await localforage.clear();
          localStorage.removeItem('betdata_user_session');
          console.log("🔥 Yerel veri temizlendi.");
      } catch (e) {
          console.error("Nuke Error:", e);
      }
  },

  // Get All Data (Robust Version)
  getAllData: async (forceUpdate: boolean = false): Promise<MatchData[]> => {
    try {
      const clientTimestamp = Date.now();

      // STEP 1: Get Metadata (Version & URL)
      const metaRes = await fetch(`/api/data?type=metadata&_t=${clientTimestamp}`, { 
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      
      if (metaRes.status === 404) return [];
      if (!metaRes.ok) throw new Error(`Sunucu hatası: ${metaRes.status}`);

      const meta = await metaRes.json();
      const serverVersion = meta.timestamp || 0;
      const downloadUrl = meta.url;

      // STEP 2: Check Local Cache
      if (!forceUpdate) {
          const localVersion = await localforage.getItem<number>('dataVersion');
          if (localVersion && localVersion === serverVersion) {
              const cachedData = await localforage.getItem<MatchData[]>('matchData');
              if (cachedData) {
                  console.log("Güncel veri önbellekten yüklendi.");
                  return cachedData;
              }
          }
      } else {
          // Force mode: Clear first
          console.log("⚡ Zorla güncelleme: Yerel veri temizleniyor...");
          await localforage.clear();
      }

      console.log(`Yeni veri indiriliyor (v${serverVersion})...`);

      if (!downloadUrl) {
          throw new Error("İndirme linki bulunamadı.");
      }

      // STEP 3: Download File Directly
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`Dosya indirilemedi (${response.status})`);
      
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // STEP 4: Unzip
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

      // STEP 5: Cache
      await localforage.clear();
      await localforage.setItem('dataVersion', serverVersion);
      await localforage.setItem('matchData', data);
      
      console.log("Veri başarıyla güncellendi.");
      return Array.isArray(data) ? data : [];

    } catch (error: any) {
      console.error("Veri Çekme Hatası:", error);
      
      // If regular check fails, try to return cache
      if (!forceUpdate) {
        const cached = await localforage.getItem<MatchData[]>('matchData');
        return cached || [];
      }
      
      // If forced, throw the actual error to display in UI
      throw error;
    }
  },

  clearData: async (): Promise<void> => {
     await dataService.saveData([]);
  },

  removeDuplicates: async (): Promise<{ removedCount: number }> => {
    // Force get fresh data to be sure
    const allData = await dataService.getAllData(true);
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