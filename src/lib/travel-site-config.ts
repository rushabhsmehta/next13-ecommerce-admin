/** Public contact & social config for the travel website (env-driven). */

function trimEnv(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

/** E.164 digits only, e.g. 919XXXXXXXXX for wa.me links */
export function getTravelWhatsAppPhone(): string | undefined {
  return trimEnv(process.env.NEXT_PUBLIC_WHATSAPP_PHONE);
}

export function getTravelWhatsAppUrl(message?: string): string | undefined {
  const phone = getTravelWhatsAppPhone();
  if (!phone) return undefined;
  const base = `https://wa.me/${phone.replace(/\D/g, "")}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

/** Human-readable phone for footer (env or formatted from WhatsApp number). */
export function getTravelContactPhoneDisplay(): string | undefined {
  const display = trimEnv(process.env.NEXT_PUBLIC_TRAVEL_CONTACT_PHONE);
  if (display) return display;
  const wa = getTravelWhatsAppPhone();
  if (!wa) return undefined;
  const digits = wa.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return digits ? `+${digits}` : undefined;
}

export const TRAVEL_CONTACT_EMAIL =
  trimEnv(process.env.NEXT_PUBLIC_TRAVEL_CONTACT_EMAIL) || "info@aagamholidays.com";

export const TRAVEL_CONTACT_ADDRESS =
  trimEnv(process.env.NEXT_PUBLIC_TRAVEL_CONTACT_ADDRESS) ||
  "Ahmedabad, Gujarat, India";

export function getTravelSocialLinks(): Array<{
  label: string;
  href: string;
}> {
  const links: Array<{ label: string; href: string }> = [];
  const instagram = trimEnv(process.env.NEXT_PUBLIC_TRAVEL_INSTAGRAM_URL);
  const facebook = trimEnv(process.env.NEXT_PUBLIC_TRAVEL_FACEBOOK_URL);
  const twitter = trimEnv(process.env.NEXT_PUBLIC_TRAVEL_TWITTER_URL);
  if (instagram) links.push({ label: "Instagram", href: instagram });
  if (facebook) links.push({ label: "Facebook", href: facebook });
  if (twitter) links.push({ label: "Twitter", href: twitter });
  return links;
}
