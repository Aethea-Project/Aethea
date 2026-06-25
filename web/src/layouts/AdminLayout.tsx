import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '../components/AdminSidebar';
import { DynamicIsland } from '../components/DynamicIsland';

export const AdminLayout = () => {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isDesktopCollapsed, setDesktopCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface relative">
      
      <div className={`hidden lg:block flex-shrink-0 transition-[width] duration-300 ease-in-out ${isDesktopCollapsed ? 'w-[112px]' : 'w-[292px]'}`} aria-hidden="true" />
      
      <AdminSidebar 
        isOpen={isMobileOpen} 
        onClose={() => setMobileOpen(false)}
        isCollapsed={isDesktopCollapsed}
        onToggleCollapse={() => setDesktopCollapsed(!isDesktopCollapsed)}
      />
      
      <main id="admin-main-content" className="relative z-10 min-w-0 flex-1 overflow-y-auto custom-scrollbar" role="main" tabIndex={-1}>
        <DynamicIsland 
          isMobileOpen={isMobileOpen} 
          onMobileToggle={() => setMobileOpen(!isMobileOpen)}
        />

        <div className="relative z-10 w-full min-h-full px-4 sm:px-6 lg:px-8 pb-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
