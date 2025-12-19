import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

export function Cart() {
  const { cart, updateCartQuantity, removeFromCart } = useStore();

  const handleQuantityChange = (productId: number, newQuantity: number, maxStock: number) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    if (newQuantity > maxStock) {
      toast.error('Not enough stock available');
      return;
    }
    updateCartQuantity(productId, newQuantity);
  };

  if (cart.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <ShoppingCart size={40} className="mb-2 opacity-50" />
        <p className="text-sm font-medium">Cart is empty</p>
        <p className="text-xs">Scan or search products</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-2 pr-1">
      {cart.map((item) => (
        <div
          key={item.product.id}
          className="p-3 bg-slate-50 rounded-lg"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800 truncate">{item.product.name}</span>
                {item.product.size && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-600 rounded">
                    {item.product.size}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                ₹{item.product.price.toLocaleString()} × {item.quantity}
              </p>
            </div>
            <button
              onClick={() => removeFromCart(item.product.id)}
              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-white rounded-md border border-slate-200">
              <button
                onClick={() => handleQuantityChange(item.product.id, item.quantity - 1, item.product.stock)}
                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-medium text-slate-700">{item.quantity}</span>
              <button
                onClick={() => handleQuantityChange(item.product.id, item.quantity + 1, item.product.stock)}
                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            <span className="text-sm font-semibold text-slate-800 font-mono">
              ₹{(item.product.price * item.quantity).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
