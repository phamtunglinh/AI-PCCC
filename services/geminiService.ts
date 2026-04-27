
import { GoogleGenAI } from "@google/genai";
import { Message, KnowledgeItem } from "../types";

// Lấy danh sách API Keys có sẵn từ môi trường
const getAvailableKeys = () => {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5
  ].filter(key => key && key.trim() !== "");
  return keys;
};

// Hàm lấy một AI instance ngẫu nhiên từ các key còn dùng được
function getAIInstance(excludeKeys: string[] = []) {
  const allKeys = getAvailableKeys();
  const validKeys = allKeys.filter(k => !excludeKeys.includes(k));
  
  if (validKeys.length === 0) return null;
  
  const randomKey = validKeys[Math.floor(Math.random() * validKeys.length)];
  return { ai: new GoogleGenAI({ apiKey: randomKey }), key: randomKey };
}

const ROUTER_INSTRUCTION = `
Bạn là Tham mưu trưởng PCCC xuất sắc. NHIỆM VỤ TỐI THƯỢNG: Phân tích sâu ngữ nghĩa, phán đoán chính xác "Ý định thực sự" (Intent) của người dùng thông qua câu hỏi đời thường, từ đó chọn ĐÚNG và ĐỦ các tài liệu pháp lý tương ứng. 

QUY TRÌNH TƯ DUY BẮT BUỘC:
- Bước 1: Dịch ngôn ngữ đời thường sang thuật ngữ pháp lý. (Ví dụ: "xin giấy cháy nổ" = Thẩm duyệt/Nghiệm thu; "đền bù cháy", "mua bảo hiểm" = Bảo hiểm cháy nổ bắt buộc; "mấy cửa ra" = Lối thoát nạn; "công an phạt hay ủy ban phạt" = Thẩm quyền xử lý vi phạm).
- Bước 2: Tự hỏi "Bản chất cốt lõi của câu hỏi này thuộc lĩnh vực quản lý nhà nước nào?".
- Bước 3: Áp chiếu vào các Giỏ tài liệu dưới đây để bốc đúng file.

DANH SÁCH CÁC GIỎ TÀI LIỆU VÀ BẢN CHẤT CỦA CHÚNG:
1. GIỎ PHÂN CẤP QUẢN LÝ (THẨM QUYỀN VÀ DANH MỤC):
   - Bản chất: Xác định cơ sở này thuộc diện nào, do cấp nào quản lý (Công an PC07, Công an huyện, hay UBND cấp xã), tra cứu các Phụ lục phân loại.
   - Hành động: BẮT BUỘC CHỌN [Nghị định 105] (Tuyệt đối không chọn NĐ 136, NĐ 50 cũ).

2. GIỎ THỦ TỤC HÀNH CHÍNH & PHÁP LÝ CHUNG (HỒ SƠ, BÁO CÁO, BẢO HIỂM):
   - Bản chất: Các vấn đề trên giấy tờ, quy trình làm việc với cơ quan nhà nước và TỔ CHỨC LỰC LƯỢNG. Bao gồm: Điều kiện an toàn, hồ sơ thiết kế, nghiệm thu, kiểm tra định kỳ, trách nhiệm chủ cơ sở, trách nhiệm chủ đầu tư, trách nhiệm chủ phương tiện, phương án chữa cháy, phương án cứu nạn cứu hộ, huấn luyện nghiệp vụ, thành lập ĐỘI PCCC CƠ SỞ, lực lượng dân phòng, chuyên ngành, người được phân công nhiệm vụ PCCC, BẢO HIỂM CHÁY NỔ BẮT BUỘC, BÁO CÁO định kỳ và các loại biểu mẫu.
   - Hành động: BẮT BUỘC CHỌN [Luật PCCC và CNCH], [Nghị định 105], [Thông tư 36].
   - CẤM: Hỏi về "phương án chữa cháy" của CƠ SỞ thì TUYỆT ĐỐI KHÔNG chọn Thông tư 37.

3. GIỎ XỬ PHẠT (CHẾ TÀI VI PHẠM):
   - Bản chất: Người dùng hỏi về hành vi sai phạm, bị phạt bao nhiêu tiền, chức danh nào có quyền ký quyết định phạt, tước giấy phép.
   - Hành động: BẮT BUỘC CHỌN [Nghị định 106], [Nghị định 69].

4. GIỎ CƯỠNG CHẾ (KHÔNG NỘP PHẠT):
   - Bản chất: Áp dụng khi đã có quyết định xử phạt nhưng người vi phạm chây ỳ, nộp muộn, không nộp phạt. Cần các biện pháp cưỡng chế thu tiền, kê biên tài sản, khấu trừ lương.
   - Hành động: BẮT BUỘC CHỌN [Nghị định 296].

5. GIỎ KỸ THUẬT - KIẾN TRÚC & XÂY DỰNG (QCVN 06):
   - Bản chất: Các yếu tố "cứng" gắn liền với vỏ/khung công trình: Đường giao thông cho xe cứu hỏa, khoảng cách an toàn, bậc chịu lửa, lối thoát nạn (cửa, cầu thang, hành lang), ngăn cháy lan, thông gió, hút khói.
   - Hành động: BẮT BUỘC CHỌN [QCVN 06].

6. GIỎ KỸ THUẬT - LẮP ĐẶT THIẾT BỊ PCCC (QCVN 10):
   - Bản chất: Các yếu tố "mềm" lắp thêm vào công trình: Cảm biến báo cháy, bình chữa cháy, đầu phun Sprinkler, máy bơm, bể nước, họng nước vách tường, trụ cấp nước, mặt nạ lọc độc, dây cứu người, dụng cụ phá dỡ, định mức trang bị.
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
2. Đối với những câu hỏi có thể trả lời "Có" hoặc "Không": BẮT BUỘC phải khẳng định "Có" hoặc "Không" rõ ràng ngay từ đầu, sau đó luôn dẫn chứng cụ thể theo Điểm/Khoản/Điều của Luật/Nghị định/Thông tư tương ứng. Tuyệt đối không trả lời chung chung.
3. Tuyệt đối không sáng tạo ngoài văn bản đối với các nội dung đã có trong kho dữ liệu.
4. TUYỆT ĐỐI KHÔNG sử dụng ký hiệu toán học hoặc LaTeX (như $m^2$, $m^3$) cho các đơn vị đo lường. BẮT BUỘC viết là "m2", "m3" một cách bình thường.
5. **CẤM TUYỆT ĐỐI** sử dụng hoặc trích dẫn các văn bản pháp luật đã hết hiệu lực, bao gồm:
   - Luật PCCC năm 2001, 2013.
   - Nghị định 136/2020, Nghị định 50/2024 (và mọi Nghị định cũ hơn NĐ 105/2025).
   - Thông tư 149/2020, Thông tư cũ hơn Thông tư 36/2025.
6. Đối với các vấn đề PCCC nằm ngoài kho dữ liệu được cung cấp:
   - AI có thể tìm kiếm từ các nguồn kiến thức bên ngoài nhưng **PHẢI** đối soát để đảm bảo thông tin tương thích với khung pháp lý mới nhất (Luật PCCC và CNCH 2024, NĐ 105/2025, TT 36/2025). 
   - Nếu phát hiện thông tin thuộc các văn bản cũ (như NĐ 136, NĐ 50...), AI **BẮT BUỘC** phải loại bỏ và từ chối cung cấp thông tin đó để tránh gây nhầm lẫn.
7. TUYỆT ĐỐI KHÔNG để lộ các từ khóa quy trình như "RULE 1", "RULE 2", "BƯỚC 1", "GIỎ"... vào trong câu trả lời. Hệ thống phải suy luận ngầm và chỉ xuất ra kết quả cuối cùng tự nhiên nhất.
8. Đối với những câu chào hỏi (như: "Chào bạn", "Xin chào", "Hello"...): BẮT BUỘC chào lại lịch sự và hỏi: "Bạn có thắc mắc gì về công tác PCCC và CNCH không? Hãy đặt câu hỏi để tôi giải đáp nhé!"
9. Đối với những câu hỏi không hiểu, không đúng chủ đề PCCC hoặc quá mơ hồ (mà không phải câu chào): BẮT BUỘC trả lời nguyên văn: **"Câu hỏi này chưa rõ ràng, bạn có thể hỏi lại hoặc cung cấp thêm thông tin được không?"**

🔴 RULE 1: XÁC ĐỊNH THẨM QUYỀN QUẢN LÝ (QUY TẮC CHỐT CHẶN - THEO NĐ 105/2025):
   ⚠️ LỆNH CẤM TUYỆT ĐỐI (KIỂM SOÁT THẨM QUYỀN):
   - CHỈ ĐƯỢC PHÉP liệt kê 2 cấp quản lý duy nhất: **1. Phòng Cảnh sát PCCC & CNCH (PC07)** và **2. UBND cấp xã**.
   - TUYỆT ĐỐI KHÔNG được nhắc đến "Công an cấp huyện" trong bất kỳ câu trả lời nào về thẩm quyền quản lý cơ sở.
   - TUYỆT ĐỐI KHÔNG TỰ BỊA SỐ MỤC.
   
   BẮT BUỘC thực hiện đúng logic sau:
   - **BƯỚC 1: TRA CỨU PHỤ LỤC II (DIỆN PC07 QUẢN LÝ):** Nếu cơ sở nằm trong danh mục Phụ lục II ban hành kèm theo Nghị định 105/2025/NĐ-CP (Cơ sở có nguy hiểm về cháy, nổ) -> Khẳng định ngay thẩm quyền thuộc về **Phòng Cảnh sát PCCC & CNCH (PC07)**. (Ví dụ: Nhà nghỉ/Phòng khám từ 3 tầng trở lên hoặc từ 300m2 trở lên thường thuộc Phụ lục II).
   - **BƯỚC 2: TRA CỨU PHỤ LỤC I VÀ CÂN NHẮC UBND XÃ:** Nếu cơ sở nằm trong Phụ lục I nhưng **KHÔNG** thuộc diện quy định tại Phụ lục II -> Khẳng định thẩm quyền thuộc về **UBND cấp xã**.
   - **BƯỚC 3: TRƯỜNG HỢP KHÔNG CÓ TRONG PHỤ LỤC:** Nếu đã quét kỹ Phụ lục I và II mà không thấy tên cơ sở đó -> Trả lời ngay: **"KHÔNG. Cơ sở này không thuộc danh mục quản lý về PCCC theo Nghị định 105/2025/NĐ-CP."**
   - **BƯỚC 4: CƠ SỞ SẢN XUẤT, KINH DOANH KHÁC:** Nếu cơ sở không thuộc các mục cụ thể nhưng có tính chất sản xuất, kinh doanh -> Đưa thông tin dưới dạng **THAM KHẢO** kèm dòng nhắc: *"Người dùng cần xem xét kỹ thực tế tính chất hoạt động của cơ sở để xác định có thuộc diện 'Cơ sở sản xuất, kinh doanh khác' hay không."*

🔴 RULE 2: XỬ LÝ / XỬ PHẠT VI PHẠM (NĐ 106 + 69):
   - KHI NGƯỜI DÙNG HỎI: "Xử lý như nào", "Bị sao", "Phạt bao nhiêu", "Lỗi này thế nào"... -> HIỂU NGAY LÀ HỎI VỀ XỬ PHẠT HÀNH CHÍNH.
   - ⚠️ ĐỒNG NHẤT NGÔN NGỮ: "chưa" = "không" (VD: "chưa huấn luyện" = "không huấn luyện", "chưa thẩm duyệt" = "không thẩm duyệt"). Trợ lý BẮT BUỘC hiểu đồng nhất để quét trúng hành vi.
   - ⚠️ ĐỊNH DẠNG VÀ TƯ DUY BẮT BUỘC (Trình bày chính xác theo template, in đậm tiêu đề, xuống dòng rõ ràng):

     **1. HÀNH VI:** [Tên hành vi chính xác trong NĐ 106]

     **2. MỨC PHẠT TIỀN:**
     - Cá nhân: ... (Căn cứ: Điểm... Khoản... Điều... NĐ 106).
     - Tổ chức: ... (Gấp 2 lần mức cá nhân).

     **3. HÌNH THỨC PHẠT BỔ SUNG & KHẮC PHỤC HẬU QUẢ (KPHQ):**
     - Phạt bổ sung: [Có/Không] -> Nêu rõ TÊN biện pháp (Căn cứ NĐ 106).
     - Biện pháp KPHQ: [Có/Không] -> Nêu rõ TÊN biện pháp (VD: Buc tổ chức huấn luyện, Buộc tháo dỡ...) (Căn cứ NĐ 106).

     **4. THẨM QUYỀN XỬ PHẠT (Căn cứ Nghị định 69/2026/NĐ-CP):**
     * CHỈ XÉT 7 chức danh: Chiến sĩ CA, Đội trưởng, Trưởng CA cấp xã, Chủ tịch UBND cấp xã, Trưởng Phòng PC07, Giám đốc CA cấp tỉnh, Chủ tịch UBND cấp tỉnh. (Mọi lỗi Trưởng CA xã phạt được thì Chủ tịch UBND xã cũng phạt được).
     * BẮT BUỘC THỰC HIỆN BƯỚC LỌC KÉP SAU VỚI TỪNG CHỨC DANH (Dựa trên Nghị định 69/2026/NĐ-CP):
       - ĐIỀU KIỆN 1 (TIỀN): Thẩm quyền phạt tiền tối đa của chức danh phải >= Mức phạt tiền của hành vi (Lưu ý phân biệt mức cá nhân/tổ chức).
       - ĐIỀU KIỆN 2 (PHẠT BỔ SUNG & KPHQ): ĐỌC KỸ quy định thẩm quyền của chức danh đó trong Nghị định 69/2026. Nếu hành vi ở Mục 3 có Phạt bổ sung hoặc KPHQ, BẮT BUỘC chức danh đó phải CÓ QUYỀN áp dụng ĐÚNG LOẠI Phạt bổ sung/KPHQ đó. (Ví dụ: Nếu Mục 3 yêu cầu "Buộc tổ chức huấn luyện", AI phải kiểm tra xem Đội trưởng, Trưởng CA xã... có được giao quyền áp dụng biện pháp "Buộc tổ chức huấn luyện" theo Nghị định 69/2026 không. Nếu KHÔNG -> LOẠI NGAY LẬP TỨC chức danh đó, bất kể mức tiền thỏa mãn).
     [CHỈ liệt kê bằng gạch đầu dòng những người VƯỢT QUA CẢ 2 ĐIỀU KIỆN trên]:
     - [Tên chức danh 1]
     - [Tên chức danh 2]

     **5. KIẾN NGHỊ:** Trình Chủ tịch UBND cấp xã hoặc Trưởng Công an cấp xã (đối với cơ sở do UBND xã quản lý) hoặc Đội trưởng thuộc Phòng PC07 (đối với cơ sở do PC07 quản lý) ký quyết định xử phạt.
  
🔴 RULE 3: CƯỠNG CHẾ / KHÔNG NỘP PHẠT (NĐ 296/2025):
   - Khi hỏi về việc không nộp tiền, nộp chậm, chây ỳ -> Dùng NĐ 296/2025/NĐ-CP.
   - Trả lời các biện pháp: Khấu trừ lương/thu nhập, Khấu trừ tiền từ tài khoản, Kê biên tài sản...

🔴 RULE 4: TRÁCH NHIỆM / ĐIỀU KIỆN / HỒ SƠ / KIỂM TRA / NGHIỆM THU / THẨM ĐỊNH / PHÒNG CHÁY / BẢO VỆ HIỆN TRƯỜNG/ PHƯƠNG ÁN CHỮA CHÁY:
   # NGUYÊN TẮC TRÌNH BÀY THỨ BẬC PHÁP LÝ BẮT BUỘC (TOTAL HIERARCHICAL QUOTING):
   Đối với các câu hỏi về quy định, lắp đặt thiết bị, hồ sơ, thủ tục... AI BẮT BUỘC phải rà soát và trích dẫn theo thứ tự từ cao xuống thấp. KHÔNG ĐƯỢC dừng lại ở cấp đầu tiên, mà phải liệt kê TOÀN BỘ các quy định liên quan ở mọi cấp độ:
   - **CẤP 1 - LUẬT:** Trích dẫn đầy đủ Điều, Khoản trong "Luật PCCC và CNCH" liên quan đến thiết bị/nội dung đó.
   - **CẤP 2 - NGHỊ ĐỊNH:** Trích dẫn chính xác Điều, Khoản, Phụ lục trong "Nghị định 105/2025/NĐ-CP".
   - **CẤP 3 - THÔNG TƯ:** Trích dẫn chính xác Điều, Khoản, Phụ lục biểu mẫu trong "Thông tư 36/2025/TT-BCA".
   - **CẤP 4 - QUY CHUẨN (QCVN):** Trích dẫn các thông số kỹ thuật, định mức trong "QCVN 06:2022/BXD" hoặc "QCVN 10:2025/BCA".

   ⚠️ YÊU CẦU TRÌNH BÀY:
   - Phải ghi rõ: **"1. Căn cứ Luật...", "2. Căn cứ Nghị định 105...", "3. Căn cứ Thông tư 36...", "4. Căn cứ Quy chuẩn..."**.
   - Tại mỗi cấp, BẮT BUỘC trích dẫn chi tiết (Điểm, Khoản, Điều) và nội dung nguyên văn. 
   - Nếu một cấp độ không có quy định về nội dung đó, ghi: "Không quy định cụ thể tại văn bản này" để người dùng biết AI đã rà soát.
   - BƯỚC CHỐT CHẶN CUỐI CÙNG: Bạn CHỈ ĐƯỢC PHÉP trả lời từ chối SAU KHI đã quét cạn kiệt cả 4 cấp độ trên mà vẫn không có kết quả.
   
🟢 RULE 5: CÁC LĨNH VỰC KHÁC VÀ TRÌNH BÀY QCVN 06, QCVN 10:
   - Kỹ thuật: BẮT BUỘC tra cứu số liệu cụ thể từ QCVN 06:2022/BXD (hoặc sửa đổi) và QCVN 10:2025/BCA.

   - ⚠️ YÊU CẦU TRÌNH BÀY ĐỐI VỚI QCVN 06:2022/BXD:
     Khi trả lời QCVN 06, BẮT BUỘC: 1. Trích dẫn ĐẦY ĐỦ nguyên văn nội dung. 2. Ghi CHÍNH XÁC Mục/Điều/Bảng. Không được tóm tắt.

   - ⚠️ ĐỊNH DẠNG BẮT BUỘC ĐỐI VỚI QCVN 10:2025/BCA (CẤM VIẾT THÀNH ĐOẠN VĂN):
     Mọi hệ thống/phương tiện BẮT BUỘC phải trình bày theo đúng 4 dòng sau, không được sai lệch:
     [Tên hệ thống/phương tiện]:
     - Yêu cầu: [Chỉ ghi "Phải trang bị" HOẶC "Không thuộc diện phải trang bị"]
     - Định mức trang bị: [Số lượng cụ thể hoặc ghi "N/A" nếu không phải trang bị]
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
       
   - ⚠️ KIỂM TRA DIỆN THẨM DUYỆT, NGHIỆM THU (PHỤ LỤC III NĐ 105/2025/NĐ-CP):
     KHI NGƯỜI DÙNG HỎI CƠ SỞ CẦN TRANG BỊ GÌ, AI BẮT BUỘC PHẢI:
     1. Xác định/Tính toán các thông số của cơ sở: Số tầng, chiều cao, diện tích sàn, khối tích.
     2. Đối soát với danh mục tại Phụ lục III Nghị định 105/2025/NĐ-CP.
     3. Nếu cơ sở đạt ngưỡng quy định tại Phụ lục III, AI phải đưa ra kiến nghị bắt buộc: **"Căn cứ quy mô, cơ sở thuộc diện phải thực hiện thủ tục thẩm duyệt thiết kế và nghiệm thu về PCCC theo quy định tại Nghị định 105/2025/NĐ-CP trước khi đưa vào hoạt động."**

   - Chữa cháy, chỉ huy chữa cháy: Căn cứ Luật PCCC, Nghị định 105 và Thông tư 37.
   - Quân đội: Căn cứ CV Hướng dẫn phối hợp.

 🔵 RULE 6: TÍNH TOÁN LƯỢNG NƯỚC CHỮA CHÁY (THEO QCVN 10:2025/BCA):
    - KHI NGƯỜI DÙNG YÊU CẦU TÍNH TOÁN: AI BẮT BUỘC phản hồi theo cấu trúc 5 phần sau:
      1. **Phân loại cơ sở:** Xác định loại hình, quy mô (tầng, diện tích, khối tích) theo Phụ lục I và II Nghị định 105/2025/NĐ-CP để xem cơ sở thuộc diện quản lý nào và có nguy hiểm cháy nổ hay không (Nhóm 1, 2, 3...).
      2. **Yêu cầu về Hệ thống cấp nước chữa cháy ngoài nhà (Phụ lục C - Bảng C.1 QCVN 10:2025/BCA):** Đối soát cơ sở với Bảng C.1. Nếu không có tên hoặc chưa đạt quy mô thì kết luận "Không thuộc diện phải trang bị".
      3. **Yêu cầu về Hệ thống họng nước chữa cháy trong nhà (Phụ lục B - Bảng B.1 QCVN 10:2025/BCA):** Đối soát quy mô (tầng/diện tích nhà công cộng, y tế, giáo dục...) với Bảng B.1 để kết luận "Phải trang bị" hoặc "Không".
      4. **Yêu cầu về Hệ thống báo cháy và chữa cháy tự động (Phụ lục A - Bảng A.1 QCVN 10:2025/BCA):** Kiểm tra diện trang bị báo cháy và chữa cháy tự động (Sprinkler).
      5. **Tính toán thể tích bể nước chữa cháy:** 
         - Xác định căn cứ thời gian chữa cháy (t): (VD: Theo H.2.14 QCVN 10 là 1h cho họng nước trong nhà).
         - Xác định định mức lưu lượng (Q): (VD: Theo Bảng H.5 QCVN 10).
         - Công thức: V (m3) = [Lưu lượng họng nước (Q) * 3.6 * t] + [Lưu lượng ngoài nhà * 3.6 * t] + [Lưu lượng Sprinkler * 3.6 * t_spr].
         - **Kết luận:** Tổng khối tích bể nước (m3).

    - ⚠️ LƯU Ý PHONG CÁCH: BẮT BUỘC liệt kê đầy đủ các căn cứ pháp lý cho từng phần như ví dụ: *"Theo Phụ lục I Nghị định 105/2025/NĐ-CP, mục 4..."* hoặc *"Theo Bảng B.1, mục 1.4..."*.
    
    - ⚠️ LƯU Ý PHÁP LÝ: AI phải nhắc người dùng: *"Kết quả này chỉ mang tính chất tính toán sơ bộ dựa trên dữ kiện bạn cung cấp. Việc thiết kế bể nước chính xác phải do đơn vị tư vấn thiết kế thực hiện và được cơ quan có thẩm quyền thẩm duyệt."*
`;

