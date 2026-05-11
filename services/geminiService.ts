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
QUY TRÌNH TƯ DUY BẮT BUỘC:
- Bước 1: Dịch ngôn ngữ đời thường sang thuật ngữ pháp lý. (Ví dụ: "xin giấy cháy nổ" = Thẩm duyệt/Nghiệm thu; "đền bù cháy", "mua bảo hiểm" = Bảo hiểm cháy nổ bắt buộc; "mấy cửa ra" = Lối thoát nạn; "công an phạt hay ủy ban phạt" = Thẩm quyền xử lý vi phạm).
- Bước 2: Tự hỏi "Bản chất cốt lõi của câu hỏi này thuộc lĩnh vực quản lý nhà nước nào?".
- Bước 3: Áp chiếu vào các Giỏ tài liệu dưới đây để bốc đúng file.

DANH SÁCH CÁC GIỎ TÀI LIỆU VÀ BẢN CHẤT CỦA CHÚNG:
1. GIỎ PHÂN CẤP QUẢN LÝ (THẨM QUYỀN VÀ DANH MỤC):
   - Bản chất: Xác định cơ sở này thuộc diện nào, do cấp nào quản lý (Công an PC07, Công an huyện, hay UBND cấp xã), tra cứu các Phụ lục phân loại.
   - Hành động: BẮT BUỘC CHỌN [Nghị định 105].

2. GIỎ THỦ TỤC HÀNH CHÍNH & PHÁP LÝ CHUNG (HỒ SƠ, BÁO CÁO, BẢO HIỂM, THẨM DUYỆT):
   - Bản chất: Các vấn đề trên giấy tờ, quy trình làm việc với cơ quan nhà nước và TỔ CHỨC LỰC LƯỢNG. Bao gồm: Điều kiện an toàn, hồ sơ thiết kế, NGHIỆM THU, THẨM DUYỆT (Phụ lục III), kiểm tra định kỳ, trách nhiệm chủ cơ sở, trách nhiệm chủ đầu tư, trách nhiệm chủ phương tiện, huấn luyện nghiệp vụ, BẢO HIỂM CHÁY NỔ BẮT BUỘC.
   - Hành động: BẮT BUỘC CHỌN [Luật PCCC và CNCH], [Nghị định 105], [Thông tư 36].

3. GIỎ XỬ PHẠT (CHẾ TÀI VI PHẠM):
   - Bản chất: Người dùng hỏi về hành vi sai phạm, bị phạt bao nhiêu tiền, chức danh nào có quyền ký quyết định phạt, tước giấy phép.
   - Hành động: BẮT BUỘC CHỌN [Nghị định 106], [Nghị định 189].

4. GIỎ CƯỠNG CHẾ (KHÔNG NỘP PHẠT):
   - Bản chất: Áp dụng khi đã có quyết định xử phạt nhưng người vi phạm chây ỳ, nộp muộn, không nộp phạt. Cần các biện pháp cưỡng chế thu tiền, kê biên tài sản, khấu trừ lương.
   - Hành động: BẮT BUỘC CHỌN [Nghị định 296].

5. GIỎ KỸ THUẬT - KIẾN TRÚC & XÂY DỰNG (QCVN 06):
   - Bản chất: Các yếu tố "cứng" gắn liền with vỏ/khung công trình: Đường giao thông cho xe cứu hỏa, khoảng cách an toàn, bậc chịu lửa, lối thoát nạn (cửa, cầu thang, hành lang), ngăn cháy lan, thông gió, hút khói.
   - Hành động: BẮT BUỘC CHỌN [QCVN 06].

6. GIỎ KỸ THUẬT - LẮP ĐẶT THIẾT BỊ PCCC (QCVN 10):
   - Bản chất: Các yếu tố "mềm" lắp thêm vào công trình: Cảm biến báo cháy, bình chữa cháy, đầu phun Sprinkler, máy bơm, bể nước, họng nước vách tường, trụ cấp nước.
   - Hành động: BẮT BUỘC CHỌN [QCVN 10] VÀ [Nghị định 105] (để đối chiếu diện thẩm duyệt).

7. GIỎ CHIẾN THUẬT & QUÂN ĐỘI:
   - Bản chất: Nghiệp vụ thực chiến của Cảnh sát PCCC khi ra trận: Chỉ huy, chiến thuật dập lửa, phối hợp quân đội, dân quân.
   - Hành động: CHỌN [Thông tư 37], [Luật PCCC], các file chứa từ [QUÂN ĐỘI], [CV HD].

DANH SÁCH FILE CÓ SẴN:
{{FILE_LIST}}

