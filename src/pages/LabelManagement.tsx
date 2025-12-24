import { useEffect, useState, useRef } from "react";
import { Printer, Search, RefreshCw, Download, Upload, Settings as SettingsIcon, Plus, Minus, Tag, X, Package, Sliders, Move } from "lucide-react";
import { Card, Button, Input, Select } from "../components/common";
import { Product, PrinterInfo } from "../types";
import { LabelData, LabelSettings, DEFAULT_LABEL_TEMPLATE } from "../types/label";
import { exportTemplate, importTemplate } from "../utils/labelPrinter";
import toast from "react-hot-toast";

interface LabelDataWithQty extends LabelData {
  quantity: number;
}

interface LabelDesign {
  logoWidth: number;
  logoGap: number;
  barcodeWidth: number;
  barcodeHeight: number;
  barcodeTextSize: number;
  priceSize: number;
}

const DEFAULT_DESIGN: LabelDesign = {
  logoWidth: 18,
  logoGap: 2,
  barcodeWidth: 1.2,
  barcodeHeight: 30,
  barcodeTextSize: 10,
  priceSize: 16,
};

export function openLabelPreviewForProduct(product: Product, printerName: string = "") {
  const labelData: LabelDataWithQty = {
    barcode: product.barcode || product.name.toLowerCase().replace(/\s+/g, "") + (product.size || ""),
    name: product.name,
    price: product.price,
    size: product.size,
    quantity: product.stock || 1,
  };
  openLabelPreviewWindow([labelData], printerName);
}

function openLabelPreviewWindow(labels: LabelDataWithQty[], printerName: string) {
  const width = 900;
  const height = 650;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  const previewWindow = window.open("", "LabelPreview", 
    `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`);
  if (previewWindow) {
    previewWindow.document.write(generateLabelPreviewHTML(labels, printerName));
    previewWindow.document.close();
  }
}
