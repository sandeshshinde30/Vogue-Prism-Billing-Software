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
        className="page-header"
        style={{
          marginBottom: '24px'
        }}
      >
        <h1 
          className="page-title"
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '4px'
          }}
        >
          Stock Management
        </h1>
        <p 
          className="page-subtitle"
          style={{
            fontSize: '14px',
            color: '#6b7280'
          }}
        >
          Monitor and adjust your inventory levels
        </p>
      </div>

      {/* Stats */}
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
      <Card style={{ marginBottom: '24px' }}>
        <div className="flex flex-col sm:flex-row gap-4">
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
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Stock Table */}
      <Card padding="none" style={{ marginBottom: '24px' }}>
        {loading ? (
          <div 
            className="flex items-center justify-center h-48 text-gray-400"
            style={{
              height: '192px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div className="text-center">
              <Package size={48} className="mx-auto mb-4 opacity-50" />
              <p>Loading products...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div 
            className="flex flex-col items-center justify-center h-48 text-gray-400"
            style={{
              height: '192px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Package size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table 
              className="w-full min-w-[900px]"
              style={{
                width: '100%',
                minWidth: '900px',
                borderCollapse: 'collapse'
              }}
            >
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th 
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{
                      padding: '16px 24px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Product
                  </th>
                  <th 
                    className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{
                      padding: '16px 24px',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Current Stock
                  </th>
                  <th 
                    className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{
                      padding: '16px 24px',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Adjust
                  </th>
                  <th 
                    className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{
                      padding: '16px 24px',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    New Stock
                  </th>
                  <th 
                    className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{
                      padding: '16px 24px',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredProducts.map((product) => {
                  const adjustment = adjustments[product.id] || 0;
                  const newStock = product.stock + adjustment;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td 
                        className="px-6 py-4"
                        style={{
                          padding: '16px 24px'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div 
                              className="font-medium text-gray-900 text-sm"
                              style={{
                                fontWeight: '500',
                                color: '#111827',
                                fontSize: '14px'
                              }}
                            >
                              {product.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {product.category}
                              </span>
                              {product.size && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                  {product.size}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td 
                        className="px-6 py-4 text-center"
                        style={{
                          padding: '16px 24px',
                          textAlign: 'center'
                        }}
                      >
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
                      <td 
                        className="px-6 py-4"
                        style={{
                          padding: '16px 24px'
                        }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              handleAdjustmentChange(product.id, adjustment - 1)
                            }
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
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
                            className="w-20 text-center border border-gray-300 rounded-lg py-1 font-mono text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                          <button
                            onClick={() =>
                              handleAdjustmentChange(product.id, adjustment + 1)
                            }
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td 
                        className="px-6 py-4 text-center"
                        style={{
                          padding: '16px 24px',
                          textAlign: 'center'
                        }}
                      >
                        <span
                          className={`font-mono font-semibold text-sm ${
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
                      <td 
                        className="px-6 py-4 text-center"
                        style={{
                          padding: '16px 24px',
                          textAlign: 'center'
                        }}
                      >
                        <button
                          onClick={() => handleSaveStock(product)}
                          disabled={adjustment === 0 || newStock < 0}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
          </div>
        )}
      </Card>
    </div>
  );
}
