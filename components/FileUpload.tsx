import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-white hover:border-gray-400'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".xlsx, .xls, .csv"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      {isLoading ? (
        <div className="flex flex-col items-center text-blue-600">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="font-semibold text-lg">Veriler işleniyor...</p>
          <p className="text-sm text-gray-500 mt-2">Büyük dosyalar için bu işlem biraz sürebilir.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-gray-500 text-center p-4">
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <FileSpreadsheet className="w-10 h-10 text-green-600" />
          </div>
          <p className="text-xl font-semibold text-gray-700 mb-2">
            Excel Dosyasını Buraya Sürükleyin
          </p>
          <p className="text-sm mb-6 max-w-sm">
            veya dosya seçmek için tıklayın. .xlsx ve .csv formatları desteklenir.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center shadow-lg shadow-blue-600/20"
          >
            <Upload className="w-4 h-4 mr-2" />
            Dosya Seç
          </button>
        </div>
      )}
    </div>
  );
};