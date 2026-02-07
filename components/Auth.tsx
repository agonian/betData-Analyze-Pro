import React, { useState } from 'react';
import { User } from '../types';
import { LogIn, UserPlus, ShieldCheck, Database, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
        if (isLogin) {
            // Login Logic
            const result = await authService.login(username, password);
            if (result.success && result.user) {
                onLogin(result.user);
            } else {
                setError(result.message);
            }
        } else {
            // Register Logic
            if (password.length < 3) {
                setError('Şifre en az 3 karakter olmalıdır.');
                setIsLoading(false);
                return;
            }
            
            const result = await authService.register(username, password);
            if (result.success) {
                // Show preparing state to user while we wait a bit
                setIsPreparing(true);
                setSuccessMsg('Kayıt başarılı! Hesap hazırlanıyor, lütfen bekleyin...');
                
                // Artificial Delay to help consistency
                setTimeout(() => {
                    setIsPreparing(false);
                    setSuccessMsg('Hesabınız hazır! Şimdi giriş yapabilirsiniz.');
                    setIsLogin(true);
                    setPassword('');
                }, 2500);
                 
            } else {
                setError(result.message);
            }
        }
    } catch (err) {
        setError("Bir hata oluştu. Lütfen bağlantınızı kontrol edin.");
    } finally {
        if (!isPreparing) {
           setIsLoading(false);
        }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 z-0"></div>
            <div className="relative z-10 flex justify-center mb-4">
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20">
                    <Database className="w-10 h-10 text-blue-400" />
                </div>
            </div>
            <h1 className="relative z-10 text-2xl font-bold text-white mb-2">BetData Analyze Pro</h1>
            <p className="relative z-10 text-slate-400 text-sm">Profesyonel Bahis Analiz Platformu</p>
        </div>

        <div className="p-8">
            {/* Toggle Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-lg mb-8">
                <button
                    onClick={() => { if(!isPreparing) { setIsLogin(true); setError(''); setSuccessMsg(''); } }}
                    disabled={isPreparing}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Giriş Yap
                </button>
                <button
                    onClick={() => { if(!isPreparing) { setIsLogin(false); setError(''); setSuccessMsg(''); } }}
                    disabled={isPreparing}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Kayıt Ol
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı</label>
                    <input 
                        type="text" 
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="Kullanıcı adınız"
                        disabled={isLoading || isPreparing}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="••••••••"
                        disabled={isLoading || isPreparing}
                    />
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
                
                {successMsg && (
                    <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                        {isPreparing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                        {successMsg}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading || isPreparing}
                    className={`w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 ${isPreparing ? 'cursor-wait' : ''}`}
                >
                    {(isLoading || isPreparing) ? <Loader2 size={18} className="animate-spin" /> : (isLogin ? <LogIn size={18} /> : <UserPlus size={18} />)}
                    {isPreparing ? 'Hesap Oluşturuluyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
                </button>
            </form>

            
        </div>
      </div>
    </div>
  );
};