import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { PasswordModal } from '../components/common/PasswordModal';
import { CashUpiTransaction, CashUpiSummary } from '../types';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Minus, 
  Banknote, 
  Smartphone,
  ArrowUp,
  ArrowDown,
  Calendar,
  Search,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';

export function CashUpiTracking() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<CashUpiTransaction[]>([]);
  const [summary, setSummary] = useState<CashUpiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'cash' | 'upi',
    transactionType: 'all' as 'all' | 'incoming' | 'outgoing',
    dateFrom: '',
    dateTo: '',
    searchQuery: ''
  });

  // Form state for adding transactions
  const [formData, setFormData] = useState({
    type: 'cash' as 'cash' | 'upi',
    transactionType: 'outgoing' as 'incoming' | 'outgoing',
    amount: '',
    reason: '',
    description: ''
  });

  const handleGoToDashboard = () => {
    navigate('/');
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [filters, isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load transactions with filters
      const transactionsData = await window.electronAPI.getCashUpiTransactions(
        filters.type === 'all' ? undefined : filters.type,
        filters.transactionType === 'all' ? undefined : filters.transactionType,
        filters.dateFrom || undefined,
        filters.dateTo || undefined,
        100, // limit
        0 // offset
      );
      
      // Load summary
      const summaryData = await window.electronAPI.getCashUpiSummary(
        filters.dateFrom || undefined,
        filters.dateTo || undefined
      );
      
      setTransactions(transactionsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading cash/UPI data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.reason) {
      toast.error('Amount and reason are required');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const result = await window.electronAPI.addCashUpiTransaction({
        type: formData.type,
        transactionType: formData.transactionType,
        amount: amount,
        reason: formData.reason.trim(),
        description: formData.description.trim() || undefined
      });

      if (result.success) {
        toast.success(`${formData.type.toUpperCase()} transaction added successfully`);
        setShowAddModal(false);
        setFormData({
          type: 'cash',
          transactionType: 'outgoing',
          amount: '',
          reason: '',
          description: ''
        });
        await loadData(); // Reload data to show the new transaction
      } else {
        toast.error('Failed to add transaction');
      }
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      
      // Handle specific error messages
      if (error.message && error.message.includes('Insufficient')) {
        toast.error(error.message);
      } else if (error.message && error.message.includes('CHECK constraint')) {
        toast.error('Database constraint error. Please try again.');
      } else {
        toast.error('Failed to add transaction. Please try again.');
      }
    }
  };

  const handlePasswordSuccess = () => {
    setIsAuthenticated(true);
    setShowPasswordModal(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthenticated) {
    return (
      <>
        <PasswordModal
          isOpen={showPasswordModal}
          onClose={handleGoToDashboard}
          onSuccess={handlePasswordSuccess}
          title="Administrator Access Required"
          description="Enter the administrator password to access Cash & UPI Tracking"
        />
      </>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="animate-pulse space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="h-12 bg-gray-200 rounded-xl w-40"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-20 bg-gray-200 rounded-2xl"></div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cash & UPI Tracking</h1>
          <p className="text-gray-600 mt-2">Track cash and UPI transactions for your store</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-xl font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            title="Refresh data to see latest bill changes"
          >
            <svg className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-5 w-5" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Cash Balance</p>
                <p className={`text-3xl font-bold mt-2 ${summary.cashBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.cashBalance)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {summary.cashBalance >= 0 ? 'Available' : 'Deficit'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                <Banknote className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">UPI Balance</p>
                <p className={`text-3xl font-bold mt-2 ${summary.upiBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.upiBalance)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {summary.upiBalance >= 0 ? 'Available' : 'Deficit'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Today Incoming</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">
                  {formatCurrency(summary.todayIncoming)}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  Received today
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center">
                <ArrowUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Today Outgoing</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {formatCurrency(summary.todayOutgoing)}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Spent today
                </p>
              </div>
              <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
                <ArrowDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={() => setFilters({
              type: 'all',
              transactionType: 'all',
              dateFrom: '',
              dateTo: '',
              searchQuery: ''
            })}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <div className="relative">
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
              >
                <option value="all">All Types</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Direction</label>
            <div className="relative">
              <select
                value={filters.transactionType}
                onChange={(e) => setFilters(prev => ({ ...prev, transactionType: e.target.value as any }))}
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
              >
                <option value="all">All Directions</option>
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </Card>

      {/* Transactions List */}
      <Card className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
            <p className="text-sm text-gray-600 mt-1">
              {summary && `${summary.transactionCount} total transactions`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Latest first</span>
          </div>
        </div>
        
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Banknote className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium">No transactions found</p>
            <p className="text-sm">Add your first transaction to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Type</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Direction</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Amount</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Reason</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Bill #</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-2">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {formatDate(transaction.createdAt!).split(',')[0]}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {formatDate(transaction.createdAt!).split(',')[1]}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        {transaction.type === 'cash' ? (
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Banknote className="h-4 w-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Smartphone className="h-4 w-4 text-blue-600" />
                          </div>
                        )}
                        <span className="capitalize font-medium text-gray-900">{transaction.type}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        {transaction.transactionType === 'incoming' ? (
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <ArrowUp className="h-3 w-3 text-green-600" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                            <ArrowDown className="h-3 w-3 text-red-600" />
                          </div>
                        )}
                        <span className="capitalize text-sm font-medium text-gray-700">{transaction.transactionType}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className={`font-semibold ${transaction.transactionType === 'incoming' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.transactionType === 'incoming' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="max-w-xs">
                        <p className="font-medium text-gray-900 text-sm">{transaction.reason}</p>
                        {transaction.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{transaction.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      {transaction.billNumber ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {transaction.billNumber}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg border border-white/20">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Add Transaction</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-6">
              <form onSubmit={handleAddTransaction} className="space-y-5">
                {/* Type and Transaction Direction */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <div className="relative">
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                      >
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Direction</label>
                    <div className="relative">
                      <select
                        value={formData.transactionType}
                        onChange={(e) => setFormData(prev => ({ ...prev, transactionType: e.target.value as any }))}
                        className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                      >
                        <option value="incoming">Incoming</option>
                        <option value="outgoing">Outgoing</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  {/* Balance Warning for Outgoing Transactions */}
                  {formData.transactionType === 'outgoing' && summary && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                      <div className="flex items-center gap-1">
                        <span>Available Balance:</span>
                        <span className="font-medium">
                          {formData.type === 'cash' 
                            ? `₹${summary.cashBalance.toFixed(2)}` 
                            : `₹${summary.upiBalance.toFixed(2)}`
                          }
                        </span>
                      </div>
                      {formData.amount && parseFloat(formData.amount) > 0 && (
                        <div className="mt-1">
                          {formData.type === 'cash' && parseFloat(formData.amount) > summary.cashBalance && (
                            <span className="text-red-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Insufficient cash balance (shortage: ₹{(parseFloat(formData.amount) - summary.cashBalance).toFixed(2)})
                            </span>
                          )}
                          {formData.type === 'upi' && parseFloat(formData.amount) > summary.upiBalance && (
                            <span className="text-red-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Insufficient UPI balance (shortage: ₹{(parseFloat(formData.amount) - summary.upiBalance).toFixed(2)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., Staff salary, Rent payment, Cash deposit"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Additional details (optional)"
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      formData.transactionType === 'outgoing' && 
                      formData.amount && 
                      summary && 
                      parseFloat(formData.amount) > 0 && 
                      ((formData.type === 'cash' && parseFloat(formData.amount) > summary.cashBalance) ||
                       (formData.type === 'upi' && parseFloat(formData.amount) > summary.upiBalance))
                    }
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    Add Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}