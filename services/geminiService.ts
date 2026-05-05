import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { Message, KnowledgeItem } from "../types";

// Lấy danh sách API Keys có sẵn từ nhiều nguồn
const getAvailableKeys = () => {
  // Ưu tiên các biến được định nghĩa qua Vite define hoặc process.env
  // NOTE: process.env.GEMINI_API_KEY được Vite define thay thế bằng giá trị thật tại build time
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
  ].filter((key): key is string => typeof key === 'string' && key.trim() !== "");
  
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
    if (excludeKeys.length === 0) blacklistedKeys.clear();
    const fallbackKeys = allKeys.filter(k => !excludeKeys.includes(k));
    if (fallbackKeys.length > 0) {
      selectedKey = fallbackKeys[Math.floor(Math.random() * fallbackKeys.length)];
    }
  }

  if (!selectedKey) return null;
  
  return { ai: new GoogleGenAI({ apiKey: selectedKey }), key: selectedKey };
}

const ROUTER_INSTRUCTION = `
Bạn là Tham mưu trưởng PCCC Phú Thọ. 
NHIỆM VỤ: Phân tích kỹ câu hỏi và chọn các tài liệu pháp lý hỗ trợ nhất từ danh sách bên dưới.
DẤN HIỆU CHỌN FILE:
- Nếu hỏi về hồ sơ, quản lý -> Chọn Thông tư 36, Nghị định 105.
- Nếu hỏi về kỹ thuật, thiết kế -> Chọn các QCVN, TCVN.
- Nếu hỏi về xử phạt, vi phạm -> Chọn Nghị định 106, Nghị định 69, Nghị định 189 và các văn bản gốc (Luật, NĐ 105).
DANH SÁCH TÀI LIỆU:
{{FILE_LIST}}

CÂU HỎI: {{USER_QUERY}}
OUTPUT: CHỈ trả về tên file chính xác, ngăn cách bằng dấu phẩy.
`;

