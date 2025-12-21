import React, { useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Product } from '../../types';
import toast from 'react-hot-toast';

export function BarcodeInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { addToCart, setSearchQuery } = useStore();

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const barcode = formData.get('barcode') as string;

    if (!barcode.trim()) return;

    try {
      const product = (await window.electronAPI.getProductByBarcode(barcode.trim())) as Product | null;

      if (product) {
        if (product.stock <= 0) {
          toast.error(`${product.name} is out of stock!`);
        } else {
          addToCart(product);
          toast.success(`Added ${product.name}`);
        }
      } else {
        setSearchQuery(barcode.trim());
        toast.error('Product not found. Searching...');
      }
    } catch (error) {
      toast.error('Error scanning barcode');
    }

    (e.target as HTMLFormElement).reset();
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '16px' }}>
      <div 
        className="relative"
        style={{ position: 'relative' }}
      >
        {/* <Barcode 
          size={18} 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            pointerEvents: 'none'
          }}
        /> */}
        <input
          ref={inputRef}
          name="barcode"
          placeholder="Scan barcode or type to search (F2)"
          autoComplete="off"
          className="w-full h-11 pl-10 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
          style={{
            width: '100%',
            height: '44px',
            paddingLeft: '40px',
            paddingRight: '16px',
            fontSize: '14px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#1e293b',
            outline: 'none',
            transition: 'all 0.2s ease'
          }}
          onFocus={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.borderColor = '#22c55e';
            e.target.style.boxShadow = '0 0 0 1px #22c55e';
          }}
          onBlur={(e) => {
            e.target.style.backgroundColor = '#f8fafc';
            e.target.style.borderColor = '#e2e8f0';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>
    </form>
  );
}