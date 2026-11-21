import qrcode from 'qrcode-generator';

/** Renders text as an SVG QR code string (dark modules on a light background for reliable scanning). */
export function qrSvg(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
}
