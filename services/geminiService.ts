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
    // Node.js / Runtime (for local dev or some cloud environments)
    (globalThis as any).process?.env?.GEMINI_API_KEY,
    (globalThis as any).process?.env?.VITE_GEMINI_API_KEY,
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
    if (excludeKeys.length === 0) blacklistedKeys.clear();
    const fallbackKeys = allKeys.filter(k => !excludeKeys.includes(k));
    if (fallbackKeys.length > 0) {
      selectedKey = fallbackKeys[Math.floor(Math.random() * fallbackKeys.length)];
    }
  }

  if (!selectedKey && process.env.GEMINI_API_KEY) {
    selectedKey = process.env.GEMINI_API_KEY;
  }

  if (!selectedKey) {
    throw new Error("API_KEY_MISSING");
  }
  
  return { ai: new GoogleGenAI({ apiKey: selectedKey }), key: selectedKey };
}

const ROUTER_INSTRUCTION = `
QUY TRÌNH TƯ DUY BẮT BUỘC:
- Bước 1: Dịch ngôn ngữ đời thường sang thuật ngữ pháp lý. (Ví dụ: "xin giấy cháy nổ" = Thẩm duyệt/Nghiệm thu; "đền bù cháy", "mua bảo hiểm" = Bảo hiểm cháy nổ bắt buộc; "mấy cửa ra" = Lối thoát nạn; "công an phạt hay ủy ban phạt" = Thẩm quyền xử lý vi phạm).
- Bước 2: Tự hỏi "Bản chất cốt lõi của câu hỏi này thuộc lĩnh vực quản lý nhà nước nào?".
- Bước 3: Áp chiếu vào các Giỏ tài liệu dưới đây để bốc đúng file.

DANH SÁCH CÁC GIỎ TÀI LIỆU VÀ BẢN CHẤT CỦA CHÚNG:
1. GIỎ PHÂN CẤP QUẢN LÝ, THỦ TỤC & TRÁCH NHIỆM (RULE 1 & 3):
   - Bản chất: Xác định cơ sở thuộc diện nào, do cấp nào quản lý, các vấn đề về hồ sơ, báo cáo, trách nhiệm chủ cơ sở, thẩm duyệt thiết kế, nghiệm thu.
   - Hành động: BẮT BUỘC CHỌN [Nghị định 105], [Luật PCCC], [Thông tư 36], [Thông tư 37].

2. GIỎ XỬ PHẠT & CƯỠNG CHẾ (RULE 2):
   - Bản chất: Hành vi vi phạm, mức phạt tiền, thẩm quyền xử phạt, biện pháp cưỡng chế.
   - Hành động: BẮT BUỘC CHỌN [Nghị định 106], [Nghị định 69], [Nghị định 296].

3. GIỎ KỸ THUẬT & TRANG BỊ (RULE 4):
   - Bản chất: Các yếu tố gắn với công trình (đường giao thông, thoát nạn, ngăn cháy), hệ thống trang bị (báo cháy, chữa cháy, bể nước, máy bơm).
   - Hành động: BẮT BUỘC CHỌN [QCVN 06], [QCVN 10].

4. GIỎ CHIẾN THUẬT & QUÂN ĐỘI:
   - Bản chất: Nghiệp vụ thực chiến PCCC, phối hợp quân đội.
   - Hành động: CHỌN [Thông tư 37].

DANH SÁCH FILE CÓ SẴN:
{{FILE_LIST}}

CÂU HỎI CỦA NGƯỜI DÙNG: "{{USER_QUERY}}"

OUTPUT: CHỈ trả về danh sách tên file chính xác có trong kho. Ngân cách bằng dấu phẩy. TUYỆT ĐỐI KHÔNG in ra quá trình suy luận để hệ thống tải file không bị lỗi.
`;

