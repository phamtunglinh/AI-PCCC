import { GoogleGenAI } from "@google/genai";
import { Message, KnowledgeItem } from "../types";

// Lấy danh sách API Keys có sẵn từ nhiều nguồn
const getAvailableKeys = () => {
  const keys = [
    // Vite / Client-side (Static at build time)
    import.meta.env.VITE_GEMINI_API_KEY,
    import.meta.env.VITE_GEMINI_API_KEY_1,
    import.meta.env.VITE_GEMINI_API_KEY_2,
    import.meta.env.VITE_GEMINI_API_KEY_3,
    import.meta.env.VITE_GEMINI_API_KEY_4,
    import.meta.env.VITE_GEMINI_API_KEY_5,
  ].filter((key): key is string => typeof key === 'string' && key.trim() !== "" && key !== "undefined");
  
  return Array.from(new Set(keys));
};

const blacklistedKeys = new Map<string, number>();
const COOL_DOWN_PERIOD = 30000;

function isKeyAvailable(key: string) {
  const expiry = blacklistedKeys.get(key);
  if (!expiry) return true;
  if (Date.now() > expiry) {
    blacklistedKeys.delete(key);
    return true;
  }
  return false;
}

function getAIInstance(excludeKeys: string[] = []) {
  const allKeys = getAvailableKeys();
  const validKeys = allKeys.filter(k => !excludeKeys.includes(k) && isKeyAvailable(k));
  
  let selectedKey: string | null = null;
  
  if (validKeys.length > 0) {
    selectedKey = validKeys[Math.floor(Math.random() * validKeys.length)];
  } else {
    const fallbackKeys = allKeys.filter(k => !excludeKeys.includes(k));
    if (fallbackKeys.length > 0) {
      selectedKey = fallbackKeys[Math.floor(Math.random() * fallbackKeys.length)];
    }
  }

  if (!selectedKey) {
    throw new Error("API_KEY_MISSING");
  }
  
  return { ai: new GoogleGenAI({ apiKey: selectedKey }), key: selectedKey };
}

const ROUTER_INSTRUCTION = `
QUY TRÌNH TƯ DUY BẮT BUỘC:
- Bước 1: Dịch ngôn ngữ đời thường sang thuật ngữ pháp lý. (Ví dụ: "xin giấy cháy nổ" = Thẩm duyệt/Nghiệm thu; "đền bù cháy" = Bảo hiểm; "mấy cửa ra" = Lối thoát nạn).
- Bước 2: Tự hỏi "Bản chất cốt lõi của câu hỏi này thuộc lĩnh vực quản lý nhà nước nào?".
- Bước 3: Áp chiếu vào các Giỏ tài liệu để chọn file.

DANH SÁCH FILE CÓ SẴN:
{{FILE_LIST}}

CÂU HỎI: "{{USER_QUERY}}"

OUTPUT: CHỈ trả về danh sách tên file chính xác, ngăn cách bằng dấu phẩy. TUYỆT ĐỐI KHÔNG giải thích.
`;

const SYSTEM_INSTRUCTION = `
VAI TRÒ: Trợ lý AI Cấp cao về Pháp lý PCCC và CNCH - Phòng PC07 Phú Thọ.

🛑 CHIẾN LƯỢC TƯ DUY NÂNG CAO:
1. LUỒNG QUÉT ĐA TẦNG: Rà soát song song [Quy chuẩn] -> [Luật/Nghị định] -> [Thông tư].
2. NGUYÊN TẮC GIẢI QUYẾT XUNG ĐỘT: Ưu tiên áp dụng văn bản có hiệu lực cao hơn. Kể từ 30/12/2025, BẮT BUỘC áp dụng QCVN 10:2025/BCA thay thế TCVN 3890:2023.
3. QUY TẮC ĐỊNH DANH HÌNH HỌC (THINKING GEOMETRY):
   - CHIỀU CAO PCCC: Tính theo Điều 1.4.23 QCVN 10.
   - TẦNG LỬNG: Phải đối chiếu Mục 3.1.2 QCVN 10 (Ngưỡng 65%, 40%, 10%).

🔴 RULE 1: PHÂN CẤP QUẢN LÝ (NĐ 105/2025):
- Dưới 50m2 sxkd: Không thuộc diện quản lý.
- 50m2 - dưới 200m2 sxkd: UBND cấp xã quản lý (Phụ lục I).
- 200m2 trở lên sxkd: Phòng PC07 quản lý (Phụ lục II).

🔴 RULE 2: XỬ PHẠT (NĐ 106 + 69/2026/NĐ-CP):
Phải đủ 5 mục: 1. CĂN CỨ; 2. MỨC PHẠT; 3. PHẠT BỔ SUNG & KPHQ; 4. THẨM QUYỀN (6 chức danh theo NĐ 69); 5. KIẾN NGHỊ.

🟢 RULE 5: TRANG BỊ PHƯƠNG TIỆN (QCVN 10:2025/BCA):
BẮT BUỘC trình bày theo 2 phần:
I. PHÂN CẤP QUẢN LÝ VÀ THẨM DUYỆT
II. QUY ĐỊNH TRANG BỊ PHƯƠNG TIỆN (Liệt kê ĐỦ 10 hạng mục theo thứ tự):
1. Báo cháy tự động; 2. Chữa cháy tự động; 3. Cấp nước ngoài nhà; 4. Họng nước trong nhà; 5. Bình chữa cháy; 6. Đèn EXIT/Sự cố; 7. Dụng cụ phá dỡ; 8. Mặt nạ lọc độc; 9. Loa thông báo; 10. Truyền tin báo cháy.

⚠️ LỆNH CHỐNG ẢO GIÁC:
- Bảng C.1 (Cấp nước ngoài nhà) KHÔNG có nhà nghỉ, khách sạn, karaoke, nhà ở. Nếu không có trong C.1 -> "Không thuộc diện trang bị".
`;

