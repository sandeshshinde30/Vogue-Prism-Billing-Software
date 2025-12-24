import JsBarcode from 'jsbarcode';
import type { LabelData, LabelTemplate, LabelSettings } from '../types/label';

// Generate barcode as SVG string
export function generateBarcodeSVG(data: string, options?: {
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
}): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  
  try {
    JsBarcode(svg, data, {
      format: 'CODE128',
      width: options?.width || 2,
      height: options?.height || 40,
      displayValue: options?.displayValue ?? false,
      fontSize: options?.fontSize || 12,
      margin: 0,
      background: 'transparent',
    });
    
    return svg.outerHTML;
  } catch (error) {
    console.error('Error generating barcode:', error);
    return '';
  }
}

// Generate barcode as base64 image
export async function generateBarcodeBase64(data: string, options?: {
  width?: number;
  height?: number;
}): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    
    try {
      JsBarcode(canvas, data, {
        format: 'CODE128',
        width: options?.width || 2,
        height: options?.height || 50,
        displayValue: false,
        margin: 0,
        background: '#ffffff',
      });
      
      resolve(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error('Error generating barcode:', error);
      resolve('');
    }
  });
}

// Format price with rupee symbol
export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}

// Generate label HTML for preview
export function generateLabelHTML(
  labelData: LabelData,
  template: LabelTemplate,
  logoTopSrc: string,
  logoBottomSrc: string
): string {
  const barcodeText = labelData.barcode || labelData.name.toLowerCase().replace(/\s+/g, '') + (labelData.size || '');
  const barcodeSVG = generateBarcodeSVG(barcodeText, { width: 1.5, height: 35 });
  
  // Scale factor: convert mm to pixels (assuming 96 DPI for screen)
  const scale = 3.78; // 1mm = 3.78px at 96 DPI
  
  const width = template.width * scale;
  const height = template.height * scale;
  
  return `
    <div style="
      width: ${width}px;
      height: ${height}px;
      background: #fff;
      border-radius: 8px;
      position: relative;
      font-family: Arial, sans-serif;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    ">
      <!-- Top Logo (Bird) -->
      <div style="
        position: absolute;
        left: ${5 * scale}px;
        top: ${2 * scale}px;
        width: ${20 * scale}px;
        height: ${10 * scale}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img src="${logoTopSrc}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
      </div>
      
      <!-- Bottom Logo (VOGUE PRISM) -->
      <div style="
        position: absolute;
        left: ${5 * scale}px;
        top: ${13 * scale}px;
        width: ${20 * scale}px;
        height: ${15 * scale}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img src="${logoBottomSrc}" alt="Vogue Prism" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
      </div>
      
      <!-- Barcode -->
      <div style="
        position: absolute;
        right: ${3 * scale}px;
        top: ${2 * scale}px;
        width: ${22 * scale}px;
        height: ${12 * scale}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${barcodeSVG}
      </div>
      
      <!-- Product Name/Size -->
      <div style="
        position: absolute;
        right: ${3 * scale}px;
        top: ${14 * scale}px;
        width: ${22 * scale}px;
        font-size: ${8}px;
        color: #333;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      ">
        ${barcodeText}
      </div>
      
      <!-- Price -->
      <div style="
        position: absolute;
        right: ${3 * scale}px;
        top: ${19 * scale}px;
        width: ${22 * scale}px;
        font-size: ${16}px;
        font-weight: bold;
        color: #000;
        text-align: center;
      ">
        ${formatPrice(labelData.price)}
      </div>
    </div>
  `;
}

// Generate printable label content
export async function generatePrintableLabel(
  labelData: LabelData,
  template: LabelTemplate,
  logoTopSrc: string,
  logoBottomSrc: string,
  copies: number = 1
): Promise<string> {
  const barcodeText = labelData.barcode || labelData.name.toLowerCase().replace(/\s+/g, '') + (labelData.size || '');
  const barcodeBase64 = await generateBarcodeBase64(barcodeText, { width: 2, height: 50 });
  
  const labelHTML = `
    <div class="label" style="
      width: ${template.width}mm;
      height: ${template.height}mm;
      background: #fff;
      position: relative;
      font-family: Arial, sans-serif;
      page-break-after: always;
      box-sizing: border-box;
    ">
      <div style="position: absolute; left: 2mm; top: 1mm; width: 18mm; height: 10mm;">
        <img src="${logoTopSrc}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
      </div>
      <div style="position: absolute; left: 2mm; top: 12mm; width: 18mm; height: 15mm;">
        <img src="${logoBottomSrc}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
      </div>
      <div style="position: absolute; right: 2mm; top: 1mm; width: 25mm; height: 12mm; text-align: center;">
        <img src="${barcodeBase64}" style="max-width: 100%; max-height: 100%;" />
      </div>
      <div style="position: absolute; right: 2mm; top: 14mm; width: 25mm; font-size: 7pt; text-align: center; color: #333;">
        ${barcodeText}
      </div>
      <div style="position: absolute; right: 2mm; top: 19mm; width: 25mm; font-size: 14pt; font-weight: bold; text-align: center;">
        ${formatPrice(labelData.price)}
      </div>
    </div>
  `;
  
  return Array(copies).fill(labelHTML).join('');
}

// Print labels using browser print
export async function printLabels(
  labels: LabelData[],
  template: LabelTemplate,
  logoTopSrc: string,
  logoBottomSrc: string,
  settings: LabelSettings
): Promise<void> {
  const labelsHTML = await Promise.all(
    labels.map(label => generatePrintableLabel(label, template, logoTopSrc, logoBottomSrc, settings.copies))
  );
  
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    throw new Error('Could not open print window');
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Labels</title>
      <style>
        @page {
          size: ${template.width}mm ${template.height}mm;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
        }
        .label {
          page-break-after: always;
        }
        .label:last-child {
          page-break-after: auto;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      ${labelsHTML.join('')}
    </body>
    </html>
  `);
  
  printWindow.document.close();
  
  // Wait for images to load
  await new Promise(resolve => setTimeout(resolve, 500));
  
  printWindow.print();
}

// Export template as JSON
export function exportTemplate(template: LabelTemplate): string {
  return JSON.stringify(template, null, 2);
}

// Import template from JSON
export function importTemplate(json: string): LabelTemplate {
  const template = JSON.parse(json);
  // Validate required fields
  if (!template.id || !template.name || !template.width || !template.height) {
    throw new Error('Invalid template format');
  }
  return template;
}
