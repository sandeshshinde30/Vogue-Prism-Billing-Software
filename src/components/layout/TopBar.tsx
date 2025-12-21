import { useState, useEffect } from 'react';
import { User, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export function TopBar() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="text-sm text-gray-600"
      style={{
        padding:'10px'
      }}>
        <span className="font-medium text-gray-800">Vogue Prism</span>
        <span className="mx-2 text-gray-300">•</span>
        <span>Clothing Store</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden sm:flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={15} className="text-gray-400" />
            <span>{format(currentTime, 'dd MMM yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={15} className="text-gray-400" />
            <span className="font-mono tabular-nums">
              {format(currentTime, 'HH:mm:ss')}
            </span>
          </div>
        </div>

        <div className="hidden sm:block h-6 w-px bg-gray-200" />

       
      </div>
    </header>
  );
}