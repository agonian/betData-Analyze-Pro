import * as XLSX from 'xlsx';
import { MatchData, COLUMNS, EXCEL_HEADERS } from '../types';

export const parseExcelFile = async (file: File): Promise<MatchData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Assume first row is header
        const headers = rawData[0] as string[];
        const rows = rawData.slice(1) as any[][];

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
    reader.readAsBinaryString(file);
  });
};