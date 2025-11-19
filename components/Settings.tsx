
import React, { useState, useEffect, useRef } from 'react';
import { Branch, ChequeBook, AuditLog, Cheque, User, UserRole, NotificationSettings } from '../types';
import { 
  getBranches, saveBranch, deleteBranch, 
  getChequeBooks, saveChequeBook, deleteChequeBook, getChequeBookUsage,
  getAuditLogs, getSettings, saveSettings, getCheques,
  getUsers, saveUser, deleteUser,
  getNotificationSettings, saveNotificationSettings, loadFromBackend
} from '../services/storageService';
import { 
  Save, Plus, Trash2, Edit2, Book, Building, Activity, Link as LinkIcon, 
  Search, ChevronLeft, ChevronRight, X, MoreVertical, CreditCard, Calendar,
  Users, Shield, User as UserIcon, Key, Bell, Mail, MessageSquare, AlertTriangle, Clock, Share2, RefreshCw
} from 'lucide-react';
import html2canvas from 'html2canvas';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'branches' | 'chequebooks' | 'users' | 'audit'>('general');
  
  // General
  const [scriptUrl, setScriptUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Notifications
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    emailAlerts: false,
    smsAlerts: false,
    defaultStockThreshold: 5
  });

  // Data & Filters
  const [branches, setBranches] = useState<Branch[]>([]);
  const [books, setBooks] = useState<ChequeBook[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [bookUsages, setBookUsages] = useState<Record<string, {used: number, total: number}>>({});
  
  const [searchQuery, setSearchQuery] = useState('');

  // Detail View State (Card View)
  const [viewedItem, setViewedItem] = useState<{ type: 'branch' | 'book' | 'user', index: number | 'new' } | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Swipe Handling
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (viewedItem === null) {
      setEditForm({});
      setIsEditing(false);
    } else if (viewedItem.index === 'new') {
      setEditForm({ role: UserRole.USER }); // Default role
      setIsEditing(true);
    } else {
      // Load data into edit form when viewing item
      let list: any[] = [];
      if (viewedItem.type === 'branch') list = filteredBranches;
      if (viewedItem.type === 'book') list = filteredBooks;
      if (viewedItem.type === 'user') list = filteredUsers;

      setEditForm({ ...list[viewedItem.index as number] });
      setIsEditing(false);
    }
  }, [viewedItem]);

  const loadData = () => {
    const s = getSettings();
    if (s.scriptUrl) setScriptUrl(s.scriptUrl);

    setNotifSettings(getNotificationSettings());

    setBranches(getBranches());
    setUsers(getUsers());
    
    const loadedBooks = getChequeBooks();
    setBooks(loadedBooks);
    
    const usages: Record<string, {used: number, total: number}> = {};
    loadedBooks.forEach(b => {
      usages[b.id] = getChequeBookUsage(b.name);
    });
    setBookUsages(usages);

    setCheques(getCheques());
    setLogs(getAuditLogs());
  };

  // Filtering
  const filteredBranches = branches.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredBooks = books.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  // --- Navigation & Actions ---

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!viewedItem || viewedItem.index === 'new') return;
    
    let list: any[] = [];
    if (viewedItem.type === 'branch') list = filteredBranches;
    if (viewedItem.type === 'book') list = filteredBooks;
    if (viewedItem.type === 'user') list = filteredUsers;

    if ((viewedItem.index as number) < list.length - 1) {
      setViewedItem({ ...viewedItem, index: (viewedItem.index as number) + 1 });
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!viewedItem || viewedItem.index === 'new') return;
    if ((viewedItem.index as number) > 0) {
      setViewedItem({ ...viewedItem, index: (viewedItem.index as number) - 1 });
    }
  };

  // Swipe Logic
  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) handleNext();
    if (isRightSwipe) handlePrev();
  };

  // Export Logic
  const handleExport = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (element) => element.classList.contains('no-export')
      });
      
      const image = canvas.toDataURL("image/jpeg", 0.9);
      const link = document.createElement('a');
      link.href = image;
      link.download = `${viewedItem?.type || 'Item'}_Export_${new Date().toISOString().slice(0,10)}.jpg`;
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export image.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- CRUD Operations ---

  const handleSave = () => {
    if (viewedItem?.type === 'branch') {
      if (!editForm.name) return;
      saveBranch({
        id: editForm.id || crypto.randomUUID(),
        name: editForm.name
      });
    } else if (viewedItem?.type === 'book') {
      if (!editForm.name || !editForm.totalLeaves) return;
      saveChequeBook({
        id: editForm.id || crypto.randomUUID(),
        name: editForm.name,
        totalLeaves: Number(editForm.totalLeaves),
        dateAdded: editForm.dateAdded || new Date().toISOString(),
        status: editForm.status || 'ACTIVE',
        branchId: editForm.branchId,
        lowStockThreshold: editForm.lowStockThreshold ? Number(editForm.lowStockThreshold) : undefined
      });
    } else if (viewedItem?.type === 'user') {
      if (!editForm.name || !editForm.email || !editForm.role) return;
      if (!editForm.email.includes('@')) {
        alert("Invalid email address");
        return;
      }
      saveUser({
        id: editForm.id || crypto.randomUUID(),
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        branch: editForm.branch,
        password: editForm.password,
        avatarUrl: editForm.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(editForm.name)}`
      });
    }
    loadData();
    if (viewedItem?.index === 'new') setViewedItem(null);
    else setIsEditing(false);
  };

  const handleDelete = () => {
    if (!editForm.id || !window.confirm('Are you sure you want to delete this item?')) return;
    
    if (viewedItem?.type === 'branch') {
      deleteBranch(editForm.id);
    } else if (viewedItem?.type === 'book') {
      deleteChequeBook(editForm.id);
    } else if (viewedItem?.type === 'user') {
      deleteUser(editForm.id);
    }
    loadData();
    setViewedItem(null);
  };

  const handleSaveSettings = () => {
    saveSettings({ scriptUrl });
    saveNotificationSettings(notifSettings);
    alert('Configuration saved successfully!');
  };
  
  const handleSync = async () => {
      if (!scriptUrl) {
          alert("Please enter a Script URL first.");
          return;
      }
      setIsSyncing(true);
      const success = await loadFromBackend();
      setIsSyncing(false);
      if (success) {
          setLastSyncTime(new Date().toLocaleTimeString());
          loadData(); // Refresh UI
          alert("Data synced successfully from Google Sheets.");
      } else {
          alert("Failed to sync. Check your URL and console for errors.");
      }
  };

  // --- Branch Stats Helper ---
  const getBranchStats = (branchName: string) => {
    const now = new Date();
    now.setHours(0,0,0,0);
    const fiveDaysFromNow = new Date(now);
    fiveDaysFromNow.setDate(now.getDate() + 5);

    // Filter cheques for this branch (including splits)
    const relatedCheques = cheques.filter(c => 
      c.branch === branchName || (c.splits && c.splits.some(s => s.branch === branchName))
    );

    let outstanding = 0;
    let overdue = 0;
    let upcoming = 0;

    relatedCheques.forEach(c => {
        if (c.status !== 'PENDING') return;

        // Calculate amount for this branch
        let amount = 0;
        if (c.branch === branchName) amount = c.amount;
        else {
            const split = c.splits?.find(s => s.branch === branchName);
            if (split) amount = split.amount;
        }

        outstanding += amount;

        const cDate = new Date(c.date);
        cDate.setHours(0,0,0,0);

        if (cDate < now) overdue += amount;
        else if (cDate <= fiveDaysFromNow) upcoming += amount;
    });
    
    return { count: relatedCheques.length, outstanding, overdue, upcoming };
  };

  const getRoleColor = (role: UserRole) => {
      switch (role) {
          case UserRole.ADMIN: return 'bg-purple-100 text-purple-700 border-purple-200';
          case UserRole.MANAGER: return 'bg-blue-100 text-blue-700 border-blue-200';
          case UserRole.USER: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
          default: return 'bg-slate-100 text-slate-600';
      }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[calc(100vh-140px)] flex flex-col md:flex-row overflow-hidden relative">
      
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 z-10">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-800">Administration</h2>
          <p className="text-sm text-slate-500 mt-1">Manage system resources</p>
        </div>
        <nav className="flex-1 px-3 space-y-1 pb-6 overflow-y-auto">
          {[
            { id: 'general', label: 'Connection', icon: LinkIcon },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'users', label: 'User Roles', icon: Users },
            { id: 'branches', label: 'Branches', icon: Building },
            { id: 'chequebooks', label: 'Chequebooks', icon: Book },
            { id: 'audit', label: 'Audit Log', icon: Activity },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* --- Search & Filters Header --- */}
        {(activeTab === 'branches' || activeTab === 'chequebooks' || activeTab === 'users') && (
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-white sticky top-0 z-10">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`} 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <button 
              onClick={() => setViewedItem({ type: activeTab === 'users' ? 'user' : activeTab === 'branches' ? 'branch' : 'book', index: 'new' })}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap shadow-sm"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Add New</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          
          {/* --- General Tab --- */}
          {activeTab === 'general' && (
            <div className="max-w-2xl animate-in fade-in">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Google Sheets Integration</h3>
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl mb-6">
                <p className="text-sm text-blue-700 mb-4">
                  Connect your dashboard to a Google Apps Script Web App to sync data automatically.
                </p>
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-blue-800 uppercase">Web App URL</label>
                  <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={scriptUrl}
                        onChange={(e) => setScriptUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/..." 
                        className="flex-1 p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button 
                        onClick={handleSync}
                        disabled={isSyncing || !scriptUrl}
                        className="px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                          {isSyncing ? 'Syncing' : 'Sync Now'}
                      </button>
                  </div>
                  {lastSyncTime && <p className="text-xs text-emerald-600 font-medium">Last successful sync: {lastSyncTime}</p>}
                  
                  <div className="pt-4 border-t border-blue-100">
                     <button onClick={handleSaveSettings} className="px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2">
                        <Save size={16} /> Save Configuration
                     </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                 <h4 className="font-bold text-slate-700 mb-2 text-sm">How to set up backend:</h4>
                 <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1">
                    <li>Create a new Google Sheet.</li>
                    <li>Open Extensions &gt; Apps Script.</li>
                    <li>Copy the code from <code>backend/GoogleAppsScript.js</code>.</li>
                    <li>Deploy as Web App (Execute as: Me, Who has access: Anyone).</li>
                    <li>Paste the URL above.</li>
                 </ol>
              </div>
            </div>
          )}

          {/* --- Notifications Tab --- */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl animate-in fade-in space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><AlertTriangle size={20} /> Stock Alerts</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Configure how and when you want to be notified about low chequebook stock.
                </p>
                
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <label className="text-sm font-semibold text-slate-700">Default Low Stock Threshold</label>
                      <div className="flex items-center gap-2">
                         <input 
                           type="number" 
                           value={notifSettings.defaultStockThreshold}
                           onChange={(e) => setNotifSettings({...notifSettings, defaultStockThreshold: Number(e.target.value)})}
                           className="w-16 p-2 border border-slate-300 rounded text-center font-bold text-slate-700 focus:border-blue-500 outline-none"
                         />
                         <span className="text-xs text-slate-400">pages</span>
                      </div>
                   </div>
                   <p className="text-xs text-slate-400">You can override this threshold for individual chequebooks in the Chequebooks tab.</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Mail size={20} /> Delivery Channels</h3>
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Mail size={18} /></div>
                          <div>
                             <p className="text-sm font-semibold text-slate-700">Email Alerts</p>
                             <p className="text-xs text-slate-400">Receive stock updates via email</p>
                          </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={notifSettings.emailAlerts} onChange={(e) => setNotifSettings({...notifSettings, emailAlerts: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                   </div>

                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-50 text-green-600 rounded-lg"><MessageSquare size={18} /></div>
                          <div>
                             <p className="text-sm font-semibold text-slate-700">SMS Alerts</p>
                             <p className="text-xs text-slate-400">Get text messages for urgent alerts</p>
                          </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={notifSettings.smsAlerts} onChange={(e) => setNotifSettings({...notifSettings, smsAlerts: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                   </div>
                </div>
              </div>

              <button onClick={handleSaveSettings} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">
                 Save Notification Settings
              </button>
            </div>
          )}

          {/* --- Users List --- */}
          {activeTab === 'users' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in">
                {filteredUsers.map((user, idx) => (
                    <div 
                        key={user.id} 
                        onClick={() => setViewedItem({ type: 'user', index: idx })}
                        className="group p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md cursor-pointer transition-all flex items-start gap-4"
                    >
                        <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`} className="w-12 h-12 rounded-full bg-slate-100 object-cover" alt={user.name} />
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-slate-800 truncate pr-2">{user.name}</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${getRoleColor(user.role)}`}>
                                    {user.role}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                            {user.branch && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-slate-600 font-medium">
                                    <Building size={12} className="text-slate-400" /> {user.branch}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
              </div>
          )}

          {/* --- Branches List --- */}
          {activeTab === 'branches' && (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
               {filteredBranches.map((branch, idx) => {
                 const stats = getBranchStats(branch.name);
                 return (
                   <div 
                     key={branch.id} 
                     onClick={() => setViewedItem({ type: 'branch', index: idx })}
                     className="group p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
                   >
                     <div className="flex justify-between items-start">
                       <div>
                          <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{branch.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">ID: {branch.id.slice(0,8)}...</p>
                       </div>
                       <Building size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors"/>
                     </div>
                     <div className="mt-4 flex gap-4">
                        <div>
                           <p className="text-[10px] uppercase text-slate-400 font-bold">Issued</p>
                           <p className="text-sm font-semibold text-slate-700">{stats.count}</p>
                        </div>
                        <div>
                           <p className="text-[10px] uppercase text-slate-400 font-bold">Outstanding</p>
                           <p className="text-sm font-semibold text-slate-700">{stats.outstanding.toLocaleString(undefined, {notation: 'compact'})}</p>
                        </div>
                     </div>
                   </div>
                 );
               })}
               {filteredBranches.length === 0 && <div className="col-span-full text-center py-10 text-slate-400">No branches found matching "{searchQuery}"</div>}
             </div>
          )}

          {/* --- Chequebooks List --- */}
          {activeTab === 'chequebooks' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in">
               {filteredBooks.map((book, idx) => {
                 const usage = bookUsages[book.id] || { used: 0, total: book.totalLeaves };
                 const percent = Math.min(100, (usage.used / usage.total) * 100);
                 const remaining = usage.total - usage.used;
                 const branchName = branches.find(b => b.id === book.branchId)?.name || 'Unassigned';

                 return (
                   <div 
                    key={book.id} 
                    onClick={() => setViewedItem({ type: 'book', index: idx })}
                    className="group p-4 border border-slate-200 rounded-xl bg-white hover:border-blue-300 hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
                   >
                     <div className={`absolute top-0 left-0 w-1 h-full ${book.status === 'ACTIVE' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                     <div className="pl-3">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{book.name}</h4>
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                               <Building size={10} />
                               <span>{branchName}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${book.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                             {book.status}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-600">{usage.used} Used</span>
                            <span className={`${remaining < 5 ? 'text-red-600' : 'text-emerald-600'}`}>{remaining} Left</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${remaining < 5 ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${percent}%`}}></div>
                          </div>
                        </div>
                     </div>
                   </div>
                 );
               })}
               {filteredBooks.length === 0 && <div className="col-span-full text-center py-10 text-slate-400">No chequebooks found matching "{searchQuery}"</div>}
             </div>
          )}

          {/* --- Audit Log List --- */}
          {activeTab === 'audit' && (
            <div className="max-w-3xl animate-in fade-in border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{log.action}</td>
                      <td className="px-4 py-3 text-slate-600">{log.details}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">No activity recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* --- Detail Card Modal Overlay --- */}
      {viewedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
            
            {/* Navigation Buttons (Desktop) */}
            {viewedItem.index !== 'new' && (
                <>
                    <button 
                        onClick={handlePrev}
                        disabled={viewedItem.index === 0}
                        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur text-white rounded-full items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={32} />
                    </button>
                    <button 
                        onClick={handleNext}
                        disabled={viewedItem.index === (viewedItem.type === 'user' ? filteredUsers : viewedItem.type === 'branch' ? filteredBranches : filteredBooks).length - 1}
                        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur text-white rounded-full items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={32} />
                    </button>
                </>
            )}

            {/* Card Container */}
            <div 
                ref={cardRef}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transform transition-transform duration-300"
            >
                {/* ... (Content remains the same as previous, only wrapper buttons updated in Settings render above) */}
                {/* Card Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        {viewedItem.type === 'user' ? <Users size={14} /> : viewedItem.type === 'branch' ? <Building size={14} /> : <Book size={14} />}
                        <span>{viewedItem.index === 'new' ? 'Create New' : 'Detail View'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Export Button (only for existing items) */}
                        {viewedItem.index !== 'new' && (
                           <button 
                             onClick={handleExport} 
                             disabled={isExporting}
                             className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors no-export"
                             title="Export as Image"
                           >
                               {isExporting ? <span className="animate-spin block w-5 h-5 border-2 border-blue-500 rounded-full border-t-transparent"></span> : <Share2 size={18} />}
                           </button>
                        )}
                        
                       {/* Edit Toggle */}
                       {viewedItem.index !== 'new' && (
                           <button 
                             onClick={() => setIsEditing(!isEditing)}
                             className={`p-2 rounded-full transition-colors no-export ${isEditing ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                             title="Toggle Edit"
                           >
                               <Edit2 size={18} />
                           </button>
                       )}
                       <button onClick={() => setViewedItem(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors no-export">
                           <X size={20} />
                       </button>
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    
                    {/* Title Section */}
                    <div className="text-center">
                        {isEditing ? (
                            <input 
                              type="text" 
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                              className="text-xl font-bold text-center w-full border-b-2 border-blue-500 outline-none pb-1"
                              placeholder="Enter Name"
                              autoFocus
                            />
                        ) : (
                            <h2 className="text-2xl font-bold text-slate-800">{editForm.name}</h2>
                        )}
                        <p className="text-xs text-slate-400 mt-1 font-mono uppercase">
                            ID: {editForm.id || 'NEW-ENTRY'}
                        </p>
                    </div>

                    {/* User Specific Fields */}
                    {viewedItem.type === 'user' && (
                        <div className="space-y-4">
                            {/* Avatar and Role Header */}
                            <div className="flex justify-center mb-4">
                                <div className="relative">
                                    <img 
                                        src={editForm.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(editForm.name || 'User')}`} 
                                        className="w-20 h-20 rounded-full border-4 border-white shadow-lg" 
                                        alt="User" 
                                    />
                                    {!isEditing && (
                                        <div className={`absolute -bottom-2 -right-2 px-2 py-1 rounded-full text-[10px] font-bold border uppercase shadow-sm bg-white ${getRoleColor(editForm.role)}`}>
                                            {editForm.role}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Role Selection (Edit Mode) */}
                            {isEditing && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Role Assignment</label>
                                    <select 
                                        value={editForm.role || UserRole.USER}
                                        onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                                        className="w-full p-2 border border-slate-300 rounded bg-white text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                                    >
                                        <option value={UserRole.ADMIN}>Admin (Full Access)</option>
                                        <option value={UserRole.MANAGER}>Branch Manager (Restricted)</option>
                                        <option value={UserRole.USER}>Standard User (Entry Only)</option>
                                    </select>
                                </div>
                            )}

                            {/* Email Field */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><UserIcon size={12}/> Email Address</label>
                                {isEditing ? (
                                    <input 
                                        type="email"
                                        value={editForm.email || ''}
                                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                        className="w-full p-2 border border-slate-300 rounded text-sm"
                                        placeholder="user@company.com"
                                    />
                                ) : (
                                    <p className="text-sm font-medium text-slate-700 p-2 bg-slate-50 rounded border border-slate-100">{editForm.email}</p>
                                )}
                            </div>

                            {/* Branch Field (Conditional) */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Building size={12}/> Assigned Branch</label>
                                {isEditing ? (
                                    <select 
                                        value={editForm.branch || ''}
                                        onChange={(e) => setEditForm({...editForm, branch: e.target.value})}
                                        className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
                                        disabled={editForm.role === UserRole.ADMIN && false} // Admins might not need branch, but good to have option
                                    >
                                        <option value="">-- No Specific Branch --</option>
                                        {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                    </select>
                                ) : (
                                    <p className="text-sm font-medium text-slate-700 p-2 bg-slate-50 rounded border border-slate-100">
                                        {editForm.branch || <span className="text-slate-400 italic">Global Access / None</span>}
                                    </p>
                                )}
                            </div>

                            {/* Password Field (Edit Only) */}
                            {isEditing && (
                                <div className="space-y-1 pt-2 border-t border-slate-100">
                                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Key size={12}/> {viewedItem.index === 'new' ? 'Set Password' : 'Reset Password'}</label>
                                    <input 
                                        type="password"
                                        value={editForm.password || ''}
                                        onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                                        className="w-full p-2 border border-slate-300 rounded text-sm"
                                        placeholder={viewedItem.index === 'new' ? 'Required' : 'Leave blank to keep current'}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Branch Specific Fields */}
                    {viewedItem.type === 'branch' && viewedItem.index !== 'new' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 p-3 rounded-xl text-center border border-blue-100">
                                    <p className="text-[10px] text-blue-500 uppercase font-bold mb-1">Outstanding</p>
                                    <p className="text-lg font-bold text-blue-700 font-mono">
                                        {getBranchStats(editForm.name).outstanding.toLocaleString(undefined, {notation: 'compact'})}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Cheques</p>
                                    <p className="text-lg font-bold text-slate-700">{getBranchStats(editForm.name).count}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-rose-50 p-3 rounded-xl flex items-center gap-3 border border-rose-100">
                                    <div className="bg-rose-100 p-2 rounded-full text-rose-500"><AlertTriangle size={16}/></div>
                                    <div>
                                        <p className="text-[10px] text-rose-400 uppercase font-bold">Overdue</p>
                                        <p className="text-sm font-bold text-rose-700">
                                            {getBranchStats(editForm.name).overdue.toLocaleString(undefined, {notation: 'compact'})}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-xl flex items-center gap-3 border border-amber-100">
                                    <div className="bg-amber-100 p-2 rounded-full text-amber-500"><Clock size={16}/></div>
                                    <div>
                                        <p className="text-[10px] text-amber-400 uppercase font-bold">Upcoming</p>
                                        <p className="text-sm font-bold text-amber-700">
                                            {getBranchStats(editForm.name).upcoming.toLocaleString(undefined, {notation: 'compact'})}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chequebook Specific Fields */}
                    {viewedItem.type === 'book' && (
                        <div className="space-y-4">
                            {/* Status & Branch */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                                    {isEditing ? (
                                        <select 
                                            value={editForm.status || 'ACTIVE'}
                                            onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                            className="w-full p-2 border rounded bg-white text-sm"
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="ARCHIVED">Archived</option>
                                        </select>
                                    ) : (
                                        <div className={`px-3 py-2 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 ${editForm.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                            {editForm.status === 'ACTIVE' && <Activity size={14} />}
                                            {editForm.status || 'ACTIVE'}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Assigned Branch</label>
                                    {isEditing ? (
                                        <select 
                                            value={editForm.branchId || ''}
                                            onChange={(e) => setEditForm({...editForm, branchId: e.target.value})}
                                            className="w-full p-2 border rounded bg-white text-sm"
                                        >
                                            <option value="">-- None --</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    ) : (
                                        <div className="px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 text-slate-700 text-sm font-medium truncate">
                                            {branches.find(b => b.id === editForm.branchId)?.name || 'Unassigned'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Capacity Stats */}
                            <div className="pt-2">
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Leaves Usage</label>
                                    {isEditing && (
                                        <input 
                                            type="number"
                                            value={editForm.totalLeaves || ''}
                                            onChange={(e) => setEditForm({...editForm, totalLeaves: e.target.value})}
                                            className="w-20 text-right border-b border-blue-300 outline-none text-sm font-bold"
                                            placeholder="Total"
                                        />
                                    )}
                                </div>
                                {viewedItem.index !== 'new' && (
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <div className="flex justify-between text-sm font-medium mb-2">
                                            <span className="text-slate-600">
                                                {bookUsages[editForm.id]?.used || 0} Used
                                            </span>
                                            <span className="text-slate-400">
                                                / {editForm.totalLeaves} Total
                                            </span>
                                        </div>
                                        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-blue-500" 
                                                style={{ width: `${Math.min(100, ((bookUsages[editForm.id]?.used || 0) / editForm.totalLeaves) * 100)}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-right mt-1 text-slate-400">
                                            {(editForm.totalLeaves - (bookUsages[editForm.id]?.used || 0))} Remaining
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Low Stock Threshold (New) */}
                            <div className="space-y-1 pt-2 border-t border-slate-100">
                                <div className="flex justify-between items-center">
                                  <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><AlertTriangle size={12}/> Low Stock Alert At</label>
                                  {isEditing ? (
                                      <div className="flex items-center gap-2">
                                        <input 
                                            type="number"
                                            value={editForm.lowStockThreshold || ''}
                                            onChange={(e) => setEditForm({...editForm, lowStockThreshold: e.target.value})}
                                            className="w-14 p-1 border border-slate-300 rounded text-right text-sm"
                                            placeholder={String(notifSettings.defaultStockThreshold)}
                                        />
                                        <span className="text-xs text-slate-400">pages</span>
                                      </div>
                                  ) : (
                                      <span className="text-sm font-medium text-slate-700">
                                        {editForm.lowStockThreshold ?? notifSettings.defaultStockThreshold} pages
                                      </span>
                                  )}
                                </div>
                            </div>

                            <div className="text-xs text-slate-400 flex items-center gap-1 justify-center pt-2">
                                <Calendar size={12} />
                                Added: {new Date(editForm.dateAdded || Date.now()).toLocaleDateString()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Card Footer (Actions) */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex gap-3 no-export">
                    {isEditing ? (
                        <>
                            <button 
                                onClick={handleSave}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> Save Changes
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={handleDelete}
                            className="flex-1 bg-white border border-red-100 text-red-500 py-3 rounded-xl font-semibold hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} /> Delete Item
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
