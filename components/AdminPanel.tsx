import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { Trash2, Ban, CheckCircle2, Crown, RefreshCcw, AlertTriangle, X } from 'lucide-react';

interface ModalConfig {
  isOpen: boolean;
  type: 'delete' | 'ban' | null;
  user: User | null;
}

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ 
    isOpen: false, 
    type: null, 
    user: null 
  });

  const loadUsers = async () => {
    setIsLoading(true);
    try {
        const allUsers = await authService.getUsers();
        setUsers(allUsers.filter(u => u.username !== 'admin'));
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const requestDelete = (user: User) => {
    setModalConfig({ isOpen: true, type: 'delete', user });
  };

  const requestBan = (user: User) => {
    setModalConfig({ isOpen: true, type: 'ban', user });
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, type: null, user: null });
  };

  const handleConfirmAction = async () => {
    if (!modalConfig.user) return;
    setIsLoading(true);

    if (modalConfig.type === 'delete') {
        const success = await authService.deleteUser(modalConfig.user.username);
        if (success) {
            setUsers(prev => prev.filter(u => u.username !== modalConfig.user!.username));
        } else {
            alert("Kullanıcı silinemedi.");
        }
    } else if (modalConfig.type === 'ban') {
        const user = modalConfig.user;
        const newRole = user.role === 'banned' ? 'free' : 'banned';
        const success = await authService.updateUser({ ...user, role: newRole });
        if (success) {
            setUsers(prev => prev.map(u => u.username === user.username ? { ...u, role: newRole } : u));
        } else {
            alert("Kullanıcı durumu güncellenemedi.");
        }
    }
    setIsLoading(false);
    closeModal();
  };

  const handleGrantPremium = async (username: string) => {
    setIsLoading(true);
    await authService.addPremiumTime(username, selectedDuration);
    await loadUsers();
    setIsLoading(false);
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '-';
    if (timestamp < Date.now()) return <span className="text-red-500">Süresi Doldu</span>;
    
    const date = new Date(timestamp);
    return date.toLocaleString('tr-TR');
  };

  const calculateRemaining = (timestamp?: number) => {
    if (!timestamp || timestamp < Date.now()) return '';
    const diff = timestamp - Date.now();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} gün kaldı`;
    if (hours > 0) return `${hours} saat kaldı`;
    return `${minutes} dk kaldı`;
  };

  return (
    <>
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8 animate-in fade-in slide-in-from-top-4 relative z-0">
      <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
        <h2 className="font-bold flex items-center gap-2">
           <Crown className="text-amber-400" size={20} />
           Kullanıcı Yönetim Paneli
        </h2>
        <button 
            type="button"
            onClick={loadUsers} 
            disabled={isLoading}
            className={`p-2 hover:bg-slate-700 rounded-full transition-colors ${isLoading ? 'animate-spin' : ''}`}
            title="Listeyi Yenile"
        >
            <RefreshCcw size={16} />
        </button>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                <tr>
                    <th className="px-4 py-3">Kullanıcı Adı</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Premium Bitiş</th>
                    <th className="px-4 py-3">Süre Yönetimi</th>
                    <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-400">
                            {isLoading ? 'Yükleniyor...' : 'Henüz kayıtlı üye yok.'}
                        </td>
                    </tr>
                ) : users.map(user => (
                    <tr key={user.username} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                        <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                user.role === 'premium' ? 'bg-amber-100 text-amber-700' :
                                user.role === 'banned' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                                {user.role === 'premium' ? 'Premium' : user.role === 'banned' ? 'Yasaklı' : 'Ücretsiz'}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                           <div className="flex flex-col">
                               <span>{formatTime(user.premiumExpiresAt)}</span>
                               <span className="text-[10px] text-blue-500 font-medium">{calculateRemaining(user.premiumExpiresAt)}</span>
                           </div>
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                                <select 
                                    className="border border-gray-300 rounded px-2 py-1 text-xs max-w-[120px]"
                                    onChange={(e) => setSelectedDuration(Number(e.target.value))}
                                    value={selectedDuration}
                                >
                                    <optgroup label="Ekle">
                                        <option value={1}>+1 Dakika</option>
                                        <option value={1440}>+1 Gün</option>
                                        <option value={10080}>+1 Hafta</option>
                                        <option value={43200}>+1 Ay</option>
                                        <option value={129600}>+3 Ay</option>
                                    </optgroup>
                                    <optgroup label="Çıkar">
                                        <option value={-1440}>-1 Gün</option>
                                        <option value={-10080}>-1 Hafta</option>
                                        <option value={-43200}>-1 Ay</option>
                                    </optgroup>
                                </select>
                                <button 
                                    type="button"
                                    onClick={() => handleGrantPremium(user.username)}
                                    disabled={isLoading}
                                    className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                                    title="Süreyi Uygula"
                                >
                                    <CheckCircle2 size={16} />
                                </button>
                            </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                                <button 
                                    type="button"
                                    onClick={() => requestBan(user)}
                                    disabled={isLoading}
                                    className={`p-1.5 rounded transition-colors disabled:opacity-50 ${user.role === 'banned' ? 'bg-gray-500 text-white hover:bg-gray-600' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                                    title={user.role === 'banned' ? "Yasağı Kaldır" : "Yasakla"}
                                >
                                    <Ban size={16} />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => requestDelete(user)}
                                    disabled={isLoading}
                                    className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors disabled:opacity-50"
                                    title="Kullanıcıyı Sil"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>

    {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 scale-100 animate-in zoom-in-95 duration-200 relative">
                <button 
                    onClick={closeModal} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>
                
                <div className="flex flex-col items-center text-center">
                    <div className={`p-4 rounded-full mb-4 ${
                        modalConfig.type === 'delete' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                        {modalConfig.type === 'delete' ? <Trash2 size={32} /> : <AlertTriangle size={32} />}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {modalConfig.type === 'delete' ? 'Kullanıcıyı Sil' : 'Yetki Değişikliği'}
                    </h3>
                    
                    <p className="text-gray-500 mb-6">
                        {modalConfig.type === 'delete' ? (
                            <>
                                <span className="font-bold text-gray-800">{modalConfig.user?.username}</span> adlı kullanıcıyı silmek istediğinize emin misiniz? <br/>
                                <span className="text-red-500 text-xs font-bold mt-1 block">Bu işlem geri alınamaz!</span>
                            </>
                        ) : (
                            <>
                                <span className="font-bold text-gray-800">{modalConfig.user?.username}</span> adlı kullanıcıyı 
                                {modalConfig.user?.role === 'banned' ? (
                                    <span className="text-green-600 font-bold mx-1">aktifleştirmek</span>
                                ) : (
                                    <span className="text-red-600 font-bold mx-1">yasaklamak</span>
                                )} 
                                istediğinize emin misiniz?
                            </>
                        )}
                    </p>
                    
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={closeModal}
                            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
                        >
                            İptal
                        </button>
                        <button 
                            onClick={handleConfirmAction}
                            disabled={isLoading}
                            className={`flex-1 px-4 py-2.5 text-white rounded-lg font-bold transition-colors shadow-lg disabled:opacity-50 ${
                                modalConfig.type === 'delete' 
                                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' 
                                    : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                            }`}
                        >
                            {isLoading ? 'İşleniyor...' : (modalConfig.type === 'delete' ? 'Evet, Sil' : 'Onayla')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )}
    </>
  );
};