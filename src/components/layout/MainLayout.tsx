import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function MainLayout() {
  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main 
          className="flex-1 overflow-auto"
          style={{
            padding: '32px',
            paddingTop: '24px',
            paddingBottom: '24px',
            width: '100%',
            maxWidth: 'none',
            margin: '0',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ width: '100%', maxWidth: 'none', margin: '0', padding: '0' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}