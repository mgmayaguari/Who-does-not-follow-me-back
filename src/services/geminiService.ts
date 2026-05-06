import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface CategorizedResults {
  newsAndBrands: string[];
  publicFigures: string[];
  personalAM: string[];
  personalNZ: string[];
}

export async function categorizeUsernames(usernames: string[]): Promise<CategorizedResults> {
  const prompt = `
    You are an Instagram Data Auditor. Categorize the following list of Instagram usernames into 4 groups:
    1. News & Brands (Organizations, news outlets, commercial brands, companies e.g., BBC, Nike, local shops)
    2. Public Figures (Verified celebrities, influencers, artists, politicians, noted individuals)
    3. Personal Accounts A-M (Likely individuals, private accounts, friends starting with A-M)
    4. Personal Accounts N-Z (Likely individuals, private accounts, friends starting with N-Z)

    Format your response as a JSON object with these keys: 
    "newsAndBrands", "publicFigures", "personalAM", "personalNZ"

    Usernames to categorize:
    ${usernames.slice(0, 300).join(", ")}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to categorize usernames:", error);
    // Fallback logic
    const results: CategorizedResults = {
      newsAndBrands: [],
      publicFigures: [],
      personalAM: [],
      personalNZ: [],
    };
    
    usernames.forEach(u => {
      const char = u[0]?.toLowerCase();
      if (char >= 'a' && char <= 'm') results.personalAM.push(u);
      else results.personalNZ.push(u);
    });
    
    return results;
  }
}
