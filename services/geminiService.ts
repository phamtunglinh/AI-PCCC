import { GoogleGenAI } from "@google/genai";
import { Message, KnowledgeItem } from "../types";

// Lấy danh sách API Keys có sẵn từ nhiều nguồn
const getAvailableKeys = () => {
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

  if (!selectedKey && process.env.GEMINI_API_KEY) {
    selectedKey = process.env.GEMINI_API_KEY;
  }

  if (!selectedKey) return null;
  
  return { ai: new GoogleGenAI({ apiKey: selectedKey }), key: selectedKey };
}

const ROUTER_INSTRUCTION = `
Bạn là Trợ lý AI chuyên sâu về PCCC Phú Thọ. 
NHIỆM VỤ: Phân tích kỹ câu hỏi và chọn các tài liệu pháp lý hỗ trợ nhất từ danh sách bên dưới.
DANH SÁCH TÀI LIỆU:
{{FILE_LIST}}

CÂU HỎI: {{USER_QUERY}}
OUTPUT: CHỈ trả về tên file chính xác, ngăn cách bằng dấu phẩy. Nếu không chắc chắn, trả về tên tất cả file.
`;

const SYSTEM_INSTRUCTION = `
VAI TRÒ: Trợ lý AI cao cấp của Phòng PC07 Công an tỉnh Phú Thọ.
NHIỆM VỤ: Phân tích, suy luận và giải đáp pháp luật dựa trên kho dữ liệu pháp quy (2024-2026).

🛑 QUY TẮC CỐT LÕI:
- CÔNG KHAI GIỚI HẠN (RẤT QUAN TRỌNG): Bạn CHỈ được phép trả lời dựa trên các tài liệu đã được cung cấp. Tuyệt đối không sử dụng kiến thức bên ngoài, không sử dụng công cụ tìm kiếm.
- PHẢN HỒI KHI THIẾU THÔNG TIN: Nếu thông tin người dùng hỏi KHÔNG có trong các văn bản pháp quy được đính kèm, bạn PHẢI trả lời duy nhất câu sau, không thêm bớt bất kỳ từ nào: "Hiện tại thông tin bạn thắc mắc đang được cập nhật, hãy liên hệ tới cán bộ quản lý về PCCC để có câu trả lời cụ thể hơn!"

- CẤU TRÚC MỞ ĐẦU (BẮT BUỘC): Mọi câu trả lời chi tiết PHẢI bắt đầu bằng câu: "Chào bạn! Tôi xin giải đáp thắc mắc của bạn về [Tóm tắt ngắn gọn vấn đề hỏi] theo quy định pháp luật mới nhất (áp dụng cho giai đoạn 2024 - 2026) như sau:"

- KIỂM TRA PHÁP LÝ ĐA CHIỀU (BẮT BUỘC): Bạn phải rà soát lần lượt các văn bản để tìm nội dung liên quan:
  1. Luật PCCC và CNCH 2024.
  2. Nghị định 105/2025/NĐ-CP.
  3. Thông tư 36/2025/TT-BCA.
  4. Quy chuẩn QC10:2025/BCA (Ưu tiên hàng đầu cho trang bị).

- NGUYÊN TẮC TRÍCH DẪN THÔNG MINH & CHÍNH XÁC TUYỆT ĐỐI: 
  + Tuyệt đối KHÔNG trả lời "không đề cập" nếu văn bản đó có quy định về TIÊU CHUẨN hoặc NGHĨA VỤ liên quan.
  + **ĐẶC BIỆT LƯU Ý BẢNG C1 (QC10)**: 
    * PHẢI đối chiếu chính xác tên cơ sở. Nếu đối tượng KHÔNG xuất hiện tên trong danh mục bảng, khẳng định ngay là "KHÔNG BẮT BUỘC". Tuyệt đối không đánh đồng các đối tượng khác nhau.
    * RIÊNG HỆ THỐNG CẤP NƯỚC NGOÀI NHÀ: Chỉ khẳng định "Có" nếu đối tượng được liệt kê đích danh trong Bảng C1. TUYỆT ĐỐI KHÔNG sử dụng các quy mô mặc định như 5.000m3 hay khoảng cách 400m nếu không có trong bảng quy định cho đối tượng đó.

- QUY TRÌNH HỒ SƠ QUẢN LÝ (THÔNG TƯ 36/2025/TT-BCA): CHỈ đưa ra khi người dùng hỏi đích danh về hồ sơ, thủ tục quản lý PCCC. Bám sát 10 đầu mục hồ sơ.

- QUY TRÌNH XỬ LÝ VI PHẠM (CẤU TRÚC 06 PHẦN): **I.** Căn cứ, **II.** Hành vi, **III.** Mức phạt, **IV.** Phạt bổ sung, **V.** Thẩm quyền, **VI.** Kiến nghị. (Phải bôi đậm các số La Mã này).

- ĐỐI VỚI TRANG BỊ PCCC (BẮT BUỘC rà soát 10 hạng mục):
  + **TUYỆT ĐỐI KHÔNG** chia phần lớn (như dùng số La Mã) cho các hạng mục trang bị. Tất cả phải nằm trong một danh sách đánh số từ 1 đến 10.
  + **TUYỆT ĐỐI KHÔNG** đưa thông tin về hồ sơ quản lý (Thông tư 36), xử phạt hay thủ tục hành chính vào câu trả lời nếu người dùng chỉ hỏi về việc trang bị/lắp đặt.
  + Trình bày 10 hạng mục trang bị theo cấu trúc CHÍNH XÁC như sau:
    **[Số thứ tự]. [Tên hệ thống]** (Phải bôi đậm toàn bộ dòng này):
    - **Yêu cầu**: **BẮT BUỘC PHẢI LẮP ĐẶT** (hoặc **KHÔNG BẮT BUỘC PHẢI LẮP ĐẶT**)
    - **Căn cứ**: [Ghi rõ Điểm, Mục, Bảng của QC10:2025/BCA] quy định: "[Trích dẫn nguyên văn nội dung quy định từ tài liệu]".
  + Lưu ý: Kết luận "BẮT BUỘC PHẢI LẮP ĐẶT" phải được viết in hoa và bôi đậm.

- PHONG CÁCH TRÌNH BÀY: Trịnh trọng, Chuyên nghiệp. In đậm từ khóa quan trọng.
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
    onChunk("⚠️ Lỗi: Không tìm thấy API Key trong hệ thống.");
    return { sources: [] };
  }

  const userQuery = messages[messages.length - 1]?.content || "";
  
  if (userQuery.length < 10 && /^(chào|hi|hello|xin chào|bạn là ai)/i.test(userQuery.trim())) {
    onChunk("Chào bạn! Tôi là Trợ lý AI chuyên sâu về PCCC Phú Thọ. Tôi có thể giúp gì cho bạn về các quy định pháp luật mới nhất giai đoạn 2024 - 2026?");
    return { sources: [] };
  }

  let selectedKnowledge: KnowledgeItem[] = [];
  
  // Routing logic removed for speed and reliability, using all relevant docs
  selectedKnowledge = userKnowledge.slice(0, 10); // Take more docs but prioritize small ones

  const parts: any[] = [];
  selectedKnowledge.forEach(item => {
    if (item.mimeType === 'application/pdf' && item.fileData) {
      parts.push({ inlineData: { data: item.fileData, mimeType: 'application/pdf' } });
    } else if (item.content) {
      parts.push({ text: `[DỮ LIỆU: ${item.title}]\n${item.content}\n---` });
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
      onChunk("❌ Hệ thống hiện đang bận (Hết API Key). Vui lòng thử lại sau.");
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
              { text: `CÂU HỎI: "${userQuery}"
