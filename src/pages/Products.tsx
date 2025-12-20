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
    <div 
      className="space-y-6"
      style={{
        width: '100%',
        maxWidth: 'none',
        margin: '0',
        padding: '0'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between"
        style={{
          marginBottom: '24px'
        }}
      >
        <div>
          <h1 
            className="text-2xl font-bold text-gray-900"
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '4px'
            }}
          >
            Products
          </h1>
          <p 
            className="text-sm text-gray-600"
            style={{
              fontSize: '14px',
              color: '#6b7280'
            }}
          >
            Manage your product inventory
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus size={18} className="mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
             
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
              className="w-full sm:w-48"
            />
            <Select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              options={[
                { value: '', label: 'All Stock' },
                { value: 'low', label: 'Low Stock' },
                { value: 'out', label: 'Out of Stock' },
              ]}
              className="w-full sm:w-40"
            />
          </div>
        </div>
      </Card>

      {/* Products Table */}
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
              className="w-full min-w-[800px]"
              style={{
                width: '100%',
                minWidth: '800px',
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
                    ID
                  </th>
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
                    Product Details
                  </th>
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
                    Category
                  </th>
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
                    Size
                  </th>
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
                    Price
                  </th>
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
                    Stock
                  </th>
                  <th 
                    className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{
                      padding: '16px 24px',
                      textAlign: 'right',
                      fontSize: '11px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500"
                      style={{
                        padding: '16px 24px',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: '#6b7280'
                      }}
                    >
                      P{String(product.id).padStart(3, '0')}
                    </td>
                    <td 
                      className="px-6 py-4"
                      style={{
                        padding: '16px 24px'
                      }}
                    >
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
                        {product.barcode && (
                          <div 
                            className="text-xs text-gray-500 font-mono mt-1"
                            style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              fontFamily: 'JetBrains Mono, monospace',
                              marginTop: '4px'
                            }}
                          >
                            {product.barcode}
                          </div>
                        )}
                      </div>
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap"
                      style={{
                        padding: '16px 24px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"
                      style={{
                        padding: '16px 24px',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                        color: '#4b5563'
                      }}
                    >
                      {product.size || '-'}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900"
                      style={{
                        padding: '16px 24px',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: '500',
                        color: '#111827'
                      }}
                    >
                      ₹{product.price.toLocaleString()}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap"
                      style={{
                        padding: '16px 24px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.stock === 0
                            ? 'bg-red-100 text-red-700'
                            : product.stock <= product.lowStockThreshold
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {product.stock <= product.lowStockThreshold &&
                          product.stock > 0 && <AlertTriangle size={12} />}
                        {product.stock}
                      </span>
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                      style={{
                        padding: '16px 24px',
                        whiteSpace: 'nowrap',
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit product"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
