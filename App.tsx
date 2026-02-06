import React, { useState, useMemo, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { VirtualTable } from './components/VirtualTable';
import { SmartAssistant } from './components/SmartAssistant';
import { Auth } from './components/Auth';
import { UpgradeAlert } from './components/UpgradeAlert';
import { AdminPanel } from './components/AdminPanel';
import { ManualEntryModal } from './components/ManualEntryModal';
import { parseExcelFile } from './utils/excelParser';
import { MatchData, User } from './types';
import { authService } from './services/authService';
import { dataService } from './services/dataService';
import { Database, AlertCircle, LogOut, Crown, Shield, Clock, Loader2, CopyPlus, Eraser, FilePlus2, Trash2, PenLine, X } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [masterData, setMasterData] = useState<MatchData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializingData, setIsInitializingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Admin Options
  const [isAppendMode, setIsAppendMode] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // State for timer
  const [now, setNow] = useState(Date.now());

  // 1. Timer Tick Effect
  useEffect(() => {
     const interval = setInterval(() => {
         setNow(Date.now());
     }, 1000);
     return () => clearInterval(interval);
  }, []);

  // 2. Premium Expiration Check Effect
  useEffect(() => {
      if (user && user.role === 'premium' && user.premiumExpiresAt) {
          if (now > user.premiumExpiresAt) {
              const updatedUser: User = { ...user, role: 'free', premiumExpiresAt: undefined };
              // Persist change
              authService.updateUser(updatedUser);
              // Update state
              setUser(updatedUser);
              alert("Premium süreniz doldu. Demo versiyona geçiş yapıldı.");
          }
      }
  }, [now, user]);

  // 3. Load Data from DB on Login
  useEffect(() => {
    const loadPersistedData = async () => {
      if (user) {
        setIsInitializingData(true);
        try {
          const savedData = await dataService.getAllData();
          if (savedData && savedData.length > 0) {
            setMasterData(savedData);
          }
        } catch (err) {
          console.error("Veri yüklenemedi:", err);
        } finally {
          setIsInitializingData(false);
        }
      }
    };

    loadPersistedData();
  }, [user]);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setMasterData([]); // Clear memory, but DB remains
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      setTimeout(async () => {
        try {
            const parsedData = await parseExcelFile(file);
            
            if (isAppendMode) {
                // Append Mode
                await dataService.appendData(parsedData);
                // Refresh data from DB to ensure IDs are correct and we have everything
                const allData = await dataService.getAllData();
                setMasterData(allData);
                alert(`${parsedData.length} satır başarıyla eklendi.`);
            } else {
                // Overwrite Mode
                await dataService.saveData(parsedData);
                setMasterData(parsedData);
            }
            
            setIsLoading(false);
        } catch (err) {
            console.error(err);
            setError("Dosya işlenirken bir hata oluştu. Lütfen formatı kontrol edin.");
            setIsLoading(false);
        }
      }, 100);
    } catch (err) {
      setError("Beklenmedik bir hata oluştu.");
      setIsLoading(false);
    }
  };

  const confirmClear = async () => {
    setShowClearConfirm(false);
    setIsLoading(true);
    try {
      await dataService.clearData();
      setMasterData([]);
      setError(null);
    } catch (e) {
      setError("Veriler silinirken hata oluştu.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleManualAdd = async (newData: MatchData) => {
      setIsLoading(true);
      try {
          await dataService.appendData([newData]);
          const freshData = await dataService.getAllData();
          setMasterData(freshData);
          setIsManualModalOpen(false);
          alert("Kayıt başarıyla eklendi.");
      } catch(e) {
          console.error(e);
          setError("Manuel kayıt eklenirken hata oluştu.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleRemoveDuplicates = async () => {
      setIsLoading(true);
      try {
          const result = await dataService.removeDuplicates();
          if (result.removedCount > 0) {
              const freshData = await dataService.getAllData();
              setMasterData(freshData);
              alert(`İşlem tamamlandı: ${result.removedCount} adet yinelenen satır silindi.`);
          } else {
              alert("Yinelenen veri bulunamadı.");
          }
      } catch (e) {
          console.error(e);
          setError("Yinelenen veriler silinirken hata oluştu.");
      } finally {
          setIsLoading(false);
      }
  };

  // Logic to determine what data the user sees
  const displayedData = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin' || user.role === 'premium') {
        return masterData;
    }
    // Free user gets limited data
    return masterData.slice(0, 50);
  }, [user, masterData]);

  // Calculate time remaining string
  const timeRemaining = useMemo(() => {
      if(user && user.role === 'premium' && user.premiumExpiresAt) {
          const diff = Math.max(0, user.premiumExpiresAt - now);
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          
          if(minutes > 60) {
              const hours = Math.floor(minutes / 60);
              return `${hours} Saat Kaldı`;
          }
          return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      }
      return null;
  }, [user, now]);

  // Conditional Return for Auth Screen
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      {/* Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
        <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg shadow-lg shadow-purple-900/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
                <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
                BetData <span className="text-blue-400">Analyze</span>
                </h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Profesyonel Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Timer Badge for Premium */}
             {user.role === 'premium' && timeRemaining && (
                 <div className="hidden md:flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-xs font-bold shadow-lg shadow-amber-500/20 animate-pulse">
                     <Clock size={12} />
                     <span>{timeRemaining}</span>
                 </div>
             )}

             {/* Role Badge */}
             <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${
                 user.role === 'admin' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 
                 user.role === 'premium' ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 
                 'bg-slate-700 border-slate-600 text-slate-300'
             }`}>
                {user.role === 'admin' && <Shield size={12} />}
                {user.role === 'premium' && <Crown size={12} />}
                {user.role === 'admin' ? 'YÖNETİCİ' : user.role === 'premium' ? 'PREMIUM ÜYE' : 'DEMO HESAP'}
             </div>

             <div className="h-6 w-px bg-slate-700 mx-1"></div>

             <div className="text-right hidden md:block">
                 <div className="text-sm font-medium text-white">{user.username}</div>
             </div>
             
             <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Çıkış Yap"
             >
                <LogOut size={18} />
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[98%] w-full mx-auto py-6 px-4 pb-32">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Admin Dashboard */}
        {user.role === 'admin' && (
            <div className="flex flex-col gap-6">
                <AdminPanel />
                
                {/* Data Management Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Database className="text-blue-600" size={24} />
                        Veri Seti İşlemleri
                    </h2>
                    
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Left: Upload */}
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                   {isAppendMode ? <CopyPlus size={18} className="text-green-600" /> : <FilePlus2 size={18} className="text-blue-600" />}
                                   Mod: {isAppendMode ? "Listeye Ekleme (Append)" : "Yeni Liste (Eskileri Sil)"}
                                </span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={isAppendMode}
                                        onChange={() => setIsAppendMode(!isAppendMode)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                            </div>
                            <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
                        </div>

                        {/* Right: Maintenance Actions */}
                        <div className="w-full md:w-64 flex flex-col gap-3">
                             <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 h-full flex flex-col justify-center">
                                 <h3 className="font-bold text-sm text-gray-500 uppercase mb-4 tracking-wider">Bakım Araçları</h3>
                                 
                                 <button
                                     onClick={() => setIsManualModalOpen(true)}
                                     disabled={isLoading}
                                     className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition-colors border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                     <PenLine size={18} />
                                     Manuel Veri Ekle
                                 </button>

                                 <button
                                     onClick={handleRemoveDuplicates}
                                     disabled={masterData.length === 0 || isLoading}
                                     className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition-colors border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                     <Eraser size={18} />
                                     Yinelenenleri Sil
                                 </button>

                                 <button 
                                     onClick={() => setShowClearConfirm(true)}
                                     disabled={masterData.length === 0 || isLoading}
                                     className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition-colors border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                     <Trash2 size={18} />
                                     Tüm Veriyi Temizle
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Data Loading State */}
        {isInitializingData ? (
             <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8">
                 <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                 <p className="text-gray-500 font-medium">Veriler yükleniyor...</p>
             </div>
        ) : (
             /* Data Display Logic */
            masterData.length === 0 ? (
            user.role === 'admin' ? null : (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-200 mt-8">
                    <div className="bg-blue-50 p-6 rounded-full mb-6 animate-pulse">
                        <Database className="w-12 h-12 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Veri Bekleniyor</h3>
                    <p className="text-gray-500 max-w-md">
                        Şu anda sistemde aktif bir veri seti bulunmamaktadır. Yöneticinin veri yüklemesini bekleyin.
                    </p>
                </div>
            )
            ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-4">
                <VirtualTable data={displayedData} isDemo={user.role === 'free'} />
                
                <div className="mt-2 text-center text-xs text-gray-400">
                {user.role === 'free' 
                    ? `Demo Modu: ${masterData.length} kayıttan sadece 50 tanesi gösteriliyor.`
                    : `Toplam ${masterData.length.toLocaleString()} kayıt listeleniyor.`
                }
                </div>
            </div>
            )
        )}
      </main>

      {/* Conditionally render Upgrade Alert for free users if data exists */}
      {!isInitializingData && user.role === 'free' && masterData.length > 0 && <UpgradeAlert />}

      {/* AI Assistant - Available for everyone but context differs based on data visibility */}
      {!isInitializingData && masterData.length > 0 && <SmartAssistant data={displayedData} />}

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
          <ManualEntryModal 
            onClose={() => setIsManualModalOpen(false)} 
            onSave={handleManualAdd} 
          />
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 scale-100 animate-in zoom-in-95 duration-200 relative">
                <button 
                    onClick={() => setShowClearConfirm(false)} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>
                
                <div className="flex flex-col items-center text-center">
                    <div className="p-4 rounded-full mb-4 bg-red-100 text-red-600">
                        <Trash2 size={32} />
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Verileri Temizle
                    </h3>
                    
                    <p className="text-gray-500 mb-6">
                        Tüm veri tabanındaki maç verilerini kalıcı olarak silmek istediğinize emin misiniz? <br/>
                        <span className="text-red-500 text-xs font-bold mt-1 block">Bu işlem geri alınamaz!</span>
                    </p>
                    
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => setShowClearConfirm(false)}
                            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
                        >
                            İptal
                        </button>
                        <button 
                            onClick={confirmClear}
                            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-red-500/30"
                        >
                            Evet, Temizle
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;