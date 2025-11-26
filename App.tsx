
import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsTable } from './components/ResultsTable';
import { DetailView } from './components/DetailView';
import { Dashboard } from './components/Dashboard';
import { parseCSV, processDatasets, parseExcel, generateSQLScript, generatePythonScript, generateGapAnalysisCSV, saveSession, loadSession } from './utils/logic';
import { ProcessedDuplicate, AppSettings, RawUser, MasterEmployee } from './types';
import { analyzeDuplicateWithGemini } from './services/geminiService';

// Demo Data
const DEMO_TALENT = `id,fullname,email,phone,role,last_login,Safety Course,Compliance Course
T1,John Doe,john.doe@company.com,1234567890,student,2023-10-01,Completed,In Progress
T2,Jane Smith,jane.s@gmail.com,0987654321,student,2023-09-15,Completed (achieved pass grade),Completed
T3,Robert Brown,robert.b@company.com,,admin,2023-11-01,,
T4,Ahmed Mohamed,ahmed.m@company.com,,student,2023-10-10,Completed,`;

const DEMO_PHARMACY = `id,fullname,email,phone,role,last_login,Safety Course,Leadership
P1,John Doe,john.doe88@gmail.com,,student,2023-10-20,Completed (achieved pass grade),
P2,Jane Smith,jane.smith@company.com,0987654321,teacher,2023-11-05,Completed,Completed (achieved pass grade)
P3,Bob Brown,bobby.brown@yahoo.com,,student,2023-01-01,,
P4,Ahmad Mohammed,ahmed.mohamed@personal.com,,student,2023-10-12,Completed,Completed`;

const DEMO_MASTER = `employee_code,fullname,official_email,personal_email,job_title
E001,John Doe,john.doe@company.com,john.doe88@gmail.com,Engineer
E002,Jane Smith,jane.smith@company.com,,Manager
E003,Robert Brown,robert.b@company.com,,Director
E004,Ahmed Mohamed,ahmed.m@company.com,,Staff`;

