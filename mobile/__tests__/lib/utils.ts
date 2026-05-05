export function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return "Now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

export function lastMessagePreview(msg: {
  content: string | null;
  messageType: string;
  sender: { name: string } | null;
} | null): string {
  if (!msg) return "No messages yet";
  if (msg.messageType !== "TEXT")
    return `📎 ${msg.messageType.charAt(0) + msg.messageType.slice(1).toLowerCase()}`;
  const preview = msg.content ?? "";
  const prefix = msg.sender ? `${msg.sender.name.split(" ")[0]}: ` : "";
  const full = prefix + preview;
  return full.length > 42 ? full.slice(0, 42) + "…" : full;
}

export function formatPrice(price: string | number | null): string | null {
  if (!price) return null;
  return `₹${Number(price).toLocaleString("en-IN")}`;
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}