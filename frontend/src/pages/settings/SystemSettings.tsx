import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings, ShieldCheck, CheckSquare, Square, 
  HelpCircle, AlertCircle, Save, Loader2 
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Dropdown } from '../../components/common/Dropdown';
import { toast } from '../../components/common/Toast';
import { useAuth } from '../../contexts/AuthContext';

interface CompanyDetails {
  company_address: string;
  city: string;
  country: string;
  postal_code: string;
  email: string;
  phone_number: string;
  website: string;
  tax_registration_number: string;
  timezone: string;
  language: string;
  fiscal_year: string;
}

interface TaxConfig {
  supported_rates: string; // "15, 20, 0"
  precision: number;
  decimal_places: number;
  auto_validation: boolean;
}

interface BasicSettings {
  company_name: string;
  default_vat_rate: number;
  currency: string;
  theme: string;
  company_details?: CompanyDetails;
  tax_config?: TaxConfig;
}

interface RulesConfig {
  rule_invoice_number_required: boolean;
  rule_invoice_number_unique: boolean;
  rule_supplier_name_required: boolean;
  rule_supplier_exists: boolean;
  rule_supplier_tax_number_required: boolean;
  rule_supplier_tax_number_format: boolean;
  rule_invoice_date_required: boolean;
  rule_invoice_date_past: boolean;
  rule_due_date_after_invoice: boolean;
  rule_subtotal_positive: boolean;
  rule_vat_recalculate: boolean;
  rule_grand_total_calculate: boolean;
  rule_currency_supported: boolean;
  rule_po_required: boolean;
  vat_tolerance: number;
  max_invoice_age_days: number;
}