export default function App() {
  const [fileA, setFileA] = useState<string | ArrayBuffer | null>(null);
  const [fileB, setFileB] = useState<string | ArrayBuffer | null>(null);
  const [fileMaster, setFileMaster] = useState<string | ArrayBuffer | null>(null);
  
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedDuplicate[] | null>(null);
  const [selectedPair, setSelectedPair] = useState<ProcessedDuplicate | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
      fuzzyThreshold: 0.85,
      checkIntraPlatform: false,
      normalizeArabic: true
  });

  // Load session on mount
  useEffect(() => {
      const saved = loadSession();
      if (saved) {
          if (saved.fileA) setFileA(saved.fileA); // Only strings are saved in localStorage usually, might need logic adjustment if saving buffers is required, but skipping complex persistence for now
          if (saved.fileB) setFileB(saved.fileB);
          setSettings(saved.settings || settings);
          if (saved.results) setResults(saved.results);
      }
  }, []);

  // Save session on update
  useEffect(() => {
      // We only save text content to local storage to avoid quota limits with binary
      if (results && typeof fileA === 'string' && typeof fileB === 'string') {
          saveSession(fileA, fileB, results, settings);
      }
  }, [results, fileA, fileB, settings]);

  const handleProcess = () => {
    if (!fileA || !fileB || !fileMaster) return;
    
    setProcessing(true);
    setTimeout(() => {
      const parseData = (file: string | ArrayBuffer, platform: 'Talent' | 'Pharmacy' | 'Master') => {
          if (typeof file === 'string') {
              return parseCSV(file, platform);
          } else {
              return parseExcel(file, platform);
          }
      };

      const dataTalent = parseData(fileA, 'Talent') as RawUser[];
      const dataPharmacy = parseData(fileB, 'Pharmacy') as RawUser[];
      const dataMaster = parseData(fileMaster, 'Master') as MasterEmployee[];
      
      const processed = processDatasets(dataTalent, dataPharmacy, dataMaster, settings);
      setResults(processed);
      setProcessing(false);
    }, 1200); 
  };

  const loadDemo = () => {
    setFileA(DEMO_TALENT);
    setFileB(DEMO_PHARMACY);
    setFileMaster(DEMO_MASTER);
  };

  const handleReset = () => {
      setResults(null);
      setFileA(null);
      setFileB(null);
      setFileMaster(null);
      setSelectedPair(null);
      localStorage.removeItem('lms_resolver_session');
  };

  const handleBulkAI = async () => {
      if (!results) return;
      const aistudio = (window as any).aistudio;
      const hasKey = await aistudio?.hasSelectedApiKey();
      if (!hasKey) {
         try { await aistudio?.openSelectKey(); } catch(e) { return; }
      }

      setProcessing(true);
      const toProcess = results.filter(r => r.warnings.length > 0 && !r.aiAnalysis).slice(0, 5);
      
      const updatedResults = [...results];
      for (const pair of toProcess) {
          const processed = await analyzeDuplicateWithGemini(pair);
          const index = updatedResults.findIndex(r => r.id === pair.id);
          if (index !== -1) updatedResults[index] = processed;
      }
      setResults(updatedResults);
      setProcessing(false);
  };

  const downloadFile = (content: string, filename: string) => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const updatePair = (updated: ProcessedDuplicate) => {
      setResults(prev => prev ? prev.map(p => p.id === updated.id ? updated : p) : null);
      setSelectedPair(updated);
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-950 text-slate-100 overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 glass-panel border-b-0 border-b-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-200"></div>
                <div className="relative bg-slate-900 ring-1 ring-white/10 p-2 rounded-lg">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                </div>
             </div>
             <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight">LMS Resolver</h1>
                <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Talent <span className="text-slate-600">x</span> Pharmacy</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </button>
            <button onClick={loadDemo} className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-full hover:bg-cyan-500/10 transition-all">
                Load Demo Data
            </button>
          </div>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
            <div className="bg-slate-900/90 border-t border-slate-700 p-4 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex gap-8 items-center">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Config:</h3>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={settings.normalizeArabic} onChange={e => setSettings({...settings, normalizeArabic: e.target.checked})} className="rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500" />
                        Arabic Normalization
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={settings.checkIntraPlatform} onChange={e => setSettings({...settings, checkIntraPlatform: e.target.checked})} className="rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500" />
                        Deep Scan (Intra)
                    </label>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <span>Fuzzy Threshold: <span className="font-mono text-cyan-400">{Math.round(settings.fuzzyThreshold * 100)}%</span></span>
                        <input 
                            type="range" min="0.5" max="1.0" step="0.05" 
                            value={settings.fuzzyThreshold} 
                            onChange={e => setSettings({...settings, fuzzyThreshold: parseFloat(e.target.value)})}
                            className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                        />
                    </div>
                </div>
            </div>
        )}
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 animate-fade-in-up">
        
        {/* 1. Upload Section */}
        {!results && (
          <div className="glass-card rounded-2xl p-8 mb-8 border border-slate-700/50">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Data Integration Hub</h2>
                <p className="text-slate-400">Upload your platform exports (CSV or Excel) to begin the reconciliation process.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FileUpload label="Talent Platform" icon="talent" onUpload={setFileA} isLoaded={!!fileA} accept=".csv, .xlsx, .xls" />
              <FileUpload label="Pharmacy Platform" icon="pharmacy" onUpload={setFileB} isLoaded={!!fileB} accept=".csv, .xlsx, .xls" />
              <FileUpload label="Master Employee List" icon="master" onUpload={setFileMaster} isLoaded={!!fileMaster} accept=".xlsx, .xls, .csv" />
            </div>
            
            <div className="mt-12 flex justify-center">
               <button
                 onClick={handleProcess}
                 disabled={!fileA || !fileB || !fileMaster || processing}
                 className={`relative group px-12 py-4 rounded-full font-bold text-lg text-white shadow-2xl transition-all duration-300 transform hover:scale-105
                    ${(!fileA || !fileB || !fileMaster) 
                        ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:shadow-indigo-500/50'
                    }
                 `}
               >
                 {processing ? (
                     <span className="flex items-center gap-2">
                         <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                         Processing Neural Net...
                     </span>
                 ) : (
                    <span>Initialize Core Analysis</span>
                 )}
                 {(!(!fileA || !fileB || !fileMaster)) && <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-40 group-hover:opacity-75 transition duration-200"></div>}
               </button>
            </div>
          </div>
        )}

        {/* 2. Results Section */}
        {results && (
          <div className="animate-slide-up">
             {/* Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 glass-panel p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live Analysis Results
                  </h2>
                  <button 
                    onClick={handleReset}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-all ml-4"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    START NEW ANALYSIS
                  </button>
              </div>
              
              <div className="flex gap-3">
                  <button onClick={handleBulkAI} disabled={processing} className="relative group overflow-hidden bg-indigo-900/50 border border-indigo-500/50 text-indigo-300 px-5 py-2 rounded-lg hover:bg-indigo-800/50 font-medium transition text-sm">
                     <span className="relative z-10 flex items-center gap-2">
                        {processing ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : '✨'}
                        AI Auto-Resolve
                     </span>
                     <div className="absolute inset-0 bg-indigo-500/20 blur-md group-hover:opacity-100 opacity-0 transition duration-300"></div>
                  </button>
                  
                  <div className="w-px bg-slate-700 mx-1"></div>

                  <button onClick={() => downloadFile(generateGapAnalysisCSV(results), 'missing_courses_gap_report.csv')} className="bg-orange-900/40 border border-orange-500/40 text-orange-200 hover:text-white hover:bg-orange-800/50 px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Export Gap Report
                  </button>
                  
                  <button onClick={() => downloadFile(generateSQLScript(results), 'migration_script.sql')} className="bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 px-4 py-2 text-sm font-medium rounded-lg transition-all">Export SQL</button>
                  <button onClick={() => downloadFile(generatePythonScript(results), 'migration_script.py')} className="bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 px-4 py-2 text-sm font-medium rounded-lg transition-all">Export Python</button>
              </div>
            </div>

            <Dashboard data={results} />
            <ResultsTable data={results} onSelect={setSelectedPair} />
          </div>
        )}
      </main>

      {/* Modal */}
      {selectedPair && (
        <DetailView 
          pair={selectedPair} 
          onClose={() => setSelectedPair(null)} 
          onUpdate={updatePair}
        />
      )}
    </div>
  );
}
