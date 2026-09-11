/**
 * Format timestamp thành định dạng thời gian tương đối thân thiện (VD: "5 phút trước", "Hôm qua")
 */
export function formatRelativeTime(
  dateInput: string | Date | undefined | null,
): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 0) {
    return "Vừa xong";
  }

  if (diffSec < 60) {
    return "Vừa xong";
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} phút trước`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour} giờ trước`;
  }

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `Hôm qua lúc ${hours}:${minutes}`;
  }

  if (diffDay < 7) {
    return `${diffDay} ngày trước`;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

/**
 * Format timestamp thành định dạng cố định "HH:mm - DD/MM/YYYY"
 */
export function formatDateTime(
  dateInput: string | Date | undefined | null,
): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${hours}:${minutes} - ${day}/${month}/${year}`;
}
