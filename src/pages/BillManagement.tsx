import { useEffect, useState, useRef } from 'react';
import {
  Receipt,
  Edit,
  Trash2,
  Search,
  Calendar,
  Filter,
  Eye,
  AlertTriangle,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { Card, Button, Input, Modal } from '../components/common';
import { PasswordModal } from '../components/common/PasswordModal';
import { BillEditModal } from '../components/billing/BillEditModal';
import { BillPreview } from '../components/billing/BillPreview';
import { formatDateTime, formatCurrency } from '../utils/export';
import toast from 'react-hot-toast';

interface Bill {
  id: number;
  billNumber: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paymentMode: 'cash' | 'upi' | 'mixed';
  cashAmount?: number;
  upiAmount?: number;
  customerMobileNumber?: string;
  status: string;
  createdAt: string;
}

interface BillItem {
  id: number;
  productId: number;
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export function BillManagement() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedBill, setSelectedBill] = useState<{ bill: Bill; items: BillItem[] } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [printingBill, setPrintingBill] = useState<number | null>(null);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [previewBillData, setPreviewBillData] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'edit' | 'delete'; bill: Bill } | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadBills();
  }, [dateFrom, dateTo, debouncedSearchQuery]);

  const loadBills = async () => {
    setLoading(true);
    try {
      const searchParam = debouncedSearchQuery && debouncedSearchQuery.trim() ? debouncedSearchQuery.trim() : undefined;
      console.log('Loading bills with search:', searchParam);
      const data = await window.electronAPI.getBills(
        dateFrom || undefined, 
        dateTo || undefined, 
        searchParam
      );
      setBills(data as Bill[]);
    } catch (error) {
      console.error('Error loading bills:', error);
      toast.error('Error loading bills');
    }
    setLoading(false);
  };

  const handlePasswordSuccess = () => {
    if (pendingAction) {
      if (pendingAction.type === 'edit') {
        handleEditBill(pendingAction.bill);
      } else if (pendingAction.type === 'delete') {
        handleDeleteBill(pendingAction.bill);
      }
    }
    setPendingAction(null);
  };

  const requestPasswordForAction = (type: 'edit' | 'delete', bill: Bill) => {
    setPendingAction({ type, bill });
    setShowPasswordModal(true);
  };

  const handleEditBill = async (bill: Bill) => {
    try {
      const data = await window.electronAPI.getBillById(bill.id);
      setSelectedBill(data);
      setShowEditModal(true);
    } catch (error) {
      toast.error('Error loading bill details for editing');
    }
  };

  const handleDeleteBill = async (bill: Bill) => {
    try {
      const result = await window.electronAPI.deleteBill(bill.id);
      if (result.success) {
        toast.success(`Bill ${bill.billNumber} deleted successfully. Stock has been restored.`);
        loadBills(); // Refresh the list
      } else {
        toast.error('Failed to delete bill');
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast.error(`Error deleting bill: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleViewBill = async (billId: number) => {
    try {
      const data = await window.electronAPI.getBillById(billId);
      setSelectedBill(data);
      setShowBillModal(true);
    } catch (error) {
      toast.error('Error loading bill details');
    }
  };

  const handlePrintBill = async (bill: Bill) => {
    setPrintingBill(bill.id);
    try {
      // Get bill details with items
      const billData = await window.electronAPI.getBillById(bill.id);
      const settings = await window.electronAPI.getSettings();
      
      // Convert bill data to thermal printer format
      const thermalBillData = {
        billNumber: bill.billNumber,
        date: new Date(bill.createdAt).toLocaleString(),
        storeName: settings?.storeName || 'Vogue Prism',
        storeAddress: `${settings?.addressLine1 || ''}\n${settings?.addressLine2 || ''}`.trim(),
        phone: settings?.phone || '',
        gstNumber: settings?.gstNumber || '',
        items: billData.items.map((item: BillItem) => ({
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        subtotal: bill.subtotal,
        discountPercent: bill.discountPercent,
        discountAmount: bill.discountAmount,
        total: bill.total,
        paymentMode: bill.paymentMode,
        cashAmount: bill.cashAmount,
        upiAmount: bill.upiAmount,
        changeAmount: bill.paymentMode === 'cash' && bill.cashAmount && bill.cashAmount > bill.total 
          ? bill.cashAmount - bill.total : undefined
      };
      
      // Show preview instead of direct print
      setPreviewBillData(thermalBillData);
      setShowBillPreview(true);
    } catch (error) {
      console.error('Error preparing bill for print:', error);
      toast.error('Error preparing bill for print');
    }
    setPrintingBill(null);
  };

  const filteredBills = bills;

  const getPaymentModeColor = (mode: string) => {
    switch (mode) {
      case 'cash': return 'text-green-600 bg-green-50';
      case 'upi': return 'text-blue-600 bg-blue-50';
      case 'mixed': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill Management</h1>
          <p className="text-sm text-gray-600">
            Edit and manage existing bills (Password Protected)
          </p>
        </div>
        <Button onClick={loadBills} disabled={loading}>
          <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search by bill number or mobile number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Bills Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <div className="text-center">
              <RefreshCw size={48} className="mx-auto mb-4 opacity-50 animate-spin" />
              <p>Loading bills...</p>
            </div>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Receipt size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No bills found</p>
            <p className="text-sm">Try adjusting your search or date filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Mode
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Receipt size={16} className="text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {bill.billNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {bill.customerMobileNumber || (
                        <span className="text-gray-400 italic">No mobile</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(bill.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(bill.total)}
                      </div>
                      {bill.discountAmount > 0 && (
                        <div className="text-xs text-gray-500">
                          Discount: {formatCurrency(bill.discountAmount)} ({bill.discountPercent}%)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentModeColor(bill.paymentMode)}`}>
                        {bill.paymentMode.toUpperCase()}
                      </span>
                      {bill.paymentMode === 'mixed' && (
                        <div className="text-xs text-gray-500 mt-1">
                          Cash: {formatCurrency(bill.cashAmount || 0)}<br />
                          UPI: {formatCurrency(bill.upiAmount || 0)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewBill(bill.id)}
                          title="View Bill"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePrintBill(bill)}
                          disabled={printingBill === bill.id}
                          title="Print Bill"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Printer size={14} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => requestPasswordForAction('edit', bill)}
                          title="Edit Bill"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => requestPasswordForAction('delete', bill)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete Bill"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Password Modal */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingAction(null);
        }}
        onSuccess={handlePasswordSuccess}
        title="Administrator Access Required"
        description="Enter the administrator password to manage bills"
      />

      {/* Bill Edit Modal */}
      {selectedBill && (
        <BillEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBill(null);
          }}
          bill={selectedBill.bill}
          items={selectedBill.items}
          onSave={() => {
            loadBills(); // Refresh the list
            setShowEditModal(false);
            setSelectedBill(null);
          }}
        />
      )}

      {/* Bill Preview Modal */}
      {showBillPreview && previewBillData && (
        <BillPreview
          billData={previewBillData}
          onClose={() => {
            setShowBillPreview(false);
            setPreviewBillData(null);
          }}
        />
      )}

      {/* Bill Details Modal */}
      {selectedBill && (
        <Modal
          isOpen={showBillModal}
          onClose={() => {
            setShowBillModal(false);
            setSelectedBill(null);
          }}
          title={`Bill Details - ${selectedBill.bill.billNumber}`}
        >
          <div className="space-y-4">
            {/* Bill Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Date:</span>
                  <div className="font-medium">{formatDateTime(selectedBill.bill.createdAt)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Payment Mode:</span>
                  <div className="font-medium">{selectedBill.bill.paymentMode.toUpperCase()}</div>
                </div>
                {selectedBill.bill.paymentMode === 'mixed' && (
                  <>
                    <div>
                      <span className="text-gray-500">Cash Amount:</span>
                      <div className="font-medium">{formatCurrency(selectedBill.bill.cashAmount || 0)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">UPI Amount:</span>
                      <div className="font-medium">{formatCurrency(selectedBill.bill.upiAmount || 0)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Items</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedBill.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">
                          {item.productName}
                          {item.size && <span className="text-gray-500"> ({item.size})</span>}
                        </td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedBill.bill.subtotal)}</span>
                </div>
                {selectedBill.bill.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount ({selectedBill.bill.discountPercent}%):</span>
                    <span>-{formatCurrency(selectedBill.bill.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedBill.bill.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Warning Notice */}
      <Card>
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Important Notice</p>
            <p className="text-amber-700 mt-1">
              Bill editing and deletion are sensitive operations that affect inventory and reports. 
              These actions require administrator password and will be logged for audit purposes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}