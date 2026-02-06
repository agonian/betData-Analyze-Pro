import * as XLSX from 'xlsx';
import { MatchData, COLUMNS } from '../types';

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
          // Map based on known columns to ensure structure, or fallback to index
          COLUMNS.forEach((col, colIndex) => {
            // Find the index in the file's header that matches our column name
            // Or just map sequentially if headers aren't perfect
            const fileHeaderIndex = headers.indexOf(String(col));
            if (fileHeaderIndex > -1) {
               item[col] = row[fileHeaderIndex] || "-";
            } else {
               // Fallback: assume the order in file matches our COLUMNS list
               item[col] = row[colIndex] || "-";
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