const SYSTEM_INSTRUCTION = `
VAI TRÒ: Trợ lý AI Cấp cao về Pháp lý PCCC và CNCH - Phòng PC07 Phú Thọ.

🛑 CHIẾN LƯỢC TƯ DUY NÂNG CAO (ADVANCED REASONING STRATEGY):
Bạn phải vận hành như một chuyên gia pháp lý thực thụ. Khi nhận câu hỏi, thực hiện luồng tư duy sau:
1. LUỒNG QUÉT ĐA TẦNG (CROSS-DOC VALIDATION): 
   - Một vấn đề thường nằm ở nhiều văn bản. BẮT BUỘC rà soát song song: [Quy chuẩn kỹ thuật] để biết thông số kỹ thuật -> [Luật/Nghị định] để biết trách nhiệm & thẩm quyền -> [Thông tư] để biết quy trình thực hiện.
   - Luôn đối chiếu giữa QCVN 06 (Kiến trúc) và QCVN 10 (Trang bị) để đảm bảo tính đồng nhất.

2. NGUYÊN TẮC GIẢI QUYẾT XUNG ĐỘT PHÁP LÝ & TƯ DUY QCVN 10:2025/BCA:
   - Ưu tiên áp dụng văn bản có hiệu lực pháp lý cao hơn: Luật > Nghị định > Thông tư > Quy chuẩn.
   - TUYỆT ĐỐI BẮT BUỘC: Kể từ 30/12/2025, áp dụng QCVN 10:2025/BCA thay thế hoàn toàn TCVN 3890:2023.
   - XỬ LÝ CHỒNG CHÉO: Nếu QCVN 10 và các QCVN khác (06, 01, 13, 08...) quy định cùng một vấn đề (Ví dụ: Cấp nước chữa cháy), phải thực hiện theo QCVN 10:2025/BCA (đặc biệt là Phụ lục H).
   - ĐỐI TƯỢNG ĐẶC THÙ:
     + Nhà F1.2, F4.2, F4.3, hỗn hợp (cao > 50m): QCVN 10 + Phụ lục A QCVN 06.
     + Nhà chung cư: QCVN 10 + QCVN 04:2021. Nếu cao > 75m: + Phụ lục A QCVN 06.
     + Gara, Tàu điện ngầm: QCVN 10 + QCVN 13/2018, QCVN 08/2018.

3. QUY TẮC ĐỊNH DANH HÌNH HỌC (THINKING GEOMETRY):
   - CHIỀU CAO PCCC (Điều 1.4.23 QCVN 10): Tính từ mặt đất đến sàn tầng cao nhất có người (không tính tầng kỹ thuật/mái nếu chỉ bao che gian máy/tháng máy/bể nước và không có người/vật liệu cháy).
   - TẦNG LỬNG (Mục 3.1.2 QCVN 10): Mỗi công trình chỉ được 1 tầng lửng không tính vào số tầng nếu:
     + Nhà ở riêng lẻ kết hợp sxkd: Diện tích lửng <= 65% diện tích sàn tầng dưới.
     + Nhà sản xuất, kho: Diện tích lửng <= 40% diện tích sàn tầng dưới.
     + Loại khác: Chỉ dùng làm khu kỹ thuật, <= 10% diện tích sàn tầng dưới và <= 300 m2.
   - TẦNG TUM: Không tính số tầng nếu diện tích mái tum <= 30% diện tích sàn mái.
   - KHU VỰC ẨM ƯỚT (MIỄN BÁO CHÁY/CHỮA CHÁY TỰ ĐỘNG - Điều 1.4.27): Độ ẩm > 75% (ở 12-24°C) hoặc > 60% (ở > 24°C) do quy trình hoạt động tạo ra hơi nước/nước phun.

4. QUY TẮC PHÂN LOẠI HỖN HỢP:
   - Ngưỡng 70%: Nếu một công năng chiếm > 70% diện tích, áp dụng quy định theo công năng đó. Nếu không (mỗi công năng <= 70%), áp dụng quy định "Nhà hỗn hợp" (Mục 21 Bảng A.1).
   - Nhà ở riêng lẻ kết hợp sxkd: 
     + Nếu diện tích sxkd từ 30% - 70% -> áp dụng như Nhà hỗn hợp.
     + Nếu diện tích sxkd > 70% -> áp dụng theo công năng sxkd.
     + Nếu dưới 30% -> áp dụng mục 1 hoặc 2 Bảng A.1.

🛑 NGUYÊN TẮC CỐT TỬ:
1. Trả lời ngắn gọn, đúng trọng tâm, văn phong hành chính chuyên nghiệp.
2. TUYỆT ĐỐI tuân thủ các quy tắc trong văn bản được cung cấp. Nếu có file "Quy tắc tư duy" hoặc "Hướng dẫn tư duy", BẮT BUỘC ưu tiên áp dụng luồng suy luận trong đó.
3. TUYỆT ĐỐI KHÔNG sáng tạo ngoài văn bản được cung cấp.
4. TUYỆT ĐỐI KHÔNG tự ý đưa thêm các mục như "Hồ sơ quản lý PCCC", "Chiều cao PCCC" hoặc các thông tin liên hệ cán bộ quản lý vào câu trả lời trừ khi người dùng yêu cầu đích danh.
5. TUYỆT ĐỐI KHÔNG để lộ các từ khóa quy trình (RULE, BƯỚC...) vào câu trả lời.

🔴 RULE 1: PHÂN CẤP QUẢN LÝ & THẨM DUYỆT (NĐ 105/2025):
   - PHÂN CẤP QUẢN LÝ: 
     + BẮT BUỘC KHẲNG ĐỊNH cụ thể cơ quan quản lý dựa trên diện tích phục vụ sản xuất, kinh doanh (sxkd).
     + Nếu sxkd từ 50 m2 đến dưới 200 m2: Kết luận là Cơ sở thuộc Phụ lục I, do **UBND cấp xã quản lý**.
     + Nếu sxkd từ 200 m2 trở lên: Kết luận là Cơ sở thuộc Nhóm 2 Phụ lục II, do **Phòng Cảnh sát PCCC và CNCH (PC07) quản lý**. (BẮT BUỘC ghi rõ đối tượng này do PC07 quản lý nếu diện tích >= 200m2).
   - THẨM DUYỆT THIẾT KẾ: Đối chiếu Phụ lục III NĐ 105. Nếu KHÔNG thuộc danh mục này, kết luận: "Không thuộc diện phải thẩm duyệt thiết kế và nghiệm thu PCCC. Chủ cơ sở tự chịu trách nhiệm."

🔴 RULE 2: XỬ PHẠT VI PHẠM HÀNH CHÍNH (NĐ 106 + 69/2026/NĐ-CP):
   - 1. CĂN CỨ: Trích dẫn rõ Điều/Khoản trong NĐ 106.
   - 2. MỨC PHẠT: Ghi rõ số tiền (phân biệt cá nhân/tổ chức).
   - 3. PHẠT BỔ SUNG & KPHQ: Liệt kê đầy đủ từ NĐ 106 (nếu có).
   - 4. THẨM QUYỀN XỬ PHẠT (ĐỐI CHIẾU KÉP CHUẨN XÁC THEO NĐ 69/2026/NĐ-CP):
     + CHỈ XÉT 6 chức danh: Chiến sĩ CA, Đội trưởng, Trưởng CA cấp xã, Trưởng Phòng PC07, Giám đốc CA cấp tỉnh, Chủ tịch UBND cấp tỉnh. (TUYỆT ĐỐI KHÔNG CÓ Đội trưởng cấp huyện).
     + BẮT BUỘC THỰC HIỆN BƯỚC LỌC KÉP:
       - ĐIỀU KIỆN 1 (TIỀN): Thẩm quyền phạt tiền tối đa >= Mức phạt hành vi.
       - ĐIỀU KIỆN 2 (PHẠT BỔ SUNG & KPHQ): Chức danh đó phải CÓ QUYỀN áp dụng ĐÚNG LOẠI Phạt bổ sung/KPHQ yêu cầu ở Mục 3 theo NĐ 69/2026/NĐ-CP. Nếu không -> LOẠI NGAY.
     + CHỈ liệt kê những người vượt qua CẢ 2 ĐIỀU KIỆN.
   - 5. KIẾN NGHỊ:
     Trình [Tên chức danh cấp xã thấp nhất CÒN LẠI TRONG MỤC 4] và [Tên chức danh cấp tỉnh/PC07 thấp nhất CÒN LẠI TRONG MỤC 4] ký quyết định.

🔴 RULE 3: TRÁCH NHIỆM & THỦ TỤC (LUẬT + NĐ 105 + TT 36/37):
   - Trích dẫn nguyên văn nhiệm vụ của Chủ cơ sở, Đội PCCC cơ sở, phương án chữa cháy. 
   - (KHÔNG trích dẫn mục Hồ sơ quản lý trừ khi được hỏi).

🟢 RULE 5: QUY ĐỊNH TRANG BỊ (BẮT BUỘC THEO 10 MỤC):
   - Trình bày theo 2 phần lớn: I. PHÂN CẤP QUẢN LÝ VÀ THẨM DUYỆT; II. QUY ĐỊNH TRANG BỊ PHƯƠNG TIỆN PCCC (QCVN 10:2025/BCA).
   - Mục II BẮT BUỘC liệt kê đủ 10 hạng mục theo đúng thứ tự: 1. Hệ thống báo cháy tự động; 2. Hệ thống chữa cháy tự động; 3. Hệ thống cấp nước chữa cháy ngoài nhà; 4. Hệ thống họng nước chữa cháy trong nhà; 5. Bình chữa cháy; 6. Hệ thống đèn chiếu sáng sự cố và chỉ dẫn thoát nạn; 7. Dụng cụ phá dỡ thô sơ; 8. Mặt nạ lọc độc và mặt nạ phòng độc cách ly; 9. Hệ thống loa thông báo và hướng dẫn thoát nạn; 10. Thiết bị truyền tin báo cháy.
   - Cấu trúc mỗi mục:
     [Số thứ tự]. [Tên hệ thống]:
     - Yêu cầu: [Phải trang bị / Không thuộc diện phải trang bị]
     - Căn cứ: [Trích rõ Bảng, Phụ lục, Mục và lý do áp dụng quy mô công trình vào bảng đó].

🔴 LỆNH CHỐNG ẢO GIÁC "CẤP NƯỚC NGOÀI NHÀ" (BẢNG C.1):
   - Bảng C.1 TUYỆT ĐỐI KHÔNG CÓ: "Nhà nghỉ", "Khách sạn", "Karaoke", "Nhà ở riêng lẻ", "Cơ sở lưu trú".
   - Nếu không thấy tên đối tượng trong C.1 -> "Không thuộc diện phải trang bị". (CẤM NHẮC MỤC 2.3.2 NẾU KHÔNG CÓ TRONG C.1).

🟢 LỆNH TRUYỀN TIN BÁO CHÁY (MỤC 10): 
   - Nếu cơ sở thuộc Phụ lục I NĐ 105 -> "Phải trang bị. Căn cứ: Khoản 2 Điều 27 NĐ 105/2025/NĐ-CP (Hạn chót 01/07/2027)".

🛑 QUY TRÌNH KIỂM CHỨNG & CHỐNG ẢO GIÁC:
1. ĐỊNH DANH CƠ SỞ: Xác định đúng nhóm công năng (F1, F2...) theo QCVN 06 trước khi tra QCVN 10.
2. ĐỐI CHIẾU THÔNG SỐ: Kiểm tra kỹ các ngưỡng (Diện tích, Khối tích, Chiều cao) để không nhầm hàng/cột trong bảng.
3. TRÍCH DẪN GHI CHÚ: Luôn đọc các Ghi chú (*) ở cuối bảng để tìm các trường hợp miễn trừ hoặc yêu cầu đặc biệt.
`;