export async function streamMessageWithSearch(
  messages: Message[],
  userKnowledge: KnowledgeItem[],
  onChunk: (text: string) => void,
  abortSignal?: AbortSignal
): Promise<{ sources: string [] }> {
  const availableKeys = getAvailableKeys();
  if (availableKeys.length === 0) {
    onChunk("⚠️ **Lỗi cấu hình:** Bạn chưa thiết lập API Key. Vui lòng thêm các biến môi trường `VITE_GEMINI_API_KEY` (và `_2`, `_3`...) và thực hiện **Redeploy** trên Vercel/Cloudflare.");
    return { sources: [] };
  }

  const userQuery = messages[messages.length - 1]?.content || "";
  let selectedKnowledge: KnowledgeItem[] = [];

  try {
    const instance = getAIInstance();
    if (userKnowledge.length > 0) {
      const routerPrompt = ROUTER_INSTRUCTION.replace("{{FILE_LIST}}", userKnowledge.map(k => k.title).join(", ")).replace("{{USER_QUERY}}", userQuery);
      
      const response = await instance.ai.models.generateContent({ 
        model: "gemini-3-flash-preview",
        contents: routerPrompt,
        config: { temperature: 0 }
      });
      
      const output = response.text?.trim() || "";
      const names = output.split(",").map(n => n.trim().toLowerCase());
      
      selectedKnowledge = userKnowledge.filter(k => 
        names.some(n => k.title.toLowerCase().includes(n) || n.includes(k.title.toLowerCase()))
      );
    }
  } catch (e) {
    console.warn("Routing failed:", e);
  }

  if (selectedKnowledge.length === 0) {
    selectedKnowledge = userKnowledge.slice(0, 5);
  }

  const contents = messages.slice(-5, -1).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const executeStream = async (retries = 3, usedKeys: string[] = []): Promise<{ sources: string [] }> => {
    let instance;
    try {
      instance = getAIInstance(usedKeys);
      const parts = selectedKnowledge.map(k => ({ text: `[DỮ LIỆU: ${k.title}]\n${k.content || ""}\n---` }));
      
      // Trích xuất 4 ký tự cuối để debug nếu lỗi
      const keySnippet = instance.key.slice(-4);
      onChunk(`🔄 (Sử dụng key ...${keySnippet})\n\n`);
      
      const streamResponse = await instance.ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [
          ...contents,
          { role: 'user', parts: [...parts, { text: userQuery }] }
        ],
        config: { 
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1 
        }
      });

      let fullText = "";
      for await (const chunk of streamResponse) {
        if (abortSignal?.aborted) break;
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          onChunk(fullText);
        }
      }

      return { sources: selectedKnowledge.map(k => k.title) };
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      
      if (errorMsg === "API_KEY_MISSING") {
        onChunk("⚠️ Không tìm thấy API Key. Hãy kiểm tra cài đặt Vercel/Cloudflare.");
        return { sources: [] };
      }

      if ((errorMsg.includes("429") || errorMsg.includes("quota")) && retries > 0 && instance) {
        blacklistedKeys.set(instance.key, Date.now() + COOL_DOWN_PERIOD);
        return executeStream(retries - 1, [...usedKeys, instance.key]);
      }

      onChunk(`🔴 **Lỗi:** ${errorMsg}\n\n*Gợi ý: Nếu bạn vừa đổi API Key, bạn PHẢI thực hiện **Redeploy** (Triển khai lại) để áp dụng thay đổi.*`);
      return { sources: [] };
    }
  };

  return executeStream();
}
