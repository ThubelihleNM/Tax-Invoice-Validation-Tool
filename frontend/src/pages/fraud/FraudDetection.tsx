import React from 'react';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { ShieldAlert } from 'lucide-react';

export const FraudDetection: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Fraud & Risk Detection</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Analyze invoices against duplicate records database and track suspect entities.
        </p>
      </div>

      <Card className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
        <div className="p-3 bg-danger/10 text-danger rounded-full mb-4">
          <ShieldAlert size={24} />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Risk evaluation engine</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
          Calculated risk thresholds and supplier warning parameters will be manageable here.
        </p>
        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 px-3 py-1 rounded text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">
          Module coming soon in Phase 3
        </span>
      </Card>
    </div>
  );
};
export default FraudDetection;
