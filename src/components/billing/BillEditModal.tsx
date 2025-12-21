import { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Save } from 'lucide-react';
import { Modal, Button, Input, Select } from '../common';
import { formatCurrency } from '../../utils/export';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  size?: string;
  price: number;
  stock: number;
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
  status: string;
  createdAt: string;
}

interface BillEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill;
  items: BillItem[];
  onSave: () => void;
}

interface EditItem extends BillItem {
  isNew?: boolean;
  isDeleted?: boolean;
}

export function BillEditModal({ isOpen, onClose, bill, items, onSave }: BillEditModalProps) {
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discountPercent, setDiscountPercent] = useState(bill.discountPercent);
  const [discountAmount, setDiscountAmount] = useState(bill.discountAmount);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'mixed'>(bill.paymentMode);
  const [cashAmount, setCashAmount] = useState(bill.cashAmount || 0);
  const [upiAmount, setUpiAmount] = useState(bill.upiAmount || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditItems(items.map(item => ({ ...item })));
      loadProducts();
    }
  }, [isOpen, items]);

  const loadProducts = async () => {
    try {
      const data = await window.electronAPI.getProducts();
      setProducts(data as Product[]);
    } catch (error) {
      toast.error('Error loading products');
    }
  };

  const subtotal = editItems
    .filter(item => !item.isDeleted)
    .reduce((sum, item) => sum + item.totalPrice, 0);

  const total = Math.max(0, subtotal - discountAmount);

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    
    const newItems = [...editItems];
    const item = newItems[index];
    item.quantity = quantity;
    item.totalPrice = item.unitPrice * quantity;
    setEditItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...editItems];
    if (newItems[index].isNew) {
      // Remove completely if it's a new item
      newItems.splice(index, 1);
    } else {
      // Mark as deleted if it's an existing item
      newItems[index].isDeleted = true;
    }
    setEditItems(newItems);
  };

  const addProduct = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newItem: EditItem = {
      id: Date.now(), // Temporary ID for new items
      productId: product.id,
      productName: product.name,
      size: product.size || '',
      quantity: 1,
      unitPrice: product.price,
      totalPrice: product.price,
      isNew: true
    };

    setEditItems([...editItems, newItem]);
  };

  const handleDiscountPercentChange = (percent: number) => {
    setDiscountPercent(percent);
    const amount = (subtotal * percent) / 100;
    setDiscountAmount(Math.round(amount * 100) / 100);
  };

  const handleDiscountAmountChange = (amount: number) => {
    setDiscountAmount(amount);
    const percent = subtotal > 0 ? (amount / subtotal) * 100 : 0;
    setDiscountPercent(Math.round(percent * 100) / 100);
  };

  const validateMixedPayment = () => {
    if (paymentMode === 'mixed') {
      return Math.abs((cashAmount + upiAmount) - total) < 0.01;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateMixedPayment()) {
      toast.error('Cash + UPI amounts must equal the total amount');
      return;
    }

    setLoading(true);
    try {
      const billData = {
        items: editItems
          .filter(item => !item.isDeleted)
          .map(item => ({
            product: {
              id: item.productId,
              name: item.productName,
              size: item.size,
              price: item.unitPrice
            },
            quantity: item.quantity
          })),
        subtotal,
        discountPercent,
        discountAmount,
        total,
        paymentMode,
        cashAmount: paymentMode === 'mixed' ? cashAmount : (paymentMode === 'cash' ? total : 0),
        upiAmount: paymentMode === 'mixed' ? upiAmount : (paymentMode === 'upi' ? total : 0),
      };

      await window.electronAPI.updateBill(bill.id, billData);
      toast.success(`Bill ${bill.billNumber} updated successfully`);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating bill:', error);
      toast.error(`Error updating bill: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setLoading(false);
  };

  const activeItems = editItems.filter(item => !item.isDeleted);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Bill - ${bill.billNumber}`} size="xl">
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Add Product Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Add Product</h4>
          <Select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                addProduct(parseInt(e.target.value));
                e.target.value = '';
              }
            }}
            options={[
              { value: '', label: 'Select a product to add...' },
              ...products.map(product => ({
                value: product.id.toString(),
                label: `${product.name}${product.size ? ` (${product.size})` : ''} - ₹${product.price}`
              }))
            ]}
          />
        </div>

        {/* Items List */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Bill Items</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-center">Quantity</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeItems.map((item, index) => (
                  <tr key={item.id} className={item.isNew ? 'bg-green-50' : ''}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        {item.size && <div className="text-gray-500 text-xs">{item.size}</div>}
                        {item.isNew && <div className="text-green-600 text-xs">New Item</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => updateItemQuantity(index, item.quantity - 1)}
                          className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQuantity(index, item.quantity + 1)}
                          className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Discount Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Discount</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Discount %</label>
              <Input
                type="number"
                value={discountPercent}
                onChange={(e) => handleDiscountPercentChange(parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Discount Amount</label>
              <Input
                type="number"
                value={discountAmount}
                onChange={(e) => handleDiscountAmountChange(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Payment Mode */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Payment Mode</h4>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(['cash', 'upi', 'mixed'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setPaymentMode(mode);
                  if (mode === 'cash') {
                    setCashAmount(total);
                    setUpiAmount(0);
                  } else if (mode === 'upi') {
                    setCashAmount(0);
                    setUpiAmount(total);
                  } else {
                    setCashAmount(Math.round(total / 2));
                    setUpiAmount(total - Math.round(total / 2));
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  paymentMode === mode
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>

          {paymentMode === 'mixed' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Cash Amount</label>
                <Input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  max={total}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">UPI Amount</label>
                <Input
                  type="number"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  max={total}
                />
              </div>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount ({discountPercent}%):</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {paymentMode === 'mixed' && (
              <div className="text-xs text-gray-600 text-center">
                Cash + UPI: {formatCurrency(cashAmount + upiAmount)} / {formatCurrency(total)}
                {!validateMixedPayment() && (
                  <div className="text-red-600 mt-1">Amounts don't match total!</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !validateMixedPayment()}
            className="flex-1"
          >
            <Save size={18} className="mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}