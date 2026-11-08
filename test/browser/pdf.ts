// A small PDF made for the browser tests, standing in for the rulebook,
// which the tests never use (AGENTS.md): n pages, each saying which PDF
// page it is in large type, so a screenshot or the viewer shows where
// the browser opened it.

/** testPdf is a PDF of n pages, page i saying "PDF page i". */
export function testPdf(n: number): Buffer {
  const objects: string[] = [];
  // 1: the catalog, 2: the pages, 3: the font; then each page and its
  // contents.
  const kids: string[] = [];
  for (let i = 0; i < n; i++) kids.push(`${4 + 2 * i} 0 R`);
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${n} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  for (let i = 1; i <= n; i++) {
    const contents = `BT /F1 48 Tf 72 600 Td (PDF page ${i}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + 2 * (i - 1)} 0 R >>`,
    );
    objects.push(
      `<< /Length ${contents.length} >>\nstream\n${contents}\nendstream`,
    );
  }
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
