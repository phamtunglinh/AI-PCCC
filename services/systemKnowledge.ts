
/**
 * KHO KIẾN THỨC HỆ THỐNG CỐ ĐỊNH - PCCC PHÚ THỌ
 * Nội dung này là nền tảng pháp lý cốt lõi cho AI.
 */

export const SYSTEM_DOCUMENTS = [
  {
    id: "system-luat-pccc-2024",
    title: "Luật PCCC và CNCH số 55/2024/QH15",
    content: `Luật này có hiệu lực từ năm 2025, quy định các nguyên tắc cốt lõi về phòng cháy, chữa cháy và cứu nạn cứu hộ. 
    - Quy định rõ trách nhiệm của chủ đầu tư, chủ cơ sở và hộ gia đình. 
    - Bắt buộc phải được thẩm duyệt thiết kế và nghiệm thu PCCC trước khi đưa vào hoạt động đối với các dự án thuộc diện quy định. 
    - Cơ sở phải đảm bảo các điều kiện an toàn PCCC như: hồ sơ quản lý, lực lượng tại chỗ, phương án chữa cháy.`,
    mimeType: "text/plain",
    isSystem: true
  },
  {
    id: "system-nd-105-2025",
    title: "Nghị định 105/2025/NĐ-CP",
    content: `Quy định về quản lý nhà nước, phân cấp quản lý cơ sở PCCC.
    - Phân cấp quản lý chỉ còn 2 cấp chính: Phòng Cảnh sát PCCC (PC07) và UBND cấp xã. PC07 quản lý các cơ sở Phụ lục II. UBND xã quản lý cơ sở Phụ lục I còn lại.
    - Phụ lục I: Danh mục cơ sở thuộc diện quản lý về PCCC.
    - Phụ lục II: Danh mục cơ sở có nguy hiểm về cháy, nổ.
    - Phụ lục III: Danh mục cơ sở thuộc diện phải thẩm duyệt thiết kế và nghiệm thu về PCCC.`,
    mimeType: "text/plain",
    isSystem: true
  },
  {
    id: "system-nd-106-2025",
    title: "Nghị định 106/2025/NĐ-CP",
    content: `Văn bản quy định về xử phạt vi phạm hành chính trong lĩnh vực PCCC và CNCH.
    - Quy định mức phạt tiền cho từng hành vi vi phạm (như không huấn luyện, không bảo trì thiết bị, chưa thẩm duyệt đã hoạt động...).
    - Quy định các hình thức phạt bổ sung (tước giấy phép, đình chỉ hoạt động) và biện pháp khắc phục hậu quả (buộc tháo dỡ, buộc huấn luyện...).`,
    mimeType: "text/plain",
    isSystem: true
  },
  {
    id: "system-nd-69-2026",
    title: "Nghị định 69/2026/NĐ-CP",
    content: `Quy định về thẩm quyền xử phạt vi phạm hành chính.
    - Phân cấp thẩm quyền phạt cho: Chiến sĩ CA, Đội trưởng, Trưởng Công an xã, Chủ tịch UBND xã, Trưởng phòng PC07, Giám đốc Công an tỉnh, Chủ tịch UBND tỉnh.
    - Thẩm quyền được xác định dựa trên: Mức phạt tiền và khả năng áp dụng các biện pháp phạt bổ sung/khắc phục hậu quả.`,
    mimeType: "text/plain",
    isSystem: true
  },
  {
    id: "system-tt-36-2025",
    title: "Thông tư 36/2025/TT-BCA",
    content: `Quy định về hồ sơ quản lý, theo dõi hoạt động PCCC và các biểu mẫu hành chính.
    - Hướng dẫn các loại giấy tờ cơ sở cần chuẩn bị: Sổ theo dõi, phương án chữa cháy cơ sở, biên bản kiểm tra bảo trì.
    - Quy định về huấn luyện nghiệp vụ và cấp chứng nhận huấn luyện.`,
    mimeType: "text/plain",
    isSystem: true
  },
  {
    id: "system-qcvn-10-2025",
    title: "QCVN 10:2025/BCA",
    content: `Quy chuẩn kỹ thuật về trang bị phương tiện PCCC cho công trình.
    - Bảng A.1: Quy định diện trang bị hệ thống báo cháy và chữa cháy tự động (Sprinkler).
    - Bảng B.1: Quy định diện trang bị họng nước chữa cháy trong nhà.
    - Bảng C.1: Quy định diện trang bị hệ thống cấp nước chữa cháy ngoài nhà.
    - Quy định các thông số kỹ thuật cho đường ống, bể nước, máy bơm và định mức trang bị bình chữa cháy theo diện tích.`,
    mimeType: "text/plain",
    isSystem: true
  },
  {
    id: "system-qcvn-06-2022",
    title: "QCVN 06:2022/BXD",
    content: `Quy chuẩn về an toàn cháy cho nhà và công trình.
    - Quy định về khoảng cách an toàn chống cháy lan giữa các công trình.
    - Quy định về bậc chịu lửa, ngăn cháy, thoát nạn (lối thoát, hành lang, cầu thang).
    - Quy định về hệ thống thông gió, hút khói cho gian phòng và hành lang.`,
    mimeType: "text/plain",
    isSystem: true
  },
  {
    id: "system-ev-battery",
    title: "Tri thức chữa cháy Pin xe điện (EV)",
    content: `Hướng dẫn chữa cháy pin Lithium-ion trên xe điện:
    - Hiệu quả thấp: Bình chữa cháy bột, CO2 thông thường.
    - Ưu tiên: Bình chữa cháy gốc nước chuyên dụng có phụ gia (Foam, Vermiculite, F500EA).
    - Phương pháp dân gian: Sử dụng cát, đất trộn với nước (tuyệt đối không dùng cát khô đơn thuần).
    - Ô tô điện: Nếu hộp pin còn kín và chưa cháy lan, nên để pin tự cháy hết trong hộp đồng thời làm mát xung quanh. Tập trung chống cháy lan sang phương tiện khác.`,
    mimeType: "text/plain",
    isSystem: true
  }
];
