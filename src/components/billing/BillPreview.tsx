import { useState, useEffect, useRef } from 'react';
import { ThermalPrinterFormatter, type BillData } from '../../utils/thermalPrinter';
import { PDFExporter } from '../../utils/pdfExport';
import type { PrinterSettings } from '../../types';

interface BillPreviewProps {
  billData: BillData;
  onClose: () => void;
}

export function BillPreview({ billData, onClose }: BillPreviewProps) {
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
    selectedPrinter: '',
    paperWidth: '80mm',
    autoPrint: false,
    printDensity: 'medium',
    cutPaper: true,
    printSpeed: 'medium',
    encoding: 'utf8'
  });
  
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [formattedBill, setFormattedBill] = useState('');
  const previewWindowRef = useRef<Window | null>(null);
  const hasOpenedWindow = useRef(false);

  useEffect(() => {
    loadPrinterSettings();
  }, []);

  useEffect(() => {
    generatePreview();
  }, [billData, paperWidth, printerSettings]);

  useEffect(() => {
    if (formattedBill && !hasOpenedWindow.current) {
      hasOpenedWindow.current = true;
      openInNewWindow();
    }
  }, [formattedBill]);

  const loadPrinterSettings = async () => {
    try {
      const settings = await window.electronAPI.getPrinterSettings();
      setPrinterSettings(settings);
      setPaperWidth(settings.paperWidth || '80mm');
    } catch (error) {
      console.error('Error loading printer settings:', error);
    }
  };

  const generatePreview = () => {
    try {
      const formatter = new ThermalPrinterFormatter({ ...printerSettings, paperWidth });
      setFormattedBill(formatter.formatBill(billData));
    } catch (error) {
      console.error('Error generating preview:', error);
    }
  };

  const openInNewWindow = () => {
    const width = 1100;
    const height = 750;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const previewWindow = window.open(
      '', 
      'ReceiptPreview', 
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
    
    if (previewWindow) {
      previewWindowRef.current = previewWindow;
      const htmlContent = generateNewWindowHTML();
      previewWindow.document.write(htmlContent);
      previewWindow.document.close();
      
      const checkClosed = setInterval(() => {
        if (previewWindow.closed) {
          clearInterval(checkClosed);
          onClose();
        }
      }, 500);
    }
  };

  const handlePrint = async (mode: 'thermal' | 'pdf') => {
    if (mode === 'thermal') {
      try {
        const { printBill } = await import('../../utils/thermalPrinter');
        const result = await printBill(billData, printerSettings.selectedPrinter);
        return result;
      } catch (error) {
        return { success: false, error: 'Error printing receipt' };
      }
    } else {
      try {
        const storeSettings = await window.electronAPI.getSettings();
        const result = await PDFExporter.exportBillToPDF(billData, storeSettings);
        return result;
      } catch (error) {
        return { success: false, error: 'Error exporting PDF' };
      }
    }
  };

  const generateNewWindowHTML = () => {
    const printerName = printerSettings.selectedPrinter || 'Default Printer';
    const itemsHtml = billData.items.map(item => `
      <div class="item-row">
        <span class="item-name">${item.name}</span>
        <span class="item-price">₹${item.totalPrice.toFixed(0)}</span>
      </div>
    `).join('');
    
    const pdfItemsHtml = billData.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">₹${item.unitPrice.toFixed(2)}</td>
        <td style="text-align:right;font-weight:600">₹${item.totalPrice.toFixed(2)}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt Preview - Bill #${billData.billNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;min-height:100vh;display:flex}
    .sidebar{width:340px;background:linear-gradient(180deg,#111827 0%,#1f2937 100%);display:flex;flex-direction:column;min-height:100vh}
    .sidebar-header{padding:28px 24px;border-bottom:1px solid rgba(255,255,255,0.1)}
    .sidebar-header-content{display:flex;align-items:center;gap:16px}
    .sidebar-icon{width:52px;height:52px;background:linear-gradient(135deg,#059669 0%,#10b981 100%);border-radius:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 16px rgba(16,185,129,0.3)}
    .sidebar-icon svg{color:#fff;width:24px;height:24px}
    .sidebar-title{font-size:18px;font-weight:600;color:#fff;margin-bottom:4px}
    .sidebar-subtitle{font-size:13px;color:#9ca3af}
    .sidebar-section{padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.06)}
    .section-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:14px}
    .format-buttons{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
    .format-btn{padding:16px 12px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:8px;border:2px solid transparent}
    .format-btn-active{background:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#fff;box-shadow:0 8px 20px rgba(16,185,129,0.35)}
    .format-btn-inactive{background:rgba(255,255,255,0.05);color:#9ca3af;border-color:rgba(255,255,255,0.1)}
    .format-btn-inactive:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2)}
    .paper-buttons{display:flex;gap:10px}
    .paper-btn{flex:1;padding:14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;border:2px solid transparent}
    .paper-btn-active{background:rgba(16,185,129,0.15);color:#10b981;border-color:rgba(16,185,129,0.4)}
    .paper-btn-inactive{background:rgba(255,255,255,0.05);color:#9ca3af;border-color:rgba(255,255,255,0.1)}
    .printer-card{background:rgba(255,255,255,0.03);border-radius:12px;padding:16px;border:1px solid rgba(255,255,255,0.08)}
    .printer-card-content{display:flex;align-items:center;gap:14px}
    .printer-icon-box{width:44px;height:44px;background:rgba(16,185,129,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center}
    .printer-icon-box svg{color:#10b981;width:20px;height:20px}
    .printer-info{flex:1;min-width:0}
    .printer-name{font-size:14px;font-weight:500;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .printer-type{font-size:12px;color:#6b7280;margin-top:2px}
    .printer-status{width:10px;height:10px;background:#10b981;border-radius:50%;box-shadow:0 0 8px rgba(16,185,129,0.6)}
    .bill-details-section{padding:20px 24px;flex:1;overflow-y:auto}
    .bill-details-list{display:flex;flex-direction:column;gap:14px}
    .bill-detail-item{display:flex;align-items:center;gap:12px}
    .bill-detail-item svg{color:#4b5563;width:16px;height:16px}
    .bill-detail-item span{font-size:13px;color:#d1d5db}
    .items-list{margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06)}
    .items-scroll{max-height:140px;overflow-y:auto;display:flex;flex-direction:column;gap:8px}
    .item-row{display:flex;justify-content:space-between;font-size:13px;padding:6px 0}
    .item-name{color:#9ca3af;flex:1;padding-right:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .item-price{color:#e5e7eb;font-family:'JetBrains Mono',monospace;font-weight:500}
    .sidebar-footer{padding:24px;border-top:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.2)}
    .total-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
    .total-label{color:#9ca3af;font-size:14px}
    .total-value{font-size:28px;font-weight:700;color:#10b981;font-family:'JetBrains Mono',monospace}
    .print-btn{width:100%;padding:16px;background:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.2s;box-shadow:0 8px 20px rgba(16,185,129,0.35)}
    .print-btn:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(16,185,129,0.45)}
    .print-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
    .cancel-btn{width:100%;padding:14px;margin-top:12px;background:transparent;color:#9ca3af;border:none;font-size:14px;font-weight:500;cursor:pointer;border-radius:8px}
    .cancel-btn:hover{color:#fff;background:rgba(255,255,255,0.05)}
    .main-content{flex:1;display:flex;flex-direction:column}
    .topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:20px 32px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
    .topbar-title{font-size:20px;font-weight:600;color:#111827}
    .topbar-subtitle{font-size:13px;color:#6b7280;margin-top:4px}
    .close-btn{width:42px;height:42px;background:#f3f4f6;border:none;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer}
    .close-btn:hover{background:#e5e7eb}
    .close-btn svg{color:#6b7280;width:20px;height:20px}
    .preview-area{flex:1;overflow:auto;padding:40px;display:flex;justify-content:center;align-items:flex-start}
    .receipt-card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.15);border:1px solid #e5e7eb}
    .receipt-header{background:#f9fafb;padding:14px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between}
    .receipt-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280}
    .receipt-size{font-size:11px;color:#9ca3af}
    .receipt-body{padding:32px;background:#fff}
    .receipt-text{font-family:'Courier New',Courier,monospace;white-space:pre;color:#1f2937;line-height:1.6}
    .pdf-preview{width:100%;max-width:700px}
    .pdf-card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.15);border:1px solid #e5e7eb}
    .pdf-body{padding:48px}
    .pdf-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:28px;border-bottom:2px solid #e5e7eb}
    .pdf-logo-section{display:flex;align-items:center;gap:16px}
    .pdf-logo{width:64px;height:64px;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);border-radius:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 16px rgba(245,158,11,0.3)}
    .pdf-logo span{color:#fff;font-weight:700;font-size:20px}
    .pdf-store-name{font-size:22px;font-weight:700;color:#111827}
    .pdf-store-subtitle{font-size:13px;color:#6b7280;margin-top:4px}
    .pdf-bill-info{text-align:right}
    .pdf-bill-number{font-size:18px;font-weight:700;color:#111827}
    .pdf-bill-date{font-size:13px;color:#6b7280;margin-top:4px}
    .pdf-table{width:100%;margin-top:28px;border-collapse:collapse}
    .pdf-table th{text-align:left;padding:14px 0;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb;text-transform:uppercase;letter-spacing:0.5px}
    .pdf-table td{padding:16px 0;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6}
    .pdf-table td:first-child{font-weight:500;color:#111827}
    .pdf-totals{display:flex;justify-content:flex-end;margin-top:28px}
    .pdf-totals-box{width:280px}
    .pdf-total-row{display:flex;justify-content:space-between;padding:10px 0;font-size:14px}
    .pdf-total-row span:first-child{color:#6b7280}
    .pdf-total-row span:last-child{color:#111827}
    .pdf-total-row.discount span{color:#dc2626}
    .pdf-total-row.final{margin-top:12px;padding-top:16px;border-top:2px solid #111827;font-size:18px;font-weight:700}
    .pdf-footer{margin-top:40px;padding-top:24px;border-top:1px solid #e5e7eb;text-align:center}
    .pdf-footer-thanks{font-size:15px;font-weight:600;color:#374151}
    .pdf-footer-payment{font-size:12px;color:#6b7280;margin-top:6px}
    .spinner{width:20px;height:20px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .status-toast{position:fixed;bottom:24px;right:24px;padding:16px 24px;border-radius:12px;font-size:14px;font-weight:500;display:none;align-items:center;gap:10px;z-index:1000}
    .status-toast.success{background:#059669;color:#fff;display:flex}
    .status-toast.error{background:#dc2626;color:#fff;display:flex}
    #thermal-preview{display:block}
    #pdf-preview{display:none}
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-header-content">
        <div class="sidebar-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>
        </div>
        <div>
          <div class="sidebar-title">Print Receipt</div>
          <div class="sidebar-subtitle">Bill #${billData.billNumber}</div>
        </div>
      </div>
    </div>
    <div class="sidebar-section">
      <div class="section-label">Output Format</div>
      <div class="format-buttons">
        <button id="btn-thermal" class="format-btn format-btn-active" onclick="setMode('thermal')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <span>Thermal</span>
        </button>
        <button id="btn-pdf" class="format-btn format-btn-inactive" onclick="setMode('pdf')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
          <span>PDF</span>
        </button>
      </div>
    </div>
    <div class="sidebar-section" id="paper-section">
      <div class="section-label">Paper Size</div>
      <div class="paper-buttons">
        <button id="btn-58mm" class="paper-btn paper-btn-inactive" onclick="setPaper('58mm')">58mm</button>
        <button id="btn-80mm" class="paper-btn paper-btn-active" onclick="setPaper('80mm')">80mm</button>
      </div>
    </div>
    <div class="sidebar-section">
      <div class="section-label">Output</div>
      <div class="printer-card">
        <div class="printer-card-content">
          <div class="printer-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect width="12" height="8" x="6" y="14" rx="1"/></svg>
          </div>
          <div class="printer-info">
            <div class="printer-name" id="output-name">${printerName}</div>
            <div class="printer-type" id="printer-type">80mm Thermal</div>
          </div>
          <div class="printer-status"></div>
        </div>
      </div>
    </div>
    <div class="bill-details-section">
      <div class="section-label">Bill Details</div>
      <div class="bill-details-list">
        <div class="bill-detail-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M2 7h20"/></svg>
          <span>${billData.storeName}</span>
        </div>
        <div class="bill-detail-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
          <span>${billData.date}</span>
        </div>
        <div class="bill-detail-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          <span style="text-transform:capitalize">${billData.paymentMode}</span>
        </div>
        <div class="bill-detail-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>
          <span>${billData.items.length} item(s)</span>
        </div>
      </div>
      <div class="items-list">
        <div class="section-label">Items</div>
        <div class="items-scroll">${itemsHtml}</div>
      </div>
    </div>
    <div class="sidebar-footer">
      <div class="total-row">
        <span class="total-label">Total Amount</span>
        <span class="total-value">₹${billData.total.toFixed(2)}</span>
      </div>
      <button id="print-btn" class="print-btn" onclick="handlePrint()">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14" rx="1"/></svg>
        <span id="print-btn-text">Print Receipt</span>
      </button>
      <button class="cancel-btn" onclick="window.close()">Cancel & Close</button>
    </div>
  </div>
  <div class="main-content">
    <div class="topbar">
      <div>
        <div class="topbar-title" id="preview-title">Thermal Receipt Preview</div>
        <div class="topbar-subtitle" id="preview-subtitle">80mm paper • 48 characters per line</div>
      </div>
      <button class="close-btn" onclick="window.close()">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
    <div class="preview-area">
      <!-- Thermal Preview -->
      <div id="thermal-preview" class="receipt-card" style="width:460px">
        <div class="receipt-header">
          <span class="receipt-label">Receipt Preview</span>
          <span class="receipt-size" id="receipt-size">80mm</span>
        </div>
        <div class="receipt-body">
          <pre class="receipt-text" id="receipt-text" style="font-size:12px">${formattedBill}</pre>
        </div>
      </div>
      <!-- PDF Preview -->
      <div id="pdf-preview" class="pdf-preview">
        <div class="pdf-card">
          <div class="receipt-header">
            <span class="receipt-label">Invoice Preview</span>
            <span class="receipt-size">A4 Format</span>
          </div>
          <div class="pdf-body">
            <div class="pdf-header">
              <div class="pdf-logo-section">
                <div class="pdf-logo"><span>VP</span></div>
                <div>
                  <div class="pdf-store-name">${billData.storeName.toUpperCase()}</div>
                  <div class="pdf-store-subtitle">Tax Invoice</div>
                </div>
              </div>
              <div class="pdf-bill-info">
                <div class="pdf-bill-number">#${billData.billNumber}</div>
                <div class="pdf-bill-date">${billData.date}</div>
                ${billData.phone ? `<div class="pdf-bill-date">Ph: ${billData.phone}</div>` : ''}
                ${billData.gstNumber ? `<div class="pdf-bill-date">GST: ${billData.gstNumber}</div>` : ''}
              </div>
            </div>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th style="width:80px;text-align:center">Qty</th>
                  <th style="width:100px;text-align:right">Rate</th>
                  <th style="width:100px;text-align:right">Amount</th>
                </tr>
              </thead>
              <tbody>${pdfItemsHtml}</tbody>
            </table>
            <div class="pdf-totals">
              <div class="pdf-totals-box">
                <div class="pdf-total-row">
                  <span>Subtotal</span>
                  <span>₹${billData.subtotal.toFixed(2)}</span>
                </div>
                ${billData.discountAmount > 0 ? `
                <div class="pdf-total-row discount">
                  <span>Discount</span>
                  <span>-₹${billData.discountAmount.toFixed(2)}</span>
                </div>` : ''}
                <div class="pdf-total-row final">
                  <span>Total</span>
                  <span>₹${billData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div class="pdf-footer">
              <div class="pdf-footer-thanks">Thank you for your business!</div>
              <div class="pdf-footer-payment">Payment: ${billData.paymentMode.toUpperCase()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div id="status-toast" class="status-toast"></div>
  <script>
    let currentMode='thermal',currentPaper='80mm';
    const billData=${JSON.stringify(billData)};
    function setMode(mode){
      currentMode=mode;
      document.getElementById('btn-thermal').className='format-btn '+(mode==='thermal'?'format-btn-active':'format-btn-inactive');
      document.getElementById('btn-pdf').className='format-btn '+(mode==='pdf'?'format-btn-active':'format-btn-inactive');
      document.getElementById('paper-section').style.display=mode==='thermal'?'block':'none';
      document.getElementById('printer-type').textContent=mode==='thermal'?currentPaper+' Thermal':'A4 PDF Export';
      document.getElementById('output-name').textContent=mode==='thermal'?'${printerName}':'PDF Document';
      document.getElementById('preview-title').textContent=mode==='thermal'?'Thermal Receipt Preview':'PDF Invoice Preview';
      document.getElementById('preview-subtitle').textContent=mode==='thermal'?currentPaper+' paper • '+(currentPaper==='58mm'?'32':'48')+' characters per line':'A4 format • Professional invoice layout';
      document.getElementById('print-btn-text').textContent=mode==='thermal'?'Print Receipt':'Export PDF';
      document.getElementById('thermal-preview').style.display=mode==='thermal'?'block':'none';
      document.getElementById('pdf-preview').style.display=mode==='pdf'?'block':'none';
    }
    function setPaper(size){
      currentPaper=size;
      document.getElementById('btn-58mm').className='paper-btn '+(size==='58mm'?'paper-btn-active':'paper-btn-inactive');
      document.getElementById('btn-80mm').className='paper-btn '+(size==='80mm'?'paper-btn-active':'paper-btn-inactive');
      document.getElementById('printer-type').textContent=size+' Thermal';
      document.getElementById('preview-subtitle').textContent=size+' paper • '+(size==='58mm'?'32':'48')+' characters per line';
      document.getElementById('receipt-size').textContent=size;
      document.getElementById('thermal-preview').style.width=size==='58mm'?'340px':'460px';
      document.getElementById('receipt-text').style.fontSize=size==='58mm'?'11px':'12px';
    }
    function showToast(msg,type){
      const t=document.getElementById('status-toast');
      t.textContent=msg;t.className='status-toast '+type;
      setTimeout(()=>{t.className='status-toast'},3000);
    }
    async function handlePrint(){
      const btn=document.getElementById('print-btn'),txt=document.getElementById('print-btn-text');
      btn.disabled=true;txt.textContent='Processing...';
      try{
        if(window.opener&&window.opener.handleBillPreviewPrint){
          const r=await window.opener.handleBillPreviewPrint(currentMode,billData);
          if(r.success){showToast(currentMode==='thermal'?'Receipt printed!':'PDF exported!','success');setTimeout(()=>window.close(),1500);}
          else{showToast(r.error||'Operation failed','error');}
        }else{showToast('Print handler not available','error');}
      }catch(e){showToast('Error: '+e.message,'error');}
      btn.disabled=false;txt.textContent=currentMode==='thermal'?'Print Receipt':'Export PDF';
    }
  </script>
</body>
</html>`;
  };

  useEffect(() => {
    (window as any).handleBillPreviewPrint = handlePrint;
    return () => {
      delete (window as any).handleBillPreviewPrint;
    };
  }, [printerSettings]);

  return null;
}
