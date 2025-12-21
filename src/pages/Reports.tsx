import { useEffect, useState } from 'react';
import {
  Calendar,
  Download,
  IndianRupee,
  Receipt,
  Banknote,
  Smartphone,
  Eye,
  FileText,
} from 'lucide-react';
import { Card, Button, StatCard, Modal } from '../components/common';
import { Bill, BillItem } from '../types';
import { exportToExcel, exportBillToPDF, formatCurrency, formatDate, formatTime } from '../utils/export';
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
      let summaryData;
      
      // Use appropriate summary function based on date range
      if (dateRange.from === dateRange.to) {
        // Single day - use daily summary
        summaryData = await window.electronAPI.getDailySummary(dateRange.from);
      } else {
        // Date range - use new date range summary
        summaryData = await window.electronAPI.getDateRangeSummary(dateRange.from, dateRange.to);
      }
      
      const [reportData, billsData] = await Promise.all([
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
      exportToExcel(data, filename);
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

  const handlePrintBill = async (billId: number) => {
    try {
      const data = await window.electronAPI.getBillById(billId);
      if (data) {
        const { bill, items } = data as { bill: Bill; items: BillItem[] };
        exportBillToPDF(bill, items);
        toast.success('PDF generated successfully');
      }
    } catch (error) {
      toast.error('Error generating PDF');
    }
  };

  return (
    <div 
      className="main-content space-y-6"
      style={{
        width: '100%',
        maxWidth: 'none',
        margin: '0',
        padding: '0'
      }}
    >
      {/* Header */}
      <div 
        className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          marginBottom: '24px'
        }}
      >
        <div>
          <h1 
            className="page-title"
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '4px'
            }}
          >
            Reports
          </h1>
          <p 
            className="page-subtitle"
            style={{
              fontSize: '14px',
              color: '#6b7280'
            }}
          >
            View sales analytics and export data
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download size={18} className="mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Date Range */}
      <Card style={{ marginBottom: '24px' }}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <div className="flex flex-wrap gap-2">
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
          <div className="flex items-center gap-2 text-gray-400">
            <span>or</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-400" />
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => {
                  setDateRange({ ...dateRange, from: e.target.value });
                  setQuickRange('');
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <span className="text-gray-400 hidden sm:inline">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => {
                setDateRange({ ...dateRange, to: e.target.value });
                setQuickRange('');
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div 
        className="stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
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
      <div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        style={{
          marginBottom: '24px'
        }}
      >
        {/* Sales Breakdown */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Sales Breakdown
            </h2>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>Loading...</p>
            </div>
          ) : salesReport.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Receipt size={48} className="mx-auto mb-4 opacity-50" />
              <p>No sales data</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-96">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {salesReport.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900 text-sm">
                          {item.productName}
                        </div>
                        {item.size && (
                          <div className="text-xs text-gray-500">
                            ({item.size})
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600 text-sm">
                        {item.quantitySold}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-medium text-gray-900 text-sm">
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Bill History
            </h2>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>Loading...</p>
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Receipt size={48} className="mx-auto mb-4 opacity-50" />
              <p>No bills found</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-96">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill #
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-900 text-sm">
                        {bill.billNumber}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-sm">
                        <div>{formatDate(bill.createdAt)}</div>
                        <div className="text-xs text-gray-500">{formatTime(bill.createdAt)}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-medium text-gray-900 text-sm">
                        {formatCurrency(bill.total)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewBill(bill.id)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View bill details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handlePrintBill(bill.id)}
                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Export to PDF"
                          >
                            <FileText size={16} />
                          </button>
                        </div>
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

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="secondary" 
                onClick={() => handlePrintBill(selectedBill.bill.id)}
              >
                <FileText size={16} className="mr-2" />
                Export PDF
              </Button>
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
