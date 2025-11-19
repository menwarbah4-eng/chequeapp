import React, { useRef, useEffect, useState } from 'react';
import { Cheque, ChequeStatus } from '../types';
import { X, ChevronLeft, ChevronRight, Edit2, Trash2, Calendar, CreditCard, Building, FileText, Image as ImageIcon, Layers, CheckSquare, XSquare, ArrowLeft, Share2, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ChequeDetailProps {
  cheque: Cheque;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  onEdit: (cheque: Cheque) => void;
  onDelete?: (id: string) => void;
  onStatusChange: (id: string, status: ChequeStatus, note?: string) => void;
}

const ChequeDetail: React.FC<ChequeDetailProps> = ({
  cheque,
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  onEdit,
  onDelete,
  onStatusChange
}) => {
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && hasNext) onNext();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNext, hasPrev, onNext, onPrev, onClose]);

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

    if (isLeftSwipe && hasNext) onNext();
    if (isRightSwipe && hasPrev) onPrev();
  };

  const getStatusColor = (status: ChequeStatus) => {
    switch (status) {
      case ChequeStatus.CLEARED: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case ChequeStatus.BOUNCED: return 'bg-rose-100 text-rose-800 border-rose-200';
      case ChequeStatus.PENDING: return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const handleAction = (status: ChequeStatus) => {
    if (status === ChequeStatus.BOUNCED) {
        const reason = window.prompt("Please enter the reason for rejection:");
        if (reason) onStatusChange(cheque.id, status, reason);
    } else {
        if(window.confirm(`Mark this cheque as ${status}?`)) {
            onStatusChange(cheque.id, status);
        }
    }
  };

  const handleExport = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2, // High quality
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (element) => {
           // Don't capture the close button or navigation during export if inside the card
           return element.classList.contains('no-export');
        }
      });
      
      const image = canvas.toDataURL("image/jpeg", 0.9);
      const link = document.createElement('a');
      link.href = image;
      link.download = `Cheque_${cheque.chequeNumber}_${new Date().toISOString().slice(0,10)}.jpg`;
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export image. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
      
      {/* Desktop Navigation Buttons */}
      <button 
        onClick={onPrev}
        disabled={!hasPrev}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur text-white rounded-full items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={40} />
      </button>
      <button 
        onClick={onNext}
        disabled={!hasNext}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur text-white rounded-full items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <ChevronRight size={40} />
      </button>

      {/* Card Container */}
      <div 
        ref={cardRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <CreditCard size={16} />
                <span>Cheque Details</span>
            </div>
            <div className="flex items-center gap-2">
                <button 
                  onClick={handleExport} 
                  disabled={isExporting}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors no-export"
                  title="Export as Image"
                >
                    {isExporting ? <span className="animate-spin block w-5 h-5 border-2 border-blue-500 rounded-full border-t-transparent"></span> : <Share2 size={20} />}
                </button>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors no-export">
                    <X size={24} />
                </button>
            </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6">
            
            {/* Status Banner */}
            <div className={`flex justify-between items-center px-4 py-3 rounded-lg border ${getStatusColor(cheque.status)}`}>
                <span className="font-bold text-sm tracking-wide uppercase">{cheque.status}</span>
                <span className="text-xs opacity-75 font-medium">
                   Created: {new Date(cheque.createdAt).toLocaleDateString()}
                </span>
            </div>

            {/* Main Amount & Payee */}
            <div className="text-center space-y-1">
                <p className="text-4xl font-bold text-slate-800 tracking-tight">
                    {cheque.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
                <h3 className="text-lg font-semibold text-slate-600">{cheque.payeeName}</h3>
                <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mt-2">
                    <Calendar size={14} /> Due: <span className="font-medium text-slate-600">{new Date(cheque.date).toLocaleDateString(undefined, {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'})}</span>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-400 font-bold">Cheque Number</label>
                    <p className="font-mono font-medium text-slate-700">{cheque.chequeNumber}</p>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-400 font-bold">Chequebook</label>
                    <p className="font-medium text-slate-700 text-sm truncate" title={cheque.chequeBookRef}>{cheque.chequeBookRef || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-400 font-bold">Bank</label>
                    <p className="font-medium text-slate-700 text-sm">{cheque.bankName || 'Not Specified'}</p>
                </div>
                 <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-400 font-bold">Branch</label>
                    <p className="font-medium text-slate-700 text-sm">{cheque.branch}</p>
                </div>
            </div>

            {/* Splits Info */}
            {cheque.splits && cheque.splits.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Layers size={14}/> Allocation Details</h4>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                         {cheque.splits.map((split, idx) => (
                             <div key={idx} className="flex justify-between px-4 py-2 border-b border-slate-50 last:border-0 text-sm">
                                 <span className="text-slate-600">{split.branch}</span>
                                 <span className="font-mono font-bold text-slate-700">{split.amount.toLocaleString()}</span>
                             </div>
                         ))}
                    </div>
                </div>
            )}

            {/* Image Preview */}
            {cheque.imageUrl && (
                 <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><ImageIcon size={14}/> Cheque Image</h4>
                    <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-100 h-40 flex items-center justify-center relative group">
                        <img src={cheque.imageUrl} alt="Cheque Scan" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <button className="text-white text-xs font-bold border border-white rounded px-3 py-1 hover:bg-white hover:text-black transition-colors">View Fullscreen</button>
                        </div>
                    </div>
                 </div>
            )}

            {/* Notes */}
            {cheque.notes && (
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><FileText size={14}/> Notes & History</h4>
                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                        {cheque.notes}
                    </div>
                </div>
            )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 grid grid-cols-2 gap-3 no-export">
            <button 
                onClick={() => onEdit(cheque)}
                className="col-span-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors flex items-center justify-center gap-2"
            >
                <Edit2 size={18} /> Edit
            </button>
            
            {onDelete ? (
                 <button 
                    onClick={() => onDelete(cheque.id)}
                    className="col-span-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
                 >
                    <Trash2 size={18} /> Delete
                 </button>
            ) : (
                <div className="col-span-1"></div>
            )}

            {cheque.status === ChequeStatus.PENDING && (
                <div className="col-span-2 grid grid-cols-2 gap-3 mt-2 border-t border-slate-200 pt-3">
                    <button 
                        onClick={() => handleAction(ChequeStatus.CLEARED)}
                        className="bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-md shadow-emerald-200 hover:bg-emerald-700 flex items-center justify-center gap-2"
                    >
                        <CheckSquare size={18} /> Mark Paid
                    </button>
                    <button 
                        onClick={() => handleAction(ChequeStatus.BOUNCED)}
                        className="bg-rose-600 text-white py-3 rounded-xl font-bold shadow-md shadow-rose-200 hover:bg-rose-700 flex items-center justify-center gap-2"
                    >
                        <XSquare size={18} /> Reject
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ChequeDetail;