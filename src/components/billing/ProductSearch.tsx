import { useEffect, useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Product } from '../../types';
import toast from 'react-hot-toast';

export function ProductSearch() {
  const { selectedCategory, searchQuery, addToCart } = useStore();
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
    addToCart(product);
    toast.success(`Added ${product.name}`);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <Package size={40} className="mb-2 opacity-50" />
        <p className="text-sm">No products found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-2 pr-1">
      {products.map((product) => (
        <div
          key={product.id}
          className={`flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors ${
            product.stock <= 0 ? 'opacity-50' : ''
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800 truncate">{product.name}</span>
              {product.size && (
                <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-600 rounded">
                  {product.size}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm font-semibold text-green-600 font-mono">
                ₹{product.price.toLocaleString()}
              </span>
              <span className={`text-xs ${
                product.stock <= product.lowStockThreshold
                  ? product.stock <= 0 ? 'text-red-500' : 'text-amber-500'
                  : 'text-slate-400'
              }`}>
                Stock: {product.stock}
              </span>
            </div>
          </div>
          <button
            onClick={() => handleAddToCart(product)}
            disabled={product.stock <= 0}
            className="w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
