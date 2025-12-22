import * as XLSX from 'xlsx';
import { Product } from '../types';

export interface StockExportData {
  'Product Name': string;
  'Category': string;
  'Size': string;
  'Barcode': string;
  'Price (₹)': number;
  'Current Stock': number;
  'Low Stock Threshold': number;
  'Stock Status': string;
  'Stock Value (₹)': number;
  'Status': string;
  'Created Date': string;
  'Last Updated': string;
}

export class StockExporter {
  static formatProductsForExport(products: Product[]): StockExportData[] {
    return products.map(product => ({
      'Product Name': product.name,
      'Category': typeof product.category === 'string' ? product.category : product.category,
      'Size': typeof product.size === 'string' ? product.size : product.size,
      'Barcode': product.barcode || 'N/A',
      'Price (₹)': product.price,
      'Current Stock': product.stock,
      'Low Stock Threshold': product.lowStockThreshold,
      'Stock Status': this.getStockStatus(product),
      'Stock Value (₹)': product.stock * product.price,
      'Status': product.isActive ? 'Active' : 'Inactive',
      'Created Date': new Date(product.createdAt).toLocaleDateString(),
      'Last Updated': new Date(product.updatedAt).toLocaleDateString()
    }));
  }

  static getStockStatus(product: Product): string {
    if (product.stock === 0) return 'Out of Stock';
    if (product.stock <= product.lowStockThreshold) return 'Low Stock';
    return 'In Stock';
  }

  static exportToExcel(products: Product[], filename?: string): void {
    try {
      // Format data for export
      const exportData = this.formatProductsForExport(products);
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const columnWidths = [
        { wch: 25 }, // Product Name
        { wch: 15 }, // Category
        { wch: 10 }, // Size
        { wch: 15 }, // Barcode
        { wch: 12 }, // Price
        { wch: 12 }, // Current Stock
        { wch: 15 }, // Low Stock Threshold
        { wch: 12 }, // Stock Status
        { wch: 15 }, // Stock Value
        { wch: 10 }, // Status
        { wch: 12 }, // Created Date
        { wch: 12 }  // Last Updated
      ];
      worksheet['!cols'] = columnWidths;

      // Add conditional formatting for stock status
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let row = 1; row <= range.e.r; row++) {
        const stockStatusCell = `H${row + 1}`;
        
        // You can add more sophisticated formatting here if needed
        if (worksheet[stockStatusCell]) {
          const status = worksheet[stockStatusCell].v;
          if (status === 'Out of Stock') {
            worksheet[stockStatusCell].s = {
              fill: { fgColor: { rgb: 'FFEBEE' } },
              font: { color: { rgb: 'C62828' } }
            };
          } else if (status === 'Low Stock') {
            worksheet[stockStatusCell].s = {
              fill: { fgColor: { rgb: 'FFF3E0' } },
              font: { color: { rgb: 'F57C00' } }
            };
          }
        }
      }

      // Add summary sheet
      const summaryData = this.generateSummaryData(products);
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [{ wch: 25 }, { wch: 15 }];

      // Add worksheets to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Details');
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

      // Generate filename
      const defaultFilename = `stock-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      const finalFilename = filename || defaultFilename;

      // Write file
      XLSX.writeFile(workbook, finalFilename);
      
      return;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error('Failed to export stock data to Excel');
    }
  }

  static generateSummaryData(products: Product[]) {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.isActive).length;
    const inactiveProducts = totalProducts - activeProducts;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
    const inStock = products.filter(p => p.stock > p.lowStockThreshold).length;
    const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const averagePrice = products.length > 0 ? products.reduce((sum, p) => sum + p.price, 0) / products.length : 0;
    const totalStockQuantity = products.reduce((sum, p) => sum + p.stock, 0);

    // Get categories
    const categories = [...new Set(products.map(p => 
      typeof p.category === 'string' ? p.category : p.category
    ))];

    const categoryBreakdown = categories.map(category => {
      const categoryProducts = products.filter(p => 
        (typeof p.category === 'string' ? p.category : p.category) === category
      );
      return {
        'Metric': `${category} Products`,
        'Value': categoryProducts.length.toString()
      };
    });

    return [
      { 'Metric': 'Total Products', 'Value': totalProducts.toString() },
      { 'Metric': 'Active Products', 'Value': activeProducts.toString() },
      { 'Metric': 'Inactive Products', 'Value': inactiveProducts.toString() },
      { 'Metric': '', 'Value': '' }, // Empty row
      { 'Metric': 'Stock Status', 'Value': '' },
      { 'Metric': 'In Stock', 'Value': inStock.toString() },
      { 'Metric': 'Low Stock', 'Value': lowStock.toString() },
      { 'Metric': 'Out of Stock', 'Value': outOfStock.toString() },
      { 'Metric': '', 'Value': '' }, // Empty row
      { 'Metric': 'Financial Summary', 'Value': '' },
      { 'Metric': 'Total Stock Value', 'Value': `₹${totalStockValue.toFixed(2)}` },
      { 'Metric': 'Average Product Price', 'Value': `₹${averagePrice.toFixed(2)}` },
      { 'Metric': 'Total Stock Quantity', 'Value': totalStockQuantity.toString() },
      { 'Metric': '', 'Value': '' }, // Empty row
      { 'Metric': 'Category Breakdown', 'Value': '' },
      ...categoryBreakdown,
      { 'Metric': '', 'Value': '' }, // Empty row
      { 'Metric': 'Report Generated', 'Value': new Date().toLocaleString() }
    ];
  }

  static exportLowStockReport(products: Product[], filename?: string): void {
    const lowStockProducts = products.filter(p => 
      p.stock <= p.lowStockThreshold && p.isActive
    );
    
    if (lowStockProducts.length === 0) {
      throw new Error('No low stock products found');
    }

    const defaultFilename = `low-stock-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    this.exportToExcel(lowStockProducts, filename || defaultFilename);
  }

