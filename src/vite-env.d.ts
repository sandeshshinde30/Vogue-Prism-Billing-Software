/// <reference types="vite/client" />

interface ElectronAPI {
  createProduct: (product: {
    name: string;
    category: string;
    size?: string;
    barcode?: string;
    price: number;
    stock: number;
    lowStockThreshold: number;
  }) => Promise<any>;
  getProducts: () => Promise<any[]>;
  getProductById: (id: number) => Promise<any>;
  updateProduct: (product: {
    id: number;
    name?: string;
    category?: string;
    size?: string;
    barcode?: string;
    price?: number;
    stock?: number;
    lowStockThreshold?: number;
  }) => Promise<any>;
  deleteProduct: (id: number) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}