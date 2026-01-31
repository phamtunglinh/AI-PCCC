
import { GoogleGenAI } from "@google/genai";
import { Message, KnowledgeItem } from "../types";

// Lấy API Key từ môi trường hoặc yêu cầu cấu hình
const API_KEY = "AIzaSyACXHlnxS821ECPjBv1aFqYhJuIVLUTLjo";

const SYSTEM_INSTRUCTION = `
BẠN LÀ: Trợ lý ảo AI chuyên trách tư vấn Pháp luật Phòng cháy chữa cháy (PCCC) tỉnh Phú Thọ.

QUY TẮC CỐT LÕI (TUÂN THỦ TUYỆT ĐỐI):
1. NGUỒN TRI THỨC DUY NHẤT: Bạn chỉ được phép sử dụng thông tin từ [DỮ LIỆU BỔ SUNG TỪ TỆP] do Quản trị viên tải lên được cung cấp trong ngữ cảnh này. Tuyệt đối không sử dụng bất kỳ kiến thức bên ngoài nào khác.
2. CÂU TRẢ LỜI KHI THIẾU THÔNG TIN: Nếu câu hỏi không thể được giải đáp từ tài liệu đã tải lên, trả lời: "Hiện tại thông tin bạn thắc mắc đang được cập nhật, hãy liên hệ tới cán bộ quản lý về PCCC để có câu trả lời cụ thể hơn!"
3. QUY TẮC CÓ/KHÔNG: Phải khẳng định rõ ràng là "CÓ" hoặc "KHÔNG" ngay đầu câu trả lời nếu là câu hỏi xác nhận.
4. DẪN CHỨNG PHÁP LÝ: Phải đi kèm dẫn chứng: "Căn cứ theo Điều... Khoản... của [Tên văn bản]".
`;

export async function sendMessageWithSearch(
  messages: Message[],
  userKnowledge: KnowledgeItem[]
) {
  if (!API_KEY) {
    return { 
      text: "Lỗi: Hệ thống chưa được cấu hình API Key. Vui lòng kiểm tra lại cấu hình host.", 
      sources: [] 
    };
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const parts: any[] = [];
  
  if (userKnowledge.length === 0) {
    parts.push({ text: "LƯU Ý: Hiện chưa có tài liệu nghiệp vụ nào được Admin tải lên." });
  }

  userKnowledge.forEach(item => {
    if (item.mimeType === 'application/pdf' && item.fileData) {
      parts.push({
        inlineData: { data: item.fileData, mimeType: 'application/pdf' }
      });
      parts.push({ text: `[TÀI LIỆU: ${item.title}]` });
    } else if (item.content) {
      parts.push({ text: `[TÀI LIỆU: ${item.title}]:\n${item.content}` });
    }
  });

  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const userQuery = messages[messages.length - 1]?.content || "";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history,
        { role: 'user', parts: [...parts, { text: `CÂU HỎI: ${userQuery}` }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
      },
    });

    return { text: response.text || "Xin lỗi, tôi không tìm thấy thông tin phù hợp.", sources: [] };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return { text: "Hệ thống đang bận, vui lòng thử lại sau.", sources: [] };
  }
}
