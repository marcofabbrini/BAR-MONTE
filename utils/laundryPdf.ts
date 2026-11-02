export interface LaundryPdfItem { staffName: string; name: string; totalQuantity: number }

/** Genera la distinta di spedizione in PDF (A4 verticale) e la restituisce in base64 (senza prefisso data:). */
export async function buildLaundryPdfBase64(sedeName: string, items: LaundryPdfItem[], date = new Date()): Promise<string> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const left = 15, right = 195, bottom = 275;
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(sedeName.toUpperCase(), 105, y, { align: 'center' });
    y += 8;
    doc.setFontSize(13);
    doc.text('DISTINTA SPEDIZIONE LAVANDERIA', 105, y, { align: 'center' });
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Data invio: ${date.toLocaleDateString('it-IT')}`, 105, y, { align: 'center' });
    y += 5;
    doc.setLineWidth(0.5);
    doc.line(left, y, right, y);
    y += 8;

    const header = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Personale', left, y);
        doc.text('Capo', 80, y);
        doc.text('Quantità', right, y, { align: 'right' });
        y += 2;
        doc.setLineWidth(0.3);
        doc.line(left, y, right, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
    };
    header();

    let total = 0;
    for (const it of items) {
        if (y > bottom - 40) { doc.addPage(); y = 20; header(); }
        doc.text(doc.splitTextToSize(String(it.staffName ?? ''), 60)[0] ?? '', left, y);
        doc.text(doc.splitTextToSize(String(it.name ?? ''), 80)[0] ?? '', 80, y);
        doc.text(String(it.totalQuantity), right, y, { align: 'right' });
        total += Number(it.totalQuantity) || 0;
        y += 6;
    }
    doc.line(left, y - 3, right, y - 3);
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTALE PEZZI', left, y);
    doc.text(String(total), right, y, { align: 'right' });

    if (y > bottom - 35) { doc.addPage(); y = 20; }
    y = Math.max(y + 35, 230);
    doc.setLineWidth(0.3);
    doc.line(left, y, left + 70, y);
    doc.line(right - 70, y, right, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Firma VVF (Consegna)', left + 35, y + 5, { align: 'center' });
    doc.text('Firma Lavanderia (Ritiro)', right - 35, y + 5, { align: 'center' });

    const uri = doc.output('datauristring');
    return uri.slice(uri.indexOf('base64,') + 7);
}
