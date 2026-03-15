import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ShoppingCart, Layers, X, Search, Tag, Package2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

interface ComboProduct {
  productId: number; productName: string; quantity: number;
  price: number; stock: number; size?: string; category?: string; costPrice?: number;
}
interface Combo {
  id: number; name: string; description?: string; comboPrice?: number | null;
  items: ComboProduct[]; createdAt: string;
}
interface ProductOption {
  id: number; name: string; price: number; stock: number;
  size?: string; category?: string; costPrice?: number; isActive?: boolean;
}
const emptyForm = { name: '', description: '', comboPrice: '', items: [] as { productId: number; quantity: number }[] };
const ACCENT = '#22c55e';
const CARD_COLORS = ['#f0fdf4','#eff6ff','#fdf4ff','#fff7ed','#f0fdfa','#fef2f2'];
const ICON_COLORS = ['#16a34a','#2563eb','#9333ea','#ea580c','#0d9488','#dc2626'];

export function Combos() {
  const { addToCart, setDiscountAmount } = useStore();
  const navigate = useNavigate();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [productSearch, setProductSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Combo | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => { loadCombos(); loadProducts(); }, []);

  const loadCombos = async () => {
    setLoading(true);
    try { setCombos(await (window.electronAPI as any).getCombos()); }
    catch { toast.error('Failed to load combos'); }
    setLoading(false);
  };

  const loadProducts = async () => {
    try { setProducts(await window.electronAPI.getProducts() as ProductOption[]); }
    catch { toast.error('Failed to load products'); }
  };

  const openCreate = () => { setEditingCombo(null); setForm(emptyForm); setProductSearch(''); setShowModal(true); };
  const openEdit = (c: Combo) => {
    setEditingCombo(c);
    setForm({ name: c.name, description: c.description || '', comboPrice: c.comboPrice != null ? String(c.comboPrice) : '', items: c.items.map(i => ({ productId: i.productId, quantity: i.quantity })) });
    setProductSearch(''); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Combo name is required'); return; }
    if (form.items.length === 0) { toast.error('Add at least one product'); return; }
    const parsedComboPrice = form.comboPrice !== '' ? parseFloat(form.comboPrice) : null;
    if (parsedComboPrice !== null && parsedComboPrice >= formTotal && formTotal > 0) {
      toast.error('Combo price must be less than the total to apply a discount');
      return;
    }
    try {
      const payload = { name: form.name, description: form.description, comboPrice: parsedComboPrice, items: form.items };
      if (editingCombo) { await (window.electronAPI as any).updateCombo(editingCombo.id, payload); toast.success('Combo updated'); }
      else { await (window.electronAPI as any).createCombo(payload); toast.success('Combo created'); }
      setShowModal(false); loadCombos();
    } catch { toast.error('Failed to save combo'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await (window.electronAPI as any).deleteCombo(deleteConfirm.id); toast.success('Combo deleted'); setDeleteConfirm(null); loadCombos(); }
    catch { toast.error('Failed to delete combo'); }
  };

  const handleAddToCart = (combo: Combo) => {
    let added = 0; const failed: string[] = [];
    for (const item of combo.items) {
      const p = products.find(x => x.id === item.productId);
      if (!p) continue;
      for (let i = 0; i < item.quantity; i++) {
        const ok = addToCart({ id: p.id, name: item.productName, price: item.price, stock: item.stock, category: item.category || '', size: item.size || '', barcode: '', costPrice: item.costPrice || 0, lowStockThreshold: 5, isActive: true, isDiscountLocked: false, createdAt: '', updatedAt: '' } as any);
        if (ok) added++; else { failed.push(item.productName); break; }
      }
    }
    if (failed.length) {
      toast.error(`Stock limit reached: ${failed.join(', ')}`);
      return;
    }
    // Apply combo price as discount if set and lower than total
    const total = comboTotal(combo);
    if (combo.comboPrice != null && combo.comboPrice < total) {
      const discount = Math.round((total - combo.comboPrice) * 100) / 100;
      setDiscountAmount(discount);
      toast.success(`${combo.name} added — ₹${discount.toLocaleString()} discount applied`);
    } else {
      toast.success(`${combo.name} — ${added} items added`);
    }
    navigate('/billing');
  };

  const addItem = (id: number) => {
    if (form.items.find(i => i.productId === id)) return;
    setForm(f => ({ ...f, items: [...f.items, { productId: id, quantity: 1 }] }));
  };
  const removeItem = (id: number) => setForm(f => ({ ...f, items: f.items.filter(i => i.productId !== id) }));
  const setQty = (id: number, q: number) => { if (q < 1) return; setForm(f => ({ ...f, items: f.items.map(i => i.productId === id ? { ...i, quantity: q } : i) })); };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && p.isActive !== false);
  const filteredCombos = combos.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const comboTotal = (c: Combo) => c.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const formTotal = form.items.reduce((s, i) => { const p = products.find(x => x.id === i.productId); return s + (p ? p.price * i.quantity : 0); }, 0);
  const formComboPriceNum = form.comboPrice !== '' ? parseFloat(form.comboPrice) : null;
  const formDiscount = formComboPriceNum !== null && formComboPriceNum < formTotal ? formTotal - formComboPriceNum : 0;
  const formDiscountPct = formTotal > 0 && formDiscount > 0 ? (formDiscount / formTotal) * 100 : 0;

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Layers size={22} style={{ color: ACCENT }} /> Combos
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '3px' }}>{combos.length} combo{combos.length !== 1 ? 's' : ''} saved</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search combos..."
              style={{ padding: '8px 12px 8px 30px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', width: '200px', backgroundColor: 'white' }} />
          </div>
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', backgroundColor: ACCENT, color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
            <Plus size={15} /> New Combo
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #f1f5f9', borderTop: `3px solid ${ACCENT}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          Loading combos...
        </div>
      ) : filteredCombos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: '#f0fdf4', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Layers size={28} style={{ color: ACCENT }} />
          </div>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>{search ? 'No combos match your search' : 'No combos yet'}</p>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px' }}>Bundle products together for quick billing</p>
          {!search && <button onClick={openCreate} style={{ padding: '9px 20px', backgroundColor: ACCENT, color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Create First Combo</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredCombos.map((combo, idx) => {
            const bg = CARD_COLORS[idx % CARD_COLORS.length];
            const ic = ICON_COLORS[idx % ICON_COLORS.length];
            const total = comboTotal(combo);
            return (
              <div key={combo.id} style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Coloured top strip */}
                <div style={{ backgroundColor: bg, padding: '16px 16px 12px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: `${ic}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package2 size={18} style={{ color: ic }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{combo.name}</h3>
                        {combo.description && <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{combo.description}</p>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', flexShrink: 0 }}>
                      <button onClick={() => openEdit(combo)} title="Edit" style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={13} /></button>
                      <button onClick={() => setDeleteConfirm(combo)} title="Delete" style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fff5f5', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '500', color: '#6b7280', backgroundColor: 'white', padding: '2px 8px', borderRadius: '20px', border: '1px solid #e5e7eb' }}>
                      {combo.items.length} item{combo.items.length !== 1 ? 's' : ''}
                    </span>
                    {combo.comboPrice != null && combo.comboPrice < comboTotal(combo) ? (
                      <>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', backgroundColor: 'white', padding: '2px 8px', borderRadius: '20px', border: '1px solid #e5e7eb', textDecoration: 'line-through' }}>
                          ₹{comboTotal(combo).toLocaleString()}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: ic, backgroundColor: 'white', padding: '2px 8px', borderRadius: '20px', border: `1px solid ${ic}30` }}>
                          ₹{combo.comboPrice.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                          Save ₹{(comboTotal(combo) - combo.comboPrice).toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: '11px', fontWeight: '700', color: ic, backgroundColor: 'white', padding: '2px 8px', borderRadius: '20px', border: `1px solid ${ic}30` }}>
                        ₹{comboTotal(combo).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items list */}
                <div style={{ flex: 1, padding: '10px 14px' }}>
                  {combo.items.slice(0, 4).map(item => (
                    <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f9fafb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <Tag size={11} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.productName}</span>
                        {item.size && <span style={{ fontSize: '10px', color: '#9ca3af', flexShrink: 0 }}>({item.size})</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>×{item.quantity}</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#111827' }}>₹{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  {combo.items.length > 4 && (
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', textAlign: 'center' }}>+{combo.items.length - 4} more item{combo.items.length - 4 !== 1 ? 's' : ''}</p>
                  )}
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 14px', borderTop: '1px solid #f3f4f6' }}>
                  <button onClick={() => handleAddToCart(combo)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '9px', backgroundColor: ACCENT, color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    <ShoppingCart size={14} /> Add All to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '28px', width: '340px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ width: '44px', height: '44px', backgroundColor: '#fef2f2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Trash2 size={20} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>Delete "{deleteConfirm.name}"?</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '22px' }}>This combo will be removed. This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '700px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

            {/* Modal header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', backgroundColor: '#f0fdf4', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={16} style={{ color: ACCENT }} />
                </div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>{editingCombo ? 'Edit Combo' : 'New Combo'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Name + description row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Combo Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Summer Outfit"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Two-column picker */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Left: product list */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Products</label>
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search..."
                      style={{ width: '100%', padding: '7px 10px 7px 28px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#f9fafb' }} />
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', maxHeight: '240px', overflowY: 'auto', backgroundColor: '#fafafa' }}>
                    {filteredProducts.length === 0
                      ? <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No products</div>
                      : filteredProducts.map(p => {
                          const added = !!form.items.find(i => i.productId === p.id);
                          return (
                            <button key={p.id} onClick={() => addItem(p.id)} disabled={added}
                              style={{ width: '100%', padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', borderBottom: '1px solid #f3f4f6', background: added ? '#f0fdf4' : 'transparent', cursor: added ? 'default' : 'pointer', textAlign: 'left' }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '13px', color: '#111827', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}{p.size ? ` (${p.size})` : ''}</div>
                                <div style={{ fontSize: '11px', color: p.stock > 0 ? '#9ca3af' : '#ef4444' }}>Stock: {p.stock}</div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: ACCENT }}>₹{p.price}</div>
                                {added && <div style={{ fontSize: '10px', color: ACCENT }}>✓ Added</div>}
                              </div>
                            </button>
                          );
                        })}
                  </div>
                </div>

                {/* Right: selected items */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Selected ({form.items.length})
                  </label>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', flex: 1, overflowY: 'auto', maxHeight: '240px', backgroundColor: '#fafafa' }}>
                    {form.items.length === 0
                      ? <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>← Pick products</div>
                      : form.items.map(item => {
                          const p = products.find(x => x.id === item.productId);
                          if (!p) return null;
                          return (
                            <div key={item.productId} style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '12px', color: '#111827', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>₹{(p.price * item.quantity).toLocaleString()}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                <button onClick={() => setQty(item.productId, item.quantity - 1)} style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>−</button>
                                <span style={{ fontSize: '12px', fontWeight: '700', minWidth: '18px', textAlign: 'center' }}>{item.quantity}</span>
                                <button onClick={() => setQty(item.productId, item.quantity + 1)} style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>+</button>
                              </div>
                              <button onClick={() => removeItem(item.productId)} style={{ width: '20px', height: '20px', borderRadius: '4px', border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={13} /></button>
                            </div>
                          );
                        })}
                  </div>
                  {form.items.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* MRP total */}
                      <div style={{ padding: '9px 12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>MRP Total</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#374151' }}>₹{formTotal.toLocaleString()}</span>
                      </div>

                      {/* Combo price input */}
                      <div style={{ padding: '10px 12px', backgroundColor: '#fffbeb', borderRadius: '8px', border: `2px solid ${formDiscount > 0 ? '#f59e0b' : '#fde68a'}` }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#92400e', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Set Combo Price (optional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={form.comboPrice}
                          onChange={e => setForm(f => ({ ...f, comboPrice: e.target.value }))}
                          placeholder={`e.g. ${Math.round(formTotal * 0.9)}`}
                          style={{ width: '100%', padding: '7px 10px', border: '1px solid #fcd34d', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white', fontWeight: '600' }}
                        />
                        {formDiscount > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '500' }}>Discount applied</span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '20px' }}>
                                −₹{formDiscount.toLocaleString()} ({formDiscountPct.toFixed(1)}% off)
                              </span>
                            </div>
                          </div>
                        )}
                        {form.comboPrice !== '' && formComboPriceNum !== null && formComboPriceNum >= formTotal && (
                          <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px' }}>Price must be less than MRP total to apply a discount</p>
                        )}
                      </div>

                      {/* Final price */}
                      {formDiscount > 0 && (
                        <div style={{ padding: '9px 12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>Combo Price</span>
                          <span style={{ fontSize: '15px', fontWeight: '800', color: ACCENT }}>₹{formComboPriceNum!.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: ACCENT, color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                {editingCombo ? 'Update Combo' : 'Create Combo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
