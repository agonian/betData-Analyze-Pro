import * as XLSX from 'xlsx';
import { MatchData, COLUMNS, EXCEL_HEADERS } from '../types';

export const parseExcelFile = async (file: File): Promise<MatchData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error("Excel dosyasında sayfa bulunamadı.");
        }

        let rawData: any[][] = [];
        let usedSheetName = "";

        // Find the first sheet that has data
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];
            if (sheetData && sheetData.length > 0) {
                rawData = sheetData;
                usedSheetName = sheetName;
                break;
            }
        }
        
        if (!rawData || rawData.length === 0) {
          throw new Error(`Excel dosyası boş veya okunamadı. (İncelenen sayfa sayısı: ${workbook.SheetNames.length})`);
        }

        // Assume first row is header
        const headers = rawData[0] as string[];
        const rows = rawData.slice(1) as any[][];

        if (rows.length === 0) {
          throw new Error("Excel dosyasında veri satırı bulunamadı.");
        }

        const mappedData: MatchData[] = rows.map((row, index) => {
          const item: any = { id: index };
          
          COLUMNS.forEach((col) => {
            const possibleHeaders = EXCEL_HEADERS[col as string] || [String(col)];
            let fileHeaderIndex = -1;
            
            for (const header of possibleHeaders) {
              fileHeaderIndex = headers.findIndex(h => h && h.toString().trim() === header);
              if (fileHeaderIndex > -1) break;
            }

            if (fileHeaderIndex > -1) {
               item[col] = row[fileHeaderIndex] ?? "-";
            } else {
               item[col] = "-";
            }
          });
          return item as MatchData;
        });

        resolve(mappedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};