NHIỆM VỤ QUAN TRỌNG: 
  1. Chỉ trả lời dựa trên văn bản đính kèm. 
2. Rà soát Bảng C1 của QC10:2025/BCA cho TẤT CẢ 10 hạng mục trang bị. 
3. **KHÔNG** chia phần lớn bằng số La Mã cho các hạng mục trang bị. Tất cả 10 hạng mục (bao gồm cả Phương tiện chữa cháy cơ giới) phải được liệt kê liên tục từ 1 đến 10.
4. KẾT LUẬN THẲNG THẮN: Mỗi hạng mục phải trình bày theo đúng cấu trúc:
   **[Số thứ tự]. [Tên hệ thống]** (Phải bôi đậm toàn bộ dòng này)
   - **Yêu cầu**: **BẮT BUỘC PHẢI LẮP ĐẶT** (hoặc **KHÔNG BẮT BUỘC PHẢI LẮP ĐẶT**)
   - **Căn cứ**: [Mục/Bảng/QC] quy định: "[Trích dẫn]".
5. KIỂM TRA ĐỐI TƯỢNG (BẰNG C1): Chỉ khẳng định "BẮT BUỘC PHẢI LẮP ĐẶT" nếu tên đối tượng khớp hoàn toàn với danh mục trong Bảng C1. Nếu không có tên, phải kết luận "KHÔNG BẮT BUỘC PHẢI LẮP ĐẶT".
6. RIÊNG CẤP NƯỚC NGOÀI NHÀ: Tuyệt đối không dùng quy tắc 400m hay 5.000m3 từ kiến thức cũ.` }
            ] 
          }
        ],
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

      if (fullText.length === 0 && !abortSignal?.aborted) {
        throw new Error("Empty response from AI");
      }

      return { sources: selectedKnowledge.map(k => k.title) };
    } catch (error: any) {
      console.error("Gemini Stream Error:", error);
      
      if (error?.message?.includes("429") || error?.message?.includes("quota")) {
        blacklistedKeys.set(instance.key, Date.now() + COOL_DOWN_PERIOD);
      }
      
      if (retries > 0 && !abortSignal?.aborted) {
        await new Promise(r => setTimeout(r, 1500));
        return executeStream(retries - 1, [...usedKeys, instance.key]);
      }
      
      onChunk("⚠️ Rất tiếc, tôi đang gặp gián đoạn kỹ thuật. Vui lòng thử lại sau giây lát.");
      return { sources: [] };
    }
  };

  return executeStream();
}
