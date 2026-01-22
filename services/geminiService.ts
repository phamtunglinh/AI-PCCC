
import { GoogleGenAI } from "@google/genai";
import { Message, KnowledgeItem } from "../types";
import { SYSTEM_DOCUMENTS } from "./systemKnowledge";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
BẠN LÀ: Trợ lý ảo AI chuyên trách tư vấn Pháp luật Phòng cháy chữa cháy (PCCC) tỉnh Phú Thọ.

NGUỒN DỮ LIỆU:
Bạn sẽ nhận được một thư viện các tài liệu (PDF, Word, Văn bản). Hãy tổng hợp và trả lời chính xác dựa trên toàn bộ dữ liệu này.

QUY TẮC QUAN TRỌNG VỀ BIỂU MẪU & LINK TẢI:
- Khi người dân hỏi về: link tải, mẫu đơn, biểu mẫu, tờ khai, file mẫu, tải ở đâu...
- TUYỆT ĐỐI KHÔNG tự cung cấp link trực tiếp hoặc file.
- HÃY TRẢ LỜI CỐ ĐỊNH: "Để đảm bảo sử dụng đúng mẫu biểu mới nhất theo quy định hiện hành, vui lòng quay lại trang chủ, truy cập vào mục 'VĂN BẢN' trên Trang thông tin điện tử PCCC Phú Thọ để tìm kiếm và tải về."

QUY TẮC PHẢN HỒI:
1. Nếu có nhiều tài liệu cùng nói về một vấn đề, hãy tổng hợp thông tin từ tài liệu có ngày ban hành mới nhất.
2. Trích dẫn rõ Điều, Khoản và tên văn bản quy phạm pháp luật.
3. Nếu thông tin không có trong dữ liệu được cung cấp, hãy hướng dẫn người dân liên hệ trực tiếp với cơ quan PCCC gần nhất để được hướng dẫn cụ thể.
4. Ngôn ngữ: Lễ phép, chuyên nghiệp, chính xác.
`;

export async function sendMessageWithSearch(
  messages: Message[],
  userKnowledge: KnowledgeItem[]
) {
  const parts: any[] = [];
  
  // Load fixed system knowledge
  const systemTextContext = SYSTEM_DOCUMENTS
    .map(doc => `[HỆ THỐNG]: ${doc.title}\n${doc.content}`)
    .join('\n\n');
  parts.push({ text: `KIẾN THỨC NỀN TẢNG:\n${systemTextContext}` });

  // Load all user knowledge (PDFs as inline data, others as text)
  userKnowledge.forEach(item => {
    if (item.mimeType === 'application/pdf' && item.fileData) {
      parts.push({
        inlineData: {
          data: item.fileData,
          mimeType: 'application/pdf'
        }
      });
      parts.push({ text: `Nội dung từ tài liệu: ${item.title}` });
    } else if (item.content) {
      parts.push({ text: `[TÀI LIỆU: ${item.title}]:\n${item.content}` });
    }
  });

  // Prepare chat history for context
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
        { role: 'user', parts: [...parts, { text: `CÂU HỎI HIỆN TẠI: ${userQuery}` }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const text = response.text || "Tôi không tìm thấy thông tin phù hợp trong dữ liệu.";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Tham khảo Web',
      uri: chunk.web?.uri
    })).filter((s: any) => s.uri) || [];

    return { text, sources };
  } catch (error: any) {
    console.error("Lỗi Gemini:", error);
    return { 
      text: "Xin lỗi, hệ thống đang gặp khó khăn khi truy xuất kho dữ liệu văn bản. Vui lòng thử lại sau giây lát.", 
      sources: [] 
    };
  }
}
