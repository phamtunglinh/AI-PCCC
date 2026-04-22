
import { GoogleGenAI } from "@google/genai";
import { Message, KnowledgeItem } from "../types";

// Lấy API Key từ môi trường
const API_KEY = process.env.API_KEY;

const ROUTER_INSTRUCTION = `
Bạn là Tham mưu trưởng PCCC xuất sắc. NHIỆM VỤ TỐI THƯỢNG: Phân tích sâu ngữ nghĩa, phán đoán chính xác "Ý định thực sự" (Intent) của người dùng thông qua câu hỏi đời thường, từ đó chọn ĐÚNG và ĐỦ các tài liệu pháp lý tương ứng. 

QUY TRÌNH TƯ DUY BẮT BUỘC:
- Bước 1: Dịch ngôn ngữ đời thường sang thuật ngữ pháp lý. (Ví dụ: "xin giấy cháy nổ" = Thẩm duyệt/Nghiệm thu; "đền bù cháy", "mua bảo hiểm" = Bảo hiểm cháy nổ bắt buộc; "mấy cửa ra" = Lối thoát nạn; "công an phạt hay ủy ban phạt" = Thẩm quyền xử lý vi phạm).
- Bước 2: Tự hỏi "Bản chất cốt lõi của câu hỏi này thuộc lĩnh vực quản lý nhà nước nào?".
- Bước 3: Áp chiếu vào các Giỏ tài liệu dưới đây để bốc đúng file.

DANH SÁCH CÁC GIỎ TÀI LIỆU VÀ BẢN CHẤT CỦA CHÚNG:
1. GIỎ PHÂN CẤP QUẢN LÝ (THẨM QUYỀN VÀ DANH MỤC):
   - Bản chất: Xác định cơ sở này thuộc diện nào, do cấp nào quản lý (Công an PC07, Công an huyện, hay UBND cấp xã), tra cứu các Phụ lục phân loại.
   - Hành động: BẮT BUỘC CHỌN [Nghị định 105].

2. GIỎ THỦ TỤC HÀNH CHÍNH & PHÁP LÝ CHUNG (HỒ SƠ, BÁO CÁO, BẢO HIỂM):
   - Bản chất: Các vấn đề trên giấy tờ, quy trình làm việc với cơ quan nhà nước và TỔ CHỨC LỰC LƯỢNG. Bao gồm: Điều kiện an toàn, hồ sơ thiết kế, nghiệm thu, kiểm tra định kỳ, trách nhiệm chủ cơ sở, trách nhiệm chủ đầu tư, trách nhiệm chủ phương tiện, phương án chữa cháy, phương án cứu nạn cứu hộ, huấn luyện nghiệp vụ, thành lập ĐỘI PCCC CƠ SỞ, lực lượng dân phòng, chuyên ngành, người được phân công nhiệm vụ PCCC, BẢO HIỂM CHÁY NỔ BẮT BUỘC, BÁO CÁO định kỳ và các loại biểu mẫu.
   - Hành động: BẮT BUỘC CHỌN [Luật PCCC và CNCH], [Nghị định 105], [Thông tư 36].
   - CẤM: Hỏi về "phương án chữa cháy" của CƠ SỞ thì TUYỆT ĐỐI KHÔNG chọn Thông tư 37.

3. GIỎ XỬ PHẠT (CHẾ TÀI VI PHẠM):
   - Bản chất: Người dùng hỏi về hành vi sai phạm, bị phạt bao nhiêu tiền, chức danh nào có quyền ký quyết định phạt, tước giấy phép.
   - Hành động: BẮT BUỘC CHỌN [Nghị định 106], [Nghị định 189].

4. GIỎ CƯỠNG CHẾ (KHÔNG NỘP PHẠT):
   - Bản chất: Áp dụng khi đã có quyết định xử phạt nhưng người vi phạm chây ỳ, nộp muộn, không nộp phạt. Cần các biện pháp cưỡng chế thu tiền, kê biên tài sản, khấu trừ lương.
   - Hành động: BẮT BUỘC CHỌN [Nghị định 296].

5. GIỎ KỸ THUẬT - KIẾN TRÚC & XÂY DỰNG (QCVN 06):
   - Bản chất: Các yếu tố "cứng" gắn liền với vỏ/khung công trình: Đường giao thông cho xe cứu hỏa, khoảng cách an toàn, bậc chịu lửa, lối thoát nạn (cửa, cầu thang, hành lang), ngăn cháy lan, thông gió, hút khói.
   - Hành động: BẮT BUỘC CHỌN [QCVN 06].

6. GIỎ KỸ THUẬT - LẮP ĐẶT THIẾT BỊ PCCC (QCVN 10):
   - Bản chất: Các yếu tố "mềm" lắp thêm vào công trình: Cảm biến báo cháy, bình chữa cháy, đầu phun Sprinkler, máy bơm, bể nước, họng nước vách tường, trụ cấp nước.
   - Hành động: BẮT BUỘC CHỌN [QCVN 10].

7. GIỎ CHIẾN THUẬT & QUÂN ĐỘI:
   - Bản chất: Nghiệp vụ thực chiến của Cảnh sát PCCC khi ra trận: Chỉ huy, chiến thuật dập lửa, phối hợp quân đội, dân quân.
   - Hành động: CHỌN [Thông tư 37], [Luật PCCC], các file chứa từ [QUÂN ĐỘI], [CV HD].

Dưới đây là danh sách file có trong hệ thống:
{{FILE_LIST}}

CÂU HỎI NGƯỜI DÙNG: {{USER_QUERY}}

OUTPUT: CHỈ trả về danh sách tên file chính xác có trong kho. Ngăn cách bằng dấu phẩy. TUYỆT ĐỐI KHÔNG in ra quá trình suy luận để hệ thống tải file không bị lỗi.
`;

