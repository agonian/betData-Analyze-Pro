// import { GoogleGenAI } from "@google/genai";
import { MatchData } from "../types";

// This service is currently disabled to remove the dependency on @google/genai
// and fix Vercel deployment issues.

export const analyzeData = async (dataSample: MatchData[], query: string): Promise<string> => {
//   if (!process.env.API_KEY) {
//     return "API Key tanımlanmamış.";
//   }

//   const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

//   // We can't send 300k rows. We send a statistical sample or the top rows.
//   // For this demo, let's take the first 50 rows as context to understand the structure
//   // or assume the user has filtered down to a manageable size.
//   const dataContext = JSON.stringify(dataSample.slice(0, 50));

//   const prompt = `
//     Aşağıda bir spor bahis veri setinden örnek veriler bulunmaktadır (JSON formatında).
    
//     Veri Örneği:
//     ${dataContext}
    
//     Kullanıcı Sorusu: "${query}"
    
//     Bu verilere dayanarak, veri setinin yapısını ve içeriğini göz önünde bulundurarak bir cevap veya analiz üret. 
//     Eğer kesin istatistik veremiyorsan, genel eğilimlerden bahset veya verinin nasıl yorumlanması gerektiğini açıkla.
//     Cevabı Türkçe ver. Kısa ve öz ol.
//   `;

//   try {
//     const response = await ai.models.generateContent({
//       model: 'gemini-3-flash-preview',
//       contents: prompt,
//     });
//     return response.text || "Analiz yapılamadı.";
//   } catch (error) {
//     console.error("Gemini Error:", error);
//     return "Yapay zeka servisine bağlanırken bir hata oluştu.";
//   }
     return "Yapay zeka özelliği şu anda devre dışıdır.";
};