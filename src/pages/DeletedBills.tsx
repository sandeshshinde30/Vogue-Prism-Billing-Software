import { useEffect, useState } from 'react';
import {
  Trash2,
  RotateCcw,
  Receipt,
  RefreshCw,
  X,
} from 'lucide-react';
import { Card, Button, Modal } from '../components/common';
import { formatDateTime, formatCurrency } from '../utils/export';
import toast from 'react-hot-toast';

interface DeletedBill {
  id: number;
  originalBillId: number;
  billNumber: string;
  billData: string;
  itemsData: string;
  deletedAt: string;
  deletedBy: string;
  reason: string;
}

export function DeletedBills() {
  const [deletedBills, setDeletedBills] = useState<DeletedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<DeletedBill | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const loadDeletedBills = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getDeletedBills(100, 0);
      setDeletedBills(data as DeletedBill[]);
    } catch (error) {
      toast.error('Error loading deleted bills');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDeletedBills();
  }, []);

  const handleRestore = async (bill: DeletedBill) => {
    if (!confirm(`Restore bill ${bill.billNumber}? This will create a new bill and reduce stock again.`)) {
      return;
    }

    try {
      const result = await window.electronAPI.restoreBill(bill.id);
      if (result.success) {
        toast.success(`Bill restored as ${result.billNumber}`);
        loadDeletedBills();
      }
    } catch (error) {
      toast.error('Error restoring bill');
    }
  };

  const handlePermanentDelete = async (bill: DeletedBill) => {
    if (!confirm(`Permanently delete bill ${bill.billNumber}? This cannot be undone!`)) {
      return;
    }

    try {
      const result = await window.electronAPI.permanentlyDeleteBill(bill.id);
      if (result.success) {
        toast.success('Bill permanently deleted');
        loadDeletedBills();
      }
    } catch (error) {
      toast.error('Error deleting bill');
    }
  };

  const showDetails = (bill: DeletedBill) => {
    setSelectedBill(bill);
    setShowDetailsModal(true);
  };

  const getBillData = (bill: DeletedBill) => {
    try {
      return JSON.parse(bill.billData);
    } catch {
      return null;
    }
  };

  const getItemsData = (bill: DeletedBill) => {
    try {
      return JSON.parse(bill.itemsData);
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deleted Bills</h1>
          <p className="text-sm text-gray-600">View and restore deleted bills</p>
        </div>
        <Button onClick={loadDeletedBills} disabled={loading}>
          <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Deleted Bills Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <div className="text-center">
              <RefreshCw size={48} className="mx-auto mb-4 opacity-50 animate-spin" />
              <p>Loading deleted bills...</p>
            </div>
          </div>
        ) : deletedBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Trash2 size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No deleted bills</p>
            <p className="text-sm">Deleted bills will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Bill Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Original Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Deleted At
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Reason
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {deletedBills.map((bill) => {
                  const billData = getBillData(bill);
                  return (
                    <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Receipt size={16} className="text-red-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {bill.billNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {billData ? formatDateTime(billData.createdAt) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {billData ? formatCurrency(billData.total) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDateTime(bill.deletedAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="max-w-xs truncate" title={bill.reason}>
                          {bill.reason || 'No reason provided'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => showDetails(bill)}
                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Receipt size={16} />
                          </button>
                          <button
                            onClick={() => handleRestore(bill)}
                            className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                            title="Restore bill"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(bill)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete permanently"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Details Modal */}
      {selectedBill && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={`Bill Details: ${selectedBill.billNumber}`}
          size="lg"
        >
          <div className="space-y-4">
            {(() => {
              const billData = getBillData(selectedBill);
              const itemsData = getItemsData(selectedBill);
              
              if (!billData) return <p>Error loading bill data</p>;

              return (
                <>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Original Date</p>
                      <p className="font-medium">{formatDateTime(billData.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment Mode</p>
                      <p className="font-medium uppercase">{billData.paymentMode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Deleted At</p>
                      <p className="font-medium">{formatDateTime(selectedBill.deletedAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Deleted By</p>
                      <p className="font-medium">{selectedBill.deletedBy}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Items</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Size</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {itemsData.map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-sm">{item.productName}</td>
                              <td className="px-4 py-2 text-sm">{item.size || '-'}</td>
                              <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(billData.subtotal)}</span>
                      </div>
                      {billData.discountAmount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Discount ({billData.discountPercent}%):</span>
                          <span>-{formatCurrency(billData.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(billData.total)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedBill.reason && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800">Deletion Reason:</p>
                      <p className="text-sm text-yellow-700 mt-1">{selectedBill.reason}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                      Close
                    </Button>
                    <Button onClick={() => {
                      setShowDetailsModal(false);
                      handleRestore(selectedBill);
                    }}>
                      <RotateCcw size={16} className="mr-2" />
                      Restore Bill
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
}
