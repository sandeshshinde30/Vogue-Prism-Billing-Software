import { useEffect, useState } from 'react';
import {
  Calendar,
  Download,
  IndianRupee,
  Receipt,
  Banknote,
  Smartphone,
  Eye,
} from 'lucide-react';
import { Card, Button, StatCard, Modal } from '../components/common';
import { Bill, BillItem } from '../types';
import { exportToExcel, formatCurrency, formatDate, formatTime } from '../utils/export';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface SalesReportItem {
  productName: string;
  size: string;
  category: string;
  quantitySold: number;
  totalAmount: number;
}

export function Reports() {
  const [dateRange, setDateRange] = useState({
    from: format(new Date(), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });
  const [quickRange, setQuickRange] = useState('today');
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalBills: 0,
    cashSales: 0,
    upiSales: 0,
  });
  const [salesReport, setSalesReport] = useState<SalesReportItem[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState<{
    bill: Bill;
    items: BillItem[];
  } | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [summaryData, reportData, billsData] = await Promise.all([
        window.electronAPI.getDailySummary(dateRange.from),
        window.electronAPI.getSalesReport(dateRange.from, dateRange.to),
        window.electronAPI.getBills(dateRange.from, dateRange.to),
      ]);

      setSummary(summaryData as typeof summary);
      setSalesReport(reportData as SalesReportItem[]);
      setBills(billsData as Bill[]);
    } catch (error) {
      toast.error('Error loading reports');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const handleQuickRange = (range: string) => {
    setQuickRange(range);
    const today = new Date();

    switch (range) {
      case 'today':
        setDateRange({
          from: format(today, 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        });
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setDateRange({
          from: format(weekAgo, 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        });
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        setDateRange({
          from: format(monthAgo, 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        });
        break;
    }
  };

  const handleExport = async () => {
    try {
      const data = await window.electronAPI.exportData(dateRange.from, dateRange.to);
      const filename = `sales-report-${dateRange.from}-to-${dateRange.to}.xlsx`;
      exportToExcel(data as Parameters<typeof exportToExcel>[0], filename);
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Error exporting report');
    }
  };

  const handleViewBill = async (billId: number) => {
    try {
      const data = await window.electronAPI.getBillById(billId);
      setSelectedBill(data as { bill: Bill; items: BillItem[] });
    } catch (error) {
      toast.error('Error loading bill details');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <Button onClick={handleExport}>
          <Download size={18} className="mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Date Range */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {['today', 'week', 'month'].map((range) => (
              <button
                key={range}
                onClick={() => handleQuickRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  quickRange === range
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range === 'today' ? 'Today' : range === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
          <span className="text-gray-400">or</span>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => {
                setDateRange({ ...dateRange, from: e.target.value });
                setQuickRange('');
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => {
                setDateRange({ ...dateRange, to: e.target.value });
                setQuickRange('');
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Sales"
          value={formatCurrency(summary.totalSales)}
          icon={<IndianRupee size={24} />}
        />
        <StatCard
          title="Total Bills"
          value={summary.totalBills}
          icon={<Receipt size={24} />}
        />
        <StatCard
          title="Cash Sales"
          value={formatCurrency(summary.cashSales)}
          icon={<Banknote size={24} />}
        />
        <StatCard
          title="UPI Sales"
          value={formatCurrency(summary.upiSales)}
          icon={<Smartphone size={24} />}
        />
      </div>

      {/* Sales Breakdown & Bill History */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sales Breakdown */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Sales Breakdown
          </h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : salesReport.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No sales data</div>
          ) : (
            <div className="overflow-auto max-h-96">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Qty
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {salesReport.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-900">
                          {item.productName}
                        </span>
                        {item.size && (
                          <span className="text-gray-500 ml-1">
                            ({item.size})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">
                        {item.quantitySold}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium text-gray-900">
                        {formatCurrency(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Bill History */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Bill History
          </h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : bills.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No bills found</div>
          ) : (
            <div className="overflow-auto max-h-96">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Bill #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Time
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {bill.billNumber}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {formatDate(bill.createdAt)} {formatTime(bill.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium text-gray-900">
                        {formatCurrency(bill.total)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleViewBill(bill.id)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Bill Detail Modal */}
      {selectedBill && (
        <Modal
          isOpen={!!selectedBill}
          onClose={() => setSelectedBill(null)}
          title={`Bill ${selectedBill.bill.billNumber}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Date: {formatDate(selectedBill.bill.createdAt)}</span>
              <span>Time: {formatTime(selectedBill.bill.createdAt)}</span>
            </div>

            <div className="border-t border-b border-gray-200 py-4">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left pb-2">Item</th>
                    <th className="text-center pb-2">Qty</th>
                    <th className="text-right pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedBill.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2">
                        {item.productName}
                        {item.size && (
                          <span className="text-gray-500 ml-1">
                            ({item.size})
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right font-mono">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-mono">
                  {formatCurrency(selectedBill.bill.subtotal)}
                </span>
              </div>
              {selectedBill.bill.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({selectedBill.bill.discountPercent}%)</span>
                  <span className="font-mono">
                    -{formatCurrency(selectedBill.bill.discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span className="font-mono">
                  {formatCurrency(selectedBill.bill.total)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Payment Mode</span>
                <span className="uppercase">{selectedBill.bill.paymentMode}</span>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="secondary" onClick={() => setSelectedBill(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
