
import React, { useState, useEffect, useMemo } from 'react';
import { Cheque, ChequeStatus, User, Notification, Branch, ChequeBook, UserRole } from './types';
import { MOCK_USER, MOCK_NOTIFICATIONS } from './constants';
import { 
  getCheques, saveCheque, deleteCheque, calculateStats, exportToCSV, 
  syncToBackend, getBranches, getChequeBooks, getUsers, getNotifications, markNotificationRead, checkAndTriggerStockAlerts, loadFromBackend, saveChequesBatch
} from './services/storageService';
import Dashboard from './components/Dashboard';
import ChequeTable from './components/ChequeTable';
import ChequeForm from './components/ChequeForm';
import Notifications from './components/Notifications';
import Settings from './components/Settings';
import ChequeDetail from './components/ChequeDetail';
import BulkImportModal from './components/BulkImportModal';
import { DesktopSidebar, MobileBottomNav } from './components/Navigation';
import { Plus, Search, Download, CheckSquare, XSquare, Bell, Clock, Calendar, Building, Upload } from 'lucide-react';

const App: React.FC = () => {
  // Global State
  const [user, setUser] = useState<User>(MOCK_USER);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [chequeBooks, setChequeBooks] = useState<ChequeBook[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [view, setView] = useState<'dashboard' | 'list' | 'settings' | 'unpaid'>('dashboard');
  
  // UI State
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Partial<Cheque> | undefined>(undefined);
  
  // View Detail State
  const [viewedChequeIndex, setViewedChequeIndex] = useState<number | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [chequebookFilter, setChequebookFilter] = useState<string>('ALL');
  
  // Date Range Filter
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Selection State for Batch Ops
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Data Loading
  useEffect(() => {
    const initData = async () => {
        // Check for user override from storage (Simulating "current user" persistence)
        const users = getUsers();
        if (users.length > 0) {
           // Just for demo purposes, we use the first admin we find, or fallback to mock
           const storedAdmin = users.find(u => u.role === UserRole.ADMIN);
           if (storedAdmin) setUser(storedAdmin);
        }

        // Attempt to load from backend if configured
        await loadFromBackend();

        // Run stock check on app load
        checkAndTriggerStockAlerts();
        
        refreshData();
    };

    initData();

    // Responsive initial state for notifications
    if (window.innerWidth >= 1280) {
        setIsNotifPanelOpen(true);
    }
  }, []);

  // RBAC: Enforce Branch Filter for non-admins
  useEffect(() => {
    if (user.role !== UserRole.ADMIN && user.branch) {
      setBranchFilter(user.branch);
    }
  }, [user]);

  // Refresh notifications whenever user changes
  useEffect(() => {
    setNotifications(getNotifications(user.id));
  }, [user.id]);

  const refreshData = () => {
    setCheques(getCheques());
    setBranches(getBranches());
    setChequeBooks(getChequeBooks());
    setNotifications(getNotifications(user.id));
  };

  // Derived State
  const stats = useMemo(() => calculateStats(cheques), [cheques]);
  
  const filteredCheques = useMemo(() => {
    // RBAC Enforcement logic inside filter
    const enforcedBranch = (user.role !== UserRole.ADMIN && user.branch) ? user.branch : branchFilter;

    return cheques.filter(c => {
      const matchesSearch = 
        c.payeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.chequeNumber.includes(searchQuery) ||
        c.bankName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      
      // Updated Branch Match logic to include splits and enforce RBAC
      const matchesBranch = enforcedBranch === 'ALL' || 
                            c.branch === enforcedBranch || 
                            (c.splits && c.splits.some(s => s.branch === enforcedBranch));
      
      const matchesChequebook = chequebookFilter === 'ALL' || c.chequeBookRef === chequebookFilter;
      
      let matchesDate = true;
      if (dateFrom) {
        matchesDate = matchesDate && c.date >= dateFrom;
      }
      if (dateTo) {
        matchesDate = matchesDate && c.date <= dateTo;
      }

      return matchesSearch && matchesStatus && matchesBranch && matchesChequebook && matchesDate;
    });
  }, [cheques, searchQuery, statusFilter, branchFilter, chequebookFilter, dateFrom, dateTo, user]);

  // Specific filter for Unpaid view
  const unpaidCheques = useMemo(() => {
    return filteredCheques
      .filter(c => c.status === ChequeStatus.PENDING)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredCheques]);

  // Determine which list is currently active for navigation context
  const activeList = view === 'unpaid' ? unpaidCheques : filteredCheques;

  // Handlers
  const handleAddCheque = () => {
    setEditingCheque(undefined);
    setIsModalOpen(true);
  };

  const handleEditCheque = (cheque: Cheque) => {
    setEditingCheque(cheque);
    setViewedChequeIndex(null); // Close detail view if open
    setIsModalOpen(true);
  };

  const handleViewCheque = (cheque: Cheque) => {
    const index = activeList.findIndex(c => c.id === cheque.id);
    if (index !== -1) {
      setViewedChequeIndex(index);
    }
  };

  const handleNextCheque = () => {
    if (viewedChequeIndex !== null && viewedChequeIndex < activeList.length - 1) {
      setViewedChequeIndex(viewedChequeIndex + 1);
    }
  };

  const handlePrevCheque = () => {
    if (viewedChequeIndex !== null && viewedChequeIndex > 0) {
      setViewedChequeIndex(viewedChequeIndex - 1);
    }
  };

  const handleDeleteCheque = (id: string) => {
    // RBAC: Users typically cannot delete, only Managers/Admins
    if (user.role === UserRole.USER) {
        alert("You do not have permission to delete cheques.");
        return;
    }
    if (confirm("Are you sure you want to delete this cheque?")) {
      deleteCheque(id);
      refreshData();
      setSelectedIds(prev => prev.filter(pid => pid !== id));
      setViewedChequeIndex(null); // Close view if deleted
    }
  };

  const handleStatusChange = (id: string, newStatus: ChequeStatus, note?: string) => {
    const cheque = cheques.find(c => c.id === id);
    if (cheque) {
      const updated: Cheque = { 
          ...cheque, 
          status: newStatus,
          lastStatusChange: new Date().toISOString() 
      };
      if (note) {
        const timestamp = new Date().toLocaleString();
        const noteText = `[${timestamp}] ${newStatus === ChequeStatus.BOUNCED ? 'Rejection Reason' : 'Status Note'}: ${note}`;
        updated.notes = updated.notes ? `${updated.notes}\n${noteText}` : noteText;
      }

      saveCheque(updated);
      refreshData();
    }
  };

  const handleBatchStatusUpdate = (newStatus: ChequeStatus) => {
    if (selectedIds.length === 0) return;
    if (confirm(`Update ${selectedIds.length} cheques to ${newStatus}?`)) {
      selectedIds.forEach(id => {
        const cheque = cheques.find(c => c.id === id);
        if (cheque) {
          const updated: Cheque = { 
              ...cheque, 
              status: newStatus,
              lastStatusChange: new Date().toISOString() 
          };
          saveCheque(updated);
        }
      });
      refreshData();
      setSelectedIds([]);
    }
  };

  const handleBulkImport = async (importedData: Partial<Cheque>[]) => {
     const newCheques: Cheque[] = importedData.map(data => ({
        id: crypto.randomUUID(),
        chequeNumber: data.chequeNumber || '000000',
        amount: data.amount || 0,
        payeeName: data.payeeName || 'Unknown',
        date: data.date || new Date().toISOString().split('T')[0],
        status: ChequeStatus.PENDING,
        bankName: data.bankName || '',
        branch: data.branch || user.branch || 'Multi',
        chequeBookRef: data.chequeBookRef || '',
        notes: data.notes || '',
        createdAt: new Date().toISOString(),
        createdBy: user.id,
        lastStatusChange: undefined,
        splits: []
     }));

     saveChequesBatch(newCheques);
     refreshData();
  };

  const handleFormSubmit = (data: Partial<Cheque>) => {
    const newCheque: Cheque = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      createdBy: user.id,
      chequeNumber: data.chequeNumber || '000000',
      amount: data.amount || 0,
      payeeName: data.payeeName || 'Unknown',
      date: data.date || new Date().toISOString().split('T')[0],
      status: data.status || ChequeStatus.PENDING,
      lastStatusChange: new Date().toISOString(),
      bankName: data.bankName || '', 
      branch: data.branch || 'Multi', 
      chequeBookRef: data.chequeBookRef || '',
      splits: data.splits || []
    };
    
    saveCheque(newCheque);
    
    refreshData();
    setIsModalOpen(false);
  };

  const handleMarkNotificationRead = (id: string) => {
    markNotificationRead(id);
    setNotifications(getNotifications(user.id));
  };

  // Listen for view changes to refresh data (e.g. returning from settings)
  useEffect(() => {
    if (view !== 'settings') refreshData();
    setViewedChequeIndex(null); // Reset viewed item on view change
  }, [view]);

  return (
    <div className="flex h-screen bg-slate-50 font-inter overflow-hidden">
      
      {/* Left Navigation (Desktop) */}
      <DesktopSidebar view={view} onChangeView={setView} userRole={user.role} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative lg:ml-64 transition-all duration-300">
        
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 hidden md:block">
            {view === 'dashboard' ? 'Overview' : view === 'unpaid' ? 'Unpaid Cheques' : view === 'list' ? 'Cheque Management' : 'Settings'}
          </h1>
          <h1 className="text-xl font-bold text-slate-800 md:hidden">Cheque Harmony</h1>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsNotifPanelOpen(!isNotifPanelOpen)} 
              className={`p-2.5 rounded-full transition-all ${isNotifPanelOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 relative'}`}
            >
              <Bell size={20} />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
              )}
            </button>
            <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>
            <div className="flex items-center gap-2 hidden md:flex">
               <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />
               <span className="text-sm font-medium text-slate-700">{user.name}</span>
               <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase">{user.role}</span>
            </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24">
          
          {/* Filters & Actions Bar (Only for List view) */}
          {(view === 'list') && (
             <div className="mb-6 flex flex-col xl:flex-col gap-4 justify-between items-start">
               
               {/* Top Row: Search, Filters, Date Range */}
               <div className="flex flex-col xl:flex-row gap-3 w-full justify-between xl:items-center">
                 
                 {/* Search & Dropdowns */}
                 <div className="flex flex-col md:flex-row gap-3 flex-1">
                   <div className="relative flex-1 min-w-[200px] max-w-md">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <input 
                       type="text" 
                       placeholder="Search payee, number..." 
                       className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                     />
                   </div>
                   
                   <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                     <select 
                       value={statusFilter} 
                       onChange={(e) => setStatusFilter(e.target.value)}
                       className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg outline-none focus:border-blue-500 text-sm min-w-[120px]"
                     >
                       <option value="ALL">All Status</option>
                       {Object.values(ChequeStatus).map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                     
                     {/* Branch Filter - Disabled/Hidden if restricted */}
                     {user.role === UserRole.ADMIN && (
                         <select 
                           value={branchFilter} 
                           onChange={(e) => setBranchFilter(e.target.value)}
                           className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg outline-none focus:border-blue-500 text-sm min-w-[120px]"
                         >
                           <option value="ALL">All Branches</option>
                           {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                         </select>
                     )}
                     {user.role !== UserRole.ADMIN && (
                         <div className="bg-slate-50 border border-slate-200 text-slate-500 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 cursor-not-allowed opacity-80 whitespace-nowrap">
                             <Building size={14} />
                             {user.branch || 'My Branch'}
                         </div>
                     )}

                     <select 
                       value={chequebookFilter} 
                       onChange={(e) => setChequebookFilter(e.target.value)}
                       className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg outline-none focus:border-blue-500 text-sm min-w-[120px]"
                     >
                       <option value="ALL">All Books</option>
                       {chequeBooks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                     </select>
                   </div>
                 </div>

                 {/* Date Range */}
                 <div className="flex gap-2 items-center bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm w-full xl:w-auto overflow-x-auto">
                    <Calendar size={16} className="text-slate-400 shrink-0" />
                    <input 
                      type="date" 
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="text-sm text-slate-600 outline-none bg-transparent w-32"
                      placeholder="Start"
                    />
                    <span className="text-slate-300">-</span>
                    <input 
                      type="date" 
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="text-sm text-slate-600 outline-none bg-transparent w-32"
                      placeholder="End"
                    />
                    {(dateFrom || dateTo) && (
                      <button 
                        onClick={() => { setDateFrom(''); setDateTo(''); }}
                        className="text-slate-400 hover:text-red-500 ml-2"
                      >
                        <XSquare size={16} />
                      </button>
                    )}
                 </div>
               </div>

               {/* Bottom Row: Batch Actions & Main Actions */}
               <div className="flex w-full justify-end items-center gap-2 border-t border-slate-100 pt-4 xl:border-none xl:pt-0">
                 {selectedIds.length > 0 && (
                   <div className="flex gap-2 animate-fade-in mr-auto xl:mr-2">
                     <button 
                        onClick={() => handleBatchStatusUpdate(ChequeStatus.CLEARED)}
                        className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg hover:bg-emerald-100 text-sm font-medium transition-colors"
                     >
                       <CheckSquare size={16} /> Paid ({selectedIds.length})
                     </button>
                     <button 
                        onClick={() => handleBatchStatusUpdate(ChequeStatus.BOUNCED)}
                        className="flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-3 py-2 rounded-lg hover:bg-rose-100 text-sm font-medium transition-colors"
                     >
                       <XSquare size={16} /> Reject ({selectedIds.length})
                     </button>
                   </div>
                 )}
                 
                 {/* Import Button */}
                 <button 
                   onClick={() => setIsImportModalOpen(true)}
                   className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm whitespace-nowrap"
                 >
                   <Upload size={18} />
                   <span className="hidden md:inline">Import</span>
                 </button>

                 <button 
                   onClick={() => exportToCSV(filteredCheques)}
                   className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm whitespace-nowrap"
                 >
                   <Download size={18} />
                   <span className="hidden md:inline">Export</span>
                 </button>
                 <button 
                    onClick={handleAddCheque}
                    className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300"
                  >
                    <Plus size={20} />
                    <span>New Cheque</span>
                  </button>
               </div>
             </div>
          )}

          {/* Render Views */}
          {view === 'dashboard' && (
            <Dashboard 
              stats={stats} 
              cheques={cheques} 
              notifications={notifications} 
              userName={user.name} 
              branches={branches}
              chequeBooks={chequeBooks}
            />
          )}

          {view === 'unpaid' && (
             <div className="animate-fade-in space-y-6">
               <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-amber-200 relative overflow-hidden">
                 <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform translate-x-10"></div>
                 <div className="relative z-10 flex justify-between items-center">
                   <div>
                     <h2 className="text-2xl font-bold mb-1">Pending Collections</h2>
                     <p className="text-amber-100 text-sm">Total outstanding amount to be collected.</p>
                   </div>
                   <div className="text-right">
                     <p className="text-4xl font-bold">{unpaidCheques.reduce((sum, c) => sum + c.amount, 0).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3})}</p>
                     <p className="text-amber-100 text-xs font-medium mt-1">{unpaidCheques.length} Cheques Pending</p>
                   </div>
                 </div>
               </div>
               
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                 <div className="flex items-center gap-2 mb-4 text-slate-700 font-medium">
                    <Clock size={18} className="text-amber-500" />
                    <span>Unpaid List (Earliest Due First)</span>
                 </div>
                 <ChequeTable 
                    cheques={unpaidCheques} 
                    onEdit={handleEditCheque}
                    onView={handleViewCheque} 
                    onStatusChange={handleStatusChange}
                    onSelectionChange={setSelectedIds}
                    selectedIds={selectedIds}
                  />
               </div>
             </div>
          )}

          {view === 'list' && (
            <ChequeTable 
              cheques={filteredCheques} 
              onEdit={handleEditCheque} 
              onView={handleViewCheque}
              onDelete={user.role !== UserRole.USER ? handleDeleteCheque : undefined} // Pass undefined if user can't delete
              onStatusChange={handleStatusChange}
              onSelectionChange={setSelectedIds}
              selectedIds={selectedIds}
            />
          )}
          
          {view === 'settings' && user.role === UserRole.ADMIN && (
            <Settings />
          )}
          {view === 'settings' && user.role !== UserRole.ADMIN && (
              <div className="flex items-center justify-center h-full text-slate-400">
                  Access Denied. Administrator privileges required.
              </div>
          )}
        </div>

        {/* Mobile Floating Action Button (FAB) */}
        <div className="lg:hidden fixed bottom-24 right-6 z-50">
          <button 
            onClick={handleAddCheque}
            className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-300 flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav view={view} onChangeView={setView} userRole={user.role} />
      </main>

      {/* Right Sidebar (Notifications) - Slidable on Desktop */}
      <div className={`
        fixed inset-y-0 right-0 z-40 w-80 bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300
        ${isNotifPanelOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <Notifications notifications={notifications} onClose={() => setIsNotifPanelOpen(false)} onMarkRead={handleMarkNotificationRead} />
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <ChequeForm 
          initialData={editingCheque} 
          onSubmit={handleFormSubmit} 
          onCancel={() => setIsModalOpen(false)} 
        />
      )}
      
      {/* Import Modal */}
      {isImportModalOpen && (
        <BulkImportModal 
          onImport={handleBulkImport}
          onClose={() => setIsImportModalOpen(false)}
          currentUser={user}
        />
      )}

      {/* View Detail Card Overlay */}
      {viewedChequeIndex !== null && activeList[viewedChequeIndex] && (
        <ChequeDetail 
          cheque={activeList[viewedChequeIndex]}
          onClose={() => setViewedChequeIndex(null)}
          onNext={handleNextCheque}
          onPrev={handlePrevCheque}
          hasNext={viewedChequeIndex < activeList.length - 1}
          hasPrev={viewedChequeIndex > 0}
          onEdit={handleEditCheque}
          onDelete={user.role !== UserRole.USER ? handleDeleteCheque : undefined}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

export default App;