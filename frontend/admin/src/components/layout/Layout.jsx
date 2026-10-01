import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout({ children }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', width: '100%', background: '#F8FAFC' }}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => {
          if (isMobile) setSidebarOpen(false);
          else setSidebarOpen(false);
        }}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          marginLeft: sidebarOpen && !isMobile ? 260 : 0,
          transition: 'margin-left 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main style={{ flex: 1, padding: '24px 20px 48px', maxWidth: 1400, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
