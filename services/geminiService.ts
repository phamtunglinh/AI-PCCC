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

  // Fallback to process.env.GEMINI_API_KEY if everything else fails
  if (!selectedKey && process.env.GEMINI_API_KEY) {
    selectedKey = process.env.GEMINI_API_KEY;
  }

  if (!selectedKey) return null;
  
  return { ai: new GoogleGenAI({ apiKey: selectedKey }), key: selectedKey };
}

const ROUTER_INSTRUCTION = `
Bạn là Trợ lý AI chuyên sâu về PCCC Phú Thọ. 
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
VAI TRÒ: Trợ lý AI cao cấp của Phòng PC07 Công an tỉnh Phú Thọ.
NHIỆM VỤ: Phân tích, suy luận và giải đáp pháp luật dựa trên kho dữ liệu pháp quy (2024-2026).

🛑 QUY TẮC CỐT LÕI:
- CẤU TRÚC MỞ ĐẦU (BẮT BUỘC): Mọi câu trả lời chi tiết PHẢI bắt đầu bằng câu: "Chào bạn! tôi xin giải đáp thắc mác của bạn về [Tóm tắt ngắn gọn vấn đề hỏi] theo quy định pháp luật mới nhất (áp dụng cho giai đoạn 2024 - 2026) như sau:"
- TUYỆT ĐỐI KHÔNG giới thiệu bản thân là "Tham mưu trưởng" hay "AI" một cách trực tiếp ở đầu câu.
- ƯU TIÊN PHÁP LÝ NỘI BỘ: Luôn rà soát và trích dẫn quy định tại **Luật PCCC và CNCH 2024** đầu tiên.
- PHẠM VI KIẾN THỨC: Nếu vấn đề KHÔNG có trong các văn bản quy phạm pháp luật được cung cấp, bạn PHẢI sử dụng công cụ tìm kiếm để đọc tài liệu từ nhiều nguồn uy tín (Cơ quan chính phủ, Báo chính thống, Hiệp hội chuyên môn), tổng hợp và trả lời một cách thông minh, logic.

🛑 NGUYÊN TẮC VÀNG TRONG THAM MƯU:
1. TƯ DUY PHÁP LÝ & HIỂU NGỮ CẢNH:
   - ĐỌC HIỂU SÂU: Phải phân tích kỹ ngữ cảnh và ý định thực sự của người hỏi để đưa ra câu trả lời "thông minh" nhất, không chỉ máy móc liệt kê.
   - SUY LUẬN LOGIC: Giải thích mối liên hệ giữa Luật và các tình huống thực tế. Nếu thông tin từ nhiều nguồn, hãy tổng hợp chúng thành một tư vấn thống nhất.
   - TRÍCH DẪN TRỰC TIẾP: Sử dụng các đoạn văn bản nguyên văn khi có căn cứ pháp lý rõ ràng.

2. QUY TRÌNH HỒ SƠ QUẢN LÝ (THÔNG TƯ 36/2025/TT-BCA):
   - Phải bám sát 10 đầu mục hồ sơ của Thông tư 36 khi được hỏi về hồ sơ cơ sở.

3. QUY TRÌNH XỬ LÝ VI PHẠM & XỬ PHẠT (CẤU TRÚC 06 PHẦN - KHÔNG GHI CHỮ "BƯỚC"):
   - **I. CĂN CỨ PHÁP LÝ:** Trích dẫn Luật 2024 + NĐ 105/TT 36.
   - **II. HÀNH VI VI PHẠM:** Theo NĐ 106/2025.
   - **III. MỨC PHẠT TIỀN:** Cá nhân/Tổ chức theo NĐ 106.
   - **IV. HÌNH THỨC PHẠT BỔ SUNG & KHẮC PHỤC HẬU QUẢ.**
   - **V. THẨM QUYỀN XỬ PHẠT:** Lọc kép chuẩn xác theo NĐ 189/2025 (6 chức danh).
   - **VI. KIẾN NGHỊ CHỨC DANH KÝ QUYẾT ĐỊNH.**

4. PHONG CÁCH & TRÌNH BÀY:
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
    onChunk("Chào bạn! Tôi có thể giúp gì cho bạn về các quy định PCCC và CNCH tại tỉnh Phú Thọ theo quy định mới nhất giai đoạn 2024 - 2026?");
    return { sources: [] };
  }

  let selectedKnowledge: KnowledgeItem[] = [];
  
  // OPTIMIZATION: If we have few documents, include all of them to skip the routing latency
  if (userKnowledge.length <= 3) {
    selectedKnowledge = userKnowledge;
  } else if (userKnowledge.length > 0) {
    try {
      const fileList = userKnowledge.map(k => k.title).join(", ");
      const routerPrompt = ROUTER_INSTRUCTION.replace("{{FILE_LIST}}", fileList).replace("{{USER_QUERY}}", userQuery);

      const instance = getAIInstance();
      if (instance) {
        // Use standard flash for ultra-fast routing
        const result = await instance.ai.models.generateContent({
          model: "gemini-3.1-flash-lite-preview",
          contents: [{ role: 'user', parts: [{ text: routerPrompt }] }],
          config: { temperature: 0 }
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
4. TÌM KIẾM & TỔNG HỢP (KHI CẦN): Nếu thông tin không có trong tài liệu đính kèm, hãy sử dụng công cụ tìm kiếm trực tuyến để tra cứu từ các nguồn uy tín, tổng hợp và giải đáp một cách thông minh, rành mạch.
5. SUY LUẬN & GIẢI ĐÁP: Dựa trên dữ liệu pháp lý và kiến thức tìm kiếm được để đưa ra câu trả lời chi tiết, logic nhất.
6. CHỌN LỌC: Tập trung tối đa vào các dữ liệu thực tế và chính xác.` }
            ] 
          }
        ],
        tools: [{ googleSearch: {} }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1,
          topP: 0.95,
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