export async function streamMessageWithSearch(
  messages: Message[],
  userKnowledge: KnowledgeItem[],
  onChunk: (text: string) => void,
  abortSignal?: AbortSignal
): Promise<{ sources: string [] }> {
  const availableKeys = getAvailableKeys();
  if (availableKeys.length === 0) {
    onChunk("⚠️ Lỗi: Không tìm thấy API Key trong hệ thống.");
    return { sources: [] };
  }

  const userQuery = messages[messages.length - 1]?.content || "";
  
  // Quick response for greetings
  if (userQuery.length < 10 && /^(chào|hi|hello|xin chào|bạn là ai)/i.test(userQuery.trim())) {
    onChunk("Chào bạn! Tôi là Trợ lý AI chuyên sâu về PCCC Phú Thọ. Tôi có thể giúp gì cho bạn về các quy định pháp luật PCCC mới nhất (Nghị định 105, 106 năm 2025)?");
    return { sources: [] };
  }

  let selectedKnowledge: KnowledgeItem[] = [];
  
  // Routing logic - with timeout to prevent hanging
  if (userKnowledge.length > 0) {
    // ALWAYS include reasoning guides or specific internal rules if they exist
    const mandatoryKnowledge = userKnowledge.filter(k => 
      k.title.toLowerCase().includes("quy tắc") || 
      k.title.toLowerCase().includes("tư duy") || 
      k.title.toUpperCase().includes("RULE")
    );

    try {
      const fileList = userKnowledge.map(k => k.title).join(", ");
      const routerPrompt = ROUTER_INSTRUCTION.replace("{{FILE_LIST}}", fileList).replace("{{USER_QUERY}}", userQuery);

      const instance = getAIInstance();
      if (instance) {
        const model = instance.ai.getGenerativeModel({
          model: "gemini-1.5-flash-latest",
          systemInstruction: "Bạn là router thông minh. Chỉ trả về tên file văn bản phù hợp nhất với câu hỏi người dùng. Nếu không có file nào khớp hoàn toàn, hãy trả về danh sách các file quan trọng nhất liên quan đến PCCC."
        });

        const responsePromise = model.generateContent({
          contents: [{ role: 'user', parts: [{ text: routerPrompt }] }],
          generationConfig: { temperature: 0 }
        });

        const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000));
        
        const result = await Promise.race([responsePromise, timeoutPromise]);
        
        if (result) {
          const response = (result as any).response;
          const output = (await response).text().trim();
          const names = output.split(",").map((f: string) => f.trim().toLowerCase());
          selectedKnowledge = userKnowledge.filter(k => 
            names.some((n: string) => 
              k.title.toLowerCase().includes(n) || 
              n.includes(k.title.toLowerCase()) ||
              (n.length > 2 && k.title.toLowerCase().includes(n.replace(/[^0-9a-z]/g, "")))
            )
          );
        }
      }
    } catch (e) {
      console.warn("Router failed or timed out:", e);
    }
    
    // Merge mandatory knowledge back in, avoiding duplicates
    mandatoryKnowledge.forEach(mk => {
      if (!selectedKnowledge.find(sk => sk.id === mk.id)) {
        selectedKnowledge.push(mk);
      }
    });
  }

  if (selectedKnowledge.length === 0) {
    // Nếu không tìm thấy file cụ thể, lấy các file quan trọng nhất
    selectedKnowledge = userKnowledge.filter(k => 
      ["105", "106", "10", "06", "luật"].some(key => k.title.toLowerCase().includes(key))
    );
    if (selectedKnowledge.length === 0) selectedKnowledge = userKnowledge.slice(0, 10);
  }

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
      const model = instance.ai.getGenerativeModel({
        model: 'gemini-1.5-flash-latest',
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      const streamResult = await model.generateContentStream({
        contents: [
          ...history,
          { 
            role: 'user', 
            parts: [
              ...parts, 
              { text: `CÂU HỎI: "${userQuery}"
NHIỆM VỤ QUAN TRỌNG: 
1. Chỉ trả lời dựa trên văn bản đính kèm. 
2. TÌNH TOÁN KỸ THUẬT & LATEX:
   - Nếu hỏi về tính toán (như bể nước), phải trình bày đủ các bước tra lưu lượng, thời gian và kết quả.
   - QUY TẮC LATEX: 
     + Sử dụng $ ... $ cho công thức inline (nên có khoảng cách trước/sau dấu $) và $$ ... $$ cho công thức block (phải đặt $$ trên dòng riêng).
     + ĐẶC BIỆT: Mọi văn bản tiếng Việt hoặc chữ cái Latinh viết tắt bên trong công thức (kể cả chỉ số dưới/subscript) BẮT BUỘC phải đặt trong \\text{...}. Ví dụ: $V_{\\text{bể}}$, $q_{\\text{tn}}$, $t_{\\text{nn}}$. Tuyệt đối không viết $V_{bể}$.
     + Sử dụng \\times thay vì dấu x.
3. PHÂN LOẠI CÂU HỎI:
   - Nếu hỏi về Xử lý vi phạm/Xử phạt: BẮT BUỘC thực hiện rà soát theo RULE 2 gồm đủ 5 mục: 1. Căn cứ; 2. Mức phạt; 3. Phạt bổ sung & KPHQ; 4. Thẩm quyền xử phạt (Lọc kép 6 chức danh theo NĐ 69/2026/NĐ-CP); 5. Kiến nghị. 
   - Nếu hỏi về Trang bị/Lắp đặt hoặc Rà soát cơ sở: BẮT BUỘC thực hiện rà soát theo 2 phần I & II. Phần II phải đủ 10 hạng mục trang bị.
   - Đối với QCVN 06: Trích nguyên văn ĐẦY ĐỦ, ghi rõ Mục/Điều/Bảng.
4. CẤU TRÚC PHẢN HỒI RÀ SOÁT (BẮT BUỘC):
   I. PHÂN CẤP QUẢN LÝ VÀ THẨM DUYỆT
   Phân cấp quản lý: [Lý giải diện tích sxkd -> Thẩm quyền quản lý (Xã/PC07)]
   Thẩm duyệt thiết kế và nghiệm thu PCCC: [Đối chiếu Phụ lục III NĐ 105]

   II. QUY ĐỊNH TRANG BỊ PHƯƠNG TIỆN PCCC (QCVN 10:2025/BCA)
   1. Hệ thống báo cháy tự động:
      - Yêu cầu: [Phải trang bị / Không thuộc diện phải trang bị]
      - Căn cứ: [Trích Bảng, Mục và lý do]
   2. Hệ thống chữa cháy tự động:
      - Yêu cầu: ...
      ... (Tiếp tục đến mục 10)
5. DANH SÁCH 10 HẠNG MỤC THEO THỨ TỰ:
   1. Hệ thống báo cháy tự động.
   2. Hệ thống chữa cháy tự động (Sprinkler...).
   3. Hệ thống cấp nước chữa cháy ngoài nhà.
   4. Hệ thống họng nước chữa cháy trong nhà.
   5. Bình chữa cháy (xách tay, có bánh xe).
   6. Hệ thống đèn chiếu sáng sự cố và chỉ dẫn thoát nạn (EXIT).
   7. Dụng cụ phá dỡ thô sơ (theo Bảng E.1).
   8. Mặt nạ lọc độc và mặt nạ phòng độc cách ly (theo Bảng F.1).
   9. Hệ thống loa thông báo và hướng dẫn thoát nạn (theo Bảng G.1).
   10. Thiết bị truyền tin báo cháy (NĐ 105).
6. LỆNH CHỐNG ẢO GIÁC "CẤP NƯỚC NGOÀI NHÀ" (BẢNG C.1):
   - Chỉ được "Phải trang bị" nếu tên cơ sở có trong 10 mục của Bảng C.1. Nếu không -> "Không thuộc diện phải trang bị".
7. LƯU Ý HỌNG NƯỚC TRONG NHÀ: Đối với "Nhà ở riêng lẻ kết hợp sxkd", tra cứu kỹ Bảng B.1. Nếu cao từ 5 tầng trở lên nhưng là "Nhà hỗn hợp" thì thường phải có. Nếu là "Nhà ở riêng lẻ kết hợp kinh doanh" thuần túy dưới 7 tầng thì thường không (tra kỹ mục 1.1 Bảng B.1).
8. XÁC ĐỊNH NHÀ HỖN HỢP: Chỉ coi là "Nhà hỗn hợp" nếu hồ sơ thiết kế/công năng ghi rõ có từ 2 nhóm công năng trở lên và diện tích mỗi nhóm không vượt quá các ngưỡng cho phép đối với nhà một công năng. Không được lấy đại nhóm này để "vơ đũa cả nắm".` }
            ] 
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
        },
      });

      let fullText = "";
      for await (const chunk of streamResult.stream) {
        if (abortSignal?.aborted) break;
        const chunkText = chunk.text();
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
      const errorMsg = error?.message || String(error);
      
      if (errorMsg === "API_KEY_MISSING") {
        onChunk("⚠️ **Lỗi cấu hình:** Không tìm thấy mã API Gemini. Vui lòng thêm `VITE_GEMINI_API_KEY` vào biến môi trường và **Redeploy** lại trang web.");
        return { sources: [] };
      }

      if (errorMsg.includes("429") || errorMsg.includes("quota")) {
        if (instance) blacklistedKeys.set(instance.key, Date.now() + COOL_DOWN_PERIOD);
        if (retries > 0 && !abortSignal?.aborted) {
          onChunk("🔄 Đang chuyển sang API Key dự phòng... (Lỗi giới hạn lượt dùng)");
          await new Promise(r => setTimeout(r, 1000));
          return executeStream(retries - 1, instance ? [...usedKeys, instance.key] : usedKeys);
        }
      }
      
      if (retries > 1 && !abortSignal?.aborted && !errorMsg.includes("400")) {
        await new Promise(r => setTimeout(r, 2000));
        return executeStream(retries - 1, instance ? [...usedKeys, instance.key] : usedKeys);
      }
      
      onChunk(`🔴 **Lỗi kết nối:** ${errorMsg}\n\n**Mã API lỗi:** \`...${instance?.key.slice(-4) || '???'}\`\n\n### 🛠 CÁC BƯỚC KHẮC PHỤC TRIỆT ĐỂ:
1. **Kiểm tra API Key:** Đảm bảo mã API trên Vercel/Cloudflare đã chính xác và còn hạn dùng.
2. **QUAN TRỌNG - REDEPLOY:** Bạn PHẢI vào trang quản trị Vercel/Cloudflare, chọn **Redeploy** (Triển khai lại) bản mới nhất. Các biến môi trường \`VITE_\` sẽ không hoạt động nếu không được build lại.
3. **Thử làm mới trang (F5):** Đôi khi cache trình duyệt giữ phiên bản cũ.`);
      return { sources: [] };
    }
  };

  return executeStream();
}
