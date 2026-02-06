import * as XLSX from 'xlsx';

interface DailySale {
  date: string;
  cashAmount: number;
  upiAmount: number;
  totalAmount: number;
  profitAmount: number;
  profitMargin: number;
}

interface Expense {
  name: string;
  amount: number;
}

export function exportDailySummaryToExcel(
  sales: DailySale[],
  expenses: Expense[],
  materialCost: number,
  storeName: string,
  filename: string
): void {
  const workbook = XLSX.utils.book_new();

  // Prepare data rows
  const dataRows: any[] = [];
  
  // Add header row
  dataRows.push({
    NO: 'NO',
    DATE: 'DATE',
    CASH: 'CASH',
    'UPI/IN AMOUNT': 'UPI/IN AMOUNT',
    'TOTAL AMOUNT': 'TOTAL AMOUNT',
    'PROFIT AMOUNT': 'PROFIT AMOUNT',
    'MAT PROFIT': 'MAT PROFIT',
    'EX KHARCH NAME': 'EX KHARCH NAME',
    'RS': 'RS',
    'RCHES MATER NAME': 'RCHES MATER NAME',
    'AMOUT': 'AMOUT',
  });

  // Add sales data
  let totalCash = 0;
  let totalUpi = 0;
  let totalAmount = 0;
  let totalProfit = 0;
  
  sales.forEach((sale, index) => {
    totalCash += sale.cashAmount;
    totalUpi += sale.upiAmount;
    totalAmount += sale.totalAmount;
    totalProfit += sale.profitAmount;
    
    const row: any = {
      NO: index + 1,
      DATE: sale.date,
      CASH: sale.cashAmount,
      'UPI/IN AMOUNT': sale.upiAmount,
      'TOTAL AMOUNT': sale.totalAmount,
      'PROFIT AMOUNT': sale.profitAmount,
      'MAT PROFIT': sale.profitMargin.toFixed(2) + '%',
      'EX KHARCH NAME': '',
      'RS': '',
      'RCHES MATER NAME': '',
      'AMOUT': '',
    };
    
    // Add expense data to corresponding rows
    if (index < expenses.length) {
      row['EX KHARCH NAME'] = expenses[index].name;
      row['RS'] = expenses[index].amount;
    }
    
    dataRows.push(row);
  });

  // Add remaining expenses if more than sales days
  for (let i = sales.length; i < expenses.length; i++) {
    dataRows.push({
      NO: '',
      DATE: '',
      CASH: '',
      'UPI/IN AMOUNT': '',
      'TOTAL AMOUNT': '',
      'PROFIT AMOUNT': '',
      'MAT PROFIT': '',
      'EX KHARCH NAME': expenses[i].name,
      'RS': expenses[i].amount,
      'RCHES MATER NAME': '',
      'AMOUT': '',
    });
  }

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Add empty rows before totals
  dataRows.push({});
  dataRows.push({});

  // Add TOTAL row
  dataRows.push({
    NO: '',
    DATE: 'TOTAL',
    CASH: '',
    'UPI/IN AMOUNT': '',
    'TOTAL AMOUNT': totalAmount,
    'PROFIT AMOUNT': totalProfit,
    'MAT PROFIT': totalAmount > 0 ? ((totalProfit / totalAmount) * 100).toFixed(2) + '%' : '0%',
    'EX KHARCH NAME': '',
    'RS': totalExpenses,
    'RCHES MATER NAME': '',
    'AMOUT': '',
  });

  // Add summary boxes
  dataRows.push({});
  dataRows.push({
    NO: 'TOTAL SALE',
    DATE: totalAmount,
    CASH: 'PROFIT',
    'UPI/IN AMOUNT': totalProfit,
    'TOTAL AMOUNT': '',
    'PROFIT AMOUNT': 'MATERL COST',
    'MAT PROFIT': materialCost,
    'EX KHARCH NAME': '',
    'RS': '',
    'RCHES MATER NAME': '',
    'AMOUT': '',
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(dataRows, { skipHeader: true });

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },   // NO
    { wch: 12 },  // DATE
    { wch: 10 },  // CASH
    { wch: 12 },  // UPI/IN AMOUNT
    { wch: 12 },  // TOTAL AMOUNT
    { wch: 14 },  // PROFIT AMOUNT
    { wch: 12 },  // MAT PROFIT
    { wch: 15 },  // EX KHARCH NAME
    { wch: 10 },  // RS
    { wch: 18 },  // RCHES MATER NAME
    { wch: 10 },  // AMOUT
  ];

  // Apply styling
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Style header row (row 0)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    
    worksheet[cellAddress].s = {
      fill: { fgColor: { rgb: "4472C4" } },
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "medium", color: { rgb: "000000" } },
        bottom: { style: "medium", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
  }

  // Style data rows with alternating colors
  for (let row = 1; row <= sales.length; row++) {
    const isEven = row % 2 === 0;
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        fill: { fgColor: { rgb: isEven ? "F2F2F2" : "FFFFFF" } },
        alignment: { horizontal: col === 0 || col === 1 ? "left" : "right", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "D0D0D0" } },
          bottom: { style: "thin", color: { rgb: "D0D0D0" } },
          left: { style: "thin", color: { rgb: "D0D0D0" } },
          right: { style: "thin", color: { rgb: "D0D0D0" } }
        }
      };
      
      // Highlight profit columns in green
      if (col === 5 || col === 6) { // PROFIT AMOUNT and MAT PROFIT columns
        worksheet[cellAddress].s.font = { color: { rgb: "008000" }, bold: true };
      }
      
      // Highlight expense columns in red
      if (col === 8) { // RS column
        worksheet[cellAddress].s.font = { color: { rgb: "FF0000" } };
      }
    }
  }

  // Style TOTAL row
  const totalRowIndex = sales.length + 3;
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: totalRowIndex, c: col });
    if (!worksheet[cellAddress]) continue;
    
    worksheet[cellAddress].s = {
      fill: { fgColor: { rgb: "FFC000" } },
      font: { bold: true, sz: 12 },
      alignment: { horizontal: "right", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "000000" } },
        bottom: { style: "medium", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
  }

  // Style summary boxes row
  const summaryRowIndex = totalRowIndex + 2;
  const summaryBoxes = [
    { col: 0, bgColor: "FF8C00" },  // TOTAL SALE - Orange
    { col: 2, bgColor: "00B050" },  // PROFIT - Green
    { col: 5, bgColor: "FF0000" },  // MATERL COST - Red
  ];
  
  for (const box of summaryBoxes) {
    for (let c = box.col; c <= box.col + 1; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r: summaryRowIndex, c });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        fill: { fgColor: { rgb: box.bgColor } },
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "medium", color: { rgb: "000000" } },
          bottom: { style: "medium", color: { rgb: "000000" } },
          left: { style: "medium", color: { rgb: "000000" } },
          right: { style: "medium", color: { rgb: "000000" } }
        }
      };
    }
  }

  // Add title at the top
  XLSX.utils.sheet_add_aoa(worksheet, [[storeName]], { origin: 'A1' });
  worksheet['A1'].s = {
    font: { bold: true, sz: 16, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };
  
  // Merge title cells
  if (!worksheet['!merges']) worksheet['!merges'] = [];
  worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } });

  // Shift all data down by 1 row to make room for title
  const newRange = { s: { r: 0, c: 0 }, e: { r: range.e.r + 1, c: range.e.c } };
  worksheet['!ref'] = XLSX.utils.encode_range(newRange);

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Summary');
  XLSX.writeFile(workbook, filename);
}
