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
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div className="text-sm text-slate-600">
        <span className="font-medium text-slate-800">Vogue Prism</span>
        <span className="mx-2 text-slate-300">•</span>
        <span>Clothing Store</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar size={15} className="text-slate-400" />
            <span>{format(currentTime, 'dd MMM yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Clock size={15} className="text-slate-400" />
            <span className="font-mono tabular-nums">{format(currentTime, 'HH:mm:ss')}</span>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <User size={15} className="text-white" />
          </div>
          <span className="text-sm font-medium text-slate-700">Admin</span>
        </div>
      </div>
    </header>
  );
}