  static exportOutOfStockReport(products: Product[], filename?: string): void {
    const outOfStockProducts = products.filter(p => p.stock === 0 && p.isActive);
    
    if (outOfStockProducts.length === 0) {
      throw new Error('No out of stock products found');
    }

    const defaultFilename = `out-of-stock-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    this.exportToExcel(outOfStockProducts, filename || defaultFilename);
  }

  static exportCategoryReport(products: Product[], category: string, filename?: string): void {
    const categoryProducts = products.filter(p => 
      (typeof p.category === 'string' ? p.category : p.category) === category
    );
    
    if (categoryProducts.length === 0) {
      throw new Error(`No products found in category: ${category}`);
    }

    const defaultFilename = `${category.toLowerCase().replace(/\s+/g, '-')}-stock-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    this.exportToExcel(categoryProducts, filename || defaultFilename);
  }
}

// Utility functions for stock analysis
export const StockAnalytics = {
  getTotalStockValue: (products: Product[]): number => {
    return products.reduce((sum, product) => sum + (product.stock * product.price), 0);
  },

  getLowStockProducts: (products: Product[]): Product[] => {
    return products.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold && p.isActive);
  },

  getOutOfStockProducts: (products: Product[]): Product[] => {
    return products.filter(p => p.stock === 0 && p.isActive);
  },

  getCategoryStats: (products: Product[]) => {
    const categories = [...new Set(products.map(p => 
      typeof p.category === 'string' ? p.category : p.category
    ))];

    return categories.map(category => {
      const categoryProducts = products.filter(p => 
        (typeof p.category === 'string' ? p.category : p.category) === category
      );
      
      return {
        category,
        totalProducts: categoryProducts.length,
        totalValue: categoryProducts.reduce((sum, p) => sum + (p.stock * p.price), 0),
        totalQuantity: categoryProducts.reduce((sum, p) => sum + p.stock, 0),
        lowStock: categoryProducts.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold).length,
        outOfStock: categoryProducts.filter(p => p.stock === 0).length
      };
    });
  },

  getTopValueProducts: (products: Product[], limit: number = 10): Product[] => {
    return products
      .filter(p => p.isActive)
      .sort((a, b) => (b.stock * b.price) - (a.stock * a.price))
      .slice(0, limit);
  },

  getStockMovementNeeded: (products: Product[]): Array<{product: Product, suggestedOrder: number}> => {
    return products
      .filter(p => p.stock <= p.lowStockThreshold && p.isActive)
      .map(product => ({
        product,
        suggestedOrder: Math.max(product.lowStockThreshold * 2 - product.stock, 0)
      }))
      .sort((a, b) => b.suggestedOrder - a.suggestedOrder);
  }
};