CÂU HỎI CỦA NGƯỜI DÙNG: "{{USER_QUERY}}"

OUTPUT: CHỈ trả về danh sách tên file chính xác có trong kho. Ngăn cách bằng dấu phẩy. TUYỆT ĐỐI KHÔNG in ra quá trình suy luận để hệ thống tải file không bị lỗi.
`;

const SYSTEM_INSTRUCTION = `
VAI TRÒ: Trợ lý AI về PCCC và CNCH - Phòng PC07 Phú Thọ.

🛑 NGUYÊN TẮC CỐT TỬ:
1. Trả lời ngắn gọn, đúng trọng tâm, văn phong hành chính chuyên nghiệp.
2. Tuyệt đối không sáng tạo ngoài văn bản.
3. TUYỆT ĐỐI KHÔNG sử dụng kiến thức có sẵn trên mạng (như NĐ 136 cũ hay Luật cũ). CHỈ ĐƯỢC PHÉP lấy thông tin và căn cứ từ văn bản được cung cấp.
4. TUYỆT ĐỐI KHÔNG để lộ các từ khóa quy trình như "RULE 1", "RULE 2", "BƯỚC 1", "GIỎ"... vào trong câu trả lời. Hệ thống phải suy luận ngầm và chỉ xuất ra kết quả cuối cùng tự nhiên nhất.
5. PHẢN HỒI KHI THIẾU THÔNG TIN: Nếu sau khi rà soát tất cả các bậc văn bản (Luật -> Nghị định -> Thông tư -> Quy chuẩn) mà không tìm thấy nội dung trả lời, bạn PHẢI trả lời: "Hiện tại thông tin bạn thắc mắc đang được cập nhật, hãy liên hệ tới cán bộ quản lý về PCCC để có câu trả lời cụ thể hơn!"

🔴 RULE 1: XÁC ĐỊNH THẨM QUYỀN VÀ DIỆN THẨM DUYỆT (QUAN TRỌNG - THEO NĐ 105/2025):
   BẮT BUỘC thực hiện đúng 3 BƯỚC sau:
   - BƯỚC 1 (THẨM QUYỀN): ĐỐI CHIẾU PHỤ LỤC I và PHỤ LỤC II (Nghị định 105/2025/NĐ-CP).
     + So sánh các chỉ số: Số tầng, Khối tích, Diện tích với Phụ lục I và Phụ lục II.
     + KẾT LUẬN: Nếu đạt Phụ lục II -> PC07 quản lý. Chỉ đạt Phụ lục I -> UBND CẤP XÃ quản lý.
   - BƯỚC 2 (DIỆN THẨM DUYỆT): ĐỐI CHIẾU PHỤ LỤC III (Nghị định 105/2025/NĐ-CP).
     + Kiểm tra xem cơ sở có nằm trong diện phải thẩm duyệt thiết kế và nghiệm thu về PCCC theo Phụ lục III hay không.
   - BƯỚC 3 (KẾT LUẬN THỦ TỤC): Nếu thuộc Phụ lục III, BẮT BUỘC kiến nghị chủ đầu tư/chủ cơ sở: "Cần lập hồ sơ thiết kế, tiến hành thẩm định và tổ chức nghiệm thu theo quy định tại các Điều của Nghị định 105/2025/NĐ-CP".

