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
    <header 
      className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6"
      style={{ 
        height: '56px', 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px'
      }}
    >
      <div className="text-sm text-slate-600" style={{ fontSize: '14px', color: '#475569' }}>
        <span className="font-medium text-slate-800" style={{ fontWeight: '500', color: '#1e293b' }}>
          Vogue Prism
        </span>
        <span className="mx-2 text-slate-300" style={{ margin: '0 8px', color: '#cbd5e1' }}>
          •
        </span>
        <span>Clothing Store</span>
      </div>

      <div 
        className="flex items-center gap-6"
        style={{ display: 'flex', alignItems: 'center', gap: '24px' }}
      >
        <div 
          className="flex items-center gap-4 text-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px' }}
        >
          <div 
            className="flex items-center gap-2 text-slate-600"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}
          >
            <Calendar size={15} className="text-slate-400" style={{ color: '#94a3b8' }} />
            <span>{format(currentTime, 'dd MMM yyyy')}</span>
          </div>
          <div 
            className="flex items-center gap-2 text-slate-600"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}
          >
            <Clock size={15} className="text-slate-400" style={{ color: '#94a3b8' }} />
            <span className="font-mono tabular-nums" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {format(currentTime, 'HH:mm:ss')}
            </span>
          </div>
        </div>

        <div 
          className="h-6 w-px bg-slate-200"
          style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0' }}
        />

        <div 
          className="flex items-center gap-2"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <div 
            className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
            style={{ 
              width: '32px', 
              height: '32px', 
              backgroundColor: '#22c55e',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <User size={15} className="text-white" style={{ color: 'white' }} />
          </div>
          <span 
            className="text-sm font-medium text-slate-700"
            style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}
          >
            Admin
          </span>
        </div>
      </div>
    </header>
  );
}