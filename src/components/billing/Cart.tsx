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
      toast.error(`Cannot add more. Only ${maxStock} available in stock.`);
      return;
    }
    updateCartQuantity(productId, newQuantity);
  };

  if (cart.length === 0) {
    return (
      <div 
        className="h-full flex flex-col items-center justify-center text-slate-400"
        style={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#94a3b8'
        }}
      >
        <div 
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#f1f5f9',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px'
          }}
        >
          <ShoppingCart size={32} className="opacity-50" style={{ opacity: '0.5', color: '#cbd5e1' }} />
        </div>
        <p 
          className="text-sm font-medium"
          style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}
        >
          Cart is empty
        </p>
        <p 
          className="text-xs"
          style={{ fontSize: '12px' }}
        >
          Scan or search products
        </p>
      </div>
    );
  }

  return (
    <div 
      className="h-full overflow-y-auto space-y-2 pr-1"
      style={{ 
        height: '100%', 
        overflowY: 'auto', 
        paddingRight: '4px'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {cart.map((item, index) => (
          <div
            key={item.product.id}
            className="p-3 bg-slate-50 rounded-lg"
            style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #f1f5f9',
              animation: `slideIn 0.3s ease-out ${index * 50}ms both`
            }}
          >
            <div 
              className="flex items-start justify-between gap-2 mb-2"
              style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                justifyContent: 'space-between', 
                gap: '8px',
                marginBottom: '8px'
              }}
            >
              <div 
                className="min-w-0 flex-1"
                style={{ minWidth: '0', flex: '1' }}
              >
                <div 
                  className="flex items-center gap-2"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span 
                    className="text-sm font-medium text-slate-800 truncate"
                    style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#1e293b',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.product.name}
                  </span>
                  {item.product.size && (
                    <span 
                      className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-600 rounded"
                      style={{
                        flexShrink: '0',
                        padding: '2px 6px',
                        fontSize: '10px',
                        fontWeight: '500',
                        backgroundColor: '#e2e8f0',
                        color: '#475569',
                        borderRadius: '4px'
                      }}
                    >
                      {item.product.size}
                    </span>
                  )}
                </div>
                <p 
                  className="text-xs text-slate-400 font-mono mt-0.5"
                  style={{ 
                    fontSize: '12px', 
                    color: '#94a3b8',
                    fontFamily: 'JetBrains Mono, monospace',
                    marginTop: '2px'
                  }}
                >
                  ₹{item.product.price.toLocaleString()} × {item.quantity}
                  {item.product.costPrice ? (
                    <span style={{ color: '#d1d5db', marginLeft: '6px', fontSize: '10px', opacity: '0.7' }}>
                      (C: ₹{item.product.costPrice.toLocaleString()})
                    </span>
                  ) : null}
                </p>
              </div>
              <button
                onClick={() => removeFromCart(item.product.id)}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                style={{
                  padding: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div 
              className="flex items-center justify-between"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div 
                className="flex items-center gap-1 bg-white rounded-md border border-slate-200"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <button
                  onClick={() => handleQuantityChange(item.product.id, item.quantity - 1, item.product.stock)}
                  className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                  style={{
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#64748b',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Minus size={14} />
                </button>
                <span 
                  className="w-8 text-center text-sm font-medium text-slate-700"
                  style={{ 
                    width: '32px', 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#374151' 
                  }}
                >
                  {item.quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(item.product.id, item.quantity + 1, item.product.stock)}
                  className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                  style={{
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#64748b',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
              <span 
                className="text-sm font-semibold text-slate-800 font-mono"
                style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#1e293b',
                  fontFamily: 'JetBrains Mono, monospace'
                }}
              >
                ₹{(item.product.price * item.quantity).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}