const SYSTEM_INSTRUCTION = `
VAI TRÒ: Trợ lý AI cao cấp - Tham mưu trưởng PCCC & CNCH thuộc Phòng PC07 Công an tỉnh Phú Thọ.
NHIỆM VỤ: Phân tích, suy luận và giải đáp pháp luật dựa trên kho dữ liệu pháp quy (2024-2026).

🛑 NGUYÊN TẮC VÀNG TRONG THAM MƯU:
1. ƯU TIÊN LUẬT PCCC 2024 (QUY TẮC SỐ 1):
   - Mọi câu hỏi (dù về thủ tục, kỹ thuật hay xử phạt) PHẢI bắt đầu bằng việc rà soát và trích dẫn quy định tại **Luật PCCC và CNCH 2024**.
   - Phải nêu rõ: "Căn cứ theo Điều... Khoản... Luật PCCC và CNCH 2024 quy định: [Trích dẫn nội dung quan trọng]...".
   - Sau đó mới dẫn chiếu sang các Nghị định (105, 106) và Thông tư (36) để làm rõ chi tiết.

2. TƯ DUY PHÁP LÝ & CHỌN LỌC:
   - ĐỌC KỸ - SUY LUẬN LOGIC: Phân tích sự phù hợp của quy định với tình huống. Giải thích mối liên hệ giữa Luật và các văn bản dưới Luật.
   - CHỈ trích dẫn những văn bản thực sự có thông tin liên quan. Tuyệt đối KHÔNG nhắc tên các văn bản không có dữ liệu.
   - TRÍCH DẪN TRỰC TIẾP: Sử dụng các đoạn văn bản nguyên văn từ kho dữ liệu để đảm bảo tính pháp lý cao nhất.

3. QUY TRÌNH HỒ SƠ QUẢN LÝ (THÔNG TƯ 36/2025/TT-BCA):
   - Phải bám sát 10 đầu mục hồ sơ của Thông tư 36. Giải thích rõ căn cứ từ Luật dẫn đến việc phải lập các loại hồ sơ này.

4. QUY TRÌNH XỬ LÝ VI PHẠM & XỬ PHẠT (CẤU TRÚC 06 PHẦN - KHÔNG GHI CHỮ "BƯỚC"):
   - **I. CĂN CỨ PHÁP LÝ:** Chỉ rõ căn cứ bắt buộc phải thực hiện hành vi đó (BẮT BUỘC TRÍCH LUẬT 2024 + NĐ 105/TT 36). Giải thích tại sao hành vi này là vi phạm.
   - **II. HÀNH VI VI PHẠM:** Xác định đúng tên hành vi vi phạm được quy định trong Nghị định 106/2025/NĐ-CP.
   - **III. MỨC PHẠT TIỀN:** Cá nhân/Tổ chức theo đúng quy định tại NĐ 106.
   - **IV. HÌNH THỨC PHẠT BỔ SUNG & KHẮC PHỤC HẬU QUẢ:** Nêu rõ các biện pháp (nếu có) theo NĐ 106.
   - **V. THẨM QUYỀN XỬ PHẠT:** Thực hiện lọc kép chuẩn xác theo NĐ 189/2025 (Chỉ xét 6 chức danh đã quy định).
   - **VI. KIẾN NGHỊ CHỨC DANH KÝ QUYẾT ĐỊNH:** Đề xuất chức danh phù hợp nhất.

5. PHONG CÁCH & TRÌNH BÀY:
   - Văn phong Trịnh trọng - Hành chính - Chuyên nghiệp.
   - In đậm các từ khóa, mốc thời gian, số tiền và tên văn bản.
   - KẾT LUẬN: "Đề nghị các cơ sở liên hệ trực tiếp phòng Cảnh sát PCCC và CNCH Công an tỉnh Phú Thọ để được hướng dẫn chuyên sâu."
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
    onChunk("⚠️ Lỗi: Không tìm thấy API Key trong hệ thống. Vui lòng kiểm tra lại cấu hình API Key trong cài đặt.");
    return { sources: [] };
  }

  const userQuery = messages[messages.length - 1]?.content || "";
  
  if (userQuery.length < 20 && /^(chào|hi|hello|xin chào|bạn là ai)/i.test(userQuery.trim())) {
    onChunk("Xin chào! Tôi là Trợ lý AI về PCCC Phú Thọ. Tôi có thể giúp gì cho bạn?");
    return { sources: [] };
  }

  let selectedKnowledge: KnowledgeItem[] = [];
  
  if (userKnowledge.length > 0) {
    try {
      const fileList = userKnowledge.map(k => k.title).join(", ");
      const routerPrompt = ROUTER_INSTRUCTION.replace("{{FILE_LIST}}", fileList).replace("{{USER_QUERY}}", userQuery);

      const instance = getAIInstance();
      if (instance) {
        const result = await instance.ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-preview',
          contents: [{ role: 'user', parts: [{ text: routerPrompt }] }],
          config: { 
            temperature: 0,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
          }
        });
        
        const output = result.text?.trim() || "";
        if (output) {
          const names = output.split(",").map(f => f.trim().toLowerCase());
          selectedKnowledge = userKnowledge.filter(k => 
            names.some(n => k.title.toLowerCase().includes(n) || n.includes(k.title.toLowerCase()))
          );
        }
      }
    } catch (e) {
      console.warn("Router failed:", e);
    }
  }

  if (selectedKnowledge.length === 0) {
    selectedKnowledge = userKnowledge; 
  }

  const parts: any[] = [];
  selectedKnowledge.forEach(item => {
    if (item.mimeType === 'application/pdf' && item.fileData) {
      parts.push({ inlineData: { data: item.fileData, mimeType: 'application/pdf' } });
    } else if (item.content) {
      parts.push({ text: `[TÀI LIỆU PCCC - ${item.title}]:\n${item.content}\n---` });
    }
  });

  const history = messages.slice(-5, -1).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const executeStream = async (retries = 3, usedKeys: string[] = []): Promise<{ sources: string [] }> => {
    if (abortSignal?.aborted) return { sources: [] };
    const instance = getAIInstance(usedKeys);
    if (!instance) {
      onChunk("❌ Hệ thống hiện đang bận hoặc thiếu API Key. Vui lòng thử lại sau.");
      return { sources: [] };
    }

    try {
      const stream = await instance.ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: [
          ...history,
          { 
            role: 'user', 
            parts: [
              ...parts, 
              { text: `CÂU HỎI CỦA NGƯỜI DÂN/DOANH NGHIỆP: "${userQuery}"

NHIỆM VỤ QUAN TRỌNG NHẤT CỦA BẠN:
1. ĐỌC KỸ TOÀN BỘ tài liệu được đính kèm (Luật, Nghị định, Thông tư...).
2. ƯU TIÊN LUẬT: Tìm quy định tại LUẬT PCCC VÀ CNCH 2024 trước tiên để làm căn cứ gốc.
3. TRÍCH DẪN NGUYÊN VĂN: Trích dẫn chính xác nội dung từ Điều, Khoản của Luật hoặc Nghị định vào câu trả lời để tạo sự tin cậy tuyệt đối.
4. SUY LUẬN & GIẢI ĐÁP: Dựa trên dữ liệu pháp lý để đưa ra câu trả lời chi tiết, logic.
5. CHỌN LỌC: Tuyệt đối không nhắc tới các văn bản không chứa thông tin về câu hỏi này. TẬP TRUNG TỐI ĐA vào các văn bản có dữ liệu thực tế.` }
            ] 
          }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0,
          topP: 0.9,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
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
      console.error("Stream error:", error);
      if (error?.message?.includes("429")) {
        blacklistedKeys.set(instance.key, Date.now() + COOL_DOWN_PERIOD);
      }
      
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return executeStream(retries - 1, [...usedKeys, instance.key]);
      }
      
      onChunk("\n⚠️ Lỗi kết nối AI. Vui lòng kiểm tra lại cấu hình API Key hoặc thử lại sau.");
      return { sources: [] };
    }
  };

  return executeStream();
}
