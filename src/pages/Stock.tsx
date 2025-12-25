import { useEffect, useState } from 'react';
import { Search, Package, AlertTriangle, Download, FileSpreadsheet } from 'lucide-react';
import { Card, Input, Select, StatCard, Button } from '../components/common';
import { Product } from '../types';
import { StockExporter } from '../utils/stockExport';
import toast from 'react-hot-toast';

export function Stock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Get unique categories and sizes from products
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  const sizes = [...new Set(products.map(p => p.size).filter(Boolean))].sort();

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

  const handleExportAll = async () => {
    setExporting(true);
    try {
      StockExporter.exportToExcel(products);
      toast.success('Stock report exported successfully');
    } catch (error) {
      toast.error('Failed to export stock report');
      console.error('Export error:', error);
    }
    setExporting(false);
  };

  const handleExportFiltered = async () => {
    setExporting(true);
    try {
      // Build filename based on active filters
      const filterParts: string[] = [];
      if (categoryFilter !== 'all') filterParts.push(categoryFilter);
      if (sizeFilter !== 'all') filterParts.push(`size-${sizeFilter}`);
      if (filter === 'low') filterParts.push('low-stock');
      if (filter === 'out') filterParts.push('out-of-stock');
      if (searchQuery) filterParts.push('search');
      
      const filterSuffix = filterParts.length > 0 ? filterParts.join('-') : 'filtered';
      const filename = `stock-${filterSuffix}-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      let productsToExport = filteredProducts;
      
      if (productsToExport.length === 0) {
        toast.error('No products to export');
        setExporting(false);
        return;
      }
      
      StockExporter.exportToExcel(productsToExport, filename);
      toast.success(`${productsToExport.length} products exported successfully`);
    } catch (error) {
      toast.error('Failed to export filtered report');
      console.error('Export error:', error);
    }
    setExporting(false);
  };

  const handleExportLowStock = async () => {
    setExporting(true);
    try {
      StockExporter.exportLowStockReport(products);
      toast.success('Low stock report exported successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('No low stock products')) {
        toast.error('No low stock products found');
      } else {
        toast.error('Failed to export low stock report');
      }
      console.error('Export error:', error);
    }
    setExporting(false);
  };

  const handleExportOutOfStock = async () => {
    setExporting(true);
    try {
      StockExporter.exportOutOfStockReport(products);
      toast.success('Out of stock report exported successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('No out of stock products')) {
        toast.error('No out of stock products found');
      } else {
        toast.error('Failed to export out of stock report');
      }
      console.error('Export error:', error);
    }
    setExporting(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Size filter
    if (sizeFilter !== 'all') {
      filtered = filtered.filter(p => p.size === sizeFilter);
    }

    // Search filter (name, barcode, category)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }

    // Stock status filter
    if (filter === 'low') {
      filtered = filtered.filter(
        (p) => p.stock <= p.lowStockThreshold && p.stock > 0
      );
    }

    if (filter === 'out') {
      filtered = filtered.filter((p) => p.stock === 0);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, filter, categoryFilter, sizeFilter]);

  const totalItems = products.length;
  const inStock = products.filter((p) => p.stock > p.lowStockThreshold).length;
  const lowStock = products.filter(
    (p) => p.stock <= p.lowStockThreshold && p.stock > 0
  ).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Management</h1>
          <p className="text-sm text-gray-500">
            View and monitor inventory levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportAll}
            disabled={exporting || products.length === 0}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <FileSpreadsheet size={18} />
            Export All
          </Button>
          <div className="relative group">
            <Button
              disabled={exporting}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Download size={18} />
              Quick Export
            </Button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="py-1">
                <button
                  onClick={handleExportLowStock}
                  disabled={exporting}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <AlertTriangle size={14} className="text-yellow-500" />
                  Low Stock Report
                </button>
                <button
                  onClick={handleExportOutOfStock}
                  disabled={exporting}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <AlertTriangle size={14} className="text-red-500" />
                  Out of Stock Report
                </button>
                <button
                  onClick={handleExportFiltered}
                  disabled={exporting || filteredProducts.length === 0}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileSpreadsheet size={14} />
                  Current View ({filteredProducts.length} items)
                </button>
              </div>
            </div>
          </div>
        </div>
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
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Search by name or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={18} />}
            className="flex-1 min-w-[200px]"
          />

          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Categories' },
              ...categories.map(cat => ({ value: cat, label: cat }))
            ]}
            className="w-40"
          />

          <Select
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Sizes' },
              ...sizes.map(size => ({ value: size, label: size }))
            ]}
            className="w-32"
          />

          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Stock' },
              { value: 'low', label: 'Low Stock' },
              { value: 'out', label: 'Out of Stock' },
            ]}
            className="w-36"
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