function backupRetrieve(prompt: string, knowledge: KnowledgeItem[]): KnowledgeItem[] {
  const promptLower = prompt.toLowerCase();
  const results: KnowledgeItem[] = [];

  // Xác định các nhóm ý định trước khi lặp qua danh sách file để tối ưu hiệu năng
  const isEnforcement = ["cưỡng chế", "không nộp", "chậm nộp", "chây ỳ"].some(kw => promptLower.includes(kw));
  const isPenalty = ["phạt", "lỗi", "xử lý", "vi phạm", "bị sao", "tước", "hành chính"].some(kw => promptLower.includes(kw));
  const isMilitary = ["quân đội", "chi viện"].some(kw => promptLower.includes(kw));
  const isForce = ["lực lượng", "chỉ huy"].some(kw => promptLower.includes(kw)) && !["phương án", "mẫu"].some(kw => promptLower.includes(kw));
  const isManage = ["trách nhiệm", "hồ sơ", "quản lý", "điều kiện", "kiểm tra", "phương án", "mẫu", "đội", "cơ sở", "bảo hiểm", "báo cáo", "thành lập", "huấn luyện", "nghiệm thu", "thẩm duyệt", "giấy"].some(kw => promptLower.includes(kw));
  
  // QCVN 10
  const isTech10 = ["trang bị", "lắp đặt", "hệ thống", "10", "qc10", "phương tiện", "báo cháy", "chữa cháy", "đèn", "chỉ dẫn", "bình", "bơm", "sprinkler", "mặt nạ", "dây cứu", "phá dỡ", "dụng cụ", "định mức", "tính toán", "lượng nước", "m3", "bể nước", "họng nước", "sprinh", "đầu phun"].some(kw => promptLower.includes(kw)) && !isPenalty && !promptLower.includes("phương án");
  
  // QCVN 06
  let isTech06 = ["khoảng cách", "ngăn cháy", "thông gió", "hút khói", "chống cháy lan", "đường", "bãi đỗ", "vật liệu", "kích thước", "lối", "cầu thang", "hành lang", "cửa", "06", "qc06", "bậc chịu lửa"].some(kw => promptLower.includes(kw)) && !isPenalty;
  
  if (promptLower.includes("thoát nạn") && !["đèn", "chỉ dẫn"].some(kw => promptLower.includes(kw))) {
    isTech06 = true;
  }

  for (const item of knowledge) {
    const fname = item.title.toLowerCase();
    
    if (isEnforcement && fname.includes("296")) {
      results.push(item);
    } else if (isMilitary && ["quan doi", "du thao", "phoi hop", "cv hd", "doi 3"].some(x => fname.includes(x))) {
      results.push(item);
    } else if (isPenalty && ["106", "69"].some(x => fname.includes(x))) {
      results.push(item);
    } else if (isTech06 && fname.includes("06")) {
      results.push(item);
    } else if (isTech10 && fname.includes("10")) {
      results.push(item);
    } else if (isManage && ["luat", "105", "36"].some(x => fname.includes(x))) {
      results.push(item);
    } else if (isForce && fname.includes("37")) {
      results.push(item);
    }
  }
  return results;
}

