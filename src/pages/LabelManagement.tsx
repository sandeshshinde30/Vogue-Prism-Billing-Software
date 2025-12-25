import { useEffect, useState, useRef } from "react";
import { Printer, Search, RefreshCw, Download, Upload, Settings as SettingsIcon, Plus, Minus, Tag, X, Package, Sliders, Move } from "lucide-react";
import { Card, Button, Input, Select } from "../components/common";
import { Product, PrinterInfo } from "../types";
import { LabelData, LabelSettings, DEFAULT_LABEL_TEMPLATE } from "../types/label";
import { exportTemplate, importTemplate } from "../utils/labelPrinter";
import toast from "react-hot-toast";

interface LabelDataWithQty extends LabelData {
  quantity: number;
}

interface LabelDesign {
  logoWidth: number;
  logoGap: number;
  barcodeWidth: number;
  barcodeHeight: number;
  barcodeTextSize: number;
  priceSize: number;
}

const DEFAULT_DESIGN: LabelDesign = {
  logoWidth: 18,
  logoGap: 2,
  barcodeWidth: 1,
  barcodeHeight: 40,
  barcodeTextSize: 7,
  priceSize: 14,
};

export function openLabelPreviewForProduct(product: Product, printerName: string = "") {
  const labelData: LabelDataWithQty = {
    barcode: product.barcode || product.name.toLowerCase().replace(/\s+/g, "") + (product.size || ""),
    name: product.name,
    price: product.price,
    size: product.size,
    quantity: product.stock || 1,
  };
  openLabelPreviewWindow([labelData], printerName);
}

function openLabelPreviewWindow(labels: LabelDataWithQty[], printerName: string) {
  const width = 900;
  const height = 650;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  const previewWindow = window.open("", "LabelPreview", 
    `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`);
  if (previewWindow) {
    previewWindow.document.write(generateLabelPreviewHTML(labels, printerName));
    previewWindow.document.close();
  }
}

