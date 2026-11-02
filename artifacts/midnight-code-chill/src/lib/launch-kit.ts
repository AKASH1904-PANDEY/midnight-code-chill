import QRCode from 'qrcode';
import JSZip from 'jszip';

type GraphicKey = 'feed' | 'story' | 'banner' | 'square';
const sizes: Record<GraphicKey, { width: number; height: number; label: string }> = {
  feed: { width: 1080, height: 1350, label: 'feed-1080x1350' },
  story: { width: 1080, height: 1920, label: 'story-1080x1920' },
  banner: { width: 1500, height: 500, label: 'banner-1500x500' },
  square: { width: 1080, height: 1080, label: 'square-1080x1080' },
};

export const captions = [
  'Stay up. Build something. Join Midnight Code & Chill, Friday, November 20, 2026, 9 PM–1 AM IST at Innovation Lab, Block 3 (On Campus). Bring a side project; work, share ideas, and grab late-night snacks. RSVP by November 19.',
  'A late-night chill coding session for builders, hackers, and students. Friday, November 20, 2026, 9 PM–1 AM IST. Innovation Lab, Block 3 (On Campus). Capacity 45; RSVPs close November 19.',
  'Bring a side project, work alongside other builders, and share ideas at Midnight Code & Chill. Friday, November 20, 2026 · 9 PM–1 AM IST · Innovation Lab, Block 3 (On Campus). RSVP deadline: November 19.',
];

