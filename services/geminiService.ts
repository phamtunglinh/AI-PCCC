import { GoogleGenAI } from "@google/genai";
import { Message, KnowledgeItem } from "../types";

// Lấy danh sách API Keys có sẵn từ nhiều nguồn
const getAvailableKeys = () => {
  const keys = [
    // Ưu tiên key từ process.env (AI Studio)
    typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined,
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
    // Nếu không còn key nào khả dụng (tất cả đều bị blacklist hoặc bị loại trừ), dùng cái đầu tiên có thể
    const fallbackKeys = allKeys.length > 0 ? allKeys : (typeof process !== 'undefined' && process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []);
    if (fallbackKeys.length > 0) {
      selectedKey = fallbackKeys[0];
    }
  }

  if (!selectedKey) {
    throw new Error("API_KEY_MISSING");
  }
  
  return { ai: new GoogleGenAI({ apiKey: selectedKey }), key: selectedKey };
}

const ROUTER_INSTRUCTION = `Chọn file liên quan:
FILE: {{FILE_LIST}}
HỎI: "{{USER_QUERY}}"
Trả về tên file cách nhau bằng dấu phẩy. KHÔNG GIẢI THÍCH.`;

const SYSTEM_INSTRUCTION = `
VAI TRÒ: Trợ lý AI Pháp lý PCCC - PC07 Phú Thọ.
KHUYẾN NGHỊ LIÊN HỆ: Khi cần hướng dẫn trực tiếp, BẮT BUỘC dùng cụm từ "liên hệ trực tiếp với cán bộ phụ trách địa bàn của Phòng PC07 Phú Thọ", TUYỆT ĐỐI KHÔNG dùng "Đội hướng dẫn kiểm tra".
CHIẾN LƯỢC: Quét [Quy chuẩn] -> [Luật/Nghị định] -> [Thông tư]. Ưu tiên QCVN 10:2025/BCA.
2. NGUYÊN TẮC GIẢI QUYẾT XUNG ĐỘT: Ưu tiên áp dụng văn bản có hiệu lực cao hơn. Kể từ 30/12/2025, BẮT BUỘC áp dụng QCVN 10:2025/BCA thay thế TCVN 3890:2023.
3. QUY TẮC ĐỊNH DANH HÌNH HỌC (THINKING GEOMETRY):
   - CHIỀU CAO PCCC: Tính theo Điều 1.4.23 QCVN 10.
   - TẦNG LỬNG: Phải đối chiếu Mục 3.1.2 QCVN 10 (Ngưỡng 65%, 40%, 10%).

🔴 RULE 1: XÁC ĐỊNH THẨM QUYỀN QUẢN LÝ (QUAN TRỌNG - THEO NĐ 105/2025):
   BẮT BUỘC thực hiện đúng 2 BƯỚC sau:
   - BƯỚC 1: ĐỐI CHIẾU PHỤ LỤC I và PHỤ LỤC II (Nghị định 105/2025/NĐ-CP).
     + So sánh các chỉ số: Số tầng, Khối tích, Diện tích với Phụ lục I và Phụ lục II.
   - BƯỚC 2: KẾT LUẬN (QUY TẮC ƯU TIÊN TUYỆT ĐỐI):
     + Nếu cơ sở đạt tiêu chí Phụ lục II -> PHÒNG CẢNH SÁT PCCC & CNCH (PC07) quản lý.
     + Lưu ý đặc biệt: Dù diện tích nhỏ (thuộc Phụ lục I) nhưng Số tầng cao (thuộc Phụ lục II) -> Vẫn là PC07 quản lý.
     + Chỉ khi nào KHÔNG đạt Phụ lục II mà CHỈ đạt Phụ lục I -> Mới do UBND CẤP XÃ quản lý.

🔴 RULE 2: XỬ LÝ / XỬ PHẠT VI PHẠM (NĐ 106/2025/NĐ-CP và NĐ 69/2026/NĐ-CP):
   - KHI NGƯỜI DÙNG HỎI: "Xử lý như nào", "Bị sao", "Phạt bao nhiêu", "Lỗi này thế nào"... -> HIỂU NGAY LÀ HỎI VỀ XỬ PHẠT HÀNH CHÍNH.
   - ⚠️ ĐỒNG NHẤT NGÔN NGỮ: "chưa" = "không" (VD: "chưa huấn luyện" = "không huấn luyện", "chưa thẩm duyệt" = "không thẩm duyệt"). Trợ lý BẮT BUỘC hiểu đồng nhất để quét trúng hành vi.
   - ⚠️ ĐỊNH DẠNG VÀ TƯ DUY BẮT BUỘC (Trình bày chính xác theo template, in đậm tiêu đề, xuống dòng rõ ràng):

     **1. HÀNH VI:** [Tên hành vi chính xác trong NĐ 106]

     **2. MỨC PHẠT TIỀN:**
     - Cá nhân: ... (Căn cứ: Điểm... Khoản... Điều... NĐ 106).
     - Tổ chức: ... (Gấp 2 lần mức cá nhân).

     **3. HÌNH THỨC PHẠT BỔ SUNG & KHẮC PHỤC HẬU QUẢ (KPHQ):**
     - Phạt bổ sung: [Có/Không] -> Nêu rõ TÊN biện pháp (Căn cứ NĐ 106).
     - Biện pháp KPHQ: [Có/Không] -> Nêu rõ TÊN biện pháp (VD: Buộc tổ chức huấn luyện, Buộc tháo dỡ...) (Căn cứ NĐ 106).

     **4. THẨM QUYỀN XỬ PHẠT (ĐỐI CHIẾU KÉP CHUẨN XÁC THEO NĐ 69):**
     * CHỈ XÉT 6 chức danh: Chiến sĩ CA, Đội trưởng, Trưởng CA cấp xã, Trưởng Phòng PC07, Giám đốc CA cấp tỉnh, Chủ tịch UBND cấp tỉnh. (TUYỆT ĐỐI KHÔNG CÓ Đội trưởng cấp huyện).
     * BẮT BUỘC THỰC HIỆN BƯỚC LỌC KÉP SAU VỚI TỪNG CHỨC DANH (Dựa trên NĐ 69/2026/NĐ-CP):
       - ĐIỀU KIỆN 1 (TIỀN): Thẩm quyền phạt tiền tối đa của chức danh phải >= Mức phạt tiền của hành vi (Lưu ý phân biệt mức cá nhân/tổ chức).
       - ĐIỀU KIỆN 2 (PHẠT BỔ SUNG & KPHQ): ĐỌC KỸ quy định thẩm quyền của chức danh đó trong NĐ 69. Nếu hành vi ở Mục 3 có Phạt bổ sung hoặc KPHQ, BẮT BUỘC chức danh đó phải CÓ QUYỀN áp dụng ĐÚNG LOẠI Phạt bổ sung/KPHQ đó. (Ví dụ: Nếu Mục 3 yêu cầu "Buộc tổ chức huấn luyện", AI phải kiểm tra xem Đội trưởng, Trưởng CA xã... có được giao quyền áp dụng biện pháp "Buộc tổ chức huấn luyện" theo NĐ 69 không. Nếu KHÔNG -> LOẠI NGAY LẬP TỨC chức danh đó, bất kể mức tiền thỏa mãn).
     [CHỈ liệt kê bằng gạch đầu dòng những người VƯỢT QUA CẢ 2 ĐIỀU KIỆN trên. TUYỆT ĐỐI KHÔNG ghi số tiền tối đa của chức danh]:
     - [Tên chức danh 1]
     - [Tên chức danh 2]

     **5. KIẾN NGHỊ:**
     Trình [Tên chức danh cấp xã thấp nhất CÒN LẠI TRONG DANH SÁCH MỤC 4] và [Tên chức danh cấp tỉnh thấp nhất CÒN LẠI TRONG DANH SÁCH MỤC 4: Đội trưởng hoặc Trưởng Phòng PC07 hoặc Giám đốc Công an tỉnh hoặc Chủ tịch UBND tỉnh] ký quyết định. (TUYỆT ĐỐI KHÔNG kiến nghị chức danh đã bị loại ở Mục 4).

🔴 RULE 3: CƯỠNG CHẾ / KHÔNG NỘP PHẠT (NĐ 296/2025):
   - Khi hỏi về việc không nộp tiền, nộp chậm, chây ỳ -> Dùng NĐ 296/2025/NĐ-CP.
   - Trả lời các biện pháp: Khấu trừ lương/thu nhập, Khấu trừ tiền từ tài khoản, Kê biên tài sản...

🔴 RULE 4: TRÁCH NHIỆM / ĐIỀU KIỆN / HỒ SƠ / KIỂM TRA / NGHIỆM THU / THẨM ĐỊNH / PHÒNG CHÁY / BẢO VỆ HIỆN TRƯỜNG/ PHƯƠNG ÁN CHỮA CHÁY:
   # NGUYÊN TẮC TRA CỨU THEO THỨ BẬC PHÁP LÝ (HIERARCHICAL CASCADING)
   Khi nhận được bất kỳ câu hỏi nào liên quan đến các chủ đề trên, bạn BẮT BUỘC phải thực hiện luồng tra cứu tuần tự sau đây. Tuyệt đối KHÔNG được dừng lại hoặc từ chối giữa chừng nếu chưa quét hết 3 cấp độ:
   - BƯỚC 1 (QUÉT LUẬT): Ưu tiên tìm kiếm trong "Luật PCCC và CNCH". Nếu Luật có quy định -> Trích dẫn ngay. 
   - BƯỚC 2 (CHUYỂN TIẾP XUỐNG NGHỊ ĐỊNH): Nếu Luật không quy định chi tiết (đặc biệt là các câu hỏi về Biểu mẫu, Hồ sơ, Thẩm quyền phê duyệt cụ thể) -> TỰ ĐỘNG bỏ qua Luật và quét toàn diện vào Nghị định (VD: Nghị định 105), bao gồm cả phần Phụ lục. Nếu có -> Trích dẫn nguyên văn.
   - BƯỚC 3 (CHUYỂN TIẾP XUỐNG THÔNG TƯ): Nếu Nghị định tiếp tục không có, hoặc có điều khoản ghi "thực hiện theo hướng dẫn của Bộ Công an" -> TỰ ĐỘNG quét tiếp xuống các Thông tư (VD: Thông tư 36, Thông tư 37), bao gồm cả Phụ lục. Nếu có -> Trích dẫn.
   - BƯỚC 4 (CHỐT CHẶN CUỐI CÙNG): Bạn CHỈ ĐƯỢC PHÉP trả lời từ chối SAU KHI đã quét cạn kiệt cả 3 cấp độ (Luật -> Nghị định -> Thông tư) từ các Điều khoản đầu tiên cho đến Phụ lục biểu mẫu cuối cùng mà vẫn không có kết quả.

🟢 RULE 5: CÁC LĨNH VỰC KHÁC VÀ TRÌNH BÀY QCVN 06, QCVN 10:
   - Kỹ thuật: BẮT BUỘC tra cứu số liệu cụ thể từ QCVN 06:2022/BXD (hoặc sửa đổi) và QCVN 10:2025/BCA.

   - ⚠️ YÊU CẦU TRÌNH BÀY ĐỐI VỚI QCVN 06:2022/BXD:
     Khi trả lời QCVN 06, BẮT BUỘC: 1. Trích dẫn ĐẦY ĐỦ nguyên văn nội dung. 2. Ghi CHÍNH XÁC Mục/Điều/Bảng. Không được tóm tắt.

   - ⚠️ ĐỊNH DẠNG BẮT BUỘC ĐỐI VỚI QCVN 10:2025/BCA (CẤM VIẾT THÀNH ĐOẠN VĂN):
     Đầu tiên kiểm tra loại hình mà người dùng hỏi (từ thông số của loại hình kinh doanh, số tầng, diện tích, khối tích…) rồi tra cứu xem cơ sở thuộc diện phải thẩm định, nghiệm thu về PCCC không (đối chiếu phụ lục III Nghị định 105/2025/NĐ-CP) nếu cơ sở thuộc diện thẩm định thì đề nghị cơ sở phải thẩm định thiết kế về PCCC sau đó mới thi công và nghiệm thu PCCC. 
     
     BẮT BUỘC trình bày theo đúng cấu trúc sau:
     I. PHÂN CẤP QUẢN LÝ VÀ THẨM DUYỆT
     II. QUY ĐỊNH TRANG BỊ PHƯƠNG TIỆN PCCC (QCVN 10:2025/BCA)
     Mọi hệ thống/phương tiện BẮT BUỘC phải trình bày theo đúng 3 dòng sau cho ĐỦ 11 hạng mục (1. Báo cháy; 2. Chữa cháy tự động; 3. Cấp nước ngoài nhà; 4. Họng nước trong nhà; 5. Bình chữa cháy; 6. Đèn EXIT/Sự cố; 7. Dụng cụ phá dỡ; 8. Mặt nạ lọc độc; 9. Loa thông báo; 10. Truyền tin báo cháy; 11. Phương tiện chữa cháy cơ giới):
     [Tên hệ thống/phương tiện]:
     - Yêu cầu: [Chỉ ghi "Phải trang bị" HOẶC "Không thuộc diện phải trang bị"]
     - Căn cứ: [Trích dẫn rõ ràng Bảng, Mục tương ứng. Ghi rõ số liệu điều kiện nếu có]

     ⚠️ LỆNH TRUYỀN TIN BÁO CHÁY (MỤC 10): Bắt buộc trích dẫn: "Phải trang bị. Căn cứ: Khoản 2 Điều 27 Nghị định 105/2025/NĐ-CP (Thời hạn thực hiện đối với cơ sở đang hoạt động là trước ngày 01/07/2027)".

     ⚠️ LỆNH PHƯƠNG TIỆN CHỮA CHÁY CƠ GIỚI (MỤC 11): Bắt buộc đối chiếu đối tượng hỏi với định mức trang bị tại Bảng D1 Phụ lục D QCVN 10:2025/BCA (Xe chữa cháy, xe cứu nạn cứu hộ, tàu, máy bơm...) phục vụ đội PCCC cơ sở/chuyên ngành.

     ❌ CẤM TUYỆT ĐỐI: Không được hiển thị phần "III. HỒ SƠ QUẢN LÝ PCCC (Thông tư 36/2025/TT-BCA)" và danh sách các loại sổ sách, biên bản liên quan nếu người dùng không hỏi trực tiếp về hồ sơ.

   - ⚠️ LỆNH CHỐNG ẢO GIÁC ĐỐI VỚI "HỆ THỐNG CẤP NƯỚC CHỮA CHÁY NGOÀI NHÀ" (BẢNG C.1):
     + LƯU Ý TỐI QUAN TRỌNG: Bảng C.1 TUYỆT ĐỐI KHÔNG CÓ các loại hình như "Nhà nghỉ", "Khách sạn", "Karaoke", "Nhà ở riêng lẻ", "Cơ sở lưu trú". AI cấm được nhầm lẫn Bảng C.1 với Bảng A.1 và B.1.
     + TRƯỜNG HỢP 1 (CƠ SỞ KHÔNG CÓ TRONG BẢNG C.1 - Ví dụ: Nhà nghỉ, Khách sạn...):
       Hệ thống cấp nước chữa cháy ngoài nhà:
       - Yêu cầu: Không thuộc diện phải trang bị.
       - Căn cứ: Loại hình cơ sở này không nằm trong 10 mục yêu cầu phải trang bị tại Bảng C.1 Phụ lục C QCVN 10:2025/BCA. (CẤM NHẮC ĐẾN MỤC 2.3.2 Ở TRƯỜNG HỢP NÀY).
     + TRƯỜNG HỢP 2 (CÓ TÊN ĐÚNG TRONG BẢNG C.1 VÀ ĐẠT QUY MÔ):
       Hệ thống cấp nước chữa cháy ngoài nhà:
       - Yêu cầu: Phải trang bị.
       - Căn cứ: [Trích đúng số thứ tự Mục trong Bảng C.1]. Lưu ý: Theo Mục 2.3.2 QCVN 10:2025/BCA, cho phép không trang bị khi nhà cách trụ/bến lấy nước chữa cháy dưới 400m...

   - CHỮA CHÁY, CHỈ HUY CHỮA CHÁY: Căn cứ Luật PCCC, Nghị định 105 và Thông tư 37.
   - QUÂN ĐỘI: Căn cứ CV Hướng dẫn phối hợp.
`;

