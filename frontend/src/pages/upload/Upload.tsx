import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, FileText, X, CheckCircle, 
  AlertTriangle, RefreshCw, ArrowRight, Play 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/common/Button';
import { Card, CardContent } from '../../components/common/Card';
import { toast } from '../../components/common/Toast';

interface UploadedInvoiceMeta {
  invoice_id: number;
  invoice_number: string;
  confidence_score: number;
  extracted_fields_count: number;
}

export const Upload: React.FC = () => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // State machine: 'idle' | 'uploading' | 'processing' | 'success' | 'failed'
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const [ocrStep, setOcrStep] = useState(0);
  const [ocrMeta, setOcrMeta] = useState<UploadedInvoiceMeta | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const uploadCancelRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status tickers during OCR processing
  const ocrSteps = [
    "Scanning Invoice Layout...",
    "Extracting Raw Characters...",
    "Reading Document Invoice Fields...",
    "Analyzing VAT & Tax Formats...",
    "Verifying Totals and Supplier Registry..."
  ];

  // OCR Step cycle timer
  useEffect(() => {
    let interval: number;
    if (status === 'processing') {
      setOcrStep(0);
      interval = window.setInterval(() => {
        setOcrStep((prev) => {
          if (prev >= ocrSteps.length - 1) {
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Drag listeners
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Check type
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    const hasAllowedExt = allowed.includes(ext);

    if (!hasAllowedExt) {
      toast('danger', 'Invalid File Type', 'Only PDF, PNG, JPG, and JPEG files are supported.');
      return;
    }

    // Check size (20MB)
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast('danger', 'File Too Large', 'Invoice file size must be less than 20MB.');
      return;
    }

    setSelectedFile(file);
    setStatus('idle');
  };

  const startUpload = async () => {
    if (!selectedFile) return;

    setStatus('uploading');
    setProgress(0);
    setEta(5);

    // Cancel token setup
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    uploadCancelRef.current = () => source.cancel("Upload cancelled by user");

    const formData = new FormData();
    formData.append('file', selectedFile);

    // Simulate progress bar before API triggers processing
    const progressTimer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressTimer);
          return 95;
        }
        const diff = Math.max(1, Math.floor((100 - prev) / 5));
        setEta(Math.ceil((100 - prev) / 20));
        return prev + diff;
      });
    }, 150);

    try {
      const res = await axios.post('/api/invoices/upload', formData, {
        cancelToken: source.token,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(progressTimer);
      setProgress(100);
      setEta(0);

      // Successfully uploaded -> transition to OCR processing
      setStatus('processing');
      
      // Delay briefly to allow user to see tickers
      setTimeout(() => {
        const metadata = res.data;
        // Estimate fields count
        const fieldsCount = Object.keys(metadata.extracted_json || {}).filter(k => metadata.extracted_json[k]).length;
        
        setOcrMeta({
          invoice_id: metadata.invoice_id,
          invoice_number: metadata.invoice_number,
          confidence_score: metadata.confidence_score,
          extracted_fields_count: fieldsCount
        });
        setStatus('success');
        toast('success', 'OCR Completed', `Successfully processed invoice ${metadata.invoice_number}`);
      }, 5000);

    } catch (err: any) {
      clearInterval(progressTimer);
      if (axios.isCancel(err)) {
        toast('info', 'Cancelled', 'Upload cancelled by user.');
        setStatus('idle');
        setSelectedFile(null);
      } else {
        const detail = err.response?.data?.detail || 'OCR extraction process failed.';
        setErrorMsg(detail);
        setStatus('failed');
        toast('danger', 'Processing Failed', detail);
      }
    }
  };

  const cancelUpload = () => {
    if (uploadCancelRef.current) {
      uploadCancelRef.current();
    }
  };

  const resetUploader = () => {
    setSelectedFile(null);
    setStatus('idle');
    setProgress(0);
    setOcrMeta(null);
    setErrorMsg('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Upload Invoice</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload tax invoices (PDF/Images) to trigger character recognition extraction automatically.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-8">
          <AnimatePresence mode="wait">
            
            {/* ================= IDLE STATE ================= */}
            {status === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Drag zone box */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-primary bg-primary/5 shadow-inner scale-[0.99]'
                      : 'border-slate-300 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/40 bg-white/20 dark:bg-slate-900/10'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                  />
                  
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 bg-primary/10 border border-primary/20 text-primary rounded-full shadow-md shadow-primary/5">
                      <UploadCloud size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-850 dark:text-slate-200">
                        Drag your invoice here, or <span className="text-primary hover:underline">Click to browse</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Supported formats: PDF, PNG, JPG, JPEG
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                      Max Size: 20MB
                    </span>
                  </div>
                </div>

                {/* Selected File Details view */}
                {selectedFile && (
                  <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-sm">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={resetUploader} className="text-slate-400 hover:text-danger p-1">
                        <X size={16} />
                      </button>
                      <Button onClick={startUpload} className="flex items-center gap-1 text-xs">
                        <Play size={12} fill="currentColor" />
                        <span>Start OCR</span>
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ================= UPLOADING STATE ================= */}
            {status === 'uploading' && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center p-8 space-y-6"
              >
                <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin flex items-center justify-center" />
                <div className="space-y-2 text-center w-full max-w-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Uploading File...</h3>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>{progress}%</span>
                    <span>ETA: {eta !== null ? `${eta}s` : 'Calculating...'}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={cancelUpload}>
                  Cancel Upload
                </Button>
              </motion.div>
            )}

            {/* ================= PROCESSING SCREEN ================= */}
            {status === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center p-8 space-y-6 text-center"
              >
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-primary border-r-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-primary">
                    <RefreshCw size={24} className="animate-spin" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-850 dark:text-slate-200">Processing OCR Intelligence...</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Please do not refresh. Extracts will complete in a few moments.</p>
                </div>
                {/* Steps ticker */}
                <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-3 text-xs w-full max-w-xs font-semibold text-primary">
                  {ocrSteps[ocrStep]}
                </div>
              </motion.div>
            )}

            {/* ================= SUCCESS PAGE ================= */}
            {status === 'success' && ocrMeta && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center p-6 space-y-6 max-w-sm mx-auto"
              >
                <div className="mx-auto w-16 h-16 bg-success/10 border border-success/20 text-success rounded-full flex items-center justify-center">
                  <CheckCircle size={32} />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-850 dark:text-slate-250">Invoice Processed Successfully</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Character recognition complete. Fields ready for review.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-y border-slate-100 dark:border-slate-800/80 py-4 text-xs font-semibold">
                  <div className="border-r border-slate-100 dark:border-slate-800/80">
                    <p className="text-slate-400 text-[10px] uppercase">OCR Accuracy</p>
                    <p className="text-base text-success font-bold mt-1">{ocrMeta.confidence_score}%</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase">Extracted Fields</p>
                    <p className="text-base text-primary font-bold mt-1">{ocrMeta.extracted_fields_count} fields</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 text-xs" onClick={resetUploader}>
                    Upload Another
                  </Button>
                  <Button 
                    className="flex-1 text-xs flex items-center justify-center gap-1.5"
                    onClick={() => navigate(`/validation?id=${ocrMeta.invoice_id}`)}
                  >
                    <span>Verify Fields</span>
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ================= FAILED STATE ================= */}
            {status === 'failed' && (
              <motion.div
                key="failed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center p-6 space-y-6 max-w-sm mx-auto"
              >
                <div className="mx-auto w-16 h-16 bg-danger/10 border border-danger/20 text-danger rounded-full flex items-center justify-center">
                  <AlertTriangle size={32} />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-850 dark:text-slate-250">OCR Processing Failed</h3>
                  <p className="text-xs text-danger font-medium">{errorMsg || 'An unexpected error occurred.'}</p>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Please verify that the file layout conforms to standard formats. If this error persists, contact the Administrator.
                </p>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 text-xs" onClick={resetUploader}>
                    Upload Another
                  </Button>
                  <Button className="flex-1 text-xs flex items-center justify-center gap-1.5" onClick={startUpload}>
                    <RefreshCw size={14} />
                    <span>Retry OCR</span>
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};
export default Upload;
