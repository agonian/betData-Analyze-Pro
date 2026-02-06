import { MatchData } from '../types';
import * as XLSX from 'xlsx';
import { upload } from '@vercel/blob/client';

const DATA_FILE_NAME = 'main-data.json';

export const dataService = {
  // Save Data (Uploads to Vercel Blob)
  saveData: async (data: MatchData[]): Promise<void> => {
    try {
      // 1. Convert data to Blob
      const jsonString = JSON.stringify(data);
      const file = new File([jsonString], DATA_FILE_NAME, { type: 'application/json' });

      // 2. Upload using client SDK (bypasses server payload limits)
      // We call our /api/data endpoint to get the permission token
      const newBlob = await upload(DATA_FILE_NAME, file, {
        access: 'public',
        handleUploadUrl: '/api/data',
      });

      console.log("Data saved to:", newBlob.url);
      return;
    } catch (error) {
      console.error("Save Error:", error);
      throw new Error("Veri kaydedilirken hata oluştu.");
    }
  },

  // Append Data (Downloads, Appends, Re-uploads)
  appendData: async (newData: MatchData[]): Promise<void> => {
    try {
      const currentData = await dataService.getAllData();
      
      // Determine new IDs
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

  // Get All Data (Fetches from API which reads Blob)
  getAllData: async (): Promise<MatchData[]> => {
    try {
      const response = await fetch('/api/data');
      if (response.status === 404) {
          return []; // No data yet
      }
      if (!response.ok) {
          throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Fetch Error:", error);
      return [];
    }
  },

  clearData: async (): Promise<void> => {
     // Save empty array
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