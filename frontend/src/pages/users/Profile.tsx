import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/common/Card';
import { toast } from '../../components/common/Toast';
import { User as UserIcon, Lock, Camera, ShieldCheck, Mail, Phone, Calendar, Bookmark, Globe, Coins } from 'lucide-react';
import { getCurrencyInfo } from '../../utils/currency';

interface ProfileDetailsInputs {
  first_name: string;
  last_name: string;
  phone: string;
  country?: string;
  currency?: string;
  occupation?: string;
  company_name?: string;
  business_registration_number?: string;
  tax_number?: string;
  city?: string;
  address?: string;
}

interface ChangePasswordInputs {
  current_pw: string;
  new_pw: string;
  confirm_pw: string;
}

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>(
    (searchParams.get('tab') as 'profile' | 'password') || 'profile'
  );
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Sync tab state with query parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'profile' || tab === 'password') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: 'profile' | 'password') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Forms setup
  const { register: regProfile, handleSubmit: handleProfileSubmit, reset: resetProfile, watch: watchProfile, formState: { errors: errorsProfile } } = useForm<ProfileDetailsInputs>();
  const { register: regPass, handleSubmit: handlePassSubmit, reset: resetPass, watch: watchPass, formState: { errors: errorsPass } } = useForm<ChangePasswordInputs>();
  const newPw = watchPass('new_pw');
  const watchedCountry = watchProfile('country');
  const selectedCurrency = getCurrencyInfo(watchedCountry || user?.country || user?.currency);

  // Initialize form details when user is loaded
  useEffect(() => {
    if (user) {
      resetProfile({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || '',
        country: user.country || '',
        occupation: user.occupation || '',
        company_name: user.company_name || '',
        business_registration_number: user.business_registration_number || '',
        tax_number: user.tax_number || '',
        city: user.city || '',
        address: user.address || ''
      });
      if (user.profile_photo) {
        setPhotoPreview(user.profile_photo);
      }
    }
  }, [user, resetProfile]);

  if (!user) return null;

  // Handle profile photo upload selection
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Client-side size validation
    if (file.size > 5 * 1024 * 1024) {
      toast('danger', 'File Too Large', 'Profile photo must be less than 5MB.');
      return;
    }

    // Client-side type validation
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast('danger', 'Invalid Format', 'Supported formats are PNG, JPG, or JPEG.');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/users/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateUser(res.data);
      toast('success', 'Photo Uploaded', 'Your profile picture has been updated.');
    } catch (err: any) {
      toast('danger', 'Upload Failed', err.response?.data?.detail || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Submit profile details modifications
  const onProfileSubmit = async (data: ProfileDetailsInputs) => {
    setUpdatingProfile(true);
    try {
      const payload = {
        ...data,
        currency: selectedCurrency.code
      };
      const res = await axios.put('/api/users/profile', payload);
      updateUser(res.data);
      toast('success', 'Profile Updated', `Your profile information has been saved with ${selectedCurrency.name} (${selectedCurrency.code} ${selectedCurrency.symbol}).`);
    } catch (err: any) {
      toast('danger', 'Error', err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Submit password modifications
  const onPasswordSubmit = async (data: ChangePasswordInputs) => {
    if (data.new_pw !== data.confirm_pw) {
      toast('danger', 'Error', 'New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await axios.post('/api/auth/change-password', {
        current_password: data.current_pw,
        new_password: data.new_pw
      });
      toast('success', 'Password Updated', 'Your password has been changed successfully.');
      resetPass();
    } catch (err: any) {
      toast('danger', 'Error', err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Profile Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your account profile picture, contact details, and security passwords.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Photo upload & Identity status Card */}
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center text-center pt-8 pb-6">
              
              {/* Photo Upload Circle wrapper */}
              <div className="relative group">
                <div className="h-32 w-32 rounded-full overflow-hidden bg-slate-150 border-4 border-white dark:border-slate-800 shadow-xl flex items-center justify-center font-bold text-3xl text-primary bg-slate-100 dark:bg-slate-850">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    `${user.first_name[0]}${user.last_name[0]}`
                  )}
                </div>
                
                {/* Photo trigger hover overlay */}
                <label className="absolute inset-0 bg-slate-900/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-200">
                  <Camera size={20} />
                  <span className="text-[10px] font-semibold mt-1">Change Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>

              <div className="mt-4 space-y-1">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {user.first_name} {user.last_name}
                </h3>
                <span className="text-xs font-semibold px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full uppercase tracking-wider">
                  {user.role}
                </span>
              </div>

              {/* Status information panel */}
              <div className="w-full mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 text-left space-y-3.5 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail size={16} />
                  <span className="truncate text-slate-600 dark:text-slate-400 font-medium">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Phone size={16} />
                  <span className="text-slate-655 text-slate-600 dark:text-slate-400 font-medium">{user.phone || 'No phone set'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar size={16} />
                  <span className="text-slate-655 text-slate-600 dark:text-slate-400 font-medium">Joined {new Date(user.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Globe size={16} />
                  <span className="text-slate-655 text-slate-600 dark:text-slate-400 font-medium">Country: 
                    <span className="ml-1 font-semibold text-slate-800 dark:text-slate-200">{user.country || 'Not specified'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Coins size={16} />
                  <span className="text-slate-655 text-slate-600 dark:text-slate-400 font-medium">Currency: 
                    <span className="ml-1 font-bold text-emerald-600 dark:text-emerald-400">{getCurrencyInfo(user).name} ({getCurrencyInfo(user).code} - {getCurrencyInfo(user).symbol})</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Bookmark size={16} />
                  <span className="text-slate-655 text-slate-600 dark:text-slate-400 font-medium">Account Status: 
                    <span className="ml-1 text-success font-bold">Active</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Tabs menu selector list */}
          <div className="flex flex-col gap-1 rounded-xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/80 p-1.5 backdrop-blur-md">
            <button
              onClick={() => switchTab('profile')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'profile'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/30'
              }`}
            >
              <UserIcon size={16} />
              <span>Update Details</span>
            </button>
            <button
              onClick={() => switchTab('password')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'password'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/30'
              }`}
            >
              <Lock size={16} />
              <span>Change Password</span>
            </button>
          </div>
        </div>

        {/* Right Side: Dynamic forms based on tabs */}
        <div className="md:col-span-8">
          {activeTab === 'profile' ? (
            <Card>
              <CardHeader>
                <h3 className="text-base font-bold text-slate-850 dark:text-slate-105">Personal Information</h3>
                <p className="text-xs text-slate-400 mt-0.5">Edit your contact coordinates and profile attributes.</p>
              </CardHeader>
              <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      error={errorsProfile.first_name?.message}
                      {...regProfile('first_name', { required: 'First name is required' })}
                    />
                    <Input
                      label="Last Name"
                      error={errorsProfile.last_name?.message}
                      {...regProfile('last_name', { required: 'Last name is required' })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Phone Number"
                      error={errorsProfile.phone?.message}
                      {...regProfile('phone', {
                        pattern: {
                          value: /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g,
                          message: 'Please enter a valid phone number'
                        }
                      })}
                    />
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Country / Tax Jurisdiction
                      </label>
                      <select
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        {...regProfile('country')}
                      >
                        <option value="">Select country...</option>
                        <option value="India">India — Indian Rupee (INR ₹)</option>
                        <option value="South Africa">South Africa — South African Rand (ZAR R)</option>
                        <option value="United States">United States — US Dollar (USD $)</option>
                        <option value="United Kingdom">United Kingdom — British Pound (GBP £)</option>
                        <option value="Canada">Canada — Canadian Dollar (CAD $)</option>
                        <option value="Australia">Australia — Australian Dollar (AUD $)</option>
                        <option value="United Arab Emirates">United Arab Emirates — UAE Dirham (AED)</option>
                        <option value="Nigeria">Nigeria — Nigerian Naira (NGN ₦)</option>
                        <option value="Kenya">Kenya — Kenyan Shilling (KES KSh)</option>
                        <option value="Zimbabwe">Zimbabwe — Zimbabwe Gold (ZWG ZiG)</option>
                        <option value="Germany">Germany — Euro (EUR €)</option>
                        <option value="France">France — Euro (EUR €)</option>
                      </select>
                      <div className="mt-1.5 flex items-center justify-between px-1 text-[11px]">
                        <span className="text-slate-400">Assigned Currency:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {selectedCurrency.name} ({selectedCurrency.code} - {selectedCurrency.symbol})
                        </span>
                      </div>
                    </div>
                  </div>

                  {user.account_type === 'PERSONAL' ? (
                    <Input
                      label="Occupation"
                      error={errorsProfile.occupation?.message}
                      {...regProfile('occupation')}
                    />
                  ) : (
                    <>
                      <Input
                        label="Company Name"
                        error={errorsProfile.company_name?.message}
                        {...regProfile('company_name')}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Business Registration Number"
                          error={errorsProfile.business_registration_number?.message}
                          {...regProfile('business_registration_number')}
                        />
                        <Input
                          label="Tax/VAT Number"
                          error={errorsProfile.tax_number?.message}
                          {...regProfile('tax_number')}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="City"
                          error={errorsProfile.city?.message}
                          {...regProfile('city')}
                        />
                        <Input
                          label="Address"
                          error={errorsProfile.address?.message}
                          {...regProfile('address')}
                        />
                      </div>
                    </>
                  )}

                  <Input
                    label="Email Address"
                    disabled
                    value={user.email}
                    helperText="Account email address cannot be edited."
                  />
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="submit" isLoading={updatingProfile}>
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <h3 className="text-base font-bold text-slate-850 dark:text-slate-105">Security Password</h3>
                <p className="text-xs text-slate-400 mt-0.5">Ensure your corporate security credentials are up to date.</p>
              </CardHeader>
              <form onSubmit={handlePassSubmit(onPasswordSubmit)}>
                <CardContent className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    error={errorsPass.current_pw?.message}
                    {...regPass('current_pw', { required: 'Current password is required' })}
                  />
                  <Input
                    label="New Password"
                    type="password"
                    error={errorsPass.new_pw?.message}
                    {...regPass('new_pw', {
                      required: 'New password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' }
                    })}
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    error={errorsPass.confirm_pw?.message}
                    {...regPass('confirm_pw', {
                      required: 'Confirm password is required',
                      validate: (val) => val === newPw || 'Passwords do not match'
                    })}
                  />
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="submit" isLoading={changingPassword}>
                    Update Password
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
export default Profile;