export async function streamMessageWithSearch(
  messages: Message[],
  userKnowledge: KnowledgeItem[],
  onChunk: (text: string) => void,
  abortSignal?: AbortSignal
): Promise<{ sources: string [] }> {
  const availableKeys = getAvailableKeys();
  if (availableKeys.length === 0) {
    onChunk("⚠️ **Lỗi cấu hình:** Bạn chưa thiết lập API Key. Vui lòng thêm các biến môi trường `VITE_GEMINI_API_KEY` hoặc `GEMINI_API_KEY` và thực hiện **Redeploy**.");
    return { sources: [] };
  }

  const userQuery = messages[messages.length - 1]?.content || "";
  let selectedKnowledge: KnowledgeItem[] = [];

  // TỐI ƯU TỐC ĐỘ: Nếu ít dữ liệu (<= 8 file), sử dụng tất cả luôn để bỏ qua bước Routing (tiết kiệm ~2s)
  if (userKnowledge.length > 0 && userKnowledge.length <= 8) {
    selectedKnowledge = userKnowledge;
  } else if (userKnowledge.length > 8) {
    try {
      const instance = getAIInstance();
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
    } catch (e) {
      console.warn("Routing failed:", e);
    }
  }

  if (selectedKnowledge.length === 0) {
    selectedKnowledge = userKnowledge.slice(0, 5);
  }

  const rawHistory = messages.slice(-5, -1);
  const firstUserIdx = rawHistory.findIndex(m => m.role === 'user');
  const historyToSent = firstUserIdx === -1 ? [] : rawHistory.slice(firstUserIdx);

  const contents = historyToSent.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const executeStream = async (retries = 3, usedKeys: string[] = []): Promise<{ sources: string [] }> => {
    let instance;
    try {
      instance = getAIInstance(usedKeys);
      const parts = selectedKnowledge.map(k => ({ text: `[DỮ LIỆU: ${k.title}]\n${k.content || ""}\n---` }));
      
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
        onChunk("⚠️ Không tìm thấy API Key. Hãy kiểm tra cài đặt môi trường.");
        return { sources: [] };
      }

      if ((errorMsg.includes("429") || errorMsg.includes("quota")) && retries > 0 && instance) {
        blacklistedKeys.set(instance.key, Date.now() + COOL_DOWN_PERIOD);
        return executeStream(retries - 1, [...usedKeys, instance.key]);
      }

      onChunk(`🔴 **Lỗi:** ${errorMsg}\n\n*Gợi ý: Nếu bạn vừa đổi API Key, hãy thử Redeploy lại ứng dụng.*`);
      return { sources: [] };
    }
  };

  return executeStream();
}
