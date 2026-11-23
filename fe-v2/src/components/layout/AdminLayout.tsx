import { useState, type FC } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export interface AdminLayoutContextType {
  openMobileSidebar: () => void;
}

export const AdminLayout: FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openMobileSidebar = () => setIsSidebarOpen(true);
  const closeMobileSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="bg-slate-50 text-slate-800 flex h-screen overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeMobileSidebar} />

      {/* Area Konten Utama */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Outlet context={{ openMobileSidebar } satisfies AdminLayoutContextType} />
      </div>
    </div>
  );
};