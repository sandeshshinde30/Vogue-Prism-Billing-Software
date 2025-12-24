import { useEffect, useState, useRef } from "react";
import { Printer, Search, RefreshCw, Download, Upload, Settings as SettingsIcon, Plus, Minus, Tag, X, Package } from "lucide-react";
import { Card, Button, Input, Select } from "../components/common";
import { Product, PrinterInfo } from "../types";
import { LabelData, LabelSettings, DEFAULT_LABEL_TEMPLATE } from "../types/label";
import { exportTemplate, importTemplate } from "../utils/labelPrinter";
import toast from "react-hot-toast";

interface LabelDataWithQty extends LabelData {
  quantity: number;
}

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
  const width = 550;
  const height = 580;
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
    <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:12px">
      <span style="flex:1;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.name}</span>
      <span style="color:#059669;font-weight:600;font-size:11px;background:#ecfdf5;padding:2px 6px;border-radius:4px">×${l.quantity}</span>
      <span style="color:#1e293b;font-weight:500">₹${l.price}</span>
    </div>
  `).join('');

  return generatePreviewHTMLContent(label, barcodeText, totalLabels, labelsListHtml, labels, printerName);
}

function generatePreviewHTMLContent(label: LabelDataWithQty, barcodeText: string, totalLabels: number, labelsListHtml: string, labels: LabelDataWithQty[], printerName: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Print Labels</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;min-height:100vh;padding:20px}
.container{max-width:510px;margin:0 auto}
.header{text-align:center;margin-bottom:16px}
.header h1{font-size:16px;font-weight:600;color:#1e293b;margin-bottom:6px}
.header-info{display:flex;justify-content:center;align-items:center;gap:10px;font-size:12px;color:#64748b}
.total-badge{background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:3px 10px;border-radius:16px;font-weight:600;font-size:11px}
.preview-card{background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden;margin-bottom:12px}
.preview-header{background:#f1f5f9;padding:8px 14px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
.preview-label{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#64748b}
.preview-body{padding:16px;display:flex;justify-content:center}
.label-preview{background:#fff;border:1.5px solid #e2e8f0;border-radius:4px;padding:8px 10px;width:200px;height:100px;display:flex;gap:8px;align-items:center}
.label-logo{width:45px;flex-shrink:0;display:flex;flex-direction:column;gap:4px}
.label-logo img{width:100%;height:auto}
.label-content{flex:1;text-align:center}
.barcode-container svg{max-width:100%;height:28px!important}
.barcode-text{font-size:7px;color:#64748b;font-family:monospace;margin-top:1px}
.label-price{font-size:14px;font-weight:700;color:#0f172a;margin-top:2px}
.info-row{display:flex;gap:8px;margin-bottom:12px}
.info-card{flex:1;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);padding:10px}
.info-card-label{font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;margin-bottom:3px}
.info-card-value{font-size:11px;color:#1e293b;font-weight:500}
.products-card{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);padding:12px;margin-bottom:12px;max-height:150px;overflow-y:auto}
.products-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.products-title{font-size:10px;font-weight:600;color:#1e293b}
.products-count{font-size:9px;color:#64748b}
.actions{display:flex;gap:8px}
.btn{flex:1;padding:10px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s}
.btn-primary{background:linear-gradient(135deg,#059669,#10b981);color:#fff;box-shadow:0 3px 10px rgba(16,185,129,0.25)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(16,185,129,0.35)}
.btn-primary:disabled{opacity:0.6;cursor:not-allowed;transform:none}
.btn-secondary{background:#f1f5f9;color:#475569}
.btn-secondary:hover{background:#e2e8f0}
.status-toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:8px;font-size:12px;font-weight:500;display:none;z-index:1000}
.status-toast.success{background:#059669;color:#fff;display:flex}
.status-toast.error{background:#dc2626;color:#fff;display:flex}
</style></head>
<body>
<div class="container">
<div class="header"><h1>Print Labels</h1><div class="header-info"><span>${labels.length} product(s)</span><span class="total-badge">${totalLabels} labels</span></div></div>
<div class="preview-card">
<div class="preview-header"><span class="preview-label">Label Preview</span><span class="preview-label">50×25mm</span></div>
<div class="preview-body">
<div class="label-preview">
<div class="label-logo">
<img src="label-logo-up.png" alt="" onerror="this.style.display='none'"/>
<img src="label-logo-down.png" alt="" onerror="this.style.display='none'"/>
</div>
<div class="label-content">
<div class="barcode-container"><svg id="barcode"></svg></div>
<div class="barcode-text">${barcodeText}</div>
<div class="label-price">₹${label.price}</div>
</div></div></div></div>
<div class="info-row">
<div class="info-card"><div class="info-card-label">Printer</div><div class="info-card-value">${printerName || 'Default'}</div></div>
<div class="info-card"><div class="info-card-label">Size</div><div class="info-card-value">50mm × 25mm</div></div>
</div>
<div class="products-card"><div class="products-header"><span class="products-title">Products</span><span class="products-count">${labels.length} items</span></div>${labelsListHtml}</div>
<div class="actions">
<button class="btn btn-secondary" onclick="window.close()">Cancel</button>
<button id="print-btn" class="btn btn-primary" onclick="handlePrint()">
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14" rx="1"/></svg>
<span id="print-btn-text">Print ${totalLabels} Labels</span>
</button></div></div>
<div id="status-toast" class="status-toast"></div>
<script>
const labels=${JSON.stringify(labels)};const printerName='${printerName}';
JsBarcode("#barcode","${barcodeText}",{format:"CODE128",width:1,height:28,displayValue:false,margin:0});
function showToast(m,t){const e=document.getElementById('status-toast');e.textContent=m;e.className='status-toast '+t;setTimeout(()=>e.className='status-toast',3000)}
async function handlePrint(){const b=document.getElementById('print-btn'),t=document.getElementById('print-btn-text');b.disabled=true;t.textContent='Printing...';
try{if(window.opener&&window.opener.handleLabelPrint){const r=await window.opener.handleLabelPrint(labels,printerName);if(r.success){showToast('Labels sent!','success');setTimeout(()=>window.close(),1500)}else showToast(r.error||'Failed','error')}else showToast('Handler not available','error')}catch(e){showToast('Error: '+e.message,'error')}
b.disabled=false;t.textContent='Print ${totalLabels} Labels'}
<\/script></body></html>`;
}

