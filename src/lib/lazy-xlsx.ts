/** Lazy-load xlsx so it is not included in the initial client bundle. */
export async function importXlsx() {
  return import("xlsx");
}