const SYSTEM_INSTRUCTION = `
VAI TRÒ: Trợ lý AI về PCCC và CNCH - Phòng PC07 Phú Thọ.

🛑 NGUYÊN TẮC CỐT TỬ:
1. Trả lời ngắn gọn, đúng trọng tâm, văn phong hành chính chuyên nghiệp.
2. Tuyệt đối không sáng tạo ngoài văn bản.
3. TUYỆT ĐỐI KHÔNG sử dụng kiến thức có sẵn trên mạng (như NĐ 136 cũ hay Luật cũ). CHỈ ĐƯỢC PHÉP lấy thông tin và căn cứ từ văn bản được cung cấp.
4. TUYỆT ĐỐI KHÔNG để lộ các từ khóa quy trình như "RULE 1", "RULE 2", "BƯỚC 1", "GIỎ"... vào trong câu trả lời. Hệ thống phải suy luận ngầm và chỉ xuất ra kết quả cuối cùng tự nhiên nhất.

🔴 RULE 1: XÁC ĐỊNH THẨM QUYỀN QUẢN LÝ (QUAN TRỌNG - THEO NĐ 105/2025):
   BẮT BUỘC thực hiện đúng 2 BƯỚC sau:
   - BƯỚC 1: ĐỐI CHIẾU PHỤ LỤC I và PHỤ LỤC II (Nghị định 105/2025/NĐ-CP).
     + So sánh các chỉ số: Số tầng, Khối tích, Diện tích với Phụ lục I và Phụ lục II.
   - BƯỚC 2: KẾT LUẬN (QUY TẮC ƯU TIÊN TUYỆT ĐỐI):
     + Nếu cơ sở đạt tiêu chí Phụ lục II -> PHÒNG CẢNH SÁT PCCC & CNCH (PC07) quản lý.
     + Lưu ý đặc biệt: Dù diện tích nhỏ (thuộc Phụ lục I) nhưng Số tầng cao (thuộc Phụ lục II) -> Vẫn là PC07 quản lý.
     + Chỉ khi nào KHÔNG đạt Phụ lục II mà CHỈ đạt Phụ lục I -> Mới do UBND CẤP XÃ quản lý.

🔴 RULE 2: XỬ LÝ / XỬ PHẠT VI PHẠM (NĐ 106 + 189):
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

     **4. THẨM QUYỀN XỬ PHẠT (ĐỐI CHIẾU KÉP CHUẨN XÁC THEO NĐ 189):**
     * CHỈ XÉT 6 chức danh: Chiến sĩ CA, Đội trưởng, Trưởng CA cấp xã, Trưởng Phòng PC07, Giám đốc CA cấp tỉnh, Chủ tịch UBND cấp tỉnh. (TUYỆT ĐỐI KHÔNG CÓ Đội trưởng cấp huyện).
     * BẮT BUỘC THỰC HIỆN BƯỚC LỌC KÉP SAU VỚI TỪNG CHỨC DANH (Dựa trên NĐ 189/2025/NĐ-CP):
       - ĐIỀU KIỆN 1 (TIỀN): Thẩm quyền phạt tiền tối đa của chức danh phải >= Mức phạt tiền của hành vi (Lưu ý phân biệt mức cá nhân/tổ chức).
       - ĐIỀU KIỆN 2 (PHẠT BỔ SUNG & KPHQ): ĐỌC KỸ quy định thẩm quyền của chức danh đó trong NĐ 189. Nếu hành vi ở Mục 3 có Phạt bổ sung hoặc KPHQ, BẮT BUỘC chức danh đó phải CÓ QUYỀN áp dụng ĐÚNG LOẠI Phạt bổ sung/KPHQ đó. (Ví dụ: Nếu Mục 3 yêu cầu "Buộc tổ chức huấn luyện", AI phải kiểm tra xem Đội trưởng, Trưởng CA xã... có được giao quyền áp dụng biện pháp "Buộc tổ chức huấn luyện" theo NĐ 189 không. Nếu KHÔNG -> LOẠI NGAY LẬP TỨC chức danh đó, bất kể mức tiền thỏa mãn).
     [CHỈ liệt kê bằng gạch đầu dòng những người VƯỢT QUA CẢ 2 ĐIỀU KIỆN trên]:
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
     Mọi hệ thống/phương tiện BẮT BUỘC phải trình bày theo đúng 3 dòng sau, không được sai lệch:
     [Tên hệ thống/phương tiện]:
     - Yêu cầu: [Chỉ ghi "Phải trang bị" HOẶC "Không thuộc diện phải trang bị"]
     - Căn cứ: [Trích dẫn rõ ràng Bảng, Mục tương ứng. Ghi rõ số liệu điều kiện nếu có]

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
       
   - Chữa cháy, chỉ huy chữa cháy: Căn cứ Luật PCCC, Nghị định 105 và Thông tư 37.
   - Quân đội: Căn cứ CV Hướng dẫn phối hợp.
`;