export const SystemSettings: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Administrator';

  const [activeTab, setActiveTab] = useState<'basic' | 'rules'>('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [basic, setBasic] = useState<BasicSettings>({
    company_name: 'Enterprise Solutions Ltd',
    default_vat_rate: 15.00,
    currency: 'USD',
    theme: 'light',
    company_details: {
      company_address: '100 Business Loop',
      city: 'London',
      country: 'United Kingdom',
      postal_code: 'EC1A 1BB',
      email: 'finance@enterprise.com',
      phone_number: '+44 20 7946 0958',
      website: 'www.enterprise.com',
      tax_registration_number: 'GB982736190',
      timezone: 'GMT',
      language: 'English',
      fiscal_year: 'January - December'
    },
    tax_config: {
      supported_rates: '0, 5, 15, 20',
      precision: 4,
      decimal_places: 2,
      auto_validation: true
    }
  });

  const [rules, setRules] = useState<RulesConfig>({
    rule_invoice_number_required: true,
    rule_invoice_number_unique: true,
    rule_supplier_name_required: true,
    rule_supplier_exists: true,
    rule_supplier_tax_number_required: true,
    rule_supplier_tax_number_format: true,
    rule_invoice_date_required: true,
    rule_invoice_date_past: true,
    rule_due_date_after_invoice: true,
    rule_subtotal_positive: true,
    rule_vat_recalculate: true,
    rule_grand_total_calculate: true,
    rule_currency_supported: true,
    rule_po_required: false,
    vat_tolerance: 0.05,
    max_invoice_age_days: 365
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const resBasic = await axios.get('/api/settings');
      
      // Seed default details if null from database
      const details = resBasic.data.company_details || basic.company_details;
      const tax = resBasic.data.tax_config || basic.tax_config;

      setBasic({
        company_name: resBasic.data.company_name,
        default_vat_rate: Number(resBasic.data.default_vat_rate),
        currency: resBasic.data.currency,
        theme: resBasic.data.theme,
        company_details: details,
        tax_config: tax
      });

      const resRules = await axios.get('/api/settings/rules');
      if (resRules.data && Object.keys(resRules.data).length > 0) {
        setRules(resRules.data as RulesConfig);
      }
    } catch (err) {
      toast('warning', 'Notice', 'Failed to retrieve configurations, showing offline defaults.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleRule = (key: keyof RulesConfig) => {
    if (!isAdmin) return;
    setRules(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleNumberChange = (key: 'vat_tolerance' | 'max_invoice_age_days', val: string) => {
    if (!isAdmin) return;
    const parsed = val === '' ? 0 : Number(val);
    setRules(prev => ({
      ...prev,
      [key]: parsed
    }));
  };

  const handleSaveBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      await axios.put('/api/settings', basic);
      toast('success', 'Configurations Updated', 'Company localization configurations updated in database.');
      fetchSettings();
    } catch (err) {
      toast('danger', 'Save Failed', 'Failed to update configurations.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRules = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      await axios.put('/api/settings/rules', { rules_config: rules });
      toast('success', 'Rules Switches Updated', 'Compliance validation engine rules switches updated.');
      fetchSettings();
    } catch (err) {
      toast('danger', 'Update Failed', 'Failed to save rules configs.');
    } finally {
      setSaving(false);
    }
  };

  const ruleRows = [
    { key: 'rule_invoice_number_required', title: 'Invoice Number Presence', desc: 'Checks that invoice identifier string is not blank' },
    { key: 'rule_invoice_number_unique', title: 'Unique ID Audit', desc: 'Validates against previously archived numbers for same supplier' },
    { key: 'rule_supplier_name_required', title: 'Supplier Identity', desc: 'Verifies supplier name exists on OCR scanning raw text' },
    { key: 'rule_supplier_exists', title: 'Supplier Registered Database Check', desc: 'Verifies supplier belongs to local database vendor logs' },
    { key: 'rule_supplier_tax_number_required', title: 'Supplier Tax ID Presence', desc: 'Validates VAT or tax code registration exists' },
    { key: 'rule_supplier_tax_number_format', title: 'Tax Number Digits Validation', desc: 'Validates length (6-20 digits) and format parameters' },
    { key: 'rule_invoice_date_required', title: 'Date Presence', desc: 'Verifies standard invoice issuance date details' },
    { key: 'rule_invoice_date_past', title: 'Block Future Dates', desc: 'Flags invoices dated later than today' },
    { key: 'rule_due_date_after_invoice', title: 'Verify Timeline Sequences', desc: 'Verifies that due date succeeds issuance date' },
    { key: 'rule_subtotal_positive', title: 'Check Positive Subtotal', desc: 'Rejects invoices with subtotal values equal to or less than zero' },
    { key: 'rule_vat_recalculate', title: 'VAT Recalculation Check', desc: 'Calculates subtotal * tax rate, comparing actual values' },
    { key: 'rule_grand_total_calculate', title: 'Total Arithmetic Balance Audit', desc: 'Verifies subtotal - discount + VAT aligns with Grand Total' },
    { key: 'rule_currency_supported', title: 'Verify Currencies Support', desc: 'Ensures currencies belong to supported types (USD, EUR, GBP, ZAR)' },
    { key: 'rule_po_required', title: 'Require Purchase Order', desc: 'Flags warning if Purchase Order reference fields are blank' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-sans">System Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure global localization details, custom tax rates, and manage the business rules validation engine.
          </p>
        </div>
        {!isAdmin && (
          <div className="bg-slate-100 dark:bg-slate-850 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <AlertCircle size={14} />
            <span>Read-Only Mode</span>
          </div>
        )}
      </div>

      {/* Tab select bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-850 gap-2">
        <button
          onClick={() => setActiveTab('basic')}
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'basic'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Company & Localizations
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'rules'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Business Rules Engine
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        
        {/* Company info Tab */}
        {activeTab === 'basic' && basic.company_details && basic.tax_config && (
          <form onSubmit={handleSaveBasic} className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">Company Information</h3>
                <p className="text-[10px] text-slate-400">Manage basic company identifiers and contact details.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Company Name"
                    value={basic.company_name}
                    onChange={(e) => setBasic(prev => ({ ...prev, company_name: e.target.value }))}
                    disabled={!isAdmin}
                    required
                  />
                  <Input
                    label="Tax Registration ID"
                    value={basic.company_details.tax_registration_number}
                    onChange={(e) => setBasic(prev => ({
                      ...prev,
                      company_details: { ...prev.company_details!, tax_registration_number: e.target.value }
                    }))}
                    disabled={!isAdmin}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Address"
                    value={basic.company_details.company_address}
                    onChange={(e) => setBasic(prev => ({
                      ...prev,
                      company_details: { ...prev.company_details!, company_address: e.target.value }
                    }))}
                    disabled={!isAdmin}
                  />
                  <Input
                    label="City"
                    value={basic.company_details.city}
                    onChange={(e) => setBasic(prev => ({
                      ...prev,
                      company_details: { ...prev.company_details!, city: e.target.value }
                    }))}
                    disabled={!isAdmin}
                  />
                  <Input
                    label="Postal Code"
                    value={basic.company_details.postal_code}
                    onChange={(e) => setBasic(prev => ({
                      ...prev,
                      company_details: { ...prev.company_details!, postal_code: e.target.value }
                    }))}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Company Email"
                    type="email"
                    value={basic.company_details.email}
                    onChange={(e) => setBasic(prev => ({
                      ...prev,
                      company_details: { ...prev.company_details!, email: e.target.value }
                    }))}
                    disabled={!isAdmin}
                  />
                  <Input
                    label="Phone Number"
                    value={basic.company_details.phone_number}
                    onChange={(e) => setBasic(prev => ({
                      ...prev,
                      company_details: { ...prev.company_details!, phone_number: e.target.value }
                    }))}
                    disabled={!isAdmin}
                  />
                  <Input
                    label="Website URL"
                    value={basic.company_details.website}
                    onChange={(e) => setBasic(prev => ({
                      ...prev,
                      company_details: { ...prev.company_details!, website: e.target.value }
                    }))}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Dropdown
                    label="Primary System Currency"
                    value={basic.currency}
                    onChange={(e) => setBasic(prev => ({ ...prev, currency: e.target.value }))}
                    disabled={!isAdmin}
                    options={[
                      { value: 'INR', label: 'INR - Indian Rupee (₹)' },
                      { value: 'USD', label: 'USD - United States Dollar ($)' },
                      { value: 'EUR', label: 'EUR - Euro (€)' },
                      { value: 'GBP', label: 'GBP - British Pound (£)' },
                      { value: 'ZAR', label: 'ZAR - South African Rand (R)' },
                      { value: 'CAD', label: 'CAD - Canadian Dollar ($)' },
                      { value: 'AUD', label: 'AUD - Australian Dollar ($)' },
                      { value: 'AED', label: 'AED - UAE Dirham' },
                      { value: 'NGN', label: 'NGN - Nigerian Naira (₦)' },
                      { value: 'KES', label: 'KES - Kenyan Shilling (KSh)' },
                      { value: 'ZWG', label: 'ZWG - Zimbabwe Gold (ZiG)' }
                    ]}
                  />
                  <Dropdown
                    label="Primary Language"
                    value={basic.company_details.language}
                    onChange={(e) => setBasic(prev => ({
                      ...prev,
                      company_details: { ...prev.company_details!, language: e.target.value }
                    }))}
                    disabled={!isAdmin}
                    options={[
                      { value: 'English', label: 'English' },
                      { value: 'Spanish', label: 'Spanish' },
                      { value: 'German', label: 'German' },
                      { value: 'French', label: 'French' }
                    ]}
                  />
                  <Dropdown
                    label="Time Zone"
                    value={basic.company_details.timezone}
                    onChange={(e) => setBasic(prev => ({
                      ...prev,
                      company_details: { ...prev.company_details!, timezone: e.target.value }
                    }))}
                    disabled={!isAdmin}
                    options={[
                      { value: 'GMT', label: 'GMT - Greenwich Mean Time' },
                      { value: 'EST', label: 'EST - Eastern Standard Time' },
                      { value: 'CET', label: 'CET - Central European Time' },
                      { value: 'CAT', label: 'CAT - Central African Time' }
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">Tax Auditing Configs</h3>
                <p className="text-[10px] text-slate-400">Configure decimals precision parameters and default rates.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Standard VAT Percentage (%)"
                    type="number"
                    step="0.01"
                    value={basic.default_vat_rate}
                    onChange={(e) => setBasic(prev => ({ ...prev, default_vat_rate: Number(e.target.value) }))}
                    disabled={!isAdmin}
                    required
                  />
                  <Input
                    label="Supported Tax Rates List (comma separated)"
                    value={basic.tax_config.supported_rates}
                    onChange={(e) => setBasic(prev => ({
                      ...prev,
                      tax_config: { ...prev.tax_config!, supported_rates: e.target.value }
                    }))}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Arithmetic Decimals Precision"
                    type="number"
                    value={basic.tax_config.precision}
                    onChange={(e) => setBasic(prev => ({
                      ...prev,
                      tax_config: { ...prev.tax_config!, precision: Number(e.target.value) }
                    }))}
                    disabled={!isAdmin}
                  />
                  <Input
                    label="Display Decimal Places"
                    type="number"
                    value={basic.tax_config.decimal_places}
                    onChange={(e) => setBasic(prev => ({
                      ...prev,
                      tax_config: { ...prev.tax_config!, decimal_places: Number(e.target.value) }
                    }))}
                    disabled={!isAdmin}
                  />
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Automatic Tax Validation</label>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => setBasic(prev => ({
                          ...prev,
                          tax_config: { ...prev.tax_config!, auto_validation: !prev.tax_config!.auto_validation }
                        }))}
                        className={`p-1 rounded transition-colors ${
                          basic.tax_config.auto_validation 
                            ? 'text-primary' 
                            : 'text-slate-350 dark:text-slate-700'
                        }`}
                      >
                        {basic.tax_config.auto_validation ? <CheckSquare size={18} fill="currentColor" className="text-white dark:text-slate-900 stroke-primary stroke-[2px]" /> : <Square size={18} />}
                      </button>
                      <span className="text-xs text-slate-500 font-semibold">Enable automatic scans validation</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              {isAdmin && (
                <CardFooter className="flex justify-end border-t dark:border-slate-850 pt-4">
                  <Button type="submit" isLoading={saving} className="flex items-center gap-1.5">
                    <Save size={16} />
                    <span>Save Administration Settings</span>
                  </Button>
                </CardFooter>
              )}
            </Card>
          </form>
        )}

        {/* Validation rules tab */}
        {activeTab === 'rules' && (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">Compliance Audit Checks</h3>
                    <p className="text-[10px] text-slate-400">Toggle business rules and customize numerical tolerances.</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="divide-y divide-slate-100 dark:divide-slate-850/80">
                <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl mb-4 border dark:border-slate-850">
                  <Input
                    label="VAT Tolerance Variance ($ / €)"
                    type="number"
                    step="0.01"
                    value={rules.vat_tolerance}
                    onChange={(e) => handleNumberChange('vat_tolerance', e.target.value)}
                    disabled={!isAdmin}
                  />
                  <Input
                    label="Maximum Age Limit (Days)"
                    type="number"
                    value={rules.max_invoice_age_days}
                    onChange={(e) => handleNumberChange('max_invoice_age_days', e.target.value)}
                    disabled={!isAdmin}
                  />
                </div>

                {ruleRows.map((row) => {
                  const val = rules[row.key as keyof RulesConfig] as boolean;
                  return (
                    <div 
                      key={row.key} 
                      onClick={() => handleToggleRule(row.key as keyof RulesConfig)}
                      className={`flex items-start justify-between py-4 ${isAdmin ? 'cursor-pointer hover:bg-slate-50/10' : ''}`}
                    >
                      <div className="space-y-0.5 max-w-lg">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-250">{row.title}</h4>
                        <p className="text-[10px] text-slate-450 dark:text-slate-400">{row.desc}</p>
                      </div>
                      
                      <button 
                        type="button" 
                        disabled={!isAdmin}
                        className={`p-1 rounded transition-colors ${
                          val 
                            ? 'text-primary hover:bg-primary/5' 
                            : 'text-slate-350 dark:text-slate-700'
                        }`}
                      >
                        {val ? <CheckSquare size={18} fill="currentColor" className="text-white dark:text-slate-900 stroke-primary stroke-[2px]" /> : <Square size={18} />}
                      </button>
                    </div>
                  );
                })}
              </CardContent>

              {isAdmin && (
                <CardFooter className="flex justify-end border-t dark:border-slate-850 pt-4">
                  <Button onClick={handleSaveRules} isLoading={saving} className="flex items-center gap-1.5">
                    <Save size={16} />
                    <span>Save Rules switches</span>
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};
export default SystemSettings;
