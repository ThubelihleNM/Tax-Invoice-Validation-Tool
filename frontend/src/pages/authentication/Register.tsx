import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { toast } from '../../components/common/Toast';
import { 
  User, Building2, Eye, EyeOff, X, AlertTriangle, Shield, 
  CheckCircle2, Globe, Phone, MapPin, Briefcase, Lock, Check, Home
} from 'lucide-react';


export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dynamic Country Selection States
  const [countries, setCountries] = useState<any[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countryLoadError, setCountryLoadError] = useState(false);
  const [countryRetryCount, setCountryRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [phoneCodePrefix, setPhoneCodePrefix] = useState('');

  // Conflict 409 & Success Modal States
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    country: '',
    occupation: '',
    profession: '',
    companyName: '',
    businessRegNum: '',
    taxNumber: '',
    city: '',
    address: ''
  });

  // Fetch Countries Configuration on mount
  useEffect(() => {
    let cancelled = false;
    setCountriesLoading(true);
    setCountryLoadError(false);

    fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/countries`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch country profiles');
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Invalid country profiles response');
        if (!cancelled) setCountries(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setCountries([]);
          setCountryLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setCountriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [countryRetryCount]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectCountry = (country: any) => {
    setSelectedCountry(country);
    setSearchQuery(country.name);
    setFormData((prev) => ({
      ...prev,
      country: country.name
    }));
    if (country.phone_code?.prefix) {
      setPhoneCodePrefix(country.phone_code.prefix);
    } else {
      setPhoneCodePrefix('');
    }
    setShowCountryDropdown(false);
  };

  // Password criteria checklist validation
  const getPasswordCriteria = (pass: string) => {
    return {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[^A-Za-z0-9]/.test(pass)
    };
  };

  const criteria = getPasswordCriteria(formData.password);
  const criteriaPassedCount = Object.values(criteria).filter(Boolean).length;

  const getStrengthIndicator = () => {
    if (!formData.password) return { label: 'None', color: 'bg-slate-200 dark:bg-slate-700 w-0' };
    if (criteriaPassedCount <= 2) return { label: 'Weak', color: 'bg-danger w-1/3' };
    if (criteriaPassedCount <= 4) return { label: 'Fair', color: 'bg-warning w-2/3' };
    return { label: 'Strong', color: 'bg-success w-full' };
  };

  const strength = getStrengthIndicator();

  // Email Validation regex
  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCountry) {
      toast('danger', 'Validation Error', 'Please select a country from the dropdown.');
      return;
    }

    if (!isEmailValid(formData.email)) {
      toast('danger', 'Validation Error', 'Please enter a valid email address.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast('danger', 'Validation Error', 'Password confirmation does not match.');
      return;
    }

    if (criteriaPassedCount < 5) {
      toast('danger', 'Validation Error', 'Please satisfy all 5 password security criteria.');
      return;
    }

    // Manual validations based on account type
    if (accountType === 'COMPANY') {
      if (!formData.companyName.trim()) {
        toast('danger', 'Validation Error', 'Company Name is required.');
        return;
      }
      if (!formData.businessRegNum.trim()) {
        toast('danger', 'Validation Error', 'Business Registration Number is required.');
        return;
      }
      if (!formData.taxNumber.trim()) {
        toast('danger', 'Validation Error', 'Tax/VAT Number is required.');
        return;
      }
    }

    setLoading(true);
    try {
      const fullPhone = phoneCodePrefix && formData.phone
        ? `${phoneCodePrefix}${formData.phone.replace(/^\+/, '')}`
        : (formData.phone || undefined);

      const payload: any = {
        account_type: accountType,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: fullPhone || undefined,
        country: selectedCountry.name,
        country_code: selectedCountry.code,
        password: formData.password,
        city: formData.city || undefined,
        address: formData.address || undefined
      };

      if (accountType === 'PERSONAL') {
        payload.occupation = formData.occupation || undefined;
        payload.profession = formData.profession || undefined;
      } else {
        payload.company_name = formData.companyName;
        payload.business_registration_number = formData.businessRegNum;
        payload.tax_number = formData.taxNumber;
      }

      await register(payload);
      setShowSuccessModal(true);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setShowConflictModal(true);
      } else {
        const detail = err.response?.data?.detail || 'Failed to complete registration.';
        toast('danger', 'Registration Failed', detail);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* ================= LEFT SIDE: HERO & BRANDING ================= */}
      <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-primary-dark via-primary to-primary-hover p-8 md:p-10 flex-col justify-between relative overflow-hidden text-white">
        
        {/* Animated Background Graphic Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
          <div className="absolute top-[10%] left-[10%] animate-float-slow">
            <svg width="120" height="150" viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white fill-current">
              <rect width="120" height="150" rx="8" fill="white" fillOpacity="0.1" />
              <rect x="15" y="20" width="90" height="8" rx="2" fill="white" />
              <rect x="15" y="36" width="50" height="6" rx="2" fill="white" />
              <line x1="15" y1="60" x2="105" y2="60" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
              <rect x="15" y="75" width="30" height="6" rx="2" fill="white" />
              <rect x="85" y="75" width="20" height="6" rx="2" fill="white" />
            </svg>
          </div>
          <div className="absolute bottom-[20%] right-[10%] animate-float-fast">
            <svg width="100" height="130" viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white fill-current">
              <rect width="100" height="130" rx="6" fill="white" fillOpacity="0.1" />
              <rect x="12" y="16" width="76" height="8" rx="2" fill="white" />
              <rect x="12" y="30" width="40" height="6" rx="2" fill="white" />
              <line x1="12" y1="50" x2="88" y2="50" stroke="white" strokeWidth="2" />
              <rect x="12" y="65" width="30" height="6" rx="2" fill="white" />
              <rect x="12" y="80" width="20" height="6" rx="2" fill="white" />
            </svg>
          </div>
        </div>

        {/* Branding header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-sm">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-lg tracking-wide block leading-tight">TaxAudit SaaS</span>
              <span className="text-[10px] text-white/75 font-medium tracking-widest uppercase">Compliance Suite</span>
            </div>
          </div>
          <Link
            to="/"
            id="register-home-btn-left"
            className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-full transition-all duration-200 font-medium"
          >
            <Home size={13} />
            <span>Home</span>
          </Link>
        </div>

        {/* Dynamic graphics and slogan */}
        <div className="space-y-6 relative z-10 my-auto py-6">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-primary-light bg-primary/20 border border-primary-light/30 px-3 py-1 rounded-full w-max block">
              Enterprise Grade
            </span>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight">
              Automated Tax Invoice Auditing
            </h2>
          </div>
          <p className="text-slate-200 text-xs sm:text-sm leading-relaxed max-w-sm">
            Accelerate your accounts payable with machine OCR, mathematical validation, and fraud intelligence safeguards.
          </p>
          
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-slate-100 text-xs font-medium">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span>Multi-jurisdiction VAT & GST engine</span>
            </div>
            <div className="flex items-center gap-3 text-slate-100 text-xs font-medium">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span>Algorithmic duplicate & fraud detection</span>
            </div>
            <div className="flex items-center gap-3 text-slate-100 text-xs font-medium">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span>Audit-ready PDF compliance logs</span>
            </div>
            <div className="flex items-center gap-3 text-slate-100 text-xs font-medium">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span>Granular Personal & Company workflows</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-white/70 relative z-10 flex items-center justify-between border-t border-white/10 pt-4">
          <span>Secure • Intelligent • Accurate</span>
          <span>v2.0.0</span>
        </div>
      </div>

      {/* ================= RIGHT SIDE: REGISTRATION FORM ================= */}
      <div className="col-span-1 md:col-span-7 flex flex-col p-6 sm:p-8 md:p-10 bg-white dark:bg-slate-900 transition-colors duration-200 overflow-y-auto max-h-[88vh]">
        <div className="max-w-xl w-full mx-auto space-y-6">
          
          {/* Header */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Create Your Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Join the platform to audit invoices, detect discrepancies, and maintain compliance.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            
            {/* Account Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Select Account Type:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('PERSONAL')}
                  className={`p-3.5 border rounded-xl flex items-center gap-3.5 transition-all text-left ${
                    accountType === 'PERSONAL'
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary ring-2 ring-primary/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg transition-colors ${
                    accountType === 'PERSONAL' ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    <User size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800 dark:text-slate-100">Personal Use</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">Auditor or freelancer</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('COMPANY')}
                  className={`p-3.5 border rounded-xl flex items-center gap-3.5 transition-all text-left ${
                    accountType === 'COMPANY'
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary ring-2 ring-primary/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg transition-colors ${
                    accountType === 'COMPANY' ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800 dark:text-slate-100">Company Use</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">Business or enterprise</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Dynamic Form Content */}
            <div className="space-y-4 pt-1">
              
              {accountType === 'PERSONAL' ? (
                /* ================= PERSONAL FORM ================= */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        placeholder="Sarah"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        placeholder="Miller"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-all ${
                        formData.email
                          ? isEmailValid(formData.email)
                            ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                            : 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20'
                      }`}
                      placeholder="sarah.miller@example.com"
                    />
                    {formData.email && !isEmailValid(formData.email) && (
                      <p className="text-[11px] text-rose-500 font-medium">Please enter a valid email format.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Country Selection */}
                    <div className="space-y-1 relative">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Country</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={searchQuery}
                          onFocus={() => setShowCountryDropdown(true)}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowCountryDropdown(true);
                            if (selectedCountry && selectedCountry.name !== e.target.value) {
                              setSelectedCountry(null);
                              setPhoneCodePrefix('');
                            }
                          }}
                          className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                          placeholder="Select Country..."
                        />
                        <Globe size={15} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                      </div>
                      {showCountryDropdown && (countriesLoading || countryLoadError || filteredCountries.length > 0) && (
                        <div className="absolute z-50 w-full mt-1 max-h-44 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                          {countriesLoading ? (
                            <p className="px-3.5 py-2 text-xs text-slate-500 dark:text-slate-400">Loading countries...</p>
                          ) : countryLoadError ? (
                            <div className="px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400">
                              <span>Countries could not be loaded.</span>
                              <button
                                type="button"
                                onClick={() => setCountryRetryCount((count) => count + 1)}
                                className="ml-2 font-semibold underline"
                              >
                                Retry
                              </button>
                            </div>
                          ) : filteredCountries.length > 0 ? (
                            filteredCountries.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelectCountry(c)}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-primary/5 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between transition-colors"
                              >
                                <span>{c.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{c.code}</span>
                              </button>
                            ))
                          ) : (
                            <p className="px-3.5 py-2 text-xs text-slate-500 dark:text-slate-400">No countries match your search.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Phone Number</label>
                      <div className="flex gap-2">
                        {phoneCodePrefix && (
                          <span className="inline-flex items-center px-2.5 text-xs border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-100 font-mono">
                            {phoneCodePrefix}
                          </span>
                        )}
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                          placeholder="555-0199"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Country Tax Config Pill */}
                  {selectedCountry?.tax_config && (
                    <div className="p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl text-xs space-y-1 text-slate-700 dark:text-slate-300 transition-all">
                      <div className="flex items-center gap-1.5 font-bold text-primary">
                        <Shield size={14} />
                        <span>Tax Configuration Profile: {selectedCountry.name}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                        <div><span className="text-slate-400">System:</span> <span className="font-semibold">{selectedCountry.tax_config.tax_system.code}</span></div>
                        <div><span className="text-slate-400">Rate:</span> <span className="font-semibold">{selectedCountry.tax_config.default_rate ? `${selectedCountry.tax_config.default_rate.rate}%` : 'N/A'}</span></div>
                        <div><span className="text-slate-400">Label:</span> <span className="font-semibold">{selectedCountry.tax_config.tax_number_label}</span></div>
                        <div><span className="text-slate-400">Currency:</span> <span className="font-semibold">{selectedCountry.tax_config.currency.code} ({selectedCountry.tax_config.currency.symbol})</span></div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Profession</label>
                      <input
                        type="text"
                        name="profession"
                        value={formData.profession}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        placeholder="e.g. Certified Tax Auditor"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Occupation (Optional)</label>
                      <input
                        type="text"
                        name="occupation"
                        value={formData.occupation}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        placeholder="Independent Consultant"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* ================= COMPANY FORM ================= */
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Company Legal Name</label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      required
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                      placeholder="Acme Global Solutions Ltd"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Business Registration Number</label>
                      <input
                        type="text"
                        name="businessRegNum"
                        value={formData.businessRegNum}
                        onChange={handleChange}
                        required
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        placeholder="REG-2026-9921"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {selectedCountry?.tax_config?.tax_number_label || 'Tax/VAT Identifier'}
                      </label>
                      <input
                        type="text"
                        name="taxNumber"
                        value={formData.taxNumber}
                        onChange={handleChange}
                        required
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        placeholder="e.g. VAT-88273619"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Primary Contact First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        placeholder="David"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Primary Contact Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        placeholder="Chen"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Corporate Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-all ${
                        formData.email
                          ? isEmailValid(formData.email)
                            ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                            : 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20'
                      }`}
                      placeholder="compliance@acme.com"
                    />
                    {formData.email && !isEmailValid(formData.email) && (
                      <p className="text-[11px] text-rose-500 font-medium">Please enter a valid email address.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Country */}
                    <div className="space-y-1 relative">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Country</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={searchQuery}
                          onFocus={() => setShowCountryDropdown(true)}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowCountryDropdown(true);
                            if (selectedCountry && selectedCountry.name !== e.target.value) {
                              setSelectedCountry(null);
                              setPhoneCodePrefix('');
                            }
                          }}
                          className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                          placeholder="Select Country..."
                        />
                        <Globe size={15} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                      </div>
                      {showCountryDropdown && filteredCountries.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 max-h-44 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                          {filteredCountries.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCountry(c)}
                              className="w-full text-left px-3.5 py-2 text-xs hover:bg-primary/5 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between transition-colors"
                            >
                              <span>{c.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{c.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Phone Number</label>
                      <div className="flex gap-2">
                        {phoneCodePrefix && (
                          <span className="inline-flex items-center px-2.5 text-xs border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-100 font-mono">
                            {phoneCodePrefix}
                          </span>
                        )}
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                          placeholder="555-0199"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Country Tax Config Pill */}
                  {selectedCountry?.tax_config && (
                    <div className="p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl text-xs space-y-1 text-slate-700 dark:text-slate-300 transition-all">
                      <div className="flex items-center gap-1.5 font-bold text-primary">
                        <Shield size={14} />
                        <span>Corporate Tax Configuration Profile: {selectedCountry.name}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                        <div><span className="text-slate-400">System:</span> <span className="font-semibold">{selectedCountry.tax_config.tax_system.code}</span></div>
                        <div><span className="text-slate-400">Default Rate:</span> <span className="font-semibold">{selectedCountry.tax_config.default_rate ? `${selectedCountry.tax_config.default_rate.rate}%` : 'N/A'}</span></div>
                        <div><span className="text-slate-400">Tax Label:</span> <span className="font-semibold">{selectedCountry.tax_config.tax_number_label}</span></div>
                        <div><span className="text-slate-400">Currency:</span> <span className="font-semibold">{selectedCountry.tax_config.currency.code} ({selectedCountry.tax_config.currency.symbol})</span></div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        placeholder="Johannesburg"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Headquarters Address</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        placeholder="100 Enterprise Boulevard"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ================= PASSWORD & SECURITY ================= */}
              <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full px-3.5 py-2.5 pr-10 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        className={`w-full px-3.5 py-2.5 pr-10 text-sm border rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-all ${
                          formData.confirmPassword
                            ? formData.password === formData.confirmPassword
                              ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                              : 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-[11px] text-rose-500 font-medium">Passwords do not match.</p>
                    )}
                  </div>
                </div>

                {/* Password Strength Bar & Checklist */}
                {formData.password && (
                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 rounded-xl transition-all">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Password Strength:</span>
                      <span className={`font-bold uppercase text-[11px] ${
                        strength.label === 'Strong' ? 'text-emerald-500' : strength.label === 'Fair' ? 'text-amber-500' : 'text-rose-500'
                      }`}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strength.color}`} />
                    </div>
                    
                    {/* Criteria 5-badge checklist */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px] pt-1">
                      <div className={`flex items-center gap-1.5 ${criteria.length ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                        <span className="text-xs">{criteria.length ? '✓' : '•'}</span> 8+ characters
                      </div>
                      <div className={`flex items-center gap-1.5 ${criteria.uppercase ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                        <span className="text-xs">{criteria.uppercase ? '✓' : '•'}</span> Uppercase letter
                      </div>
                      <div className={`flex items-center gap-1.5 ${criteria.lowercase ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                        <span className="text-xs">{criteria.lowercase ? '✓' : '•'}</span> Lowercase letter
                      </div>
                      <div className={`flex items-center gap-1.5 ${criteria.number ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                        <span className="text-xs">{criteria.number ? '✓' : '•'}</span> Number (0-9)
                      </div>
                      <div className={`flex items-center gap-1.5 ${criteria.special ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                        <span className="text-xs">{criteria.special ? '✓' : '•'}</span> Special character
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Submit button */}
            <Button
              type="submit"
              isLoading={loading}
              className="w-full py-3 mt-4 text-sm font-bold shadow-lg shadow-primary/25 rounded-xl transition-transform active:scale-[0.99]"
            >
              Create Account
            </Button>

            {/* Footer switch to sign in */}
            <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Sign In
              </Link>
            </div>

          </form>

        </div>
      </div>

      {/* ================= CONFLICT MODAL (409) ================= */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <button
              onClick={() => setShowConflictModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 text-amber-500">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Account Already Registered</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              An account with the email <strong className="text-slate-900 dark:text-slate-100 font-semibold">{formData.email}</strong> already exists. Sign in with your password or use password recovery.
            </p>
            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                onClick={() => {
                  setShowConflictModal(false);
                  navigate('/login');
                }}
                className="w-full font-bold"
              >
                Sign In to Account
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowConflictModal(false);
                  navigate('/forgot-password');
                }}
                className="w-full font-bold"
              >
                Reset Forgotten Password
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS MODAL ================= */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Account Successfully Created!</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Welcome to TaxAudit SaaS. Your account is configured and ready for automated tax invoice validation.
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/login');
                }}
                className="w-full font-bold py-2.5"
              >
                Sign In Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Register;
