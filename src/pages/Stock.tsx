import { useEffect, useState } from 'react';
import { Search, Package, AlertTriangle } from 'lucide-react';
import { Card, Input, Select, StatCard } from '../components/common';
import { Product } from '../types';
import toast from 'react-hot-toast';

export function Stock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = (await window.electronAPI.getProducts()) as Product[];
      setProducts(data);
    } catch {
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
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q)
      );
    }

    if (filter === 'low') {
      filtered = filtered.filter(
        (p) => p.stock <= p.lowStockThreshold && p.stock > 0
      );
    }

    if (filter === 'out') {
      filtered = filtered.filter((p) => p.stock === 0);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, filter]);

  const totalItems = products.length;
  const inStock = products.filter((p) => p.stock > p.lowStockThreshold).length;
  const lowStock = products.filter(
    (p) => p.stock <= p.lowStockThreshold && p.stock > 0
  ).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Stock Management</h1>
        <p className="text-sm text-gray-500">
          View and monitor inventory levels
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Items" value={totalItems} icon={<Package />} />
        <StatCard title="In Stock" value={inStock} icon={<Package />} />
        <StatCard
          title="Low Stock"
          value={lowStock}
          icon={<AlertTriangle />}
          variant="warning"
        />
        <StatCard
          title="Out of Stock"
          value={outOfStock}
          icon={<AlertTriangle />}
          variant="danger"
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex gap-4">
          <Input
            placeholder="Scan barcode or search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={18} />}
          />

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

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-400">
            Loading products...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400">
            No products found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="bg-gray-50 border border-gray-300">
                <tr>
                  <th className="px-6 py-4 text-left text-xs uppercase">
                    Product
                  </th>
                  <th className="px-6 py-4 text-center text-xs uppercase">
                    Category
                  </th>
                  <th className="px-6 py-4 text-center text-xs uppercase">
                    Size
                  </th>
                  <th className="px-6 py-4 text-center text-xs uppercase">
                    Price
                  </th>
                  <th className="px-6 py-4 text-center text-xs uppercase">
                    Stock
                  </th>
                </tr>
              </thead>

              <tbody className="">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    {/* Product */}
                    <td className="px-6 py-4">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500">
                        ID: {product.id}
                      </div>
                      {product.barcode && (
                        <div className="text-xs text-gray-400">
                          {product.barcode}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4 text-center">
                      {product.category}
                    </td>

                    {/* Size */}
                    <td className="px-6 py-4 text-center">
                      {product.size || '-'}
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 text-center font-mono">
                      ₹{product.price}
                    </td>

                    {/* Stock */}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
