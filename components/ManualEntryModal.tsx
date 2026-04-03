import React, { useState } from 'react';
import { COLUMNS, MatchData } from '../types';
import { X, Save, Eraser } from 'lucide-react';

interface ManualEntryModalProps {
  onClose: () => void;
  onSave: (data: MatchData) => void;
}

// User friendly labels mapping
const LABELS: Record<string, string> = {
  Tarih: "Tarih (GG.AA.YYYY)",
  Lig: "Lig",
  EvSahibi: "Ev Sahibi Takım",
  Deplasman: "Deplasman Takımı",
  Iy: "İlk Yarı Sonucu (1-0)",
  Ms: "Maç Sonucu (2-1)",
  Iy05: "İY 0.5 (ÜST/ALT)",
  Iy15: "İY 1.5 (ÜST/ALT)",
  Ms15: "MS 1.5 (ÜST/ALT)",
  Ms25: "MS 2.5 (ÜST/ALT)",
  Ms35: "MS 3.5 (ÜST/ALT)",
  Kg: "KG (VAR/YOK)",
  Ms1: "Maç Sonu 1 Oranı",
  MsX: "Maç Sonu X Oranı",
  Ms2: "Maç Sonu 2 Oranı",
  Ust25: "2.5 Üst Oranı",
  Alt25: "2.5 Alt Oranı",
  KgVar: "KG Var Oranı",
  KgYok: "KG Yok Oranı",
  IyMs: "İY/MS (1/1)",
  Arti6: "6+ Gol"
};

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<MatchData>>({});

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Fill missing keys with "-"
    const completeData: any = { id: 0 }; // ID will be overwritten by service
    COLUMNS.forEach(col => {
        completeData[col] = formData[col as keyof MatchData] || "-";
    });
    
    onSave(completeData as MatchData);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
                Manuel Veri Girişi
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
            <form id="manual-entry-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {COLUMNS.map((col) => (
                    <div key={col} className="flex flex-col">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1">
                            {LABELS[col as string] || col}
                        </label>
                        <input
                            type="text"
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder={LABELS[col as string] || String(col)}
                            value={formData[col as keyof MatchData] || ''}
                            onChange={(e) => handleChange(col as string, e.target.value)}
                        />
                    </div>
                ))}
            </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
            <button 
                type="button" 
                onClick={() => setFormData({})}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
                <Eraser size={18} />
                Temizle
            </button>
            <button 
                type="submit" 
                form="manual-entry-form"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-colors"
            >
                <Save size={18} />
                Kaydet ve Ekle
            </button>
        </div>
      </div>
    </div>
  );
};