import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { toast } from '../../components/common/Toast';
import { User, Building2, Eye, EyeOff, X, AlertTriangle } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dynamic Country Selection States
  const [countries, setCountries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [phoneCodePrefix, setPhoneCodePrefix] = useState('');

  // Conflict 409 Modal State
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
    fetch('/api/v1/countries')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch country profiles');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setCountries(data);
      })
      .catch((err) => console.error(err));
  }, []);

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
    if (!formData.password) return { label: 'None', color: 'bg-slate-200 w-0' };
    if (criteriaPassedCount <= 2) return { label: 'Weak', color: 'bg-red-500 w-1/3' };
    if (criteriaPassedCount <= 4) return { label: 'Fair', color: 'bg-yellow-500 w-2/3' };
    return { label: 'Strong', color: 'bg-green-500 w-full' };
  };

  const strength = getStrengthIndicator();

  // Email Validation regex
  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCountry) {
      toast('danger', 'Validation Error', 'Please select a valid country from the dropdown.');
      return;
    }

    if (!isEmailValid(formData.email)) {
      toast('danger', 'Validation Error', 'Please enter a valid email address.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast('danger', 'Validation Error', 'Password confirmation mismatch.');
      return;
    }

    if (criteriaPassedCount < 5) {
      toast('danger', 'Validation Error', 'Please meet all password strength requirements.');
      return;
    }

    // Manual validations based on account type
    if (accountType === 'COMPANY') {
      if (!formData.companyName) {
        toast('danger', 'Validation Error', 'Company Name is required.');
        return;
      }
      if (!formData.businessRegNum) {
        toast('danger', 'Validation Error', 'Business Registration Number is required.');
        return;
      }
      if (!formData.taxNumber) {
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
    <div className="w-full max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
          Create Your Account
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Redesigning onboarding for a modern tax compliance tool.
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-6">
        {/* Account Type Selection */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            I am registering as:
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setAccountType('PERSONAL')}
              className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all duration-200 ${
                accountType === 'PERSONAL'
                  ? 'border-primary bg-primary/5 text-primary shadow-md'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <User size={24} />
              <span className="font-bold text-sm">Personal Use</span>
            </button>

            <button
              type="button"
              onClick={() => setAccountType('COMPANY')}
              className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all duration-200 ${
                accountType === 'COMPANY'
                  ? 'border-primary bg-primary/5 text-primary shadow-md'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Building2 size={24} />
              <span className="font-bold text-sm">Company Use</span>
            </button>
          </div>
        </div>

        {/* Card containing dynamic forms */}
        <Card className="p-6 md:p-8 space-y-4">
          
          {accountType === 'PERSONAL' ? (
            /* ================= PERSONAL FORM FIELDS ================= */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                    placeholder="Jane"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`w-full px-3.5 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none ${
                    formData.email
                      ? isEmailValid(formData.email)
                        ? 'border-green-500 focus:border-green-500'
                        : 'border-red-500 focus:border-red-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-primary'
                  }`}
                  placeholder="jane.doe@gmail.com"
                />
                {formData.email && !isEmailValid(formData.email) && (
                  <p className="text-[10px] text-red-500 font-medium">Please enter a valid email format.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Searchable Country Selection */}
                <div className="space-y-1 relative">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Country</label>
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
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                    placeholder="Search country..."
                  />
                  {showCountryDropdown && filteredCountries.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg">
                      {filteredCountries.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCountry(c)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dialing Code + Phone Input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Phone Number</label>
                  <div className="flex gap-2">
                    {phoneCodePrefix && (
                      <span className="inline-flex items-center px-3 text-sm border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-500 dark:text-slate-400 font-medium">
                        {phoneCodePrefix}
                      </span>
                    )}
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                      placeholder="555-0199"
                    />
                  </div>
                </div>
              </div>

              {/* Country Tax Config Summary Card */}
              {selectedCountry?.tax_config && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg text-xs space-y-1 text-blue-700 dark:text-blue-300 transition-all duration-200">
                  <p className="font-semibold">Selected Country Tax Profile Summary:</p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div><span className="font-medium text-slate-500 dark:text-slate-400">Tax System:</span> {selectedCountry.tax_config.tax_system.code}</div>
                    <div><span className="font-medium text-slate-500 dark:text-slate-400">Default Rate:</span> {selectedCountry.tax_config.default_rate ? `${selectedCountry.tax_config.default_rate.rate}%` : 'N/A'}</div>
                    <div><span className="font-medium text-slate-500 dark:text-slate-400">Tax Label:</span> {selectedCountry.tax_config.tax_number_label}</div>
                    <div><span className="font-medium text-slate-500 dark:text-slate-400">Currency:</span> {selectedCountry.tax_config.currency.code} ({selectedCountry.tax_config.currency.symbol})</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Profession</label>
                  <input
                    type="text"
                    name="profession"
                    value={formData.profession}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                    placeholder="e.g. Auditor, Analyst"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Occupation (Optional)</label>
                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                    placeholder="Freelance Developer"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ================= COMPANY FORM FIELDS ================= */
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                  placeholder="Acme Corp"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 relative">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Country</label>
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
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                    placeholder="Search country..."
                  />
                  {showCountryDropdown && filteredCountries.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg">
                      {filteredCountries.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCountry(c)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Phone Number</label>
                  <div className="flex gap-2">
                    {phoneCodePrefix && (
                      <span className="inline-flex items-center px-3 text-sm border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-500 dark:text-slate-400 font-medium">
                        {phoneCodePrefix}
                      </span>
                    )}
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                      placeholder="555-0199"
                    />
                  </div>
                </div>
              </div>

              {/* Country Tax Config Summary Card */}
              {selectedCountry?.tax_config && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg text-xs space-y-1 text-blue-700 dark:text-blue-300 transition-all duration-200">
                  <p className="font-semibold">Selected Country Tax Profile Summary:</p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div><span className="font-medium text-slate-500 dark:text-slate-400">Tax System:</span> {selectedCountry.tax_config.tax_system.code}</div>
                    <div><span className="font-medium text-slate-500 dark:text-slate-400">Default Rate:</span> {selectedCountry.tax_config.default_rate ? `${selectedCountry.tax_config.default_rate.rate}%` : 'N/A'}</div>
                    <div><span className="font-medium text-slate-500 dark:text-slate-400">Tax Label:</span> {selectedCountry.tax_config.tax_number_label}</div>
                    <div><span className="font-medium text-slate-500 dark:text-slate-400">Currency:</span> {selectedCountry.tax_config.currency.code} ({selectedCountry.tax_config.currency.symbol})</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Business Registration Number</label>
                  <input
                    type="text"
                    name="businessRegNum"
                    value={formData.businessRegNum}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                    placeholder="REG-9283719"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {selectedCountry?.tax_config?.tax_number_label || 'Tax/VAT Number'}
                  </label>
                  <input
                    type="text"
                    name="taxNumber"
                    value={formData.taxNumber}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                    placeholder="Tax identifier number..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Primary Contact First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                    placeholder="Sarah"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Primary Contact Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                    placeholder="Jenkins"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Business Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={`w-full px-3.5 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none ${
                      formData.email
                        ? isEmailValid(formData.email)
                          ? 'border-green-500 focus:border-green-500'
                          : 'border-red-500 focus:border-red-500'
                        : 'border-slate-200 dark:border-slate-800 focus:border-primary'
                    }`}
                    placeholder="billing@yourcompany.com"
                  />
                  {formData.email && !isEmailValid(formData.email) && (
                    <p className="text-[10px] text-red-500 font-medium">Please enter a valid email format.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                    placeholder="Berlin"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                  placeholder="Friedrichstr 12"
                />
              </div>
            </div>
          )}

          {/* ================= COMMON PASSWORD FIELDS ================= */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password Field with strength check */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2 pr-10 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-primary focus:outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2 space-y-1.5 transition-all duration-200">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Password Strength:</span>
                      <span className={`font-bold uppercase ${
                        strength.label === 'Strong' ? 'text-green-500' : strength.label === 'Fair' ? 'text-yellow-500' : 'text-red-500'
                      }`}>{strength.label}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strength.color}`} />
                    </div>
                    
                    {/* Criteria list */}
                    <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-500 mt-1.5 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded">
                      <div className={`flex items-center gap-1 ${criteria.length ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                        <span>{criteria.length ? '✓' : '•'}</span> Min 8 chars
                      </div>
                      <div className={`flex items-center gap-1 ${criteria.uppercase ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                        <span>{criteria.uppercase ? '✓' : '•'}</span> Uppercase letter
                      </div>
                      <div className={`flex items-center gap-1 ${criteria.lowercase ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                        <span>{criteria.lowercase ? '✓' : '•'}</span> Lowercase letter
                      </div>
                      <div className={`flex items-center gap-1 ${criteria.number ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                        <span>{criteria.number ? '✓' : '•'}</span> Number (0-9)
                      </div>
                      <div className={`flex items-center gap-1 ${criteria.special ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                        <span>{criteria.special ? '✓' : '•'}</span> Special symbol
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password field with eye toggle */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className={`w-full px-3.5 py-2 pr-10 text-sm border rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none ${
                      formData.confirmPassword
                        ? formData.password === formData.confirmPassword
                          ? 'border-green-500 focus:border-green-500'
                          : 'border-red-500 focus:border-red-500'
                        : 'border-slate-200 dark:border-slate-800 focus:border-primary'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-[10px] text-red-500 font-medium">Passwords do not match.</p>
                )}
              </div>
            </div>
          </div>

          <Button type="submit" isLoading={loading} className="w-full py-2.5 mt-6 font-bold shadow-md shadow-primary/10">
            Create Account
          </Button>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-bold">
              Sign In
            </Link>
          </div>

        </Card>
      </form>

      {/* Account Already Exists Modal */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowConflictModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 text-yellow-500">
              <AlertTriangle size={28} />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Account Already Exists</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              An account with the email <strong className="text-slate-800 dark:text-slate-200">{formData.email}</strong> is already registered in our system. Please sign in or use the password recovery assistant.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => {
                  setShowConflictModal(false);
                  navigate('/login');
                }}
                className="w-full font-bold"
              >
                Sign In
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowConflictModal(false);
                  navigate('/forgot-password');
                }}
                className="w-full font-bold"
              >
                Forgot Password
              </Button>
              <button
                type="button"
                onClick={() => setShowConflictModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Successful Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Registration Successful!</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Your TaxAudit SaaS account has been created successfully. You can now sign in using your email address and password.
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/login');
                }}
                className="w-full font-bold"
              >
                Continue to Sign In
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