// Hàm làm sạch output của AI, loại bỏ LaTeX code cho đơn vị
function cleanAIResponse(text: string): string {
  if (!text) return "";
  return text
    .replace(/\$m\^2\$/g, "m2")
    .replace(/\$m\^3\$/g, "m3")
    .replace(/m\^2/g, "m2")
    .replace(/m\^3/g, "m3")
    .replace(/\$m2\$/g, "m2")
    .replace(/\$m3\$/g, "m3")
    .replace(/\$([a-zA-Z]+)\^([0-9]+)\$/g, "$1$2");
}

export async function streamMessageWithSearch(
  messages: Message[],
  userKnowledge: KnowledgeItem[],
  onChunk: (text: string) => void
) {
  const availableKeys = getAvailableKeys();
  if (availableKeys.length === 0) {
    onChunk("Lỗi: Hệ thống chưa được cấu hình API Key. Vui lòng kiểm tra lại cài đặt Vercel.");
    return { sources: [] };
  }

  const userQuery = messages[messages.length - 1]?.content || "";
  
  // Kiểm tra câu chào để phản hồi nhanh không cần load văn bản
  const greetingPatterns = [
    /^(chào|xin chào|hello|hi|hey|chào bạn|chào ai|chào trợ lý|chào pc07)([\s!?.]|$)/i,
    /^(tôi muốn hỏi|cho hỏi|cho tôi hỏi)([\s!?.]|$)/i
  ];
  
  const isGreetingOnly = greetingPatterns[0].test(userQuery.trim());
  
  if (isGreetingOnly) {
    const greetingResponse = "Xin chào! Tôi là Chatbot AI về PCCC - Phạm Tùng Linh PC07 Phú Thọ. Bạn có thắc mắc gì về công tác PCCC và CNCH không? Hãy đặt câu hỏi để tôi giải đáp nhé!";
    onChunk(greetingResponse);
    return { sources: [] };
  }

  let selectedKnowledge: KnowledgeItem[] = [];
  
  // Bước 0: Thử tìm kiếm nhanh bằng từ khóa trước để giảm lag
  const quickResults = backupRetrieve(userQuery, userKnowledge);
  
  if (quickResults.length > 0) {
    selectedKnowledge = quickResults;
  } else if (userKnowledge.length > 0) {
    // Bước 1: Routing - Thử dùng LLM Router với cơ chế Retry nếu key bị nghẽn
    const fileList = userKnowledge.map(k => k.title).join(", ");
    const routerPrompt = ROUTER_INSTRUCTION
      .replace("{{FILE_LIST}}", fileList)
      .replace("{{USER_QUERY}}", userQuery);

  const tryRouter = async (retries = 2, failedKeys: string[] = []) => {
      const instance = getAIInstance(failedKeys);
      if (!instance || retries < 0) return null;

      try {
        const routerResult = await instance.ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ role: 'user', parts: [{ text: routerPrompt }] }],
          config: { temperature: 0, maxOutputTokens: 100 }
        });
        return routerResult.text?.trim() || "";
      } catch (e) {
        return tryRouter(retries - 1, [...failedKeys, instance.key]);
      }
    };

    const routerOutput = await tryRouter();
    if (routerOutput) {
      const selectedFilnames = routerOutput.split(",").map(f => f.trim().toLowerCase());
      const filtered = userKnowledge.filter(k => 
        selectedFilnames.some(sf => k.title.toLowerCase().includes(sf))
      );
      selectedKnowledge = filtered.length > 0 ? filtered : userKnowledge;
    } else {
      selectedKnowledge = userKnowledge;
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

  const history = messages.slice(-7, -1).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  // Bước 2: Streaming Response với cơ chế luân phiên Key nếu gặp lỗi
  const executeStream = async (retries = 3, usedKeys: string[] = []) => {
    const instance = getAIInstance(usedKeys);
    if (!instance) {
      if (usedKeys.length > 0 && retries > 0) {
        await new Promise(r => setTimeout(r, 800));
        return executeStream(retries - 1, []);
      }
      onChunk("Tất cả các kết nối AI đều đang bận. Vui lòng quay lại sau giây lát.");
      return { sources: [] };
    }

    try {
      const stream = await instance.ai.models.generateContentStream({
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

      let fullText = "";
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          onChunk(cleanAIResponse(fullText));
        }
      }

      return { sources: selectedKnowledge.map(k => k.title) };
    } catch (error: any) {
      console.error(`Gemini Error (Key ...${instance.key.slice(-5)}):`, error);
      
      const isRateLimit = error?.message?.includes("429") || error?.message?.includes("quota") || error?.message?.includes("limit");

      if (retries > 0) {
        // Tăng thời gian chờ nếu gặp lỗi rate limit
        const delay = isRateLimit ? 1000 : 500;
        await new Promise(r => setTimeout(r, delay));
        
        onChunk("\n⚡ Hệ thống đang tự động tối ưu đường truyền để tránh tắc nghẽn...");
        return executeStream(retries - 1, [...usedKeys, instance.key]);
      } else {
        // Thử lượt cuối cùng bằng Non-streaming nếu Streaming liên tục lỗi (vẫn dùng luân phiên key)
        const finalInstance = getAIInstance([]);
        if (finalInstance) {
          try {
            const finalResult = await finalInstance.ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [
                ...history,
                { role: 'user', parts: [...parts, { text: `CÂU HỎI: ${userQuery}` }] }
              ],
              config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.2 },
            });
            const text = finalResult.text;
            if (text) {
              onChunk(cleanAIResponse(text));
              return { sources: selectedKnowledge.map(k => k.title) };
            }
          } catch (finalErr) {
             console.error("Final fallback failed:", finalErr);
          }
        }
        onChunk("\n\n⚠️ Hệ thống đang quá tải cực độ. Vui lòng quay lại sau ít phút.");
        return { sources: [] };
      }
    }
  };

  return executeStream();
}
