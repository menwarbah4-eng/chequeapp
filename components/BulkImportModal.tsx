import React, { useState, useRef } from 'react';
import { Cheque, ChequeStatus, User } from '../types';
import { Upload, FileText, AlertTriangle, CheckCircle, X, Download, Loader2 } from 'lucide-react';

interface BulkImportModalProps {
  onImport: (cheques: Partial<Cheque>[]) => Promise<void>;
  onClose: () => void;
  currentUser: User;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onImport, onClose, currentUser }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Partial<Cheque>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = ['Cheque Number', 'Amount', 'Payee Name', 'Date (YYYY-MM-DD)', 'Bank Name', 'Branch', 'Chequebook Name', 'Notes'];
    const sample = ['000123', '5000.00', 'Sample Vendor Ltd', '2023-12-31', 'City Bank', 'Menwar 01', 'Menwar Book A', 'Payment for supplies'];
    const csvContent = [headers.join(','), sample.join(',')].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cheque_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const results: Partial<Cheque>[] = [];
    const errs: string[] = [];

    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
      // Simple split by comma (Note: This doesn't handle commas inside quotes well, basic implementation)
      const cols = lines[i].split(',').map(c => c.trim());
      
      if (cols.length < 4) {
        errs.push(`Row ${i + 1}: Insufficient columns. Expected at least 4.`);
        continue;
      }

      const [chequeNo, amountStr, payee, dateStr, bank, branch, bookRef, notes] = cols;

      // Basic Validation
      if (!chequeNo) { errs.push(`Row ${i + 1}: Missing Cheque Number`); continue; }
      if (!amountStr || isNaN(Number(amountStr))) { errs.push(`Row ${i + 1}: Invalid Amount`); continue; }
      if (!payee) { errs.push(`Row ${i + 1}: Missing Payee Name`); continue; }
      if (!dateStr || isNaN(Date.parse(dateStr))) { errs.push(`Row ${i + 1}: Invalid Date format (YYYY-MM-DD required)`); continue; }

      results.push({
        chequeNumber: chequeNo,
        amount: Number(amountStr),
        payeeName: payee.replace(/"/g, ''), // Remove quotes if any
        date: dateStr,
        bankName: bank || '',
        branch: branch || currentUser.branch || 'Multi',
        chequeBookRef: bookRef || '',
        notes: notes || '',
        status: ChequeStatus.PENDING,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id
      });
    }

    setParsedData(results);
    setErrors(errs);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(selectedFile);
  };

  const handleConfirm = async () => {
    if (parsedData.length === 0) return;
    setIsProcessing(true);
    await onImport(parsedData);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Import Cheques via CSV</h2>
            <p className="text-xs text-slate-500">Bulk upload data from Excel or CSV</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Step 1: Template */}
          {!file && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="font-bold text-blue-900">Step 1: Download Template</h3>
                <p className="text-sm text-blue-600/80 mt-1">Use our standardized CSV format to ensure data accuracy.</p>
              </div>
              <button 
                onClick={downloadTemplate}
                className="px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors flex items-center gap-2 mx-auto"
              >
                <Download size={16} /> Download CSV Template
              </button>
            </div>
          )}

          {/* Step 2: Upload */}
          <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv" 
              onChange={handleFileChange}
              className="hidden"
            />
            
            {!file ? (
              <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="font-bold text-slate-600">Click to Upload CSV</p>
                <p className="text-xs text-slate-400 mt-1">Supported format: .csv</p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <FileText size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-700 text-sm">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={() => { setFile(null); setParsedData([]); setErrors([]); }} className="text-xs text-red-500 font-bold hover:underline">Remove</button>
              </div>
            )}
          </div>

          {/* Validation Report */}
          {file && (
            <div className="space-y-4">
               <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <CheckCircle size={16} />
                    <span>{parsedData.length} Valid Rows</span>
                  </div>
                  {errors.length > 0 && (
                    <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                      <AlertTriangle size={16} />
                      <span>{errors.length} Errors</span>
                    </div>
                  )}
               </div>

               {errors.length > 0 && (
                 <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <ul className="list-disc list-inside text-xs text-rose-600 space-y-1">
                      {errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                 </div>
               )}

               {parsedData.length > 0 && (
                 <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">No.</th>
                          <th className="px-3 py-2">Payee</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedData.slice(0, 5).map((d, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono text-slate-600">{d.chequeNumber}</td>
                            <td className="px-3 py-2 truncate max-w-[120px]">{d.payeeName}</td>
                            <td className="px-3 py-2 text-right font-medium">{d.amount?.toLocaleString()}</td>
                            <td className="px-3 py-2 text-slate-500">{d.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.length > 5 && (
                      <div className="px-3 py-2 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-200">
                        ...and {parsedData.length - 5} more
                      </div>
                    )}
                 </div>
               )}
            </div>
          )}

        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={parsedData.length === 0 || isProcessing}
            className="flex-[2] py-2.5 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={18} /> : `Import ${parsedData.length} Cheques`}
          </button>
        </div>

      </div>
    </div>
  );
};

export default BulkImportModal;