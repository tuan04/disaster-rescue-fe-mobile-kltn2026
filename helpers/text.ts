/**
 * Giải mã các HTML entities phổ biến từ dữ liệu crawl về thành ký tự thông thường
 */
export function decodeHtmlEntities(raw?: string | null): string {
  if (!raw) return "";

  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&hellip;/gi, "...")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(Number(dec));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return "";
      }
    });
}

/**
 * Làm sạch văn bản bài báo (decode HTML entities, loại bỏ tag HTML thừa, chuẩn hóa dấu xuống dòng và khoảng trắng)
 */
export function cleanNewsText(raw?: string | null): string {
  if (!raw) return "";

  const decoded = decodeHtmlEntities(raw);

  return decoded
    .replace(/<[^>]*>/g, "") // Loại bỏ các thẻ HTML nếu crawler còn sót
    .replace(/\r?\n+/g, " ") // Gom các dấu xuống dòng đơn lẻ trong câu
    .replace(/[ \t\u00A0]+/g, " ") // Gom khoảng trắng và non-breaking space
    .trim();
}
