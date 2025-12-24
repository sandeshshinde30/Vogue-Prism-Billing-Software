import { useEffect, useState, useRef } from "react";
import { Printer, Search, RefreshCw, Download, Upload, Settings as SettingsIcon, Plus, Minus, Tag, X } from "lucide-react";
import { Card, Button, Input, Select } from "../components/common";
import { Product, PrinterInfo } from "../types";
import { LabelData, LabelSettings, DEFAULT_LABEL_TEMPLATE } from "../types/label";
import { exportTemplate, importTemplate } from "../utils/labelPrinter";
import toast from "react-hot-toast";

// Extended label data with quantity for copies
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
  const height = 620;
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
    <div class="label-item">
      <span class="label-name">${l.name}</span>
      <span class="label-qty">×${l.quantity}</span>
      <span class="label-price">₹${l.price}</span>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Print Labels</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;min-height:100vh;padding:24px}
    .container{max-width:500px;margin:0 auto}
    .header{text-align:center;margin-bottom:20px}
    .header h1{font-size:18px;font-weight:600;color:#1e293b;margin-bottom:8px}
    .header-info{display:flex;justify-content:center;align-items:center;gap:12px;font-size:13px;color:#64748b}
    .total-badge{background:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#fff;padding:4px 12px;border-radius:20px;font-weight:600}
    .preview-card{background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;margin-bottom:16px}
    .preview-header{background:#f1f5f9;padding:10px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
    .preview-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#64748b}
    .preview-size{font-size:10px;color:#94a3b8}
    .preview-body{padding:20px;display:flex;justify-content:center}
    .label-preview{background:#fff;border:2px solid #e2e8f0;border-radius:6px;padding:10px 14px;width:240px;display:flex;gap:12px;align-items:center}
    .label-logo{width:55px;flex-shrink:0}
    .label-logo img{width:100%;height:auto}
    .label-logo-placeholder{width:55px;height:40px;background:#f1f5f9;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:8px}
    .label-content{flex:1;text-align:center}
    .barcode-container svg{max-width:100%}
    .barcode-text{font-size:8px;color:#64748b;font-family:monospace;margin-top:2px}
    .label-price{font-size:18px;font-weight:700;color:#0f172a;margin-top:4px}
    .info-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
    .info-card{background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.06);padding:12px}
    .info-card-label{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;margin-bottom:4px}
    .info-card-value{font-size:12px;color:#1e293b;font-weight:500}
    .products-card{background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.06);padding:14px;margin-bottom:16px}
    .products-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .products-title{font-size:11px;font-weight:600;color:#1e293b}
    .products-count{font-size:10px;color:#64748b}
    .labels-list{max-height:90px;overflow-y:auto}
    .label-item{display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:11px}
    .label-item:last-child{border-bottom:none}
    .label-name{flex:1;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .label-qty{color:#059669;font-weight:600;font-size:10px;background:#ecfdf5;padding:2px 5px;border-radius:4px}
    .label-price{color:#1e293b;font-weight:500}
    .actions{display:flex;gap:10px}
    .btn{flex:1;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s}
    .btn-primary{background:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#fff;box-shadow:0 4px 12px rgba(16,185,129,0.3)}
    .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(16,185,129,0.4)}
    .btn-primary:disabled{opacity:0.6;cursor:not-allowed;transform:none}
    .btn-secondary{background:#f1f5f9;color:#475569}
    .btn-secondary:hover{background:#e2e8f0}
    .status-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;display:none;align-items:center;gap:8px;z-index:1000}
    .status-toast.success{background:#059669;color:#fff;display:flex}
    .status-toast.error{background:#dc2626;color:#fff;display:flex}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Print Labels</h1>
      <div class="header-info">
        <span>${labels.length} product(s)</span>
        <span class="total-badge">${totalLabels} labels</span>
      </div>
    </div>
    
    <div class="preview-card">
      <div class="preview-header">
        <span class="preview-label">Label Preview</span>
        <span class="preview-size">50mm × 25mm</span>
      </div>
      <div class="preview-body">
        <div class="label-preview">
          <div class="label-logo">
            <img src="label-logo-up.png" alt="Logo" onerror="this.outerHTML='<div class=\\'label-logo-placeholder\\'>LOGO</div>'"/>
          </div>
          <div class="label-content">
            <div class="barcode-container"><svg id="barcode"></svg></div>
            <div class="barcode-text">${barcodeText}</div>
            <div class="label-price">₹${label.price}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="info-cards">
      <div class="info-card">
        <div class="info-card-label">Printer</div>
        <div class="info-card-value">${printerName || 'Default'}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Label Size</div>
        <div class="info-card-value">50mm × 25mm</div>
      </div>
    </div>
    
    <div class="products-card">
      <div class="products-header">
        <span class="products-title">Products</span>
        <span class="products-count">${labels.length} items</span>
      </div>
      <div class="labels-list">${labelsListHtml}</div>
    </div>
    
    <div class="actions">
      <button class="btn btn-secondary" onclick="window.close()">Cancel</button>
      <button id="print-btn" class="btn btn-primary" onclick="handlePrint()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14" rx="1"/></svg>
        <span id="print-btn-text">Print ${totalLabels} Labels</span>
      </button>
    </div>
  </div>
  
  <div id="status-toast" class="status-toast"></div>
  
  <script>
    const labels = ${JSON.stringify(labels)};
    const printerName = '${printerName}';
    
    JsBarcode("#barcode", "${barcodeText}", {format:"CODE128", width:1.5, height:30, displayValue:false, margin:0});
    
    function showToast(msg, type) {
      const t = document.getElementById('status-toast');
      t.textContent = msg;
      t.className = 'status-toast ' + type;
      setTimeout(() => { t.className = 'status-toast'; }, 3000);
    }
    
    async function handlePrint() {
      const btn = document.getElementById('print-btn');
      const txt = document.getElementById('print-btn-text');
      btn.disabled = true;
      txt.textContent = 'Printing...';
      
      try {
        if (window.opener && window.opener.handleLabelPrint) {
          const result = await window.opener.handleLabelPrint(labels, printerName);
          if (result.success) {
            showToast('Labels sent to printer!', 'success');
            setTimeout(() => window.close(), 1500);
          } else {
            showToast(result.error || 'Print failed', 'error');
          }
        } else {
          showToast('Print handler not available', 'error');
        }
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
      }
      
      btn.disabled = false;
      txt.textContent = 'Print ${totalLabels} Labels';
    }
  <\/script>
</body>
</html>`;
}

// Generate ZPL commands for Honeywell IH-210 label printer (50mm x 25mm)
function generateZPLContent(label: LabelData): string {
  const barcodeText = label.barcode || label.name.toLowerCase().replace(/\s+/g, "") + (label.size || "");
  const price = `Rs.${label.price}`;
  
  // ZPL commands for 50mm x 25mm label (at 203 DPI: 406 x 203 dots)
  let zpl = '^XA\n';
  zpl += '^PW406\n';  // Print width 50mm
  zpl += '^LL203\n';  // Label length 25mm
  zpl += '^MD15\n';   // Print darkness
  
  // Download and print logo (if available) - positioned at left
  // Note: Logo needs to be pre-loaded to printer memory for ZPL
  // ^XGE:LOGO.GRF,1,1^FS would print stored graphic
  
  // Barcode - positioned at x=140, y=15
  zpl += '^FO140,15\n';
  zpl += '^BY2\n';  // Barcode module width
  zpl += '^BCN,50,N,N,N\n';  // Code 128, 50 dots height
  zpl += `^FD${barcodeText}^FS\n`;
  
  // Barcode text below barcode
  zpl += '^FO140,70\n';
  zpl += '^A0N,18,18\n';
  zpl += `^FD${barcodeText}^FS\n`;
  
  // Price - larger font
  zpl += '^FO140,95\n';
  zpl += '^A0N,50,50\n';
  zpl += `^FD${price}^FS\n`;
  
  zpl += '^XZ\n';
  return zpl;
}

// Generate ESC/POS content for thermal label printer
function generateLabelContent(label: LabelData): string {
  const barcodeText = label.barcode || label.name.toLowerCase().replace(/\s+/g, "") + (label.size || "");
  const price = `Rs.${label.price}`;
  
  let content = '\x1B\x40';  // Initialize
  content += '\x1D\x7C\x08'; // Print density
  content += '\x1B\x61\x01'; // Center
  
  // Barcode
  content += '\x1D\x68\x40'; // Height 64 dots
  content += '\x1D\x77\x02'; // Width 2
  content += '\x1D\x6B\x49'; // CODE128
  content += String.fromCharCode(barcodeText.length + 2);
  content += '\x7B\x42' + barcodeText;
  
  content += '\x0A';
  content += '\x1B\x21\x00' + barcodeText + '\x0A';
  
  // Price
  content += '\x1B\x21\x30\x1B\x45\x01' + price + '\x0A';
  content += '\x1B\x45\x00\x1B\x21\x00';
  
  content += '\x0A\x0A\x1D\x56\x01';  // Feed and cut
  return content;
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
          const zplContent = generateZPLContent(label);
          const result = await window.electronAPI.printLabel(zplContent, printerName);
          if (!result.success) {
            const escContent = generateLabelContent(label);
            const escResult = await window.electronAPI.printLabel(escContent, printerName);
            if (!escResult.success) {
              return { success: false, error: escResult.error || "Print failed" };
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
      // Use stock quantity as default copies
      const qty = product.stock && product.stock > 0 ? product.stock : 1;
      setSelectedProducts([...selectedProducts, { product, quantity: qty }]);
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
      toast.error("Please select products to preview");
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
    <div className="main-content space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Label Management</h1>
          <p className="text-gray-600 mt-1">Print barcode labels for your products</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExportTemplate} variant="secondary" className="flex items-center gap-2">
            <Download className="w-4 h-4" />Export Template
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleImportTemplate} accept=".json" className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />Import Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Button onClick={loadProducts} variant="secondary" className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
              </Button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No products found</div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer" onClick={() => addToSelection(product)}>
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.barcode || "No barcode"} • ₹{product.price}{product.size && ` • ${product.size}`} • Stock: {product.stock || 0}</div>
                      </div>
                      <Button size="sm" variant="secondary" className="flex items-center gap-1"><Plus className="w-4 h-4" />Add</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Tag className="w-5 h-5" />Selected Labels ({totalLabels})</h3>
            {selectedProducts.length === 0 ? (
              <div className="text-center py-6 text-gray-500">Click products to add them</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {selectedProducts.map(({product, quantity}) => (
                  <div key={product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm truncate flex-1">{product.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, -1); }} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded"><Minus className="w-3 h-3" /></button>
                      <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                      <button onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, 1); }} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded"><Plus className="w-3 h-3" /></button>
                      <button onClick={() => removeFromSelection(product.id)} className="ml-2 text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedProducts.length > 0 && <Button onClick={clearSelection} variant="secondary" size="sm" className="w-full mb-4">Clear All</Button>}
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><SettingsIcon className="w-5 h-5" />Print Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Printer</label>
                <Select value={settings.selectedPrinter} onChange={(e) => setSettings(prev => ({ ...prev, selectedPrinter: e.target.value }))}
                  options={[{ value: "", label: "Select printer..." }, ...printers.map(p => ({ value: p.name, label: p.displayName }))]} />
              </div>
            </div>
          </Card>

          <Button onClick={previewLabels} disabled={selectedProducts.length === 0} className="w-full flex items-center justify-center gap-2">
            <Printer className="w-5 h-5" />Print {totalLabels} Label{totalLabels !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
