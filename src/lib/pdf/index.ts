/**
 * Barrel export for PDF shared utilities.
 *
 * Usage:
 *   import { brandColors, sanitizeText, cardStyle } from "@/lib/pdf";
 */
export {
  companyInfo,
  brandColors,
  brandGradients,
  resolveCompanyInfo,
  type CompanyInfo,
  type CompanyInfoEntry,
  type BrandColors,
} from "./branding";

export {
  containerStyle,
  cardStyle,
  headerStyleAlt,
  contentStyle,
  sectionTitleStyle,
  priceCardStyle,
  pageStyle,
  infoRowStyle,
  infoLabelStyle,
  infoValueStyle,
  dividerStyle,
  getPdfStyles,
} from "./styles";

export {
  sanitizeText,
  extractText,
  parsePolicyField,
  renderBulletList,
} from "./text-utils";
