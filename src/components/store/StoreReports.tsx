import { useStoreContext } from '../../contexts/StoreContext';
import { FileBarChart, Download, BarChart } from 'lucide-react';

export function StoreReports() {
  const { selectedStore, stores } = useStoreContext();

  return (
    <div className="space-y-6">
      {/* Reports Content */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileBarChart className="w-5 h-5 text-blue-600" />
          Store Reports
          {selectedStore !== 'all' && (
            <span className="text-sm font-normal text-gray-500">
              - {stores.find(s => s.id === selectedStore)?.name}
            </span>
          )}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Multi-Store Reports Placeholder */}
          <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Multi-Store Reports</h4>
              <p className="text-gray-500">
                {selectedStore === 'all' 
                  ? 'Combined financial reports from all stores'
                  : 'Detailed reports for selected store'
                }
              </p>
            </div>
          </div>

          {/* Export Options Placeholder */}
          <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <Download className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Export & Download</h4>
              <p className="text-gray-500">
                Export consolidated data with store filters
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="text-indigo-800 text-sm">
            <strong>Coming Soon:</strong> Comprehensive reporting system with multi-store reports, 
            comparative analysis, consolidated exports, and custom report builder with store filters.
          </p>
        </div>
      </div>
    </div>
  );
}