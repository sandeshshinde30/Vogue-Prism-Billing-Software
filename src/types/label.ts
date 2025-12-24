// Label template types
export interface LabelTemplate {
  id: string;
  name: string;
  width: number;  // in mm
  height: number; // in mm
  elements: LabelElement[];
  createdAt: string;
  updatedAt: string;
}

export interface LabelElement {
  type: 'logo-top' | 'logo-bottom' | 'barcode' | 'text' | 'price';
  x: number;      // position from left in mm
  y: number;      // position from top in mm
  width?: number;
  height?: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  align?: 'left' | 'center' | 'right';
  content?: string; // for static text
  field?: string;   // for dynamic fields: 'barcode', 'name', 'price', 'size'
}

export interface LabelData {
  barcode: string;
  name: string;
  price: number;
  size?: string;
}

export interface LabelSettings {
  selectedPrinter: string;
  labelWidth: number;
  labelHeight: number;
  dpi: number;
  copies: number;
}

export const DEFAULT_LABEL_TEMPLATE: LabelTemplate = {
  id: 'default',
  name: 'Vogue Prism Default',
  width: 50,
  height: 30,
  elements: [
    { type: 'logo-top', x: 5, y: 2, width: 20, height: 10 },
    { type: 'logo-bottom', x: 5, y: 13, width: 20, height: 8 },
    { type: 'barcode', x: 27, y: 2, width: 20, height: 12 },
    { type: 'text', x: 27, y: 15, fontSize: 8, field: 'name', align: 'left' },
    { type: 'price', x: 27, y: 21, fontSize: 14, fontWeight: 'bold', field: 'price', align: 'left' },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