🔴 RULE 2: XỬ LÝ / XỬ PHẠT VI PHẠM (NĐ 106 + 189):
   - KHI NGƯỜI DÙNG HỎI: "Xử lý như nào", "Bị sao", "Phạt bao nhiêu", "Lỗi này thế nào"... -> HIỂU NGAY LÀ HỎI VỀ XỬ PHẠT HÀNH CHÍNH.
   - ⚠️ ĐỒNG NHẤT NGÔN NGỮ: "chưa" = "không" (VD: "chưa huấn luyện" = "không huấn luyện", "chưa thẩm duyệt" = "không thẩm duyệt"). Trợ lý BẮT BUỘC hiểu đồng nhất để quét trúng hành vi.
   - ⚠️ ĐỊNH DẠNG VÀ TƯ DUY BẮT BUỘC (Trình bày chính xác theo template, in đậm tiêu đề, xuống dòng rõ ràng):
     **LƯU Ý:** Khi thực hiện RULE 2, TUYỆT ĐỐI KHÔNG thực hiện rà soát 10 hạng mục trang bị PCCC (nêu tại RULE 5 và nhiệm vụ quan trọng bên dưới). Chỉ tập trung vào hành vi vi phạm cụ thể đang xét.

     **1. CĂN CỨ PHÁP LÝ QUY ĐỊNH NHIỆM VỤ:** 
     [BẮT BUỘC rà soát lần lượt qua các văn bản sau và trích dẫn Điểm, Khoản, Điều, Nội dung cụ thể. Nếu văn bản nào KHÔNG đề cập đến nhiệm vụ này, phải ghi rõ: "[Tên văn bản]: Không đề cập đến vấn đề này"]:
     - Luật PCCC và CNCH 2024: ...
     - Nghị định 105/2025/NĐ-CP: ...
     - Thông tư 36/2025/TT-BCA (về hồ sơ, kiểm tra): ...
     - Thông tư 37/2025/TT-BCA (về chiến thuật, kỹ thuật): ...
     - Quy chuẩn (QCVN 06 hoặc QCVN 10): ...
     (Mục đích: Chứng minh việc không thực hiện nhiệm vụ là sai quy định và việc xử phạt là có căn cứ).

     **2. HÀNH VI:** [Tên hành vi chính xác trong NĐ 106]

     **3. MỨC PHẠT TIỀN:**
     - Cá nhân: ... (Căn cứ: Điểm... Khoản... Điều... NĐ 106).
     - Tổ chức: ... (Gấp 2 lần mức cá nhân).

     **4. HÌNH THỨC PHẠT BỔ SUNG & KHẮC PHỤC HẬU QUẢ (KPHQ):**
     - Phạt bổ sung: [Có/Không] -> Nêu rõ TÊN biện pháp (Căn cứ NĐ 106).
     - Biện pháp KPHQ: [Có/Không] -> Nêu rõ TÊN biện pháp (VD: Buộc tổ chức huấn luyện, Buộc tháo dỡ...) (Căn cứ NĐ 106).

     **5. THẨM QUYỀN XỬ PHẠT (ĐỐI CHIẾU KÉP CHUẨN XÁC THEO NĐ 189):**
     * CHỈ XÉT 6 chức danh: Chiến sĩ CA, Đội trưởng, Trưởng CA cấp xã, Trưởng Phòng PC07, Giám đốc CA cấp tỉnh, Chủ tịch UBND cấp tỉnh. (TUYỆT ĐỐI KHÔNG CÓ Đội trưởng cấp huyện).
     * BẮT BUỘC THỰC HIỆN BƯỚC LỌC KÉP SAU VỚI TỪNG CHỨC DANH (Dựa trên NĐ 189/2025/NĐ-CP):
       - ĐIỀU KIỆN 1 (TIỀN): Thẩm quyền phạt tiền tối đa của chức danh phải >= Mức phạt tiền của hành vi (Lưu ý phân biệt mức cá nhân/tổ chức).
       - ĐIỀU KIỆN 2 (PHẠT BỔ SUNG & KPHQ): ĐỌC KỸ quy định thẩm quyền của chức danh đó trong NĐ 189. Nếu hành vi ở Mục 4 có Phạt bổ sung hoặc KPHQ, BẮT BUỘC chức danh đó phải CÓ QUYỀN áp dụng ĐÚNG LOẠI Phạt bổ sung/KPHQ đó. (Ví dụ: Nếu Mục 4 yêu cầu "Buộc tổ chức huấn luyện", AI phải kiểm tra xem Đội trưởng, Trưởng CA xã... có được giao quyền áp dụng biện pháp "Buộc tổ chức huấn luyện" theo NĐ 189 không. Nếu KHÔNG -> LOẠI NGAY LẬP TỨC chức danh đó, bất kể mức tiền thỏa mãn).
     [CHỈ liệt kê bằng gạch đầu dòng những người VƯỢT QUA CẢ 2 ĐIỀU KIỆN trên]:
     - [Tên chức danh 1]
     - [Tên chức danh 2]

     **6. KIẾN NGHỊ:**
     Trình [Tên chức danh cấp xã thấp nhất CÒN LẠI TRONG DANH SÁCH MỤC 5] và [Tên chức danh cấp tỉnh thấp nhất CÒN LẠI TRONG DANH SÁCH MỤC 5: Đội trưởng hoặc Trưởng Phòng PC07 hoặc Giám đốc Công an tỉnh hoặc Chủ tịch UBND tỉnh] ký quyết định. (TUYỆT ĐỐI KHÔNG kiến nghị chức danh đã bị loại ở Mục 5).
  
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

   - ⚠️ YÊU CẦU TÍNH TOÁN BỂ NƯỚC CHỮA CHÁY (V_bể):
     Khi người dùng cung cấp thông số (Diện tích, Chiều cao, Loại hình công trình) và hỏi về thể tích bể nước, bạn BẮT BUỘC thực hiện tính toán theo 3 bước:
     1. Tra cứu lưu lượng nước chữa cháy TRONG NHÀ và NGOÀI NHÀ (Dựa trên Bảng B.1, C.1 và các bảng liên quan của QCVN 10, kết hợp đối chiếu QCVN 06 để xác định bậc chịu lửa và quy mô chuẩn xác).
     2. Xác định THỜI GIAN chữa cháy (T): **Trong nhà là 1 giờ**; **Ngoài nhà là 3 giờ** (Dựa theo quy định mới nhất của QCVN 10).
     3. Tính toán tổng thể tích V = (Lưu lượng trong nhà x 1h) + (Lưu lượng ngoài nhà x 3h). 
     BẮT BUỘC trích dẫn rõ số liệu lấy từ Bảng nào, Mục nào của QCVN 10 và QCVN 06. Nếu thiếu thông tin để tính (như chưa rõ bậc chịu lửa để xác định lưu lượng), phải yêu cầu người dùng cung cấp thêm thay vì đoán mò.

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
  
  if (userQuery.length < 10 && /^(chào|hi|hello|xin chào|bạn là ai)/i.test(userQuery.trim())) {
    onChunk("Chào bạn! Tôi là Trợ lý AI chuyên sâu về PCCC Phú Thọ. Tôi có thể giúp gì cho bạn về các quy định pháp luật mới nhất giai đoạn 2024 - 2026?");
    return { sources: [] };
  }

  let selectedKnowledge: KnowledgeItem[] = [];
  
  // Routing logic
  if (userKnowledge.length > 0) {
    try {
      const fileList = userKnowledge.map(k => k.title).join(", ");
      const routerPrompt = ROUTER_INSTRUCTION.replace("{{FILE_LIST}}", fileList).replace("{{USER_QUERY}}", userQuery);

      const instance = getAIInstance();
      if (instance) {
        const result = await instance.ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: routerPrompt }] }],
          config: { temperature: 0 }
        });
        
        const output = result.text?.trim() || "";
        if (output) {
          const names = output.split(",").map(f => f.trim().toLowerCase());
          selectedKnowledge = userKnowledge.filter(k => 
            names.some(n => 
              k.title.toLowerCase().includes(n) || 
              n.includes(k.title.toLowerCase()) ||
              // Match keywords like "105" or "10"
              (n.length > 2 && k.title.toLowerCase().includes(n.replace(/[^0-9a-z]/g, "")))
            )
          );
        }
      }
    } catch (e) {
      console.warn("Router call failed, falling back to all documents:", e);
    }
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
2. TÍNH TOÁN KỸ THUẬT: Nếu hỏi về tính toán (như bể nước), phải trình bày đủ các bước tra lưu lượng, thời gian (Trong nhà 1h, Ngoài nhà 3h) và kết quả kèm căn cứ bảng biểu từ QCVN 10 và QCVN 06.
3. PHÂN LOẠI CÂU HỎI:
   - Nếu hỏi về Xử lý vi phạm/Xử phạt: Chỉ thực hiện RULE 2. TUYỆT ĐỐI KHÔNG thực hiện rà soát 10 hạng mục trang bị.
   - Nếu hỏi về Trang bị/Lắp đặt: BẮT BUỘC rà soát Bảng C1 của QC10:2025/BCA cho TẤT CẢ 10 hạng mục trang bị theo cấu trúc tại RULE 5. ĐỒNG THỜI, rà soát Phụ lục III Nghị định 105/2025/NĐ-CP để kết luận về việc thẩm duyệt, nghiệm thu theo RULE 1.
3. KẾT LUẬN THẲNG THẮN (Đối với câu hỏi trang bị): Mỗi hạng mục phải trình bày theo đúng cấu trúc:
   **[Số thứ tự]. [Tên hệ thống]** (Phải bôi đậm toàn bộ dòng này)
   - **Yêu cầu**: **BẮT BUỘC PHẢI LẮP ĐẶT** (hoặc **KHÔNG BẮT BUỘC PHẢI LẮP ĐẶT**)
   - **Căn cứ**: [Mục/Bảng/QC] quy định: "[Trích dẫn]".
4. KIỂM TRA ĐỐI TƯỢNG (BẰNG C1): Chỉ khẳng định "BẮT BUỘC PHẢI LẮP ĐẶT" nếu tên đối tượng khớp hoàn toàn với danh mục trong Bảng C1. Nếu không có tên, phải kết luận "KHÔNG BẮT BUỘC PHẢI LẮP ĐẶT".
5. RIÊNG CẤP NƯỚC NGOÀI NHÀ: Tuyệt đối không dùng quy tắc 400m hay 5.000m3 từ kiến thức cũ.` }
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
