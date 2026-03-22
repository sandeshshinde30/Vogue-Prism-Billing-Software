

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
  theme?: 'orange' | 'green' | 'blue';
}

export function Pagination({ 
  currentPage, 
  totalItems, 
  pageSize, 
  onPageChange, 
  className = '',
  theme = 'blue'
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  
  if (totalPages <= 1) return null;

  const getThemeColor = () => {
    switch (theme) {
      case 'orange': return '#f97316';
      case 'green': return '#22c55e';
      case 'blue': return '#3b82f6';
      default: return '#3b82f6';
    }
  };

  const themeColor = getThemeColor();

  return (
    <div className={`flex justify-between items-center mt-4 pt-4 border-t border-gray-200 ${className}`}>
      <span className="text-sm text-gray-600">
        Page {currentPage} of {totalPages} &nbsp;·&nbsp; 
        Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
      </span>
      
      <div className="flex gap-1.5">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          «
        </button>
        
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          ‹ Prev
        </button>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .reduce<(number | '...')[]>((acc, p, i, arr) => {
            if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) {
              acc.push('...');
            }
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) => p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 py-1.5 text-sm text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md transition-colors"
              style={{
                backgroundColor: currentPage === p ? themeColor : 'white',
                color: currentPage === p ? 'white' : '#374151',
                fontWeight: currentPage === p ? '600' : '400'
              }}
            >
              {p}
            </button>
          ))}
        
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Next ›
        </button>
        
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          »
        </button>
      </div>
    </div>
  );
}