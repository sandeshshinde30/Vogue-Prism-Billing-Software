import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { Card, Button, Input, Select, Modal } from '../components/common';
import { Product, CATEGORIES, SIZES } from '../types';
import toast from 'react-hot-toast';

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = (await window.electronAPI.getProducts()) as Product[];
      setProducts(data);
      setFilteredProducts(data);
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

    if (categoryFilter) {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    if (stockFilter === 'low') {
      filtered = filtered.filter((p) => p.stock <= p.lowStockThreshold && p.stock > 0);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter((p) => p.stock === 0);
    }

    setFilteredProducts(filtered);
  }, [searchQuery, categoryFilter, stockFilter, products]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await window.electronAPI.deleteProduct(id);
      setProducts(products.filter((p) => p.id !== id));
      toast.success('Product deleted');
    } catch (error) {
      toast.error('Error deleting product');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleSave = async (productData: Partial<Product>) => {
    try {
      if (editingProduct) {
        const updated = await window.electronAPI.updateProduct({
          ...editingProduct,
          ...productData,
        });
        setProducts(
          products.map((p) => (p.id === editingProduct.id ? (updated as Product) : p))
        );
        toast.success('Product updated');
      } else {
        const created = await window.electronAPI.createProduct(productData);
        setProducts([...products, created as Product]);
        toast.success('Product created');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Error saving product');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Button onClick={handleAdd}>
          <Plus size={18} className="mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={18} />}
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: '', label: 'All Categories' },
              ...CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
            className="w-48"
          />
          <Select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            options={[
              { value: '', label: 'All Stock' },
              { value: 'low', label: 'Low Stock' },
              { value: 'out', label: 'Out of Stock' },
            ]}
            className="w-40"
          />
        </div>
      </Card>

      {/* Products Table */}
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
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stock
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">
                    P{String(product.id).padStart(3, '0')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {product.name}
                    </span>
                    {product.barcode && (
                      <p className="text-xs text-gray-500 font-mono">
                        {product.barcode}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {product.category}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {product.size || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                    ₹{product.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                        product.stock === 0
                          ? 'bg-red-100 text-red-700'
                          : product.stock <= product.lowStockThreshold
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {product.stock <= product.lowStockThreshold &&
                        product.stock > 0 && <AlertTriangle size={14} />}
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded ml-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        onSave={handleSave}
      />
    </div>
  );
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: (data: Partial<Product>) => void;
}

function ProductModal({ isOpen, onClose, product, onSave }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: CATEGORIES[0],
    size: '',
    barcode: '',
    price: '',
    stock: '',
    lowStockThreshold: '5',
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        size: product.size || '',
        barcode: product.barcode || '',
        price: String(product.price),
        stock: String(product.stock),
        lowStockThreshold: String(product.lowStockThreshold),
      });
    } else {
      setFormData({
        name: '',
        category: CATEGORIES[0],
        size: '',
        barcode: '',
        price: '',
        stock: '0',
        lowStockThreshold: '5',
      });
    }
  }, [product, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      category: formData.category,
      size: formData.size,
      barcode: formData.barcode,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      lowStockThreshold: parseInt(formData.lowStockThreshold),
    });
  };

  const generateBarcode = () => {
    const barcode = `VP${Date.now().toString().slice(-10)}`;
    setFormData({ ...formData, barcode });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add New Product'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Product Name *"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Category *"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <Select
            label="Size"
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            options={[
              { value: '', label: 'No Size' },
              ...SIZES.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              label="Barcode"
              value={formData.barcode}
              onChange={(e) =>
                setFormData({ ...formData, barcode: e.target.value })
              }
              className="font-mono"
            />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="secondary" onClick={generateBarcode}>
              Generate
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Selling Price *"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
            min="0"
            step="0.01"
          />
          <Input
            label="Stock *"
            type="number"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            required
            min="0"
          />
        </div>

        <Input
          label="Low Stock Alert Threshold"
          type="number"
          value={formData.lowStockThreshold}
          onChange={(e) =>
            setFormData({ ...formData, lowStockThreshold: e.target.value })
          }
          min="0"
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {product ? 'Update Product' : 'Save Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