function generateLabelPreviewHTML(labels: LabelDataWithQty[], printerName: string): string {
  const label = labels[0];
  const barcodeText = label.barcode || label.name.toLowerCase().replace(/\s+/g, "") + (label.size || "");
  const totalLabels = labels.reduce((sum, l) => sum + l.quantity, 0);
  
  const labelsListHtml = labels.map((l) => `
    <div class="product-item">
      <span class="product-name">${l.name}</span>
      <span class="product-qty">×${l.quantity}</span>
      <span class="product-price">₹${l.price}</span>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Print Labels</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#1e293b;min-height:100vh;display:flex}
.sidebar{width:260px;background:#0f172a;color:#fff;padding:20px;display:flex;flex-direction:column;gap:16px;overflow-y:auto}
.sidebar-header{display:flex;align-items:center;gap:12px;padding-bottom:16px;border-bottom:1px solid #334155}
.sidebar-icon{width:40px;height:40px;background:#059669;border-radius:10px;display:flex;align-items:center;justify-content:center}
.sidebar-title{font-size:16px;font-weight:600}
.sidebar-subtitle{font-size:12px;color:#94a3b8}
.section{background:#1e293b;border-radius:12px;padding:14px}
.section-title{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:10px}
.design-controls{display:flex;flex-direction:column;gap:10px}
.control-row{display:flex;align-items:center;justify-content:space-between}
.control-label{font-size:11px;color:#cbd5e1}
.control-input{width:60px;padding:5px 8px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;font-size:11px;text-align:center}
.control-input:focus{outline:none;border-color:#059669}
.control-unit{font-size:10px;color:#64748b;width:20px}
.printer-card{display:flex;align-items:center;gap:10px;padding:10px;background:#0f172a;border-radius:8px}
.printer-icon{width:32px;height:32px;background:#334155;border-radius:6px;display:flex;align-items:center;justify-content:center}
.printer-name{font-size:12px;font-weight:500}
.printer-type{font-size:10px;color:#64748b}
.printer-status{width:8px;height:8px;background:#22c55e;border-radius:50%;margin-left:auto}
.products-list{max-height:100px;overflow-y:auto}
.product-item{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #334155;font-size:11px}
.product-name{flex:1;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.product-qty{color:#22c55e;font-weight:600;background:#064e3b;padding:2px 6px;border-radius:4px;font-size:9px}
.product-price{color:#fff;font-weight:500}
.main{flex:1;padding:24px;display:flex;flex-direction:column}
.main-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.main-title{font-size:20px;font-weight:600;color:#fff}
.main-subtitle{font-size:12px;color:#94a3b8}
.close-btn{width:36px;height:36px;background:#334155;border:none;border-radius:8px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s}
.close-btn:hover{background:#475569}
.preview-container{flex:1;background:#f1f5f9;border-radius:16px;padding:20px;display:flex;flex-direction:column}
.preview-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:0 8px}
.preview-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#64748b}
.preview-body{flex:1;display:flex;align-items:center;justify-content:center;padding:16px}
.label-card{background:#fff;border:2px solid #cbd5e1;border-radius:8px;padding:12px 16px;display:flex;gap:12px;align-items:center;box-shadow:0 4px 16px rgba(0,0,0,0.1);transform:scale(1.4);transform-origin:center}
.label-logos{display:flex;flex-direction:column;gap:6px;align-items:center}
.label-logos img{object-fit:contain}
.label-content{display:flex;flex-direction:column;align-items:center;gap:4px}
.barcode-container svg{display:block}
.barcode-text{font-family:'Courier New',monospace;color:#1e293b;letter-spacing:0.5px}
.label-price{font-weight:700;color:#059669}
.actions{display:flex;gap:12px;margin-top:16px}
.btn{flex:1;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s}
.btn-secondary{background:#334155;color:#fff}
.btn-secondary:hover{background:#475569}
.btn-primary{background:linear-gradient(135deg,#059669,#10b981);color:#fff;box-shadow:0 4px 14px rgba(16,185,129,0.4)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(16,185,129,0.5)}
.btn-primary:disabled{opacity:0.6;cursor:not-allowed;transform:none}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:10px;font-size:13px;font-weight:500;display:none;z-index:1000;box-shadow:0 4px 20px rgba(0,0,0,0.3)}
.toast.success{background:#059669;color:#fff;display:flex;gap:8px;align-items:center}
.toast.error{background:#dc2626;color:#fff;display:flex;gap:8px;align-items:center}
</style></head>
<body>
<div class="sidebar">
  <div class="sidebar-header">
    <div class="sidebar-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14" rx="1"/></svg></div>
    <div><div class="sidebar-title">Print Labels</div><div class="sidebar-subtitle">Label #${labels.length > 1 ? labels.length + ' products' : label.name}</div></div>
  </div>
  
  <div class="section">
    <div class="section-title">🎨 Label Design</div>
    <div class="design-controls">
      <div class="control-row"><span class="control-label">Logo Size</span><input type="number" class="control-input" id="logoWidth" value="18" min="10" max="25" oninput="updateDesign()"><span class="control-unit">mm</span></div>
      <div class="control-row"><span class="control-label">Barcode Width</span><input type="number" class="control-input" id="barcodeWidth" value="1" min="0.8" max="2" step="0.1" oninput="updateDesign()"><span class="control-unit"></span></div>
      <div class="control-row"><span class="control-label">Barcode Height</span><input type="number" class="control-input" id="barcodeHeight" value="40" min="30" max="60" oninput="updateDesign()"><span class="control-unit">px</span></div>
      <div class="control-row"><span class="control-label">Text Size</span><input type="number" class="control-input" id="textSize" value="7" min="5" max="14" oninput="updateDesign()"><span class="control-unit">px</span></div>
      <div class="control-row"><span class="control-label">Price Size</span><input type="number" class="control-input" id="priceSize" value="14" min="10" max="24" oninput="updateDesign()"><span class="control-unit">px</span></div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">🖨️ Output</div>
    <div class="printer-card">
      <div class="printer-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14" rx="1"/></svg></div>
      <div><div class="printer-name">${printerName || 'Default Printer'}</div><div class="printer-type">50mm × 25mm Label</div></div>
      <div class="printer-status"></div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">📦 Products (${labels.length})</div>
    <div class="products-list">${labelsListHtml}</div>
  </div>
</div>

<div class="main">
  <div class="main-header">
    <div><div class="main-title">Label Preview</div><div class="main-subtitle">50mm × 25mm • ${totalLabels} label${totalLabels > 1 ? 's' : ''} to print</div></div>
    <button class="close-btn" onclick="window.close()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
  </div>
  
  <div class="preview-container">
    <div class="preview-header"><span class="preview-label">📋 Live Preview (scaled 1.4x)</span><span class="preview-label">50×25MM</span></div>
    <div class="preview-body">
      <div class="label-card" id="labelCard">
        <div class="label-logos" id="logoSection">
          <img id="logoUp" src="label-logo-up.png" alt="" onerror="this.style.display='none'" style="width:50px;height:auto;max-height:40px"/>
          <img id="logoDown" src="label-logo-down.png" alt="" onerror="this.style.display='none'" style="width:50px;height:auto;max-height:40px"/>
        </div>
        <div class="label-content">
          <div class="barcode-container"><svg id="barcode"></svg></div>
          <div class="barcode-text" id="barcodeText" style="font-size:7px">${barcodeText}</div>
          <div class="label-price" id="priceText" style="font-size:14px">₹${label.price}</div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="actions">
    <button class="btn btn-secondary" onclick="window.close()">✕ Cancel</button>
    <button class="btn btn-primary" id="printBtn" onclick="handlePrint()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14" rx="1"/></svg>
      <span id="printBtnText">Print ${totalLabels} Label${totalLabels > 1 ? 's' : ''}</span>
    </button>
  </div>
</div>

<div id="toast" class="toast"></div>

<script>
const labels=${JSON.stringify(labels)};
const printerName='${printerName}';
const barcodeText='${barcodeText}';
let design={logoWidth:18,barcodeWidth:1,barcodeHeight:40,textSize:7,priceSize:14};

function initBarcode(){
  JsBarcode("#barcode",barcodeText,{format:"CODE128",width:design.barcodeWidth,height:design.barcodeHeight,displayValue:false,margin:5,background:"#ffffff",lineColor:"#000000"});
}
initBarcode();

function updateDesign(){
  design.logoWidth=parseFloat(document.getElementById('logoWidth').value)||18;
  design.barcodeWidth=parseFloat(document.getElementById('barcodeWidth').value)||1;
  design.barcodeHeight=parseInt(document.getElementById('barcodeHeight').value)||40;
  design.textSize=parseInt(document.getElementById('textSize').value)||7;
  design.priceSize=parseInt(document.getElementById('priceSize').value)||14;
  
  document.getElementById('logoUp').style.width=design.logoWidth*2.8+'px';
  document.getElementById('logoDown').style.width=design.logoWidth*2.8+'px';
  document.getElementById('barcodeText').style.fontSize=design.textSize+'px';
  document.getElementById('priceText').style.fontSize=design.priceSize+'px';
  
  JsBarcode("#barcode",barcodeText,{format:"CODE128",width:design.barcodeWidth,height:design.barcodeHeight,displayValue:false,margin:5,background:"#ffffff",lineColor:"#000000"});
}

function showToast(msg,type){
  const t=document.getElementById('toast');
  t.innerHTML=(type==='success'?'✓ ':'✕ ')+msg;
  t.className='toast '+type;
  setTimeout(()=>t.className='toast',3000);
}

async function handlePrint(){
  const btn=document.getElementById('printBtn');
  const txt=document.getElementById('printBtnText');
  btn.disabled=true;txt.textContent='Printing...';
  try{
    if(window.opener&&window.opener.handleLabelPrint){
      const r=await window.opener.handleLabelPrint(labels,printerName,design);
      if(r.success){showToast('Labels sent to printer!','success');setTimeout(()=>window.close(),1500)}
      else showToast(r.error||'Print failed','error');
    }else showToast('Print handler not available','error');
  }catch(e){showToast('Error: '+e.message,'error')}
  btn.disabled=false;txt.textContent='Print ${totalLabels} Label${totalLabels > 1 ? 's' : ''}';
}
<\/script>
</body></html>`;
}

// Generate TSPL commands for label printer (Honeywell IH-210 compatible)
function generateTSPLContent(label: LabelData, design?: any): string {
  const barcodeText = label.barcode || label.name.toLowerCase().replace(/\s+/g, "") + (label.size || "");
  const price = `Rs.${label.price}`;
  
  // TSPL barcode: narrow=2, wide=5 for good scanning
  let tspl = 'SIZE 50 mm, 25 mm\n';
  tspl += 'GAP 2 mm, 0 mm\n';
  tspl += 'DIRECTION 0\n'; // 0 = normal direction
  tspl += 'CLS\n';
  // BARCODE X,Y,"code type",height,human readable,rotation,narrow,wide,"content"
  tspl += `BARCODE 140,20,"128",50,0,0,2,5,"${barcodeText}"\n`;
  tspl += `TEXT 140,75,"2",0,1,1,"${barcodeText}"\n`;
  tspl += `TEXT 140,100,"3",0,1,1,"${price}"\n`;
  tspl += 'PRINT 1,1\n';
  return tspl;
}

// Generate ESC/POS for thermal printers
function generateESCPOSWithGraphics(label: LabelData): string {
  const barcodeText = label.barcode || label.name.toLowerCase().replace(/\s+/g, "") + (label.size || "");
  const price = `Rs.${label.price}`;
  
  let cmd = '\x1B\x40\x1B\x61\x01';
  cmd += '\x1D\x68\x28\x1D\x77\x01\x1D\x48\x00';
  cmd += '\x1D\x6B\x49' + String.fromCharCode(barcodeText.length + 2) + '\x7B\x42' + barcodeText;
  cmd += '\x0A\x1B\x21\x00' + barcodeText + '\x0A';
  cmd += '\x1B\x21\x30' + price + '\x0A\x1B\x21\x00';
  cmd += '\x0A\x0A\x1D\x56\x01';
  return cmd;
}

// Generate ZPL for 50x25mm label - optimized for scannable CODE128
function generateZPLContent(label: LabelData, design?: any): string {
  const barcodeText = label.barcode || label.name.toLowerCase().replace(/\s+/g, "") + (label.size || "");
  const price = `Rs.${label.price}`;
  
  // ZPL coordinates: 203 DPI, 50mm = 406 dots, 25mm = 203 dots
  // ^BY sets barcode module width (2 is good for scanning)
  const barcodeHeight = design?.barcodeHeight || 50;
  const barcodeModuleWidth = 2;
  
  let zpl = '^XA\n';
  zpl += '^PW406\n'; // Print width 50mm
  zpl += '^LL203\n'; // Label length 25mm
  zpl += '^PON\n'; // Print orientation normal (not inverted)
  zpl += '^MD15\n'; // Media darkness
  zpl += '^PR2\n'; // Print speed
  
  // Barcode - positioned for proper layout (x=140 to leave space for logo)
  zpl += `^FO140,20^BY${barcodeModuleWidth}^BCN,${barcodeHeight},N,N,N^FD${barcodeText}^FS\n`;
  
  // Barcode text below
  zpl += `^FO140,${20 + barcodeHeight + 8}^A0N,20,18^FD${barcodeText}^FS\n`;
  
  // Price
  zpl += `^FO140,${20 + barcodeHeight + 30}^A0N,32,28^FD${price}^FS\n`;
  
  zpl += '^XZ\n';
  return zpl;
}

export function LabelManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<{product: Product, quantity: number}[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<LabelSettings>({
    selectedPrinter: "",
    labelWidth: 50,
    labelHeight: 25,
    dpi: 203,
    copies: 1,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
    loadPrinters();
    
    (window as any).handleLabelPrint = async (labels: LabelDataWithQty[], printerName: string, design?: any) => {
      return await printLabelsDirectly(labels, printerName, design);
    };
    
    return () => { delete (window as any).handleLabelPrint; };
  }, []);
  
  const printLabelsDirectly = async (labels: LabelDataWithQty[], printerName: string, design?: any) => {
    try {
      for (const label of labels) {
        for (let i = 0; i < label.quantity; i++) {
          // Use HTML-based printing with logos (produces scannable barcodes with logo)
          const result = await window.electronAPI.printLabelWithImage(
            label.barcode || label.name.toLowerCase().replace(/\s+/g, "") + (label.size || ""),
            label.price,
            printerName,
            design
          );
          
          if (!result.success) {
            return { success: false, error: result.error || "Print failed" };
          }
        }
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Print failed" };
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getProducts();
      setProducts(data);
    } catch (error) {
      toast.error("Error loading products");
    }
    setLoading(false);
  };

  const loadPrinters = async () => {
    try {
      const data = await window.electronAPI.getPrinters();
      setPrinters(data);
      if (data.length > 0 && !settings.selectedPrinter) {
        setSettings(prev => ({ ...prev, selectedPrinter: data[0].name }));
      }
    } catch (error) {
      console.error("Error loading printers:", error);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addToSelection = (product: Product) => {
    const existing = selectedProducts.find(p => p.product.id === product.id);
    if (!existing) {
      const qty = product.stock && product.stock > 0 ? product.stock : 1;
      setSelectedProducts([...selectedProducts, { product, quantity: qty }]);
      toast.success(`Added ${product.name} (${qty} labels)`);
    }
  };

  const removeFromSelection = (productId: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.product.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.product.id === productId 
        ? { ...p, quantity: Math.max(1, p.quantity + delta) }
        : p
    ));
  };

  const clearSelection = () => setSelectedProducts([]);
  const totalLabels = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);

  const previewLabels = () => {
    if (selectedProducts.length === 0) {
      toast.error("Please select products");
      return;
    }
    const labels: LabelDataWithQty[] = selectedProducts.map(p => ({
      barcode: p.product.barcode || p.product.name.toLowerCase().replace(/\s+/g, "") + (p.product.size || ""),
      name: p.product.name,
      price: p.product.price,
      size: p.product.size,
      quantity: p.quantity,
    }));
    openLabelPreviewWindow(labels, settings.selectedPrinter);
  };

  const handleExportTemplate = () => {
    const json = exportTemplate(DEFAULT_LABEL_TEMPLATE);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "label-template.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template exported");
  };

  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const template = importTemplate(event.target?.result as string);
        toast.success(`Template "${template.name}" imported`);
      } catch {
        toast.error("Invalid template file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex gap-6" style={{ height: 'calc(100vh - 120px)', display: 'flex', gap: '24px' }}>
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col min-w-0" style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: '0' }}>
        <Card padding="none">
          <div className="h-14 px-6 flex items-center justify-between border-b border-gray-100" style={{ height: '56px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
            <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center" style={{ width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tag size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800" style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Label Printing</h2>
                <p className="text-xs text-gray-500" style={{ fontSize: '12px', color: '#6b7280' }}>Select products to print labels</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleExportTemplate} variant="secondary" size="sm" className="flex items-center gap-1" style={{ fontSize: '11px', padding: '6px 10px' }}>
                <Download className="w-3 h-3" />Export
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleImportTemplate} accept=".json" className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} variant="secondary" size="sm" className="flex items-center gap-1" style={{ fontSize: '11px', padding: '6px 10px' }}>
                <Upload className="w-3 h-3" />Import
              </Button>
            </div>
          </div>
          
          <div className="p-4" style={{ padding: '16px' }}>
            <div className="flex items-center gap-3 mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div className="relative flex-1" style={{ position: 'relative', flex: '1' }}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <Input placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" style={{ paddingLeft: '36px' }} />
              </div>
              <Button onClick={loadProducts} variant="secondary" size="sm" className="flex items-center gap-1">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            
            <div className="overflow-y-auto" style={{ height: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              {loading ? (
                <div className="h-full flex items-center justify-center text-gray-400" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '32px', height: '32px', border: '3px solid #f1f5f9', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                    <span style={{ fontSize: '14px' }}>Loading...</span>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400" style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={40} style={{ marginBottom: '8px', opacity: '0.5' }} />
                  <p style={{ fontSize: '14px' }}>No products found</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAdd={addToSelection} isSelected={selectedProducts.some(p => p.product.id === product.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Right Panel - Selected & Settings */}
      <div className="w-[340px] flex flex-col gap-4" style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Card padding="none" className="flex-1" style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
          <div className="h-14 px-4 flex items-center border-b border-gray-100" style={{ height: '56px', padding: '0 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
            <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center" style={{ width: '32px', height: '32px', backgroundColor: '#22c55e', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Printer size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800" style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Selected Labels</h2>
                <p className="text-xs text-gray-500" style={{ fontSize: '12px', color: '#6b7280' }}>{totalLabels} label{totalLabels !== 1 ? 's' : ''} to print</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3" style={{ flex: '1', overflowY: 'auto', padding: '12px' }}>
            {selectedProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400" style={{ height: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Tag size={32} style={{ marginBottom: '8px', opacity: '0.3' }} />
                <p style={{ fontSize: '13px' }}>Click products to add</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedProducts.map(({product, quantity}) => (
                  <SelectedProductCard key={product.id} product={product} quantity={quantity} onUpdateQty={(d) => updateQuantity(product.id, d)} onRemove={() => removeFromSelection(product.id)} />
                ))}
              </div>
            )}
          </div>
          
          {selectedProducts.length > 0 && (
            <div className="px-3 pb-3" style={{ padding: '0 12px 12px' }}>
              <button onClick={clearSelection} className="w-full text-xs text-gray-500 hover:text-red-500 py-2" style={{ width: '100%', fontSize: '12px', color: '#6b7280', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>Clear All</button>
            </div>
          )}
        </Card>
        
        <Card padding="none">
          <div className="p-4" style={{ padding: '16px' }}>
            <div className="flex items-center gap-2 mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <SettingsIcon size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700" style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>Print Settings</span>
            </div>
            <div className="mb-3" style={{ marginBottom: '12px' }}>
              <label className="block text-xs font-medium text-gray-500 mb-1" style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Printer</label>
              <Select value={settings.selectedPrinter} onChange={(e) => setSettings(prev => ({ ...prev, selectedPrinter: e.target.value }))}
                options={[{ value: "", label: "Select printer..." }, ...printers.map(p => ({ value: p.name, label: p.displayName }))]} />
            </div>
          </div>
        </Card>
        
        <Button onClick={previewLabels} disabled={selectedProducts.length === 0} className="w-full flex items-center justify-center gap-2" style={{ width: '100%', padding: '14px', fontSize: '14px' }}>
          <Printer className="w-5 h-5" />
          Print {totalLabels} Label{totalLabels !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}

// Product Card Component - matches billing tab style
function ProductCard({ product, onAdd, isSelected }: { product: Product; onAdd: (p: Product) => void; isSelected: boolean }) {
  const isOutOfStock = product.stock <= 0;
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px',
        backgroundColor: isSelected ? '#f0fdf4' : '#f8fafc',
        borderRadius: '8px',
        border: `1px solid ${isSelected ? '#86efac' : '#f1f5f9'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        opacity: isOutOfStock ? '0.5' : '1'
      }}
      onMouseEnter={(e) => {
        if (!isOutOfStock && !isSelected) {
          e.currentTarget.style.backgroundColor = '#f1f5f9';
          e.currentTarget.style.borderColor = '#e2e8f0';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isSelected ? '#f0fdf4' : '#f8fafc';
        e.currentTarget.style.borderColor = isSelected ? '#86efac' : '#f1f5f9';
      }}
    >
      <div style={{ minWidth: '0', flex: '1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.name}
          </span>
          {product.size && (
            <span style={{ flexShrink: '0', padding: '2px 6px', fontSize: '10px', fontWeight: '500', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '4px' }}>
              {product.size}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a', fontFamily: 'JetBrains Mono, monospace' }}>
            ₹{product.price.toLocaleString()}
          </span>
          <span style={{ fontSize: '12px', color: product.stock <= (product.lowStockThreshold || 5) ? (product.stock <= 0 ? '#dc2626' : '#d97706') : '#94a3b8' }}>
            Stock: {product.stock}
          </span>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(product); }}
        disabled={isSelected}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isSelected ? '#86efac' : '#22c55e',
          color: 'white',
          borderRadius: '8px',
          border: 'none',
          cursor: isSelected ? 'default' : 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#16a34a'; }}
        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#22c55e'; }}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

// Selected Product Card Component
function SelectedProductCard({ product, quantity, onUpdateQty, onRemove }: { product: Product; quantity: number; onUpdateQty: (delta: number) => void; onRemove: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
      <div style={{ flex: '1', minWidth: '0' }}>
        <div style={{ fontSize: '12px', fontWeight: '500', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
        <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>₹{product.price}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button onClick={() => onUpdateQty(-1)} style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#64748b' }}>
          <Minus size={12} />
        </button>
        <span style={{ width: '28px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>{quantity}</span>
        <button onClick={() => onUpdateQty(1)} style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#64748b' }}>
          <Plus size={12} />
        </button>
        <button onClick={onRemove} style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#dc2626', marginLeft: '4px' }}>
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
