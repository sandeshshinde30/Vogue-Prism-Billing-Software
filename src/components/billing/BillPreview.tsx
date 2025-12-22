import { useState, useEffect } from 'react';
import { X, Printer, Settings, Eye, FileText, Zap } from 'lucide-react';
import { Button, Input, Select } from '../common';
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
  
  const [previewSettings, setPreviewSettings] = useState({
    paperWidth: '80mm' as '58mm' | '80mm',
    fontSize: 'normal' as 'small' | 'normal' | 'large',
    lineSpacing: 'normal' as 'compact' | 'normal' | 'loose',
    itemNameLength: 20,
    showBorder: true,
    headerStyle: 'normal' as 'normal' | 'bold' | 'large'
  });
  
  const [formattedBill, setFormattedBill] = useState('');
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printMode, setPrintMode] = useState<'thermal' | 'pdf'>('thermal');

  useEffect(() => {
    loadPrinterSettings();
  }, []);

  useEffect(() => {
    generatePreview();
  }, [billData, previewSettings]);

  const loadPrinterSettings = async () => {
    try {
      const settings = await window.electronAPI.getPrinterSettings();
      setPrinterSettings(settings);
      setPreviewSettings(prev => ({
        ...prev,
        paperWidth: settings.paperWidth || '80mm'
      }));
    } catch (error) {
      console.error('Error loading printer settings:', error);
    }
  };

  const generatePreview = () => {
    try {
      const customSettings = {
        ...printerSettings,
        paperWidth: previewSettings.paperWidth
      };
      
      const formatter = new ThermalPrinterFormatter(customSettings);
      const formatted = formatter.formatBill(billData);
      setFormattedBill(formatted);
    } catch (error) {
      console.error('Error generating preview:', error);
      setFormattedBill('Error generating preview');
    }
  };

  const handleThermalPrint = async () => {
    setPrinting(true);
    try {
      // Update printer settings with preview adjustments
      await window.electronAPI.setPrinterSettings({
        ...printerSettings,
        paperWidth: previewSettings.paperWidth
      });
      
      // Import and use thermal printer utility
      const { printBill } = await import('../../utils/thermalPrinter');
      const result = await printBill(billData, printerSettings.selectedPrinter);
      
      if (result.success) {
        toast.success('Bill sent to thermal printer successfully');
        onClose();
      } else {
        toast.error(result.error || 'Thermal print failed');
      }
    } catch (error) {
      toast.error('Error printing to thermal printer');
      console.error('Thermal print error:', error);
    }
    setPrinting(false);
  };

  const handlePDFExport = async () => {
    setExporting(true);
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
      console.error('PDF export error:', error);
    }
    setExporting(false);
  };

  const handlePrint = async () => {
    if (printMode === 'thermal') {
      await handleThermalPrint();
    } else {
      // For PDF mode, just export the PDF
      await handlePDFExport();
    }
  };

  const getPreviewWidth = () => {
    return previewSettings.paperWidth === '58mm' ? '320px' : '480px';
  };

  const getFontSize = () => {
    switch (previewSettings.fontSize) {
      case 'small': return '10px';
      case 'large': return '14px';
      default: return '12px';
    }
  };

  const getLineHeight = () => {
    switch (previewSettings.lineSpacing) {
      case 'compact': return '1.2';
      case 'loose': return '1.8';
      default: return '1.4';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Bill Preview & Print</h2>
              <p className="text-sm text-gray-600">Bill #{billData.billNumber} • {billData.date}</p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" className="hover:bg-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex h-[calc(95vh-120px)]">
          {/* Enhanced Settings Panel */}
          <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Print Settings
              </h3>
              
              {/* Print Mode Selection */}
              <div className="mb-6 p-4 bg-white rounded-lg border">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Print Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPrintMode('thermal')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      printMode === 'thermal'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Zap className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-xs font-medium">Thermal</div>
                  </button>
                  <button
                    onClick={() => setPrintMode('pdf')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      printMode === 'pdf'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FileText className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-xs font-medium">PDF</div>
                  </button>
                </div>
              </div>

              {/* Thermal Settings (only show when thermal mode is selected) */}
              {printMode === 'thermal' && (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-3">Thermal Settings</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Paper Width
                        </label>
                        <Select
                          value={previewSettings.paperWidth}
                          onChange={(e) => setPreviewSettings(prev => ({ 
                            ...prev, 
                            paperWidth: e.target.value as '58mm' | '80mm' 
                          }))}
                          options={[
                            { value: '58mm', label: '58mm (Small Thermal)' },
                            { value: '80mm', label: '80mm (Standard Thermal)' }
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Size
                        </label>
                        <Select
                          value={previewSettings.fontSize}
                          onChange={(e) => setPreviewSettings(prev => ({ 
                            ...prev, 
                            fontSize: e.target.value as 'small' | 'normal' | 'large' 
                          }))}
                          options={[
                            { value: 'small', label: 'Small (10px)' },
                            { value: 'normal', label: 'Normal (12px)' },
                            { value: 'large', label: 'Large (14px)' }
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Line Spacing
                        </label>
                        <Select
                          value={previewSettings.lineSpacing}
                          onChange={(e) => setPreviewSettings(prev => ({ 
                            ...prev, 
                            lineSpacing: e.target.value as 'compact' | 'normal' | 'loose' 
                          }))}
                          options={[
                            { value: 'compact', label: 'Compact' },
                            { value: 'normal', label: 'Normal' },
                            { value: 'loose', label: 'Loose' }
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Item Name Length
                        </label>
                        <Input
                          type="number"
                          min="10"
                          max="30"
                          value={previewSettings.itemNameLength}
                          onChange={(e) => setPreviewSettings(prev => ({ 
                            ...prev, 
                            itemNameLength: parseInt(e.target.value) || 20 
                          }))}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Characters before truncation
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="mt-6 p-4 bg-white rounded-lg border">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  {printMode === 'pdf' && (
                    <Button
                      onClick={handlePDFExport}
                      disabled={exporting}
                      variant="secondary"
                      size="sm"
                      className="w-full flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      {exporting ? 'Exporting...' : 'Export PDF'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Preview Panel */}
          <div className="flex-1 overflow-y-auto bg-gray-100">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {printMode === 'thermal' ? 'Thermal Receipt Preview' : 'PDF Invoice Preview'}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {printMode === 'thermal' && (
                    <>
                      <span>Width: {previewSettings.paperWidth}</span>
                      <span>Font: {previewSettings.fontSize}</span>
                    </>
                  )}
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    printMode === 'thermal' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {printMode.toUpperCase()} MODE
                  </div>
                </div>
              </div>
              
              {/* Preview Content */}
              <div className="flex justify-center">
                {printMode === 'thermal' ? (
                  <div 
                    className="bg-white shadow-xl rounded-lg overflow-hidden border"
                    style={{ width: getPreviewWidth() }}
                  >
                    <div className="p-4">
                      <pre
                        className="whitespace-pre-wrap font-mono text-black"
                        style={{
                          fontSize: getFontSize(),
                          lineHeight: getLineHeight(),
                          fontFamily: 'Courier New, monospace'
                        }}
                      >
                        {formattedBill}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white shadow-xl rounded-lg overflow-hidden border max-w-4xl">
                    <div className="p-6">
                      {/* PDF Invoice Preview */}
                      <div className="border rounded-lg overflow-hidden bg-white">
                        <div className="p-8 transform scale-75 origin-top">
                          {/* Header */}
                          <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center">
                              <div className="w-16 h-16 bg-yellow-500 rounded-lg flex items-center justify-center mr-4">
                                <span className="text-white font-bold text-lg">VP</span>
                              </div>
                              <div>
                                <h1 className="text-2xl font-bold">VOGUE PRISM</h1>
                                <p className="text-sm text-gray-600">Professional Invoice</p>
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <p className="font-semibold">Vogue Vision Ventures PVT LMT.</p>
                              <p className="text-gray-600">info@voguevisionventures.com</p>
                              <p className="text-gray-600">+91 8412065353</p>
                              <p className="text-gray-600">GST IN: 564651515151</p>
                            </div>
                          </div>

                          <hr className="my-4 border-gray-300" />

                          {/* Bill Info */}
                          <div className="mb-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p><span className="font-medium">Bill No:</span> {billData.billNumber}</p>
                                <p><span className="font-medium">Date:</span> {billData.date}</p>
                                <p><span className="font-medium">Payment:</span> {billData.paymentMode.toUpperCase()}</p>
                              </div>
                            </div>
                          </div>

                          {/* Items Table */}
                          <div className="mb-6">
                            <table className="w-full text-sm border border-gray-300">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="p-2 text-left border-b">Item</th>
                                  <th className="p-2 text-center border-b">Qty</th>
                                  <th className="p-2 text-right border-b">Price</th>
                                  <th className="p-2 text-right border-b">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {billData.items.slice(0, 3).map((item, index) => (
                                  <tr key={index} className="border-b">
                                    <td className="p-2">
                                      <p className="font-medium">{item.name}</p>
                                    </td>
                                    <td className="p-2 text-center">{item.quantity}</td>
                                    <td className="p-2 text-right">₹{item.unitPrice.toFixed(2)}</td>
                                    <td className="p-2 text-right">₹{item.totalPrice.toFixed(2)}</td>
                                  </tr>
                                ))}
                                {billData.items.length > 3 && (
                                  <tr className="border-b">
                                    <td className="p-2 text-center text-gray-500" colSpan={4}>
                                      ... and {billData.items.length - 3} more items
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Totals */}
                          <div className="flex justify-end">
                            <div className="w-64 text-sm">
                              <div className="flex justify-between py-1">
                                <span>Subtotal:</span>
                                <span>₹{billData.subtotal.toFixed(2)}</span>
                              </div>
                              {billData.discountPercent > 0 && (
                                <div className="flex justify-between py-1 text-red-600">
                                  <span>Discount ({billData.discountPercent}%):</span>
                                  <span>-₹{billData.discountAmount.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between py-2 font-bold border-t">
                                <span>Total:</span>
                                <span>₹{billData.total.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
                            <p>Thank You for Your Business!</p>
                            <p>Visit Again...</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center mt-4 p-4 bg-blue-50 rounded-lg">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-sm font-medium text-blue-800">A4 PDF Invoice Preview</p>
                        <p className="text-xs text-blue-600">Full invoice will be generated for printing</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {printMode === 'thermal' ? 'Thermal printer ready' : 'PDF format ready'} • 
            Bill Total: ₹{billData.total.toFixed(2)}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="secondary"
              className="flex items-center gap-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePrint}
              disabled={printing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="w-4 h-4" />
              {printing ? 'Processing...' : printMode === 'thermal' ? 'Print Receipt' : 'Save PDF'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}