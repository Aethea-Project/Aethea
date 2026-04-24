import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { isValidName, isValidPhone, validatePassword, doPasswordsMatch } from '@core/auth/auth-utils';
import { GENDER_OPTIONS } from '@core/auth/auth-types';
import type { Gender } from '@core/auth/auth-types';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';
import { cn } from '../../lib/utils';

const CompleteProfilePage: React.FC = () => {
  const { profile, updateProfile, updatePassword, refreshProfile } = useAuth();
  const { notifySuccess } = useUiNotifications();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    // Populate with existing data if available
    if (profile) {
      if (profile.firstName) setFirstName(profile.firstName);
      if (profile.lastName) setLastName(profile.lastName);
      if (profile.phone) {
        // Remove +20 if present so it doesn't display double prefix
        const p = profile.phone.startsWith('+20') ? profile.phone.slice(3) : profile.phone;
        setPhone(p);
      }
      if (profile.dateOfBirth) setDateOfBirth(profile.dateOfBirth);
      if (profile.gender) setGender(profile.gender as Gender);
    }
  }, [profile]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Names
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    else {
      const nameCheck = isValidName(firstName);
      if (!nameCheck.valid) newErrors.firstName = nameCheck.error!;
    }

    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    else {
      const nameCheck = isValidName(lastName);
      if (!nameCheck.valid) newErrors.lastName = nameCheck.error!;
    }

    // Phone
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    else {
      const phoneCheck = isValidPhone('EG', phone); // Defaulting to EG '20' validation contextually based on RegisterForm if needed
      if (!phoneCheck.valid) newErrors.phone = phoneCheck.error || 'Invalid phone number';
    }

    // DOB
    if (!dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';

    // Gender
    if (!gender) newErrors.gender = 'Gender is required';

    // Password
    if (!password) {
      newErrors.password = 'Please set a password for your account';
    } else {
      const passCheck = validatePassword(password);
      if (!passCheck.valid) newErrors.password = passCheck.error!;
    }

    // Confirm password
    if (password && !doPasswordsMatch(password, confirmPassword)) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Format phone as international before sending
      let finalPhone = phone.trim();
      if (finalPhone && !finalPhone.startsWith('+')) {
        // Assume +20 (Egypt) by default as indicated in the UI
        finalPhone = `+20${finalPhone.replace(/^0+/, '')}`;
      }

      // 1. Update Profile (Basic info)
      const profileResult = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: finalPhone,
        dateOfBirth,
        gender: gender as Gender,
      });

      if (!profileResult.success) {
        setLoading(false);
        setGlobalError(profileResult.message || 'Failed to update profile');
        return;
      }

      // 2. Set Password locally
      if (password) {
        await updatePassword(password);
      }

      // 3. Refresh Auth Profile Context
      await refreshProfile();
      setLoading(false);
      notifySuccess('Profile Completed', 'Your profile is now complete.');

      // Proceed to dashboard
      navigate('/dashboard', { replace: true });
    } catch {
      setLoading(false);
      setGlobalError('An unexpected error occurred while saving your profile.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 flex justify-center">
      <div className="w-full max-w-[600px]">
        <div className="text-center mb-8">
          <h2 className="m-0 text-2xl font-semibold text-slate-900">Complete your profile</h2>
          <p className="mt-2 text-sm text-slate-500">
            Before accessing the platform, please provide your remaining details and set a local password.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          {globalError && (
            <div className="mb-5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-2.5 py-2 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-2"
                />
                {errors.firstName && <span className="mt-1 block text-xs text-red-600">{errors.firstName}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-2"
                />
                {errors.lastName && <span className="mt-1 block text-xs text-red-600">{errors.lastName}</span>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">+20</span>
                  <input
                    type="tel"
                    placeholder="10XXXXX..."
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-2 pl-10"
                  />
                </div>
                {errors.phone && <span className="mt-1 block text-xs text-red-600">{errors.phone}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as Gender)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2"
                >
                  <option value="" disabled>Select gender</option>
                  {GENDER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {errors.gender && <span className="mt-1 block text-xs text-red-600">{errors.gender}</span>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2.5 py-2"
              />
              {errors.dateOfBirth && <span className="mt-1 block text-xs text-red-600">{errors.dateOfBirth}</span>}
            </div>

            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Set Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-2"
                />
                {errors.password && <span className="mt-1 block text-xs text-red-600">{errors.password}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-2"
                />
                {errors.confirmPassword && <span className="mt-1 block text-xs text-red-600">{errors.confirmPassword}</span>}
              </div>
            </div>
            <div className="text-xs text-slate-500">
              At least 8 characters, containing uppercase, lowercase, number, and special character.
            </div>

            <div className="mt-4">
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full rounded-md px-3 py-3 text-sm font-semibold text-white transition-colors',
                  loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-teal-700 hover:bg-teal-800',
                )}
              >
                {loading ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
