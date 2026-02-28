/**
 * Shared PDF branding configuration.
 * Used by tourPackageQueryPDFGenerator, tourPackagePDFGenerator, and their WithVariants counterparts.
 */

export interface CompanyInfoEntry {
  logo: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  social?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    whatsapp?: string;
  };
}

export interface CompanyInfo {
  [key: string]: CompanyInfoEntry;
}

export const companyInfo: CompanyInfo = {
  Empty: { logo: "", name: "", address: "", phone: "", email: "", website: "" },
  AH: {
    logo: "https://admin.aagamholidays.com/aagamholidays.png",
    name: "Aagam Holidays",
    address:
      "B - 1203, PNTC, Times of India Press Road, Satellite, Ahmedabad - 380015, Gujarat, India",
    phone: "+91-97244 44701",
    email: "info@aagamholidays.com",
    website: "https://aagamholidays.com",
    social: {
      facebook: "https://www.facebook.com/aagamholidays2021",
      instagram: "https://www.instagram.com/aagamholidays/",
      twitter: "https://twitter.com/aagamholidays",
      linkedin: "https://www.linkedin.com/in/deep-doshi-1265802b9",
      whatsapp: "https://wa.me/919724444701",
    },
  },
};

/** Default brand color palette for PDF generation */
export const brandColors = {
  primary: "#DC2626",
  secondary: "#EA580C",
  accent: "#F97316",
  light: "#FEF2F2",
  lightOrange: "#FFF7ED",
  text: "#1F2937",
  muted: "#6B7280",
  white: "#FFFFFF",
  border: "#E5E7EB",
  success: "#059669",
  panelBg: "#FFF8F5",
  subtlePanel: "#FFFDFB",
  tableHeaderBg: "#FFF3EC",
  slateText: "#374151",
  softDivider: "#F5E8E5",
} as const;

export type BrandColors = typeof brandColors;

/** Brand gradients derived from brand colors */
export const brandGradients = {
  primary: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%)`,
  secondary: `linear-gradient(135deg, ${brandColors.secondary} 0%, ${brandColors.accent} 100%)`,
  light: `linear-gradient(135deg, ${brandColors.light} 0%, ${brandColors.lightOrange} 100%)`,
  subtle: `linear-gradient(135deg, ${brandColors.white} 0%, ${brandColors.lightOrange} 100%)`,
  accent: `linear-gradient(135deg, ${brandColors.lightOrange} 0%, ${brandColors.light} 100%)`,
} as const;

/**
 * Resolve company info by merging a selected company option with the AH fallback.
 */
export function resolveCompanyInfo(
  selectedOption: string,
  companyProfile?: Partial<CompanyInfoEntry> | null
): CompanyInfoEntry {
  const fallback = companyInfo["AH"];
  const base = companyInfo[selectedOption] || fallback;

  if (!companyProfile) return base;

  return {
    logo: companyProfile.logo || base.logo,
    name: companyProfile.name || base.name,
    address: companyProfile.address || base.address,
    phone: companyProfile.phone || base.phone,
    email: companyProfile.email || base.email,
    website: companyProfile.website || base.website,
    social: {
      ...base.social,
      ...companyProfile.social,
    },
  };
}