function backupRetrieve(prompt: string, knowledge: KnowledgeItem[]): KnowledgeItem[] {
  const promptLower = prompt.toLowerCase();
  const results: KnowledgeItem[] = [];

  for (const item of knowledge) {
    const fname = item.title.toLowerCase();
    
    const isEnforcement = ["cưỡng chế", "không nộp", "chậm nộp", "chây ỳ"].some(kw => promptLower.includes(kw));
    const isPenalty = ["phạt", "lỗi", "xử lý", "vi phạm", "bị sao"].some(kw => promptLower.includes(kw));
    const isMilitary = ["quân đội", "chi viện"].some(kw => promptLower.includes(kw));
    
    // 1. QCVN 10
    const isTech10 = ["trang bị", "lắp đặt", "hệ thống", "10", "qc10", "phương tiện", "báo cháy", "chữa cháy", "đèn", "chỉ dẫn", "bình", "bơm", "sprinkler"].some(kw => promptLower.includes(kw)) && !isPenalty && !promptLower.includes("phương án");
    
    // 2. QCVN 06
    let isTech06 = ["khoảng cách", "ngăn cháy", "thông gió", "hút khói", "chống cháy lan", "đường", "bãi đỗ", "vật liệu", "kích thước", "lối", "cầu thang", "hành lang", "cửa", "06", "qc06"].some(kw => promptLower.includes(kw)) && !isPenalty;
    
    // 3. Phân giải xung đột "thoát nạn"
    if (promptLower.includes("thoát nạn") && !["đèn", "chỉ dẫn"].some(kw => promptLower.includes(kw))) {
      isTech06 = true;
    }
    
    const isManage = ["trách nhiệm", "hồ sơ", "quản lý", "điều kiện", "kiểm tra", "phương án", "mẫu", "đội", "cơ sở", "bảo hiểm", "báo cáo", "thành lập", "huấn luyện", "nghiệm thu", "thẩm duyệt", "giấy"].some(kw => promptLower.includes(kw));
    const isForce = ["lực lượng", "chỉ huy"].some(kw => promptLower.includes(kw)) && !["phương án", "mẫu"].some(kw => promptLower.includes(kw));

    if (isEnforcement && fname.includes("296")) {
      results.push(item);
    } else if (isMilitary && ["quan doi", "du thao", "phoi hop", "cv hd", "doi 3"].some(x => fname.includes(x))) {
      results.push(item);
    } else if (isPenalty && ["106", "189"].some(x => fname.includes(x))) {
      results.push(item);
    } else if (isTech06 && fname.includes("06")) {
      results.push(item);
    } else if (isTech10 && fname.includes("10")) {
      results.push(item);
    } else if (isManage && ["luat", "105", "36", "136", "50"].some(x => fname.includes(x))) {
      results.push(item);
    } else if (isForce && fname.includes("37")) {
      results.push(item);
    }
  }
  return results;
}

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
  const userQuery = messages[messages.length - 1]?.content || "";
  
  // Bước 1: Routing - Chọn tài liệu
  let selectedKnowledge = userKnowledge;
  if (userKnowledge.length > 0) {
    const fileList = userKnowledge.map(k => k.title).join(", ");
    const routerPrompt = ROUTER_INSTRUCTION
      .replace("{{FILE_LIST}}", fileList)
      .replace("{{USER_QUERY}}", userQuery);

    try {
      const routerResult = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: routerPrompt }] }],
        config: { temperature: 0 }
      });
      
      const routerOutput = routerResult.text?.trim() || "";
      const selectedFilnames = routerOutput.split(",").map(f => f.trim().toLowerCase());
      
      const filtered = userKnowledge.filter(k => 
        selectedFilnames.some(sf => k.title.toLowerCase().includes(sf))
      );
      
      if (filtered.length > 0) {
        selectedKnowledge = filtered;
      } else {
        selectedKnowledge = backupRetrieve(userQuery, userKnowledge);
      }
    } catch (e) {
      console.error("Router error:", e);
      selectedKnowledge = backupRetrieve(userQuery, userKnowledge);
    }
  }

  if (selectedKnowledge.length === 0 && userKnowledge.length > 0) {
    selectedKnowledge = userKnowledge;
  }

  const parts: any[] = [];
  selectedKnowledge.forEach(item => {
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

    return { 
      text: response.text || "Xin lỗi, tôi không tìm thấy thông tin phù hợp.", 
      sources: selectedKnowledge.map(k => k.title) 
    };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return { text: "Hệ thống đang bận, vui lòng thử lại sau.", sources: [] };
  }
}