// Generate TSPL commands for label printer (Honeywell IH-210 compatible)
function generateTSPLContent(label: LabelData): string {
  const barcodeText = label.barcode || label.name.toLowerCase().replace(/\s+/g, "") + (label.size || "");
  const price = `Rs.${label.price}`;
  
  let tspl = 'SIZE 50 mm, 25 mm\n';
  tspl += 'GAP 2 mm, 0 mm\n';
  tspl += 'DIRECTION 1\n';
  tspl += 'CLS\n';
  tspl += `BARCODE 130,15,"128",45,0,0,2,3,"${barcodeText}"\n`;
  tspl += `TEXT 130,65,"1",0,1,1,"${barcodeText}"\n`;
  tspl += `TEXT 130,82,"3",0,1,1,"${price}"\n`;
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

// Generate ZPL for 50x25mm label
function generateZPLContent(label: LabelData): string {
  const barcodeText = label.barcode || label.name.toLowerCase().replace(/\s+/g, "") + (label.size || "");
  const price = `Rs.${label.price}`;
  
  let zpl = '^XA^PW406^LL203^MD10\n';
  zpl += '^FO130,10^BY1^BCN,40,N,N,N^FD' + barcodeText + '^FS\n';
  zpl += '^FO130,55^A0N,16,16^FD' + barcodeText + '^FS\n';
  zpl += '^FO130,75^A0N,45,45^FD' + price + '^FS\n';
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
    
    (window as any).handleLabelPrint = async (labels: LabelDataWithQty[], printerName: string) => {
      return await printLabelsDirectly(labels, printerName);
    };
    
    return () => { delete (window as any).handleLabelPrint; };
  }, []);
  
  const printLabelsDirectly = async (labels: LabelDataWithQty[], printerName: string) => {
    try {
      for (const label of labels) {
        for (let i = 0; i < label.quantity; i++) {
          // Use HTML-based printing with logos via printLabelWithImage
          const result = await window.electronAPI.printLabelWithImage(
            label.barcode || label.name.toLowerCase().replace(/\s+/g, "") + (label.size || ""),
            label.price,
            printerName
          );
          
          if (!result.success) {
            // Fallback to raw printing without logos
            const tsplContent = generateTSPLContent(label);
            let rawResult = await window.electronAPI.printLabel(tsplContent, printerName);
            
            if (!rawResult.success) {
              const zplContent = generateZPLContent(label);
              rawResult = await window.electronAPI.printLabel(zplContent, printerName);
            }
            
            if (!rawResult.success) {
              const escContent = generateESCPOSWithGraphics(label);
              rawResult = await window.electronAPI.printLabel(escContent, printerName);
            }
            
            if (!rawResult.success) {
              return { success: false, error: rawResult.error || "Print failed" };
            }
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
        <button onClick={onRemove} style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#ef4444', marginLeft: '4px' }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
