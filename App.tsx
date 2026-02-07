import React, { useState, useMemo, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { VirtualTable } from './components/VirtualTable';
import { Auth } from './components/Auth';
import { UpgradeAlert } from './components/UpgradeAlert';
import { AdminPanel } from './components/AdminPanel';
import { ManualEntryModal } from './components/ManualEntryModal';
import { parseExcelFile } from './utils/excelParser';
import { MatchData, User } from './types';
import { authService } from './services/authService';
import { dataService } from './services/dataService';
import { Database, AlertCircle, LogOut, Crown, Shield, Clock, Loader2, CopyPlus, Eraser, FilePlus2, Trash2, PenLine, X, Download, Cloud, PlayCircle, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [masterData, setMasterData] = useState<MatchData[]>([]);
  
  // Loading States
  const [isInitializing, setIsInitializing] = useState(true); // App Startup
  const [isLoading, setIsLoading] = useState(false); // Manual Actions
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Valid Data Present
  
  const [error, setError] = useState<string | null>(null);
  
  // Admin Options
  const [isAppendMode, setIsAppendMode] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // State for timer
  const [now, setNow] = useState(Date.now());

  // 1. Initialize Session on Mount
  useEffect(() => {
     const initApp = async () => {
         const savedUser = authService.getCurrentUser();
         if (savedUser) {
             setUser(savedUser);
             // If we have a user, immediately try to load/sync data
             await performSmartDataSync();
         }
         setIsInitializing(false);
     };
     
     initApp();

     const interval = setInterval(() => {
         setNow(Date.now());
     }, 1000);
     return () => clearInterval(interval);
  }, []);

  // Helper for Smart Data Sync
  const performSmartDataSync = async () => {
      setIsLoading(true);
      setError(null);
      try {
          // dataService.getAllData already handles the "Check Version -> Load DB or Download" logic
          const savedData = await dataService.getAllData();
          if (savedData && savedData.length > 0) {
            setMasterData(savedData);
            setIsDataLoaded(true);
          } else {
             setIsDataLoaded(false);
          }
      } catch (err) {
          console.error("Auto-sync error:", err);
          // Don't show error on auto-sync, just stay in empty state
      } finally {
          setIsLoading(false);
      }
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    setIsDataLoaded(false); 
    setMasterData([]);
    // Trigger sync after login
    performSmartDataSync();
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setMasterData([]);
    setIsDataLoaded(false);
  };

  // Manual Trigger (Re-check version)
  const handleLoadData = async () => {
      await performSmartDataSync();
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
        const parsedData = await parseExcelFile(file);
        
        if (isAppendMode) {
            if (!isDataLoaded && masterData.length === 0) {
               try {
                  const currentData = await dataService.getAllData();
                  const startId = currentData.length > 0 ? Math.max(...currentData.map(d => d.id)) + 1 : 0;
                  const preparedNewData = parsedData.map((item, index) => ({ ...item, id: startId + index }));
                  const combinedData = [...currentData, ...preparedNewData];
                  await dataService.saveData(combinedData);
                  setMasterData(combinedData);
               } catch(e) { throw e; }
            } else {
               await dataService.appendData(parsedData);
               const allData = await dataService.getAllData(); // Sync
               setMasterData(allData);
            }
            alert(`${parsedData.length} satır başarıyla eklendi ve buluta kaydedildi.`);
        } else {
            await dataService.saveData(parsedData);
            setMasterData(parsedData);
            alert("Veriler başarıyla buluta yüklendi.");
        }
        setIsDataLoaded(true);
    } catch (err) {
        console.error(err);
        setError("Dosya işlenirken veya sunucuya yüklenirken hata oluştu.");
    } finally {
        setIsLoading(false);
    }
  };

  const confirmClear = async () => {
    setShowClearConfirm(false);
    setIsLoading(true);
    try {
      await dataService.clearData();
      setMasterData([]);
      setIsDataLoaded(false);
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
          setIsDataLoaded(true);
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

  const handleExport = async () => {
      let dataToExport = masterData;
      if (!isDataLoaded || masterData.length === 0) {
         setIsLoading(true);
         try {
            dataToExport = await dataService.getAllData();
            setMasterData(dataToExport);
            setIsDataLoaded(true);
         } catch(e) {
             alert("Veri indirilemedi.");
             setIsLoading(false);
             return;
         }
         setIsLoading(false);
      }

      if (dataToExport.length === 0) {
          alert("Dışa aktarılacak veri yok.");
          return;
      }

      try {
          await dataService.exportToExcel();
      } catch (e) {
          console.error(e);
          alert("Dışa aktarma başarısız.");
      }
  };

  const displayedData = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin' || user.role === 'premium') {
        return masterData;
    }
    return masterData.slice(0, 50);
  }, [user, masterData]);

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

  // Loading Screen for Auth Check
  if (isInitializing) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
              <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
              <p>Sistem başlatılıyor...</p>
          </div>
      );
  }

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
             {user.role === 'premium' && timeRemaining && (
                 <div className="hidden md:flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-xs font-bold shadow-lg shadow-amber-500/20 animate-pulse">
                     <Clock size={12} />
                     <span>{timeRemaining}</span>
                 </div>
             )}

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

      <main className="flex-1 max-w-[98%] w-full mx-auto py-6 px-4 pb-32">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {user.role === 'admin' && (
            <div className="flex flex-col gap-6">
                <AdminPanel />
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Cloud className="text-blue-600" size={24} />
                        Bulut Veri İşlemleri (Vercel Blob)
                    </h2>
                    
                    <div className="flex flex-col md:flex-row gap-6">
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

                        <div className="w-full md:w-64 flex flex-col gap-3">
                             <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 h-full flex flex-col justify-center">
                                 <h3 className="font-bold text-sm text-gray-500 uppercase mb-4 tracking-wider">Bakım Araçları</h3>
                                 
                                 <button
                                     onClick={handleExport}
                                     className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                     <Download size={18} />
                                     Verileri Yedekle
                                 </button>

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
                                     disabled={isLoading}
                                     className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition-colors border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                     <Eraser size={18} />
                                     Yinelenenleri Sil
                                 </button>

                                 <button 
                                     onClick={() => setShowClearConfirm(true)}
                                     disabled={isLoading}
                                     className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition-colors border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                     <Trash2 size={18} />
                                     Bulutu Temizle
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Loading State or Data View */}
        {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-200 mt-4">
                 <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
                 <h3 className="text-xl font-bold text-gray-900 mb-2">Veriler Senkronize Ediliyor...</h3>
                 <p className="text-gray-500">Versiyon kontrolü yapılıyor ve veriler yükleniyor.</p>
                 <p className="text-xs text-gray-400 mt-2">İnternet hızınıza bağlı olarak büyük güncellemeler zaman alabilir.</p>
            </div>
        ) : (
            !isDataLoaded ? (
                 <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-200 mt-4">
                     <div className="bg-blue-50 p-6 rounded-full mb-6">
                         <Cloud className="w-12 h-12 text-blue-500" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Veri Seti Hazır</h3>
                     <p className="text-gray-500 max-w-md mb-8">
                         {user.role === 'admin' 
                          ? 'Veritabanı trafiğini yönetmek için veriler otomatik yüklenmez. İşlem yapmak için yükleyin.' 
                          : 'Sistem şu an veriye ulaşamıyor veya sunucuda veri yok. Yeniden denemek için tıklayın.'}
                     </p>
                     
                     <button 
                        onClick={handleLoadData}
                        disabled={isLoading}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xl shadow-blue-500/30 flex items-center gap-3 transition-all transform hover:scale-105 disabled:opacity-70 disabled:scale-100"
                     >
                        <PlayCircle size={24} />
                        Tekrar Dene (Zorla Yükle)
                     </button>
                 </div>
            ) : (
                masterData.length === 0 ? (
                    user.role === 'admin' ? null : (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-200 mt-8">
                            <div className="bg-gray-100 p-6 rounded-full mb-6">
                                <Database className="w-12 h-12 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Veri Bulunamadı</h3>
                            <p className="text-gray-500 max-w-md">
                                Sistemde henüz veri bulunmamaktadır veya silinmiş olabilir.
                            </p>
                            <button 
                                onClick={handleLoadData}
                                className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
                            >
                                <RefreshCw className="inline w-4 h-4 mr-1" />
                                Yenile
                            </button>
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
            )
        )}
      </main>

      {!isLoading && isDataLoaded && user.role === 'free' && masterData.length > 0 && <UpgradeAlert />}

      {isManualModalOpen && (
          <ManualEntryModal 
            onClose={() => setIsManualModalOpen(false)} 
            onSave={handleManualAdd} 
          />
      )}

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
                        Bulut Verisini Sil
                    </h3>
                    <p className="text-gray-500 mb-6">
                        Sunucudaki tüm maç verilerini kalıcı olarak silmek istediğinize emin misiniz? <br/>
                        <span className="text-red-500 text-xs font-bold mt-1 block">Bu işlem tüm kullanıcılardan veriyi siler!</span>
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