function svgGraphic(key: GraphicKey) {
  const { width: w, height: h } = sizes[key];
  const isBanner = key === 'banner';
  const titleSize = isBanner ? 74 : key === 'story' ? 112 : 102;
  const inset = isBanner ? 84 : 86;
  const titleY = isBanner ? 220 : h * 0.46;
  const subY = isBanner ? 365 : titleY + 280;
  const metaY = isBanner ? 432 : h - 100;
  const rx = isBanner ? 388 : w - 144;
  const renderTitle = (text: string, y: number, color = '#eef5f8') =>
    `<text x="${inset}" y="${y}" fill="${color}" font-family="'DM Mono','Courier New',monospace" font-size="${titleSize}" font-weight="700" letter-spacing="-7">${text}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#283b4b" stroke-opacity=".42" stroke-width="1"/></pattern><radialGradient id="aura"><stop stop-color="#00f2fe" stop-opacity=".19"/><stop offset="1" stop-color="#00f2fe" stop-opacity="0"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="#0b0f19"/><rect width="${w}" height="${h}" fill="url(#grid)"/>
  <circle cx="${w * 0.81}" cy="${h * 0.22}" r="${Math.min(w, h) * .27}" fill="url(#aura)"/>
  <path d="M${inset} ${isBanner ? 76 : 96}h68" stroke="#00f2fe" stroke-width="4"/>
  <text x="${inset}" y="${isBanner ? 129 : 156}" fill="#00f2fe" font-family="'DM Mono','Courier New',monospace" font-size="${isBanner ? 22 : 24}" letter-spacing="5">CAMPUS BUILD SESSION / 01</text>
  ${isBanner ? `${renderTitle('MIDNIGHT CODE', titleY)}${renderTitle('& CHILL', titleY + 102, '#00f2fe')}` : `${renderTitle('STAY UP.', titleY)}${renderTitle('BUILD', titleY + 116, '#00f2fe')}${renderTitle('SOMETHING.', titleY + 232)}`}
  <text x="${inset}" y="${subY}" fill="#9aaab7" font-family="Arial,sans-serif" font-size="${isBanner ? 23 : 28}" letter-spacing="1.4">${isBanner ? 'A LATE-NIGHT SESSION FOR PEOPLE WHO BUILD THINGS' : 'A LATE-NIGHT CAMPUS BUILD SESSION'}</text>
  <path d="M${inset} ${metaY - 32}H${w - inset}" stroke="#354452" stroke-width="1"/>
  <text x="${inset}" y="${metaY}" fill="#e5edf1" font-family="'DM Mono','Courier New',monospace" font-size="${isBanner ? 18 : 22}" letter-spacing="2">FRI · NOV 20, 2026  /  9 PM — 1 AM IST</text>
  <text x="${inset}" y="${metaY + (isBanner ? 34 : 38)}" fill="#00f2fe" font-family="'DM Mono','Courier New',monospace" font-size="${isBanner ? 16 : 18}" letter-spacing="2">INNOVATION LAB, BLOCK 3  ·  RSVP BY NOV 19</text>
  <g transform="translate(${rx},${isBanner ? 142 : h * .75})" fill="none" stroke="#00f2fe" stroke-opacity=".56"><circle r="${isBanner ? 64 : 126}" stroke-width="2"/><circle r="${isBanner ? 44 : 88}" stroke-width="2"/><path d="M-${isBanner ? 78 : 150} 0h${isBanner ? 156 : 300}M0 -${isBanner ? 78 : 150}v${isBanner ? 156 : 300}" stroke-opacity=".4"/><rect x="-20" y="-20" width="40" height="40" fill="#0b0f19" stroke-width="2"/></g>
  <text x="${inset}" y="${isBanner ? 52 : h - 34}" fill="#768894" font-family="'DM Mono','Courier New',monospace" font-size="14" letter-spacing="3">MIDNIGHT CODE &amp; CHILL  /  ON CAMPUS</text>
  </svg>`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function makeCalendarFile() {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Midnight Code and Chill//Campus Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Kolkata',
    'X-LIC-LOCATION:Asia/Kolkata',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0530',
    'TZOFFSETTO:+0530',
    'TZNAME:IST',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:midnight-code-chill-20261120@${window.location.hostname || 'event.local'}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    'SEQUENCE:0',
    'DTSTART;TZID=Asia/Kolkata:20261120T210000',
    'DTEND;TZID=Asia/Kolkata:20261121T010000',
    'SUMMARY:Midnight Code & Chill',
    'DESCRIPTION:A late-night chill coding session for builders\\, hackers\\, and students to work on side projects\\, share ideas\\, and grab late-night snacks.',
    'LOCATION:Innovation Lab\\, Block 3 (On Campus)',
    'ORGANIZER;CN=Akash Pandey:mailto:contact@akashpandey.dev',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadCalendar() {
  const ics = makeCalendarFile();
  downloadBlob(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), 'midnight-code-and-chill.ics');
  return ics;
}

export async function downloadQr(origin: string) {
  const dataUrl = await QRCode.toDataURL(origin, { errorCorrectionLevel: 'H', margin: 2, width: 1200, color: { dark: '#0B0F19', light: '#FFFFFF' } });
  const response = await fetch(dataUrl);
  downloadBlob(await response.blob(), 'midnight-code-and-chill-qr.png');
}

export async function buildLaunchKit(origin: string, graphic?: GraphicKey) {
  if (graphic) {
    downloadBlob(new Blob([svgGraphic(graphic)], { type: 'image/svg+xml;charset=utf-8' }), `midnight-${sizes[graphic].label}.svg`);
    return;
  }
  const zip = new JSZip();
  const qrDataUrl = await QRCode.toDataURL(origin, { errorCorrectionLevel: 'H', margin: 2, width: 1200, color: { dark: '#0B0F19', light: '#FFFFFF' } });
  zip.file('midnight-code-and-chill-qr.png', qrDataUrl.split(',')[1], { base64: true });
  zip.file('midnight-code-and-chill.ics', makeCalendarFile());
  for (const key of Object.keys(sizes) as GraphicKey[]) zip.file(`graphics/${sizes[key].label}.svg`, svgGraphic(key));
  zip.file('captions.txt', captions.map((caption, i) => `CAPTION ${i + 1}\n${caption}`).join('\n\n'));
  zip.file('README.txt', [
    'MIDNIGHT CODE & CHILL — LAUNCH KIT',
    '',
    'Generated locally in your browser. No upload or social posting occurred.',
    `QR destination: ${origin}`,
    'Calendar: Friday, November 20, 2026, 9:00 PM–1:00 AM Asia/Kolkata.',
    'Location: Innovation Lab, Block 3 (On Campus).',
    'RSVP deadline: November 19, 2026.',
    '',
    'GRAPHICS',
    'Feed: 1080 × 1350 SVG',
    'Story: 1080 × 1920 SVG',
    'LinkedIn/Twitter banner: 1500 × 500 SVG',
    'Square: 1080 × 1080 SVG',
    '',
    'CAPTIONS',
    ...captions.flatMap((caption, i) => [`${i + 1}. ${caption}`, '']),
  ].join('\n'));
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  downloadBlob(blob, 'midnight-code-and-chill-launch-kit.zip');
}
