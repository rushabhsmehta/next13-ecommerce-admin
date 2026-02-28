/**
 * Shared CSS style templates for PDF generation.
 * Eliminates duplication across all 4 PDF generator components.
 */

import { brandColors, BrandColors } from "./branding";

/** Base container style for the PDF document */
export const containerStyle = `
  max-width: 820px;
  margin: 0 auto;
  font-family: Arial, sans-serif;
  color: ${brandColors.text};
  font-size: 14px;
`;

/** Card wrapper with subtle border and shadow */
export const cardStyle = `
  background: ${brandColors.white};
  border: 1px solid ${brandColors.border};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
`;

/** Alt header style (used for section headers with warm background) */
export const headerStyleAlt = `
  background: ${brandColors.tableHeaderBg};
  border-bottom: 1px solid ${brandColors.border};
  padding: 12px 16px;
`;

/** Content area padding inside cards */
export const contentStyle = `
  padding: 16px;
`;

/** Section title text styling */
export const sectionTitleStyle = `
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${brandColors.text};
`;

/** Price card panel style */
export const priceCardStyle = `
  background: ${brandColors.subtlePanel};
  border: 1px solid ${brandColors.border};
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
`;

/** Print-specific page style with A4 sizing */
export const pageStyle = `
  @media print {
    @page {
      size: A4;
      margin: 72px 14px 140px 14px;
    }
  }
`;

/** Info row style for key-value pairs */
export const infoRowStyle = `
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
`;

/** Info label style */
export const infoLabelStyle = `
  color: ${brandColors.muted};
  font-weight: 500;
`;

/** Info value style */
export const infoValueStyle = `
  color: ${brandColors.text};
  font-weight: 600;
`;

/** Divider between sections */
export const dividerStyle = `
  border: none;
  height: 1px;
  background: ${brandColors.softDivider};
  margin: 8px 0;
`;

/**
 * Creates a complete set of PDF styles.
 * Can be used in components that need all styles as an object.
 */
export function getPdfStyles(colors: BrandColors = brandColors) {
  return {
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
    colors,
  };
}
