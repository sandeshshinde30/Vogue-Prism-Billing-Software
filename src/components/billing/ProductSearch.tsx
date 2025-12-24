import { useEffect, useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Product } from '../../types';
import toast from 'react-hot-toast';

export function ProductSearch() {
  const { selectedCategory, searchQuery, addToCart, getCartQuantity } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, searchQuery]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      let result: Product[];
      if (searchQuery) {
        result = (await window.electronAPI.searchProducts(searchQuery)) as Product[];
      } else if (selectedCategory) {
        result = (await window.electronAPI.getProductsByCategory(selectedCategory)) as Product[];
      } else {
        result = (await window.electronAPI.getProducts()) as Product[];
      }
      setProducts(result);
    } catch (error) {
      toast.error('Error loading products');
    }
    setLoading(false);
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error(`${product.name} is out of stock!`);
      return;
    }
    
    // Check if adding would exceed available stock
    const currentCartQty = getCartQuantity(product.id);
    if (currentCartQty >= product.stock) {
      toast.error(`Cannot add more ${product.name}. Only ${product.stock} in stock, ${currentCartQty} already in cart.`);
      return;
    }
    
    const added = addToCart(product);
    if (added) {
      toast.success(`Added ${product.name}`);
    } else {
      toast.error(`Cannot add more ${product.name}. Stock limit reached.`);
    }
  };

  if (loading) {
    return (
      <div 
        className="h-full flex items-center justify-center text-slate-400"
        style={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#94a3b8'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div 
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid #f1f5f9',
              borderTop: '3px solid #22c55e',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 8px'
            }}
          />
          <span className="text-sm" style={{ fontSize: '14px' }}>Loading...</span>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
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
        <Package size={40} className="mb-2 opacity-50" style={{ marginBottom: '8px', opacity: '0.5' }} />
        <p className="text-sm" style={{ fontSize: '14px' }}>No products found</p>
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
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              backgroundColor: product.stock <= 0 ? '#f8fafc' : '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #f1f5f9',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: product.stock <= 0 ? '0.5' : '1'
            }}
            onMouseEnter={(e) => {
              if (product.stock > 0) {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#f1f5f9';
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
                  {product.name}
                </span>
                {product.size && (
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
                    {product.size}
                  </span>
                )}
              </div>
              <div 
                className="flex items-center gap-3 mt-1"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}
              >
                <span 
                  className="text-sm font-semibold text-green-600 font-mono"
                  style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#16a34a',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}
                >
                  ₹{product.price.toLocaleString()}
                </span>
                <span 
                  className="text-xs"
                  style={{
                    fontSize: '12px',
                    color: product.stock <= product.lowStockThreshold
                      ? product.stock <= 0 ? '#dc2626' : '#d97706'
                      : '#94a3b8'
                  }}
                >
                  Stock: {product.stock}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleAddToCart(product)}
              disabled={product.stock <= 0}
              className="w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: product.stock <= 0 ? '#e2e8f0' : '#22c55e',
                color: product.stock <= 0 ? '#94a3b8' : 'white',
                borderRadius: '8px',
                border: 'none',
                cursor: product.stock <= 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (product.stock > 0) {
                  e.currentTarget.style.backgroundColor = '#16a34a';
                }
              }}
              onMouseLeave={(e) => {
                if (product.stock > 0) {
                  e.currentTarget.style.backgroundColor = '#22c55e';
                }
              }}
            >
              <Plus size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}