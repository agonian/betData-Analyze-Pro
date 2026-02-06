import React, { useState } from 'react';
import { Sparkles, Send, Bot } from 'lucide-react';
import { MatchData } from '../types';
import { analyzeData } from '../services/geminiService';

interface SmartAssistantProps {
  data: MatchData[];
}

export const SmartAssistant: React.FC<SmartAssistantProps> = ({ data }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    
    const result = await analyzeData(data, query);
    setResponse(result);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center">
            <div className="flex items-center text-white">
              <Sparkles className="w-5 h-5 mr-2" />
              <h3 className="font-bold">Veri Asistanı</h3>
            </div>
            <span className="text-xs text-indigo-200 bg-indigo-800 px-2 py-1 rounded">Gemini Powered</span>
          </div>
          
          <div className="p-4 bg-gray-50 h-64 overflow-y-auto">
            {response ? (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm text-sm text-gray-700 border border-gray-100">
                  {response}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 mt-10 text-sm px-4">
                <p>Şu anki tablo görünümü hakkında soru sorabilirsiniz.</p>
                <p className="mt-2 text-xs">Örnek: "Bu verilerdeki en yüksek oran hangisi?"</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-white border-t border-gray-100">
            <div className="relative">
              <input
                type="text"
                className="w-full pl-4 pr-10 py-2 rounded-full bg-gray-100 border-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Bir soru sor..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              />
              <button 
                onClick={handleAsk}
                disabled={loading}
                className="absolute right-1 top-1 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-lg transition-all duration-300 ${isOpen ? 'bg-red-500 rotate-45' : 'bg-indigo-600 hover:bg-indigo-700'}`}
      >
        {isOpen ? <span className="text-white font-bold text-xl">+</span> : <Sparkles className="text-white w-6 h-6" />}
      </button>
    </div>
  );
};