import { GoogleGenAI } from "@google/genai";
import { Message, KnowledgeItem } from "../types";

// Lấy danh sách API Keys có sẵn từ môi trường
const getAvailableKeys = () => {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5
  ].filter(key => key && key.trim() !== "");
  return keys;
};

// Quản lý trạng thái Key bị khóa tạm thời (Cool down)
const blacklistedKeys = new Map<string, number>();
const COOL_DOWN_PERIOD = 30000; // 30 giây

function isKeyAvailable(key: string) {
  const expiry = blacklistedKeys.get(key);
  if (!expiry) return true;
  if (Date.now() > expiry) {
    blacklistedKeys.delete(key);
    return true;
  }
  return false;
}

// Hàm lấy một AI instance ngẫu nhiên từ các key còn dùng được
function getAIInstance(excludeKeys: string[] = []) {
  const allKeys = getAvailableKeys();
  const validKeys = allKeys.filter(k => !excludeKeys.includes(k) && isKeyAvailable(k));
  
  if (validKeys.length === 0) {
    if (excludeKeys.length === 0) blacklistedKeys.clear();
    const fallbackKeys = allKeys.filter(k => !excludeKeys.includes(k));
    if (fallbackKeys.length === 0) return null;
    const randomKey = fallbackKeys[Math.floor(Math.random() * fallbackKeys.length)];
    return { ai: new GoogleGenAI({ apiKey: randomKey }), key: randomKey };
  }
  
  const randomKey = validKeys[Math.floor(Math.random() * validKeys.length)];
  return { ai: new GoogleGenAI({ apiKey: randomKey }), key: randomKey };
}

const ROUTER_INSTRUCTION = `
Bạn là Tham mưu trưởng PCCC xuất sắc. NHIỆM VỤ: Phân tích câu hỏi để chọn ĐÚNG các tài liệu pháp lý hỗ trợ.
DANH SÁCH FILE:
{{FILE_LIST}}

CÂU HỎI: {{USER_QUERY}}
OUTPUT: CHỈ trả về tên file chính xác, ngăn cách bằng dấu phẩy.
`;

const SYSTEM_INSTRUCTION = `
VAI TRÒ: Trợ lý AI về PCCC và CNCH - Phòng PC07 Công an tỉnh Phú Thọ.

🛑 NGUYÊN TẮC:
1. Trả lời chuyên nghiệp, văn phong hành chính. Dẫn chứng rõ Điều/Khoản.
2. CHỈ sử dụng văn bản mới nhất: Luật 2024, NĐ 105/2025, NĐ 106/2025, QCVN 10:2025.
3. Không trích dẫn văn bản hết hiệu lực (NĐ 136, NĐ 50...).
4. Trình bày rõ ràng, in đậm các ý chính.
5. Cảnh báo: "Kết quả tra cứu chỉ mang tính tham khảo, vui lòng liên hệ PC07 Phú Thọ để được hướng dẫn chính thức."
`;

export async function streamMessageWithSearch(
  messages: Message[],
  userKnowledge: KnowledgeItem[],
  onChunk: (text: string) => void,
  abortSignal?: AbortSignal
) {
  if (abortSignal?.aborted) return { sources: [] };

  const availableKeys = getAvailableKeys();
  if (availableKeys.length === 0) {
    onChunk("Lỗi: Hệ thống chưa được cấu hình API Key.");
    return { sources: [] };
  }

  const userQuery = messages[messages.length - 1]?.content || "";
  
  // Phản hồi nhanh cho câu chào
  if (userQuery.length < 15 && /^(chào|hi|hello|xin chào)/i.test(userQuery.trim())) {
    onChunk("Xin chào! Tôi là Trợ lý AI về PCCC Phú Thọ. Tôi có thể giúp gì cho bạn về các quy định PCCC mới nhất năm 2025?");
    return { sources: [] };
  }

  let selectedKnowledge: KnowledgeItem[] = [];
  
  // Bước 1: Phân loại tài liệu
  if (userKnowledge.length > 0) {
    const fileList = userKnowledge.map(k => k.title).join(", ");
    const routerPrompt = ROUTER_INSTRUCTION
      .replace("{{FILE_LIST}}", fileList)
      .replace("{{USER_QUERY}}", userQuery);

    const tryRouter = async (retries = 1, failedKeys: string[] = []) => {
      const instance = getAIInstance(failedKeys);
      if (!instance || retries < 0) return null;

      try {
        const result = await instance.ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [{ role: 'user', parts: [{ text: routerPrompt }] }],
          config: { temperature: 0, maxOutputTokens: 150 }
        });
        return result.text?.trim() || "";
      } catch (e) {
        return tryRouter(retries - 1, [...failedKeys, instance.key]);
      }
    };

    const routerOutput = await tryRouter();
    if (routerOutput) {
      const selectedFilnames = routerOutput.split(",").map(f => f.trim().toLowerCase());
      selectedKnowledge = userKnowledge.filter(k => 
        selectedFilnames.some(sf => k.title.toLowerCase().includes(sf)) || 
        selectedFilnames.some(sf => sf.includes(k.title.toLowerCase()))
      );
    }
  }

  // Fallback nếu router không tìm thấy hoặc lỗi
  if (selectedKnowledge.length === 0) {
    selectedKnowledge = userKnowledge.slice(0, 8); 
  }

  const parts: any[] = [];
  selectedKnowledge.forEach(item => {
    if (item.mimeType === 'application/pdf' && item.fileData) {
      parts.push({
        inlineData: { data: item.fileData, mimeType: 'application/pdf' }
      });
    } else if (item.content) {
      parts.push({ text: `[Dữ liệu PCCC - ${item.title}]:\n${item.content}` });
    }
  });

  const history = messages.slice(-5, -1).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  // Bước 2: Sinh câu trả lời (Streaming)
  const executeStream = async (retries = 3, usedKeys: string[] = []): Promise<{ sources: string [] }> => {
    if (abortSignal?.aborted) return { sources: [] };
    const instance = getAIInstance(usedKeys);
    
    if (!instance) {
      onChunk("Hệ thống đang bận. Vui lòng thử lại sau.");
      return { sources: [] };
    }

    try {
      // Sử dụng gemini-1.5-flash để đảm bảo tốc độ và độ ổn định khi deploy ngoài
      const stream = await instance.ai.models.generateContentStream({
        model: 'gemini-1.5-flash',
        contents: [
          ...history,
          { role: 'user', parts: [...parts, { text: `TỪ CÁC DỮ LIỆU TRÊN, HÃY TRẢ LỜI CÂU HỎI: ${userQuery}` }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1,
          topP: 0.9,
          topK: 20
        },
      });

      let fullText = "";
      for await (const chunk of stream) {
        if (abortSignal?.aborted) break;
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          onChunk(fullText);
        }
      }

      return { sources: selectedKnowledge.map(k => k.title) };
    } catch (error: any) {
      const isRateLimit = error?.message?.includes("429");
      if (isRateLimit) blacklistedKeys.set(instance.key, Date.now() + COOL_DOWN_PERIOD);

      if (retries > 0) {
        await new Promise(r => setTimeout(r, 800));
        return executeStream(retries - 1, [...usedKeys, instance.key]);
      }
      
      onChunk("\n⚠️ Lỗi kết nối. Vui lòng kiểm tra lại đường truyền.");
      return { sources: [] };
    }
  };

  return executeStream();
}
