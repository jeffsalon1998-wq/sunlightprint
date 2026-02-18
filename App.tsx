import React, { useEffect, useState, useRef, useMemo } from 'react';
import { fetchDatabaseRecords, updateRequisitionStatus } from './services/dbService';
import { DocumentData, PrintSettings } from './types';
import PrintableDocument from './components/PrintableDocument';
import { 
  Printer, 
  Database, 
  FileText, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Menu,
  X,
  Settings2,
  Copy,
  WifiOff,
  FileDown,
  PenTool,
  ArrowRight
} from 'lucide-react';

const App: React.FC = () => {
  // Splash Screen State
  const [hasEntered, setHasEntered] = useState(false);

  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Track printed/exported documents locally to ensure immediate UI feedback
  const [processedDocIds, setProcessedDocIds] = useState<Set<string>>(new Set());
  
  // Print Settings State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    copies: 1,
    paperSize: 'A4',
    orientation: 'portrait'
  });
  
  // Ref for the sidebar to handle click outside
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docs = await fetchDatabaseRecords();
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      } else if (docs.length === 0) {
        setError("No records found in the database.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Unable to connect to Turso database. Please check your internet connection or database configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDoc = documents.find(d => d.id === selectedDocId);

  // Helper to check if a document is considered "processed" (printed/exported/signed)
  const isDocProcessed = (doc: DocumentData) => {
    return processedDocIds.has(doc.id) || doc.status === 'For signing';
  };

  // Sort documents for sidebar: Unprocessed first, then Processed (Printed/Exported/For signing)
  // Processed items are moved to the bottom.
  const sidebarDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      const aProcessed = isDocProcessed(a);
      const bProcessed = isDocProcessed(b);
      
      // If one is processed and the other isn't, the processed one goes last (return 1)
      if (aProcessed && !bProcessed) return 1;
      if (!aProcessed && bProcessed) return -1;
      
      // Otherwise keep original order (by index/date)
      return 0;
    });
  }, [documents, processedDocIds]);

  const handlePrintRequest = () => {
    setIsPrintModalOpen(true);
  };

  const updateStatusToSigning = async (id: string) => {
    // 1. Update local documents state
    setDocuments(prevDocs => prevDocs.map(d => 
        d.id === id ? { ...d, status: 'For signing' } : d
    ));

    // 2. Add to processed set for immediate sorting/styling effect if not caught by status yet
    setProcessedDocIds(prev => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
    });

    // 3. Update Database
    await updateRequisitionStatus(id, 'For signing');
  };

  const executePrint = async () => {
    if (selectedDocId) {
      await updateStatusToSigning(selectedDocId);
    }
    
    // We do not close the modal here to avoid state transitions (fading/blurring) 
    // interfering with the print capture. CSS handles hiding the modal.
    window.print();
  };

  const handleExportPdf = async () => {
    if (selectedDocId) {
      await updateStatusToSigning(selectedDocId);
    }

    const element = document.getElementById('printable-area');
    if (!element) return;
    
    // Check if html2pdf is loaded
    if (typeof (window as any).html2pdf === 'undefined') {
        alert("PDF Generator is still loading. Please try again in a moment.");
        return;
    }

    const opt = {
      margin: 0,
      filename: `Requisition_${selectedDoc?.id || 'doc'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    (window as any).html2pdf().set(opt).from(element).save();
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'For signing': return <PenTool className="w-4 h-4 text-blue-400" />;
      case 'Pending': return <Clock className="w-4 h-4 text-gold-400" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Dynamic CSS for Print Settings
  const printStyles = `
    @media print {
      @page {
        size: ${printSettings.paperSize} ${printSettings.orientation};
        margin: 0;
      }
      
      /* Reset global layout styles that might clip content */
      html, body, #root {
        height: auto !important;
        overflow: visible !important;
        background: white !important;
      }

      body { -webkit-print-color-adjust: exact; }
      
      /* Hide everything by default */
      body * { visibility: hidden; }
      
      /* Only show the printable area and its children */
      #printable-area, #printable-area * { 
        visibility: visible; 
      }
      
      /* Position the printable area at the top-left of the page */
      #printable-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        margin: 0;
        padding: 0;
        box-shadow: none;
        background: white;
        color: black;
      }
      
      /* Hide scrollbars */
      ::-webkit-scrollbar { display: none; }
    }
  `;

  // SPLASH SCREEN RENDER
  if (!hasEntered) {
    return (
      <div className="h-screen w-screen bg-maroon-950 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-maroon-900/50 rounded-full blur-[100px]"></div>
           <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-gold-600/10 rounded-full blur-[80px]"></div>
           <div className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-maroon-800/50 rounded-full blur-[100px]"></div>
        </div>

        <div className="z-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000 fill-mode-forwards">
          <div className="text-center mb-12">
             <div className="inline-block relative">
                <h1 className="text-7xl md:text-9xl text-gold-500 leading-tight drop-shadow-2xl" style={{ fontFamily: 'Vivaldi, "Brush Script MT", cursive' }}>
                  Sunlight
                </h1>
                {/* Underline accent */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-50"></div>
             </div>
             
             <div className="mt-4 flex items-center justify-center gap-4">
                <div className="h-px w-8 bg-maroon-400"></div>
                <span className="text-sm md:text-lg tracking-[0.4em] font-bold text-maroon-100 uppercase font-sans">
                  Hotel, Coron
                </span>
                <div className="h-px w-8 bg-maroon-400"></div>
             </div>
             
             <p className="mt-6 text-maroon-300 font-serif italic text-lg tracking-wide">
                Requisition Printing System
             </p>
          </div>

          <button 
            onClick={() => setHasEntered(true)}
            className="group relative px-10 py-4 bg-transparent overflow-hidden rounded-full transition-all duration-500 hover:shadow-[0_0_50px_rgba(250,202,21,0.2)] border border-gold-500/30 hover:border-gold-500"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-gold-600 to-gold-400 opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <span className="relative flex items-center gap-3 text-maroon-950 font-bold text-lg tracking-widest uppercase z-10">
              Enter System
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </button>
        </div>
        
        <div className="absolute bottom-6 text-maroon-500/50 text-[10px] tracking-[0.2em] font-sans">
            SECURE DATABASE CONNECTION ESTABLISHED
        </div>
      </div>
    );
  }

  // MAIN APP RENDER
  return (
    <div className="flex h-screen bg-maroon-950 text-white overflow-hidden relative">
      <style>{printStyles}</style>

      {/* Print Settings Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-maroon-950/90 backdrop-blur-sm print:hidden">
           <div className="bg-maroon-900 border border-gold-500 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-maroon-800 bg-maroon-800/50 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-gold-500 rounded-lg text-maroon-900">
                      <Settings2 className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-serif font-bold text-white">Print Settings</h2>
                 </div>
                 <button onClick={() => setIsPrintModalOpen(false)} className="text-maroon-300 hover:text-white transition-colors">
                   <X className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="p-6 space-y-6">
                
                {/* Copies */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-maroon-200 flex items-center gap-2">
                    <Copy className="w-4 h-4 text-gold-500" />
                    Copies
                  </label>
                  <div className="flex items-center gap-4">
                     <button 
                        onClick={() => setPrintSettings(prev => ({ ...prev, copies: Math.max(1, prev.copies - 1) }))}
                        className="w-10 h-10 rounded-lg bg-maroon-950 border border-maroon-700 hover:border-gold-500 text-white flex items-center justify-center transition-colors"
                     >-</button>
                     <span className="text-2xl font-mono font-bold w-12 text-center">{printSettings.copies}</span>
                     <button 
                        onClick={() => setPrintSettings(prev => ({ ...prev, copies: prev.copies + 1 }))}
                        className="w-10 h-10 rounded-lg bg-maroon-950 border border-maroon-700 hover:border-gold-500 text-white flex items-center justify-center transition-colors"
                     >+</button>
                  </div>
                </div>

              </div>

              <div className="p-6 border-t border-maroon-800 bg-maroon-950/50 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setIsPrintModalOpen(false)}
                  className="py-3 px-4 rounded-xl border border-maroon-700 text-maroon-300 hover:text-white hover:bg-maroon-800 transition-colors font-medium text-center"
                >
                  Cancel
                </button>
                <div className="flex-1 flex gap-3">
                    <button 
                        onClick={handleExportPdf}
                        className="flex-1 py-3 rounded-xl bg-maroon-800 border border-gold-500/30 text-gold-400 font-bold hover:bg-maroon-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                    >
                        <FileDown className="w-4 h-4" />
                        Export PDF
                    </button>
                    <button 
                        onClick={executePrint}
                        className="flex-1 py-3 rounded-xl bg-gold-500 text-maroon-950 font-bold hover:bg-gold-400 shadow-lg shadow-gold-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                    >
                        <Printer className="w-4 h-4" />
                        Print Now
                    </button>
                </div>
              </div>
           </div>
        </div>
      )}
      
      {/* Mobile Header */}
      <div className="lg:hidden absolute top-0 left-0 right-0 h-16 bg-maroon-900 border-b border-maroon-800 flex items-center justify-between px-4 z-20 print:hidden">
        <div className="flex items-center gap-2">
            <Printer className="w-6 h-6 text-gold-400" />
            <span className="font-serif font-bold text-lg text-white">Sunlight Requisition Printing</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gold-400">
           {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar - Document List */}
      <div 
        ref={sidebarRef}
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-80 bg-maroon-900 border-r border-maroon-800 flex flex-col shadow-2xl transition-transform duration-300 transform
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          print:hidden
        `}
      >
        <div className="p-6 border-b border-maroon-800 hidden lg:flex items-center gap-3">
          <div className="p-2 bg-maroon-800 rounded-lg">
            <Printer className="w-6 h-6 text-gold-400" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg tracking-wide text-white leading-tight">Sunlight<br/>Requisition Printing</h1>
          </div>
        </div>

        {/* Filters/Search Mockup */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-maroon-400" />
            <input 
              type="text" 
              placeholder="Search database..." 
              className="w-full bg-maroon-950 border border-maroon-800 rounded-lg py-2 pl-9 pr-4 text-sm text-maroon-100 placeholder-maroon-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            />
          </div>
          <button 
            onClick={loadData}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2 bg-maroon-800 hover:bg-maroon-700 text-gold-400 text-xs font-medium rounded-lg transition-colors border border-maroon-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Database
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 scrollbar-thin">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center h-40 text-maroon-300 space-y-2">
                <Database className="w-8 h-8 animate-pulse text-maroon-500" />
                <span className="text-sm">Querying Database...</span>
             </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 text-maroon-300 space-y-2 px-4 text-center">
               <WifiOff className="w-8 h-8 text-maroon-500" />
               <span className="text-sm text-maroon-400">{error}</span>
            </div>
          ) : (
            sidebarDocuments.map((doc) => {
              const processed = isDocProcessed(doc);
              return (
                <button
                  key={doc.id}
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 group border ${
                    selectedDocId === doc.id 
                      ? 'bg-maroon-800 border-gold-500/50 shadow-lg shadow-black/20' 
                      : 'bg-transparent border-transparent hover:bg-maroon-800/50 hover:border-maroon-700'
                  } ${processed ? 'opacity-40 grayscale bg-maroon-950/30' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      selectedDocId === doc.id ? 'bg-gold-500 text-maroon-900' : 
                      processed ? 'bg-gray-700 text-gray-400' : 'bg-maroon-950 text-maroon-300 group-hover:bg-maroon-900'
                    }`}>
                      {doc.type}
                    </span>
                    <span className="text-xs text-maroon-300 font-mono">{doc.date}</span>
                  </div>
                  <h3 className={`font-medium truncate mb-1 ${
                    selectedDocId === doc.id ? 'text-white' : 'text-maroon-100'
                  }`}>
                    {doc.department}
                  </h3>
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-1.5 text-xs text-maroon-300">
                       {getStatusIcon(doc.status)}
                       <span>{doc.status}</span>
                     </div>
                     <span className={`font-mono text-sm ${
                       selectedDocId === doc.id ? 'text-gold-400' : 'text-gray-400'
                     }`}>
                       #{doc.id}
                     </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
        
        {/* User Profile Mock */}
        <div className="p-4 border-t border-maroon-800 bg-maroon-900/50">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-maroon-900 font-bold">
                    A
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">Admin User</p>
                    <p className="text-xs text-maroon-300 truncate">Station #04 • Online</p>
                </div>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-maroon-950 pt-16 lg:pt-0">
        
        {/* Toolbar */}
        <div className="h-16 border-b border-maroon-800 flex items-center justify-between px-6 bg-maroon-950 print:hidden shrink-0">
          <div className="flex items-center gap-4 text-sm text-maroon-200">
             <span className="flex items-center gap-2">
               <Database className="w-4 h-4 text-gold-500" />
               <span className="hidden sm:inline">Source: Turso DB</span>
             </span>
             <span className="text-maroon-700">|</span>
             <span className="flex items-center gap-2">
               <FileText className="w-4 h-4 text-gold-500" />
               <span>{documents.length} Records</span>
             </span>
          </div>

          <div className="flex items-center gap-3">
             <button 
               onClick={handlePrintRequest}
               disabled={!selectedDoc}
               className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-maroon-950 px-6 py-2 rounded-full font-bold shadow-lg shadow-gold-900/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Printer className="w-4 h-4" />
               <span>Print Document</span>
             </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-maroon-950 p-4 md:p-8 flex justify-center items-start print:p-0 print:overflow-visible relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-maroon-400 space-y-4">
               <div className="w-16 h-16 border-4 border-maroon-800 border-t-gold-500 rounded-full animate-spin"></div>
               <p className="font-serif animate-pulse">Retrieving records from database...</p>
            </div>
          ) : selectedDoc ? (
            <div className={`animate-in fade-in zoom-in-95 duration-300 print:animate-none w-full flex justify-center transition-all print:opacity-100 print:filter-none print:scale-100 ${
               isPrintModalOpen ? 'opacity-50 blur-sm scale-95' : 'opacity-100 scale-100'
            }`}>
              <PrintableDocument data={selectedDoc} settings={printSettings} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-maroon-400 max-w-md text-center">
              <div className="w-20 h-20 bg-maroon-900 rounded-full flex items-center justify-center mb-6">
                 <FileText className="w-10 h-10 text-maroon-600" />
              </div>
              <h2 className="text-2xl font-serif text-maroon-200 mb-2">
                {error ? 'Database Error' : 'No Document Selected'}
              </h2>
              <p className="text-maroon-500">
                {error || 'Select a record from the sidebar to view details and print options.'}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default App;