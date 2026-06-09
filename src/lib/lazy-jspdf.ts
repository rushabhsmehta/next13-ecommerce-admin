/** Lazy-load jsPDF + autotable for export buttons only. */
export async function importJsPdf() {
  const [jspdfMod, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  return {
    jsPDF: jspdfMod.jsPDF,
    autoTable: autoTableMod.default,
  };
}
