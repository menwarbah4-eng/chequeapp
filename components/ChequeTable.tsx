import React, { useState } from 'react';
import { Cheque, ChequeStatus } from '../types';
import { Edit2, Trash2, Calendar, Building, BookOpen, ChevronDown, Layers, Eye } from 'lucide-react';

interface ChequeTableProps {
  cheques: Cheque[];
  onEdit: (cheque: Cheque) => void;
  onView?: (cheque: Cheque) => void;
  onDelete?: (id: string) => void; // Made optional
  onStatusChange: (id: string, status: ChequeStatus, note?: string) => void;
  onSelectionChange: (ids: string[]) => void;
  selectedIds: string[];
}

const ChequeTable: React.FC<ChequeTableProps> = ({ 
  cheques, 
  onEdit, 
  onView,
  onDelete, 
  onStatusChange,
  onSelectionChange,
  selectedIds 
}) => {
  const [sortConfig, setSortConfig] = useState<{key: keyof Cheque, direction: 'asc' | 'desc'} | null>(null);

  const handleSort = (key: keyof Cheque) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedCheques = [...cheques].sort((a, b) => {
    if (!sortConfig) return 0;
    const aVal = a[sortConfig.key] ?? '';
    const bVal = b[sortConfig.key] ?? '';
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.checked) {
      onSelectionChange(cheques.map(c => c.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleStatusAction = (id: string, newStatus: ChequeStatus, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    if (newStatus === ChequeStatus.CLEARED) {
      // Confirm before marking as Paid
      const confirmed = window.confirm("Are you sure you want to mark this cheque as PAID?");
      if (confirmed) {
        onStatusChange(id, newStatus);
      }
    } else if (newStatus === ChequeStatus.BOUNCED) {
      // Reason prompt for Rejection
      const reason = window.prompt("Please enter the reason for rejection:");
      if (reason !== null) { // If user didn't cancel
        if (reason.trim() === "") {
           alert("A reason is required to reject a cheque.");
           return;
        }
        onStatusChange(id, newStatus, reason);
      }
    } else {
      // Standard update for other statuses
      onStatusChange(id, newStatus);
    }
  };

  // Helper to get user-friendly label for status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case ChequeStatus.CLEARED: return 'Paid';
      case ChequeStatus.BOUNCED: return 'Rejected';
      case ChequeStatus.PENDING: return 'Pending';
      case ChequeStatus.CANCELLED: return 'Cancelled';
      default: return status;
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case ChequeStatus.CLEARED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case ChequeStatus.BOUNCED: return 'bg-rose-100 text-rose-700 border-rose-200';
      case ChequeStatus.PENDING: return 'bg-amber-100 text-amber-700 border-amber-200';
      case ChequeStatus.CANCELLED: return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (cheques.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="text-slate-300" size={32} />
        </div>
        <h3 className="text-lg font-medium text-slate-700">No cheques found</h3>
        <p className="text-slate-400 max-w-xs mx-auto mt-2">Try adjusting your search or filters, or add a new cheque to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
          <thead className="bg-slate-50/80 backdrop-blur border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  onChange={handleSelectAll}
                  checked={cheques.length > 0 && selectedIds.length === cheques.length}
                />
              </th>
              <th onClick={() => handleSort('chequeNumber')} className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors">
                Cheque #
              </th>
              <th onClick={() => handleSort('payeeName')} className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors">
                Payee / Date
              </th>
              <th onClick={() => handleSort('amount')} className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors text-right">
                Amount
              </th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                Bank & Branch
              </th>
              <th onClick={() => handleSort('status')} className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors text-center">
                Status
              </th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedCheques.map(cheque => (
              <tr 
                key={cheque.id} 
                onClick={() => onView && onView(cheque)}
                className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${selectedIds.includes(cheque.id) ? 'bg-blue-50/30' : ''}`}
              >
                <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(cheque.id)}
                    onChange={(e) => handleSelectRow(cheque.id, e)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-4">
                  <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs">
                    {cheque.chequeNumber}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1 md:hidden">{cheque.chequeBookRef}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 text-sm">{cheque.payeeName}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar size={10} /> {cheque.date}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="font-bold text-slate-700">
                    {cheque.amount.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                  </span>
                </td>
                <td className="px-4 py-4 hidden md:table-cell">
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-600">{cheque.bankName}</span>
                    
                    {/* Logic for Multi-Branch display */}
                    {cheque.splits && cheque.splits.length > 1 ? (
                        <div className="group/tooltip relative">
                             <div className="flex items-center gap-1 text-xs text-blue-600 font-medium cursor-help">
                                <Layers size={10} /> Multi-Branch
                             </div>
                             {/* Tooltip for Splits */}
                             <div className="absolute left-0 bottom-full mb-1 w-48 bg-slate-800 text-white text-xs rounded-lg p-2 shadow-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-10">
                                 <p className="font-bold border-b border-slate-600 pb-1 mb-1">Allocation:</p>
                                 {cheque.splits.map(s => (
                                     <div key={s.branch} className="flex justify-between">
                                         <span>{s.branch}:</span>
                                         <span>{s.amount}</span>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Building size={10} /> {cheque.branch}
                        </div>
                    )}
                    
                    {cheque.chequeBookRef && <span className="text-[10px] text-slate-400 mt-0.5">{cheque.chequeBookRef}</span>}
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                   {/* Read-only Status Badge */}
                   <span className={`
                     px-3 py-1 rounded-full text-xs font-bold border inline-block min-w-[80px]
                     ${getStatusColorClass(cheque.status)}
                   `}>
                     {getStatusLabel(cheque.status)}
                   </span>
                </td>
                <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  {cheque.status === ChequeStatus.PENDING ? (
                    <div className="flex items-center justify-end gap-3">
                        {/* Quick Edit Icon */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEdit(cheque); }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-50 hover:opacity-100"
                          title="Edit Details"
                        >
                          <Edit2 size={16} />
                        </button>

                        {/* Primary Action Dropdown */}
                        <div className="relative">
                          <select
                            value=""
                            onChange={(e) => handleStatusAction(cheque.id, e.target.value as ChequeStatus, e)}
                            className="appearance-none bg-blue-600 text-white pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold cursor-pointer shadow-sm hover:bg-blue-700 transition-all outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1"
                          >
                            <option value="" disabled>Actions</option>
                            <option value={ChequeStatus.CLEARED}>Mark Paid</option>
                            <option value={ChequeStatus.BOUNCED}>Reject</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-100 pointer-events-none" />
                        </div>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(cheque); }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      {onDelete && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDelete(cheque.id); }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
        <span>Showing {cheques.length} records</span>
        {/* Simple Mock Pagination */}
        <div className="flex gap-1">
          <button disabled className="px-2 py-1 rounded bg-white border border-slate-200 disabled:opacity-50">Prev</button>
          <button className="px-2 py-1 rounded bg-blue-600 text-white border border-blue-600">1</button>
          <button disabled className="px-2 py-1 rounded bg-white border border-slate-200 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
};

export default ChequeTable;