/** Escape HTML entities for safe embedding in rich-text form fields. */
export function escapeHtmlForAiActivity(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type MappedAiActivity = {
  activityTitle: string;
  activityDescription: string;
  activityImages: { url: string }[];
  locationId?: string;
};

export type MapAiActivitiesOptions = {
  /** When true, include locationId from the source row (or fallback). */
  includeLocationId?: boolean;
  fallbackLocationId?: string;
};

/**
 * Normalize AI-generated activity shapes for web tour package / query forms.
 * Keeps titled activities even when activityDescription is empty (common Gemini output).
 * Maps every item — does not collapse to activities[0] only.
 */
export function mapAiActivitiesForWebForm(
  activities: unknown,
  options: MapAiActivitiesOptions = {}
): MappedAiActivity[] {
  if (!Array.isArray(activities) || activities.length === 0) {
    return [];
  }

  const { includeLocationId = false, fallbackLocationId = "" } = options;

  return activities.flatMap((act, index) => {
    if (typeof act === "string") {
      const title = act.trim();
      if (!title) return [];
      const mapped: MappedAiActivity = {
        activityTitle: title,
        activityDescription: "",
        activityImages: [],
      };
      if (includeLocationId) {
        mapped.locationId = fallbackLocationId || "";
      }
      return [mapped];
    }

    if (!act || typeof act !== "object") return [];

    const row = act as Record<string, unknown>;
    const title = String(
      row.activityTitle ?? row.title ?? row.name ?? ""
    ).trim();
    const rawDescription = String(
      row.activityDescription ?? row.description ?? ""
    );
    if (!title && !rawDescription.trim()) return [];

    const escapedDescription = escapeHtmlForAiActivity(rawDescription).replace(
      /\n/g,
      "<br>"
    );

    const mapped: MappedAiActivity = {
      activityTitle: title || `Activity ${index + 1}`,
      activityDescription: escapedDescription,
      activityImages: [],
    };

    if (includeLocationId) {
      const fromRow =
        typeof row.locationId === "string" ? row.locationId.trim() : "";
      mapped.locationId = fromRow || fallbackLocationId || "";
    }

    return [mapped];
  });
}
