
import React, { useState } from 'react';
import { ProcessedDuplicate } from '../types';
import { analyzeDuplicateWithGemini, generateEmailDraft } from '../services/geminiService';

interface DetailViewProps {
  pair: ProcessedDuplicate;
  onClose: () => void;
  onUpdate: (updated: ProcessedDuplicate) => void;
}

export const DetailView: React.FC<DetailViewProps> = ({ pair, onClose, onUpdate }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'email'>('details');

  const handleAIAnalysis = async () => {
    const aistudio = (window as any).aistudio;
    const hasKey = await aistudio?.hasSelectedApiKey();
    if (!hasKey) {
        try { await aistudio?.openSelectKey(); } catch (e) { return; }
    }

    setAnalyzing(true);
    const result = await analyzeDuplicateWithGemini(pair);
    onUpdate(result);
    setAnalyzing(false);
  };

  const handleDraftEmail = async () => {
    const aistudio = (window as any).aistudio;
    const hasKey = await aistudio?.hasSelectedApiKey();
    if (!hasKey) {
        try { await aistudio?.openSelectKey(); } catch (e) { return; }
    }

    setDrafting(true);
    const draft = await generateEmailDraft(pair);
    onUpdate({ ...pair, emailDraft: draft });
    setDrafting(false);
    setActiveTab('email');
  };

  // Determine which account is treated as Primary for display to match logic.ts calculation
  // Logic.ts defaults to userA (Talent) if there is a Tie (Review Needed)
  const isTalentPrimary = pair.primaryAccount === 'Talent' || pair.primaryAccount === 'Review Needed';
  
  const primaryObj = isTalentPrimary ? pair.accountA : pair.accountB;
  const secondaryObj = isTalentPrimary ? pair.accountB : pair.accountA;

  const DiffRow = ({ label, valA, valB }: { label: string, valA: string | undefined, valB: string | undefined }) => {
     const isDiff = (valA || '').toLowerCase() !== (valB || '').toLowerCase();
     return (
        <div className="grid grid-cols-12 gap-4 text-sm py-3 border-b border-slate-700/50 last:border-0 items-center hover:bg-white/5 transition px-2 rounded-sm">
            <div className="col-span-2 font-medium text-slate-400 text-xs uppercase tracking-wide truncate" title={label}>{label}</div>
            <div className={`col-span-5 px-3 py-1.5 rounded border border-transparent font-mono text-xs truncate ${isDiff ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'text-slate-300'}`} title={valA}>{valA || '-'}</div>
            <div className={`col-span-5 px-3 py-1.5 rounded border border-transparent font-mono text-xs truncate ${isDiff ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'text-slate-300 opacity-50'}`} title={valB}>{valB || '-'}</div>
        </div>
     );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center pt-10">
      <div className="relative glass-panel rounded-xl shadow-2xl w-11/12 max-w-5xl p-0 mb-20 flex flex-col h-[90vh] ring-1 ring-white/10 animate-fade-in-up">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-slate-900/50 rounded-t-xl">
             <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Resolution Protocol</h2>
                <div className="flex gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-700 text-slate-300 border border-slate-600">{pair.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">{pair.type}</span>
                </div>
            </div>
            <div className="flex gap-3">
                 <button onClick={handleDraftEmail} disabled={drafting} className="px-4 py-2 bg-slate-800 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white text-sm font-medium transition">
                    {drafting ? 'Generating...' : 'Draft Email'}
                 </button>
                 <button onClick={handleAIAnalysis} disabled={analyzing} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-indigo-500/20 text-sm font-medium border border-white/10 transition">
                    {analyzing ? 'Thinking...' : 'AI Deep Scan'}
                 </button>
                 <button onClick={onClose} className="text-slate-400 hover:text-white ml-2 transition">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>
            </div>
        </div>

        <div className="flex border-b border-white/10 bg-slate-900/30">
            <button onClick={() => setActiveTab('details')} className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === 'details' ? 'border-b-2 border-cyan-500 text-cyan-400 bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}>Data Comparison</button>
            <button onClick={() => setActiveTab('email')} className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === 'email' ? 'border-b-2 border-cyan-500 text-cyan-400 bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}>Communication</button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-900/20">
            {activeTab === 'details' ? (
                <>
                    {/* Diff View */}
                    <div className="mb-8">
                        <div className="grid grid-cols-12 gap-4 mb-2 px-4 text-xs font-mono uppercase tracking-widest">
                            <div className="col-span-2"></div>
                            <div className="col-span-5 font-bold text-emerald-400 flex items-center gap-2">
                                Primary (Retention)
                                {isTalentPrimary && <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] border border-cyan-500/30">TALENT</span>}
                                {!isTalentPrimary && <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] border border-emerald-500/30">PHARMACY</span>}
                            </div>
                            <div className="col-span-5 font-bold text-red-400 flex items-center gap-2">
                                Secondary (Archive)
                                {!isTalentPrimary && <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] border border-cyan-500/30">TALENT</span>}
                                {isTalentPrimary && <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] border border-emerald-500/30">PHARMACY</span>}
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-white/5 rounded-lg p-4 shadow-inner">
                            <DiffRow label="Full Name" valA={primaryObj?.fullName} valB={secondaryObj?.fullName} />
                            <DiffRow label="Email" valA={pair.primaryEmail} valB={pair.secondaryEmail} />
                            <DiffRow label="Role" valA={primaryObj?.role} valB={secondaryObj?.role} />
                            <DiffRow label="Last Login" valA={primaryObj?.lastLogin} valB={secondaryObj?.lastLogin} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         {/* Logic */}
                        <div>
                            <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Decision Logic
                            </h4>
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-300">
                                <p className="mb-2"><span className="text-slate-500 font-mono text-xs uppercase mr-2">Reason:</span> {pair.decisionReason}</p>
                                <p><span className="text-slate-500 font-mono text-xs uppercase mr-2">Score:</span> <span className="text-cyan-400 font-bold">{pair.matchScore}%</span> ({pair.matchReason})</p>
                                {pair.aiAnalysis && (
                                    <div className="mt-3 pt-3 border-t border-slate-700">
                                        <p className="font-semibold text-indigo-400 text-xs uppercase mb-1 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor"></path></svg>
                                            AI Insight
                                        </p>
                                        <p className="italic text-slate-400">{pair.aiAnalysis}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                         {/* Warnings */}
                        <div>
                            <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                System Warnings
                            </h4>
                            {pair.warnings.length > 0 ? (
                                <ul className="bg-red-900/10 border border-red-500/20 rounded-lg p-4 list-disc pl-5 text-sm text-red-300">
                                    {pair.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                            ) : (
                                <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    System integrity verified. No warnings.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8">
                         {/* Visualization of what was actually detected */}
                        <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-3">
                             <span>Detected Course Completions</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono mb-6">
                             <div className="bg-slate-900 p-4 rounded border border-slate-700">
                                 <h5 className="text-emerald-400 font-bold mb-2">Primary (Keep): {pair.primaryEmail}</h5>
                                 <div className="flex flex-wrap gap-2">
                                     {primaryObj?.completedCourseNames?.map(c => (
                                         <span key={c} className="px-2 py-1 bg-emerald-500/10 text-emerald-300 rounded border border-emerald-500/20">{c}</span>
                                     ))}
                                     {!primaryObj?.completedCourseNames?.length && <span className="text-slate-600">No courses detected</span>}
                                 </div>
                             </div>
                             <div className="bg-slate-900 p-4 rounded border border-slate-700">
                                 <h5 className="text-red-400 font-bold mb-2">Secondary (Migrate from): {pair.secondaryEmail}</h5>
                                 <div className="flex flex-wrap gap-2">
                                     {secondaryObj?.completedCourseNames?.map(c => (
                                         <span key={c} className="px-2 py-1 bg-red-500/10 text-red-300 rounded border border-red-500/20">{c}</span>
                                     ))}
                                     {!secondaryObj?.completedCourseNames?.length && <span className="text-slate-600">No courses detected</span>}
                                 </div>
                             </div>
                        </div>

                        <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-3">
                             <span>Missing Course Gap Analysis</span>
                             <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${pair.migrationSteps.length > 0 ? 'bg-orange-900/30 text-orange-400 border border-orange-500/30' : 'bg-slate-700 text-slate-400'}`}>
                                {pair.migrationSteps.length > 0 ? `${pair.migrationSteps.length} MISSING COURSES` : 'NO GAPS'}
                             </span>
                        </h4>
                        
                        {pair.migrationSteps.length > 0 ? (
                             <div className="border border-orange-500/30 rounded-lg overflow-hidden bg-orange-900/10">
                                 <div className="p-3 bg-orange-900/20 border-b border-orange-500/20 flex gap-2 items-center">
                                     <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                     <span className="text-sm text-orange-200 font-semibold">Action Required: The following columns were marked "Completed" in the secondary account but are missing or incomplete in the primary account.</span>
                                 </div>
                                 <table className="min-w-full divide-y divide-slate-700/50">
                                    <thead className="bg-slate-800/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider font-mono w-1/3">Missing Course Name (Column)</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">Manual Action Needed</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50 bg-slate-900/30">
                                        {pair.migrationSteps.map((step, idx) => (
                                            <tr key={idx} className="hover:bg-white/5">
                                                <td className="px-6 py-4 text-sm text-white font-bold">{step.courseName}</td>
                                                <td className="px-6 py-4 text-sm text-orange-300 font-mono">{step.action}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center p-8 border-2 border-dashed border-slate-700 rounded-lg bg-slate-800/30 text-slate-500 flex flex-col items-center">
                                <svg className="w-12 h-12 mb-3 text-emerald-500/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>100% Sync. The Primary Account has all the progress found in the Secondary Account.</span>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="h-full flex flex-col">
                    <h3 className="text-lg font-bold text-slate-200 mb-4">Generated Correspondence</h3>
                    {pair.emailDraft ? (
                        <textarea 
                            readOnly 
                            className="flex-1 w-full p-6 border border-slate-700 rounded-lg font-mono text-sm bg-slate-950 text-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none leading-relaxed"
                            value={pair.emailDraft}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-lg bg-slate-800/20">
                            <svg className="w-16 h-16 mb-4 text-slate-600 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            <p className="font-mono text-xs uppercase tracking-wider">Draft Buffer Empty</p>
                            <button onClick={handleDraftEmail} className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full text-sm font-medium transition">Generate Email</button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
