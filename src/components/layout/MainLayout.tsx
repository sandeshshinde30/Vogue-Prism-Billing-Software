import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function MainLayout() {
  return (
    <div 
      className="h-screen flex bg-slate-50"
      style={{ 
        height: '100vh', 
        display: 'flex', 
        backgroundColor: '#f8fafc' 
      }}
    >
      <Sidebar />
      <div 
        className="flex-1 flex flex-col min-w-0"
        style={{ 
          flex: '1', 
          display: 'flex', 
          flexDirection: 'column', 
          minWidth: '0' 
        }}
      >
        <TopBar />
        <main 
          className="flex-1 overflow-auto p-5"
          style={{ 
            flex: '1', 
            overflow: 'auto', 
            padding: '20px' 
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}