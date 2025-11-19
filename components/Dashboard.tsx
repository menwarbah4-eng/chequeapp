import React, { useMemo } from 'react';
import { DashboardStats, Cheque, Notification, Branch, ChequeBook, ChequeStatus } from '../types';
import StatsCard from './StatsCard';
import { DollarSign, CheckCircle, AlertTriangle, XCircle, Calendar, Building, Book } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardProps {
  stats: DashboardStats;
  cheques: Cheque[];
  notifications: Notification[];
  userName: string;
  branches: Branch[];
  chequeBooks: ChequeBook[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, cheques, notifications, userName, branches, chequeBooks }) => {
  const pieData = [
    { name: 'Cleared', value: stats.clearedCount, color: '#10b981' }, // emerald-500
    { name: 'Pending', value: stats.pendingCount, color: '#f59e0b' }, // amber-500
    { name: 'Bounced', value: stats.bouncedCount, color: '#f43f5e' }, // rose-500
  ].filter(d => d.value > 0);

  // Calculate Branch Metrics
  const branchMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return branches.map(branch => {
      let outstanding = 0;
      let overdue = 0;
      let upcoming = 0;
      let pendingCount = 0;

      // 1. Calculate Financials
      cheques.forEach(c => {
        let amount = 0;
        let belongs = false;

        // Check if cheque belongs to branch (direct or via split)
        if (c.splits && c.splits.length > 0) {
          const split = c.splits.find(s => s.branch === branch.name);
          if (split) {
            amount = split.amount;
            belongs = true;
          }
        } else if (c.branch === branch.name) {
          amount = c.amount;
          belongs = true;
        }

        if (belongs && c.status === ChequeStatus.PENDING) {
            outstanding += amount;
            pendingCount++;
            
            if (c.date < todayStr) {
              overdue += amount;
            } else {
              // All future dates considered upcoming bills
              upcoming += amount;
            }
        }
      });

      // 2. Calculate Chequebook Stock
      // Find books linked to this branch via branchId
      const branchBooks = chequeBooks.filter(b => b.branchId === branch.id && b.status === 'ACTIVE');
      const booksStock = branchBooks.map(b => {
          // Count usage for this book
          const usedCount = cheques.filter(c => c.chequeBookRef === b.name).length;
          const remaining = Math.max(0, b.totalLeaves - usedCount);
          const percent = (remaining / b.totalLeaves) * 100;
          return {
              name: b.name,
              remaining,
              total: b.totalLeaves,
              percent
          };
      });

      return {
        id: branch.id,
        name: branch.name,
        outstanding,
        overdue,
        upcoming,
        pendingCount,
        books: booksStock
      };
    });
  }, [branches, cheques, chequeBooks]);

  const urgentNotifs = notifications.filter(n => !n.read && (n.type === 'warning' || n.type === 'error'));

  // Helper for dynamic card themes
  const getCardTheme = (index: number) => {
    const themes = [
      { bg: 'bg-gradient-to-br from-blue-50 via-white to-blue-50', border: 'border-blue-100', accent: 'text-blue-600' },
      { bg: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50', border: 'border-emerald-100', accent: 'text-emerald-600' },
      { bg: 'bg-gradient-to-br from-violet-50 via-white to-violet-50', border: 'border-violet-100', accent: 'text-violet-600' },
      { bg: 'bg-gradient-to-br from-amber-50 via-white to-orange-50', border: 'border-amber-100', accent: 'text-amber-600' },
      { bg: 'bg-gradient-to-br from-cyan-50 via-white to-cyan-50', border: 'border-cyan-100', accent: 'text-cyan-600' },
      { bg: 'bg-gradient-to-br from-rose-50 via-white to-rose-50', border: 'border-rose-100', accent: 'text-rose-600' },
    ];
    return themes[index % themes.length];
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-0">
      
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform translate-x-10"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-1">Welcome back, {userName}</h2>
              <p className="text-slate-300 text-sm">Here is your financial overview.</p>
            </div>
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
              <Calendar className="text-white" size={24} />
            </div>
          </div>

           {urgentNotifs.length > 0 && (
            <div className="mt-6 bg-rose-500/20 backdrop-blur-md rounded-xl p-4 border border-rose-500/30 animate-pulse">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-rose-300" size={20} />
                <div>
                  <p className="font-semibold text-sm text-rose-100">Attention Required</p>
                  <p className="text-xs text-rose-200">{urgentNotifs[0].message}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Outstanding" 
          value={stats.pendingAmount.toLocaleString()} 
          subtext={`${stats.pendingCount} cheques pending`}
          icon={DollarSign} 
          colorClass="bg-blue-500" 
        />
        <StatsCard 
          title="Total Cleared" 
          value={stats.clearedAmount.toLocaleString()} 
          icon={CheckCircle} 
          colorClass="bg-emerald-500" 
        />
        <StatsCard 
          title="Upcoming Bills" 
          value={stats.upcomingCount}
          subtext="Due in next 5 days"
          icon={Calendar} 
          colorClass="bg-amber-500" 
        />
        <StatsCard 
          title="Bounced/Rejected" 
          value={stats.bouncedCount}
          subtext="Action required"
          icon={XCircle} 
          colorClass="bg-rose-500" 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Branch Performance Board */}
        <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Building className="text-slate-500" size={20} />
                <h3 className="text-lg font-bold text-slate-800">Branch Performance</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branchMetrics.map((metric, index) => {
                    const theme = getCardTheme(index);
                    return (
                    <div key={metric.id} className={`${theme.bg} ${theme.border} rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col`}>
                        {/* Header */}
                        <div className="p-4 border-b border-black/5 flex justify-between items-center">
                            <div>
                                <h4 className={`font-bold text-lg ${theme.accent} brightness-75`}>{metric.name}</h4>
                                <span className="text-xs text-slate-500 font-medium">{metric.pendingCount} Active Cheques</span>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${metric.overdue > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                        </div>

                        {/* Metrics */}
                        <div className="p-4 grid grid-cols-2 gap-3">
                            <div className="col-span-2 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/50 shadow-sm">
                                <p className="text-xs text-slate-500 font-medium uppercase mb-1">Outstanding</p>
                                <p className="text-xl font-bold text-slate-800">{metric.outstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                            </div>
                            <div className={`p-3 rounded-lg border backdrop-blur-sm shadow-sm ${metric.overdue > 0 ? 'bg-rose-50/80 border-rose-100' : 'bg-white/60 border-white/50'}`}>
                                <p className={`text-xs font-medium uppercase mb-1 ${metric.overdue > 0 ? 'text-rose-600' : 'text-slate-500'}`}>Overdue</p>
                                <p className={`text-lg font-bold ${metric.overdue > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                                    {metric.overdue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border border-amber-100 bg-amber-50/80 backdrop-blur-sm shadow-sm">
                                <p className="text-xs font-medium uppercase mb-1 text-amber-600">Upcoming</p>
                                <p className="text-lg font-bold text-amber-700">
                                    {metric.upcoming.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                                </p>
                            </div>
                        </div>

                        {/* Chequebook Inventory List */}
                        <div className="px-4 pb-4 mt-auto">
                             <div className="border-t border-black/5 pt-3">
                                 <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                                    <Book size={12} /> Chequebook Inventory
                                 </h5>
                                 {metric.books.length > 0 ? (
                                     <div className="space-y-3">
                                         {metric.books.map(book => (
                                             <div key={book.name}>
                                                 <div className="flex justify-between items-center mb-1">
                                                     <span className="text-sm font-medium text-slate-700 truncate max-w-[150px]" title={book.name}>{book.name}</span>
                                                     <span className={`text-xs font-bold ${book.remaining < 5 ? 'text-rose-600' : 'text-slate-600'}`}>
                                                         {book.remaining} pages
                                                     </span>
                                                 </div>
                                                 <div className="h-1.5 w-full bg-slate-200/60 rounded-full overflow-hidden">
                                                     <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${book.remaining < 5 ? 'bg-rose-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${book.percent}%` }}
                                                     ></div>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 ) : (
                                     <div className="text-xs text-slate-400 italic py-1">No chequebooks assigned</div>
                                 )}
                             </div>
                        </div>
                    </div>
                    );
                })}
                {branches.length === 0 && (
                   <div className="col-span-full p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400">
                       Add branches in Settings to see performance metrics here.
                   </div>
                )}
            </div>
        </div>

        {/* Stats Breakdown */}
        <div className="h-fit space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Status Breakdown</h3>
                <div className="h-[220px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        >
                        {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                    </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <span className="text-3xl font-bold text-slate-700">{stats.totalCount}</span>
                        <p className="text-xs text-slate-400 uppercase font-medium">Total</p>
                    </div>
                </div>
                <div className="mt-4 space-y-2">
                    {pieData.map(p => (
                        <div key={p.name} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: p.color}}></div>
                                <span className="text-slate-600">{p.name}</span>
                            </div>
                            <span className="font-bold text-slate-800">{p.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;