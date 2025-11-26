
import React from 'react';
import { ProcessedDuplicate } from '../types';

interface DashboardProps {
    data: ProcessedDuplicate[];
}

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
    const total = data.length;
    const exact = data.filter(r => r.matchReason === 'Exact Email').length;
    const fuzzy = data.filter(r => r.matchReason === 'Fuzzy Name Match').length;
    const phone = data.filter(r => r.matchReason === 'Same Phone').length;
    
    // "Ready to Merge" are those without critical warnings (ties)
    const needsReview = data.filter(r => r.warnings.length > 0).length;
    const readyToMerge = total - needsReview;

    // Calculate total missing courses (migration steps)
    const totalMissingCourses = data.reduce((acc, curr) => acc + curr.migrationSteps.length, 0);

    const getWidth = (val: number) => total > 0 ? `${(val / total) * 100}%` : '0%';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* KPI Card 1 */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-all"></div>
                <div>
                    <h3 className="text-slate-400 text-xs font-mono uppercase tracking-widest">Duplicate Users</h3>
                    <div className="text-5xl font-bold text-white mt-2 tracking-tight drop-shadow-lg">{total}</div>
                </div>
                <div className="mt-6 flex gap-2">
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-md font-mono">
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                         Ready: {readyToMerge}
                    </div>
                </div>
            </div>

            {/* Manual Work Load */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div>
                    <h3 className="text-slate-400 text-xs font-mono uppercase tracking-widest">Missing Course Gaps</h3>
                    <div className="flex items-end gap-3 mt-2">
                        <span className={`text-5xl font-bold drop-shadow-[0_0_10px_rgba(249,115,22,0.3)] ${totalMissingCourses > 0 ? 'text-orange-400' : 'text-slate-600'}`}>{totalMissingCourses}</span>
                        <span className="text-xs text-slate-500 mb-2 font-mono">TOTAL MERGES NEEDED</span>
                    </div>
                </div>
                 <div className="mt-4">
                     <p className="text-xs text-slate-500 border-l-2 border-slate-700 pl-3">
                        Total courses completed in secondary accounts but missing in primary accounts.
                     </p>
                </div>
            </div>

            {/* Action Status */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div>
                    <h3 className="text-slate-400 text-xs font-mono uppercase tracking-widest">Conflict Review</h3>
                    <div className="flex items-end gap-3 mt-2">
                        <span className={`text-5xl font-bold drop-shadow-[0_0_10px_rgba(248,113,113,0.3)] ${needsReview > 0 ? 'text-red-400' : 'text-slate-600'}`}>{needsReview}</span>
                        <span className="text-xs text-slate-500 mb-2 font-mono">TIE BREAKERS</span>
                    </div>
                </div>
                <div className="mt-4">
                     <p className="text-xs text-slate-500 border-l-2 border-slate-700 pl-3">
                        Accounts marked for review have <span className="text-slate-300">identical completion counts</span> on both platforms.
                     </p>
                </div>
            </div>
        </div>
    );
};
