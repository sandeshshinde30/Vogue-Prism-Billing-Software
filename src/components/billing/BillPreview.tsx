import { useState, useEffect } from 'react';
import { X, Printer, FileText, Zap, Store, Calendar, CreditCard, Package, Receipt } from 'lucide-react';
import { ThermalPrinterFormatter, type BillData } from '../../utils/thermalPrinter';
import { PDFExporter } from '../../utils/pdfExport';
import type { PrinterSettings } from '../../types';
import toast from 'react-hot-toast';

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
  const [printing, setPrinting] = useState(false);
  const [printMode, setPrintMode] = useState<'thermal' | 'pdf'>('thermal');

  useEffect(() => {
    loadPrinterSettings();
  }, []);

  useEffect(() => {
    generatePreview();
  }, [billData, paperWidth]);

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

  const handleThermalPrint = async () => {
    setPrinting(true);
    try {
      const { printBill } = await import('../../utils/thermalPrinter');
      const result = await printBill(billData, printerSettings.selectedPrinter);
      
      if (result.success) {
        toast.success('Receipt printed successfully!');
        onClose();
      } else {
        toast.error(result.error || 'Print failed');
      }
    } catch (error) {
      toast.error('Error printing receipt');
    }
    setPrinting(false);
  };

  const handlePDFExport = async () => {
    setPrinting(true);
    try {
      const storeSettings = await window.electronAPI.getSettings();
      const result = await PDFExporter.exportBillToPDF(billData, storeSettings);
      
      if (result.success) {
        toast.success(`PDF saved: ${result.filename}`);
        onClose();
      } else {
        toast.error(result.error || 'PDF export failed');
      }
    } catch (error) {
      toast.error('Error exporting PDF');
    }
    setPrinting(false);
  };

  const handlePrint = () => {
    if (printMode === 'thermal') {
      handleThermalPrint();
    } else {
      handlePDFExport();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-gray-100">
      {/* Left Sidebar */}
      <div className="w-80 bg-gray-900 flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Receipt className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Print Receipt</h2>
              <p className="text-sm text-gray-500">Bill #{billData.billNumber}</p>
            </div>
          </div>
        </div>

        {/* Print Mode Selection */}
        <div className="p-5 border-b border-gray-800">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 block">
            Output Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPrintMode('thermal')}
              className={`p-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-2 ${
                printMode === 'thermal'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-750 border border-gray-700'
              }`}
            >
              <Zap className="w-5 h-5" />
              <span>Thermal</span>
            </button>
            <button
              onClick={() => setPrintMode('pdf')}
              className={`p-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-2 ${
                printMode === 'pdf'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-750 border border-gray-700'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Paper Width (Thermal only) */}
        {printMode === 'thermal' && (
          <div className="p-5 border-b border-gray-800">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 block">
              Paper Size
            </label>
            <div className="flex gap-2">
              {['58mm', '80mm'].map((size) => (
                <button
                  key={size}
                  onClick={() => setPaperWidth(size as '58mm' | '80mm')}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                    paperWidth === size
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Printer Status */}
        <div className="p-5 border-b border-gray-800">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 block">
            Printer
          </label>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Printer className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {printerSettings.selectedPrinter || 'Default Printer'}
                </p>
                <p className="text-xs text-gray-500">
                  {printMode === 'thermal' ? `${paperWidth} Thermal` : 'A4 PDF Export'}
                </p>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Bill Details */}
        <div className="flex-1 p-5 overflow-y-auto">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 block">
            Bill Details
          </label>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Store className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-300">{billData.storeName}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-300">{billData.date}</span>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-300 capitalize">{billData.paymentMode}</span>
            </div>
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-300">{billData.items.length} item(s)</span>
            </div>
          </div>

          {/* Items Summary */}
          <div className="mt-6 pt-4 border-t border-gray-800">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 block">
              Items
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {billData.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-gray-400 truncate flex-1 pr-3">{item.name}</span>
                  <span className="text-gray-300 font-mono">₹{item.totalPrice.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with Total & Actions */}
        <div className="p-5 border-t border-gray-800 bg-gray-800/30">
          {/* Total */}
          <div className="flex justify-between items-center mb-5">
            <span className="text-gray-400">Total Amount</span>
            <span className="text-2xl font-bold text-green-400 font-mono">
              ₹{billData.total.toFixed(2)}
            </span>
          </div>
          
          {/* Print Button */}
          <button
            onClick={handlePrint}
            disabled={printing}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-green-500/30"
          >
            {printing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                <span>{printMode === 'thermal' ? 'Print Receipt' : 'Export PDF'}</span>
              </>
            )}
          </button>
          
          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full py-3 mt-3 text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            Cancel & Close
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b px-8 py-5 flex items-center justify-between shadow-sm">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {printMode === 'thermal' ? 'Thermal Receipt Preview' : 'PDF Invoice Preview'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {printMode === 'thermal' 
                ? `${paperWidth} paper • ${paperWidth === '58mm' ? '32' : '48'} characters per line`
                : 'A4 format • Professional invoice layout'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-8 bg-gray-100">
          <div className="flex justify-center">
            {printMode === 'thermal' ? (
              /* Thermal Receipt Preview */
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Receipt Preview
                  </span>
                  <span className="text-xs text-gray-400">{paperWidth}</span>
                </div>
                <div 
                  className="p-6 bg-white"
                  style={{ 
                    width: paperWidth === '58mm' ? '320px' : '440px',
                    minHeight: '400px'
                  }}
                >
                  <pre
                    className="text-xs leading-relaxed whitespace-pre text-gray-900"
                    style={{ 
                      fontFamily: '"Courier New", Courier, monospace',
                      fontSize: paperWidth === '58mm' ? '11px' : '12px',
                      lineHeight: '1.5'
                    }}
                  >
                    {formattedBill}
                  </pre>
                </div>
              </div>
            ) : (
              /* PDF Invoice Preview */
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 w-full max-w-3xl">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Invoice Preview
                  </span>
                  <span className="text-xs text-gray-400">A4 Format</span>
                </div>
                
                <div className="p-10">
                  {/* PDF Header */}
                  <div className="flex justify-between items-start pb-8 border-b-2 border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-xl">VP</span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{billData.storeName.toUpperCase()}</h2>
                        <p className="text-sm text-gray-500 mt-1">Tax Invoice</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">#{billData.billNumber}</p>
                      <p className="text-sm text-gray-500 mt-1">{billData.date}</p>
                      {billData.phone && <p className="text-sm text-gray-500">Ph: {billData.phone}</p>}
                      {billData.gstNumber && <p className="text-sm text-gray-500">GST: {billData.gstNumber}</p>}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="mt-8">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 text-sm font-semibold text-gray-600">Item Description</th>
                          <th className="text-center py-3 text-sm font-semibold text-gray-600 w-20">Qty</th>
                          <th className="text-right py-3 text-sm font-semibold text-gray-600 w-28">Rate</th>
                          <th className="text-right py-3 text-sm font-semibold text-gray-600 w-28">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billData.items.map((item, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-4 text-gray-900 font-medium">{item.name}</td>
                            <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                            <td className="py-4 text-right text-gray-600">₹{item.unitPrice.toFixed(2)}</td>
                            <td className="py-4 text-right text-gray-900 font-semibold">₹{item.totalPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end mt-8">
                    <div className="w-72">
                      <div className="flex justify-between py-2 text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="text-gray-900">₹{billData.subtotal.toFixed(2)}</span>
                      </div>
                      {billData.discountAmount > 0 && (
                        <div className="flex justify-between py-2 text-sm">
                          <span className="text-red-600">Discount</span>
                          <span className="text-red-600">-₹{billData.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-3 mt-2 border-t-2 border-gray-900">
                        <span className="text-lg font-bold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-gray-900">₹{billData.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-12 pt-6 border-t border-gray-200 text-center">
                    <p className="text-sm font-medium text-gray-700">Thank you for your business!</p>
                    <p className="text-xs text-gray-500 mt-1">Payment: {billData.paymentMode.toUpperCase()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
