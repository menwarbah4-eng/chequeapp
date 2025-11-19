import React from 'react';
import { LayoutDashboard, ListFilter, Settings, User, LogOut, Clock } from 'lucide-react';
import { UserRole } from '../types';

interface NavigationProps {
  view: string;
  onChangeView: (view: 'dashboard' | 'list' | 'settings' | 'unpaid') => void;
  userRole?: UserRole;
}

const NavItem = ({ icon: Icon, label, active, onClick, mobileOnly = false, desktopOnly = false, hidden = false }: any) => {
  if (hidden) return null;
  
  return (
    <button 
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full
        ${active ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
        ${mobileOnly ? 'lg:hidden' : ''}
        ${desktopOnly ? 'hidden lg:flex' : ''}
      `}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className={`font-medium ${active ? 'font-semibold' : ''}`}>{label}</span>
    </button>
  );
};

const MobileNavItem = ({ icon: Icon, label, active, onClick, hidden = false }: any) => {
  if (hidden) return null;

  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-1 flex-1 ${active ? 'text-blue-600' : 'text-slate-400'}`}
    >
      <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );
};

export const DesktopSidebar: React.FC<NavigationProps> = ({ view, onChangeView, userRole }) => {
  return (
    <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col fixed inset-y-0 left-0 z-30">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        <span className="font-bold text-xl text-slate-800 tracking-tight">Cheque Harmony</span>
      </div>

      <div className="flex-1 px-4 space-y-2 mt-6">
        <NavItem 
          icon={LayoutDashboard} 
          label="Dashboard" 
          active={view === 'dashboard'} 
          onClick={() => onChangeView('dashboard')} 
        />
        <NavItem 
          icon={Clock} 
          label="Unpaid" 
          active={view === 'unpaid'} 
          onClick={() => onChangeView('unpaid')} 
        />
        <NavItem 
          icon={ListFilter} 
          label="All Cheques" 
          active={view === 'list'} 
          onClick={() => onChangeView('list')} 
        />
        <NavItem 
          icon={Settings} 
          label="Settings" 
          active={view === 'settings'} 
          onClick={() => onChangeView('settings')} 
          hidden={userRole !== UserRole.ADMIN}
        />
      </div>

      <div className="p-4 border-t border-slate-100">
        <button className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg w-full transition-colors">
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export const MobileBottomNav: React.FC<NavigationProps> = ({ view, onChangeView, userRole }) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-between items-center z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
      <MobileNavItem 
        icon={LayoutDashboard} 
        label="Dashboard" 
        active={view === 'dashboard'} 
        onClick={() => onChangeView('dashboard')} 
      />
      <MobileNavItem 
        icon={Clock} 
        label="Unpaid" 
        active={view === 'unpaid'} 
        onClick={() => onChangeView('unpaid')} 
      />
      <div className="w-12"></div> {/* Spacer for FAB */}
      <MobileNavItem 
        icon={ListFilter} 
        label="Cheques" 
        active={view === 'list'} 
        onClick={() => onChangeView('list')} 
      />
      <MobileNavItem 
        icon={Settings} 
        label="Settings" 
        active={view === 'settings'} 
        onClick={() => onChangeView('settings')} 
        hidden={userRole !== UserRole.ADMIN}
      />
    </div>
  );
};