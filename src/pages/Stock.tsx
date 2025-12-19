import { useEffect, useState } from 'react';
import { Search, Package, Save, AlertTriangle } from 'lucide-react';
import { Card, Input, Select, StatCard } from '../components/common';
import { Product } from '../types';
import toast from 'react-hot-toast';

export function Stock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [adjustments, setAdjustments] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = (await window.electronAPI.getProducts()) as Product[];
      setProducts(data);
    } catch (error) {
      toast.error('Error loading products');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query)
      );
    }

    if (filter === 'low') {
      filtered = filtered.filter(
        (p) => p.stock <= p.lowStockThreshold && p.stock > 0
      );
    } else if (filter === 'out') {
      filtered = filtered.filter((p) => p.stock === 0);
    }

    setFilteredProducts(filtered);
  }, [searchQuery, filter, products]);

  const handleAdjustmentChange = (productId: number, value: number) => {
    setAdjustments({ ...adjustments, [productId]: value });
  };

  const handleSaveStock = async (product: Product) => {
    const adjustment = adjustments[product.id] || 0;
    if (adjustment === 0) return;

    try {
      await window.electronAPI.updateStock(product.id, adjustment, 'adjustment');
      
      // Update local state
      setProducts(
        products.map((p) =>
          p.id === product.id ? { ...p, stock: p.stock + adjustment } : p
        )
      );
      
      // Clear adjustment
      const newAdjustments = { ...adjustments };
      delete newAdjustments[product.id];
      setAdjustments(newAdjustments);

      toast.success(`Stock updated for ${product.name}`);
    } catch (error) {
      toast.error('Error updating stock');
    }
  };

  const totalItems = products.length;
  const inStock = products.filter((p) => p.stock > p.lowStockThreshold).length;
  const lowStock = products.filter(
    (p) => p.stock <= p.lowStockThreshold && p.stock > 0
  ).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Items"
          value={totalItems}
          icon={<Package size={24} />}
        />
        <StatCard
          title="In Stock"
          value={inStock}
          icon={<Package size={24} />}
        />
        <StatCard
          title="Low Stock"
          value={lowStock}
          icon={<AlertTriangle size={24} />}
          variant="warning"
        />
        <StatCard
          title="Out of Stock"
          value={outOfStock}
          icon={<AlertTriangle size={24} />}
          variant="danger"
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Scan barcode or search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={18} />}
            />
          </div>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Products' },
              { value: 'low', label: 'Low Stock' },
              { value: 'out', label: 'Out of Stock' },
            ]}
            className="w-48"
          />
        </div>
      </Card>

      {/* Stock Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            Loading products...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Package size={48} className="mb-2" />
            <p>No products found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Current Stock
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Adjust
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  New Stock
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => {
                const adjustment = adjustments[product.id] || 0;
                const newStock = product.stock + adjustment;

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {product.name}
                        </span>
                        {product.size && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                            {product.size}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{product.category}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                          product.stock === 0
                            ? 'bg-red-100 text-red-700'
                            : product.stock <= product.lowStockThreshold
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() =>
                            handleAdjustmentChange(product.id, adjustment - 1)
                          }
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={adjustment}
                          onChange={(e) =>
                            handleAdjustmentChange(
                              product.id,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-20 text-center border border-gray-300 rounded-lg py-1 font-mono"
                        />
                        <button
                          onClick={() =>
                            handleAdjustmentChange(product.id, adjustment + 1)
                          }
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-mono font-semibold ${
                          newStock < 0
                            ? 'text-red-600'
                            : adjustment !== 0
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {newStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleSaveStock(product)}
                        disabled={adjustment === 0 || newStock < 0}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Save size={14} />
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
