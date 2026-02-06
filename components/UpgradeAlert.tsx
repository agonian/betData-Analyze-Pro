import React from 'react';
import { Lock, CheckCircle2, MessageCircle, Send } from 'lucide-react';

export const UpgradeAlert: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
        {/* Blur overlay for the background table content behind this panel */}
        <div className="h-24 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none absolute -top-24 left-0 right-0" />
        
        <div className="bg-slate-900 text-white p-6 shadow-2xl border-t-4 border-amber-500">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-amber-500 p-2 rounded-lg text-slate-900">
                            <Lock size={24} />
                        </div>
                        <h3 className="text-2xl font-bold">Tam Sürüme Erişin</h3>
                    </div>
                    <p className="text-slate-300 max-w-2xl">
                        Şu anda demo modundasınız ve verilerin sadece kısıtlı bir kısmını (50 satır) görebiliyorsunuz. 
                        Tüm veri setine (300.000+ satır), sınırsız filtrelemeye ve yapay zeka analizine erişmek için Premium'a geçin.
                    </p>
                    <div className="flex gap-4 mt-3 text-sm text-slate-400">
                        <span className="flex items-center"><CheckCircle2 size={14} className="text-green-500 mr-1"/> Sınırsız Veri</span>
                        <span className="flex items-center"><CheckCircle2 size={14} className="text-green-500 mr-1"/> Excel Export</span>
                        <span className="flex items-center"><CheckCircle2 size={14} className="text-green-500 mr-1"/> 7/24 Destek</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <a 
                        href="https://wa.me/905555555555" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition-all shadow-lg shadow-green-900/20 hover:scale-105"
                    >
                        <MessageCircle size={20} />
                        WhatsApp ile Satın Al
                    </a>
                    <a 
                        href="https://t.me/username" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20 hover:scale-105"
                    >
                        <Send size={20} />
                        Telegram ile İletişime Geç
                    </a>
                </div>
            </div>
        </div>
    </div>
  );
};