import React, { useState, useRef, useEffect } from 'react';
import { Cheque, ChequeStatus, Branch, ChequeBook } from '../types';
import { extractChequeDetails } from '../services/geminiService';
import { getChequeBookUsage, getBranches, getChequeBooks } from '../services/storageService';
import { Loader2, Camera, X, Book, ChevronRight, AlertCircle, CheckSquare, Calculator, CreditCard } from 'lucide-react';

interface ChequeFormProps {
  initialData?: Partial<Cheque>;
  onSubmit: (cheque: Partial<Cheque>) => void;
  onCancel: () => void;
}

const ChequeForm: React.FC<ChequeFormProps> = ({ initialData, onSubmit, onCancel }) => {
  // Initialize state
  const [formData, setFormData] = useState<Partial<Cheque>>({
    chequeNumber: '',
    payeeName: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    status: ChequeStatus.PENDING,
    bankName: '',
    chequeBookRef: '',
    notes: '',
    ...initialData
  });

  // Dynamic Data State
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
  const [availableBooks, setAvailableBooks] = useState<ChequeBook[]>([]);

  // Load dynamic data
  useEffect(() => {
    setAvailableBranches(getBranches());
    setAvailableBooks(getChequeBooks());
  }, []);

  // State for Branch Split Table
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(() => {
    if (initialData?.splits && initialData.splits.length > 0) {
      return new Set(initialData.splits.map(s => s.branch));
    }
    if (initialData?.branch && initialData.branch !== 'Multi') {
      return new Set([initialData.branch]);
    }
    return new Set();
  });

  const [branchAmounts, setBranchAmounts] = useState<Record<string, number>>(() => {
    const amounts: Record<string, number> = {};
    if (initialData?.splits && initialData.splits.length > 0) {
      initialData.splits.forEach(s => amounts[s.branch] = s.amount);
    } else if (initialData?.branch && initialData.amount && initialData.branch !== 'Multi') {
      amounts[initialData.branch] = initialData.amount;
    }
    return amounts;
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.imageUrl || null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bookUsage, setBookUsage] = useState({ used: 0, total: 50 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate Chequebook Usage on mount and when chequeBookRef changes
  useEffect(() => {
    if (formData.chequeBookRef) {
      const { used, total } = getChequeBookUsage(formData.chequeBookRef);
      setBookUsage({ used, total });
    }
  }, [formData.chequeBookRef]);

  // Recalculate Total Amount when branch amounts change
  useEffect(() => {
    const total = Object.entries(branchAmounts)
      .filter(([branch]) => selectedBranches.has(branch))
      .reduce((sum: number, [, amount]) => sum + ((amount as number) || 0), 0);
    
    setFormData(prev => ({ ...prev, amount: total }));
    
    // Clear amount error if valid
    if (total > 0 && errors.amount) {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.amount;
            return newErrors;
        });
    }
  }, [branchAmounts, selectedBranches, errors.amount]);

  const handleBranchToggle = (branchName: string) => {
    const newSelected = new Set(selectedBranches);
    if (newSelected.has(branchName)) {
      newSelected.delete(branchName);
    } else {
      newSelected.add(branchName);
      if (!branchAmounts[branchName]) {
        setBranchAmounts(prev => ({ ...prev, [branchName]: 0 }));
      }
    }
    setSelectedBranches(newSelected);
    if (errors.branch) {
        setErrors(prev => { const e = {...prev}; delete e.branch; return e; });
    }
  };

  const handleBranchAmountChange = (branchName: string, value: string) => {
    const numVal = value === '' ? 0 : parseFloat(value);
    setBranchAmounts(prev => ({ ...prev, [branchName]: numVal }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setPreviewUrl(base64);
      
      setIsProcessing(true);
      try {
        const ocrResult = await extractChequeDetails(base64);
        setFormData(prev => ({
          ...prev,
          ...ocrResult,
          imageUrl: base64,
          // Preserve manual logic
          branch: prev.branch, 
          chequeBookRef: prev.chequeBookRef
        }));
      } catch (error) {
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (selectedBranches.size === 0) newErrors.branch = "At least one branch must be selected";
    if (!formData.chequeBookRef) newErrors.chequeBookRef = "Chequebook is required";
    if (!formData.chequeNumber?.trim()) newErrors.chequeNumber = "Cheque number is required";
    if (!formData.amount || formData.amount <= 0) newErrors.amount = "Total amount must be greater than 0";
    if (!formData.payeeName?.trim()) newErrors.payeeName = "Payee name is required";
    if (!formData.date) newErrors.date = "Date is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Construct splits array
      const splits = Array.from(selectedBranches).map(branchName => ({
        branch: branchName,
        amount: branchAmounts[branchName] || 0
      }));

      // Determine main branch value
      const mainBranch = splits.length === 1 ? splits[0].branch : 'Multi';

      onSubmit({
        ...formData,
        branch: mainBranch,
        splits: splits
      });
    }
  };

  const remainingPages = bookUsage.total - bookUsage.used;
  const progressPercent = Math.min(100, (bookUsage.used / bookUsage.total) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full md:w-[650px] md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {initialData?.id ? 'Edit Cheque' : 'Issue New Cheque'}
            </h2>
            <p className="text-xs text-slate-500">Fill in the details below</p>
          </div>
          <button onClick={onCancel} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          
          {/* 1. Chequebook Selection */}
          <div className="space-y-3">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Book size={14} /> Chequebook Selection
             </h3>
             <div className="relative">
                <select
                    name="chequeBookRef"
                    value={formData.chequeBookRef}
                    onChange={handleChange}
                    className={`w-full pl-4 pr-10 py-3 bg-slate-50 border ${errors.chequeBookRef ? 'border-red-300' : 'border-slate-200'} rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none transition-all font-medium text-slate-700`}
                >
                    <option value="" disabled>Select Chequebook...</option>
                    {availableBooks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
                <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
            </div>
            {errors.chequeBookRef && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/> {errors.chequeBookRef}</p>}

            {/* Remaining Pages Visual */}
            {formData.chequeBookRef && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="flex-1">
                         <div className="flex justify-between items-end mb-2">
                             <span className="text-sm font-medium text-slate-600">Available Leaves</span>
                             <span className="text-xs text-slate-400 font-mono">{bookUsage.used} used / {bookUsage.total} total</span>
                         </div>
                         <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden w-full">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${remainingPages < 5 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                style={{ width: `${100 - progressPercent}%` }}
                            ></div>
                         </div>
                    </div>
                    <div className="text-center pl-4 border-l border-slate-100">
                        <span className={`block text-2xl font-bold ${remainingPages < 5 ? 'text-red-600' : 'text-slate-800'}`}>{remainingPages}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Left</span>
                    </div>
                </div>
            )}
          </div>

          {/* 2. Branch-wise Amount Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Calculator size={14} /> Branch Allocation
                </h3>
                {errors.branch && <span className="text-xs text-red-500 font-medium">{errors.branch}</span>}
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 w-12 text-center">#</th>
                            <th className="px-4 py-3">Branch Name</th>
                            <th className="px-4 py-3 w-40 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {availableBranches.map(branch => {
                            const isSelected = selectedBranches.has(branch.name);
                            return (
                                <tr key={branch.id} className={`transition-colors ${isSelected ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}>
                                    <td className="px-4 py-3 text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={() => handleBranchToggle(branch.name)}
                                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-700" onClick={() => handleBranchToggle(branch.name)}>
                                        {branch.name}
                                    </td>
                                    <td className="px-4 py-2">
                                        <input 
                                            type="number" 
                                            disabled={!isSelected}
                                            value={branchAmounts[branch.name] || ''}
                                            onChange={(e) => handleBranchAmountChange(branch.name, e.target.value)}
                                            placeholder="0.000"
                                            className={`w-full text-right px-3 py-1.5 rounded border outline-none transition-all font-mono
                                                ${isSelected 
                                                    ? 'bg-white border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                                                    : 'bg-slate-50 border-transparent text-slate-300 cursor-not-allowed'}`}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                            <td colSpan={2} className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-xs tracking-wider">Total Amount</td>
                            <td className="px-4 py-3 text-right font-bold text-blue-600 font-mono text-base">
                                {formData.amount?.toLocaleString(undefined, {minimumFractionDigits: 3})}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            {errors.amount && <p className="text-xs text-red-500 flex items-center gap-1 justify-end"><AlertCircle size={12}/> {errors.amount}</p>}
          </div>

          {/* 3. Cheque Details */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={14} /> Cheque Details
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2 space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Payee Name</label>
                    <input
                        type="text"
                        name="payeeName"
                        value={formData.payeeName}
                        onChange={handleChange}
                        placeholder="Name of receiver"
                        className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.payeeName ? 'border-red-300' : 'border-slate-200'} rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none`}
                    />
                    {errors.payeeName && <p className="text-xs text-red-500">{errors.payeeName}</p>}
                 </div>
                 
                 <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Cheque No.</label>
                    <input
                        type="text"
                        name="chequeNumber"
                        value={formData.chequeNumber}
                        onChange={handleChange}
                        placeholder="000000"
                        className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.chequeNumber ? 'border-red-300' : 'border-slate-200'} rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none font-mono`}
                    />
                    {errors.chequeNumber && <p className="text-xs text-red-500">{errors.chequeNumber}</p>}
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Date</label>
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.date ? 'border-red-300' : 'border-slate-200'} rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none`}
                    />
                    {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                 </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
             <label className="text-xs font-semibold text-slate-500 uppercase">Notes (Optional)</label>
             <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none resize-none text-sm"
                placeholder="Add details..."
             />
          </div>

          {/* Smart Scan Toggle (Optional functionality hidden but kept in code structure if needed) */}
          {!previewUrl && (
             <div className="flex justify-center">
                <button 
                 type="button"
                 onClick={() => fileInputRef.current?.click()}
                 className="text-blue-600 text-xs font-medium flex items-center gap-1 hover:underline opacity-80"
                >
                  <Camera size={14} /> Upload Cheque Image (OCR)
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
             </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
           <button 
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isProcessing}
            className="flex-[2] px-4 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={18} /> : (initialData?.id ? 'Update Cheque' : 'Save Cheque')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChequeForm;