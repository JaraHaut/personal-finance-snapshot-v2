/**
 * PDF snapshot export — dynamically imported to avoid bundle bloat.
 * Captures the supplied DOM element as a canvas, then fits it into 1–2 A4 pages.
 */
export async function exportToPdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const CANVAS_SCALE = 2;
  const A4_W_MM = 210;
  const A4_H_MM = 297;

  const canvas = await html2canvas(element, {
    scale: CANVAS_SCALE,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  // JPEG on an opaque white background: 3–6× smaller than PNG, faster to encode
  const imgData = canvas.toDataURL('image/jpeg', 0.92);

  // Logical pixel dimensions (undo html2canvas 2× device-pixel scaling)
  const pxW = canvas.width  / CANVAS_SCALE;
  const pxH = canvas.height / CANVAS_SCALE;

  // Fit to A4 width; cap at 2 pages so height never exceeds 594mm
  const fitScale = Math.min(A4_W_MM / pxW, (A4_H_MM * 2) / pxH);
  const outW = pxW * fitScale;
  const outH = pxH * fitScale;
  // Non-zero only when the height cap makes outW < A4 width (tall content)
  const xOffset = (A4_W_MM - outW) / 2;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Page 1: image anchored at y=0; jsPDF clips content at the 297mm boundary.
  // Passing alias 'snap' so jsPDF reuses the decoded image on page 2 without
  // re-parsing the full JPEG data.
  pdf.addImage(imgData, 'JPEG', xOffset, 0, outW, outH, 'snap', 'FAST');

  if (outH > A4_H_MM) {
    // Page 2: shift the image up by one page height to reveal the second portion.
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', xOffset, -A4_H_MM, outW, outH, 'snap', 'FAST');
  }

  pdf.save(filename);
}
