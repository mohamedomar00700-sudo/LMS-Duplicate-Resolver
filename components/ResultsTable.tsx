
import React from 'react';
import { ProcessedDuplicate } from '../types';

interface ResultsTableProps {
  data: ProcessedDuplicate[];
  onSelect: (item: ProcessedDuplicate) => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ data, onSelect }) => {
  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-slate-700/50">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700/50">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">User Identity</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Match Logic</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Primary (Keep)</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Secondary (Del)</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Status</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {data.map((row) => (
              <tr key={row.id} className="group hover:bg-white/5 transition-colors duration-200 cursor-pointer" onClick={() => onSelect(row)}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{row.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{row.employeeCode || 'ID_MISSING'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-bold rounded uppercase tracking-wide border 
                    ${row.matchReason === 'Exact Email' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 
                      row.matchReason === 'Same Phone' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                    {row.matchReason}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-300 font-mono">{row.primaryEmail}</span>
                    <div className="flex items-center mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${row.primaryAccount === 'Talent' ? 'bg-cyan-500' : (row.primaryAccount === 'Pharmacy' ? 'bg-emerald-500' : 'bg-red-500')}`}></span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">{row.primaryAccount}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col opacity-60">
                    <span className="text-xs text-slate-400 font-mono line-through decoration-slate-600">{row.secondaryEmail}</span>
                    <div className="flex items-center mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${row.primaryAccount === 'Talent' ? 'bg-emerald-500' : 'bg-cyan-500'}`}></span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">{row.primaryAccount === 'Talent' ? 'Pharmacy' : (row.primaryAccount === 'Pharmacy' ? 'Talent' : '-')}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                   {row.warnings.length > 0 ? (
                     <span className="flex items-center text-red-400 text-xs font-medium bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                       <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                       REVIEW (TIE)
                     </span>
                   ) : (
                     <div className="flex items-center">
                         <span className="flex items-center text-emerald-400 text-xs font-medium bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                           <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                           READY
                         </span>
                         {row.migrationSteps.length > 0 && (
                            <span className="ml-2 text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-1.5 py-0.5 rounded font-bold">
                               +{row.migrationSteps.length} MERGE
                            </span>
                         )}
                     </div>
                   )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onSelect(row); }}
                    className="text-xs font-medium text-slate-300 hover:text-white border border-slate-600 hover:border-indigo-400 hover:bg-indigo-500/20 px-3 py-1.5 rounded transition-all"
                  >
                    View Diff
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
