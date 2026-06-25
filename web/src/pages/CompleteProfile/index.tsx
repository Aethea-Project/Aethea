import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { isValidName, isValidPhone, validatePassword, doPasswordsMatch } from '@core/auth/auth-utils';
import { GENDER_OPTIONS } from '@core/auth/auth-types';
import type { Gender } from '@core/auth/auth-types';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card } from '../../components/ui/Card';
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
    <div className="min-h-screen bg-surface px-4 py-8 flex justify-center">
      <div className="w-full max-w-[600px]">
        <div className="text-center mb-8">
          <h2 className="m-0 text-2xl font-semibold text-sand-900">Complete your profile</h2>
          <p className="mt-2 text-sm text-sand-500">
            Before accessing the platform, please provide your remaining details and set a local password.
          </p>
        </div>

        <Card className="p-8">
          {globalError && (
            <div className="mb-5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-5">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={profile?.email || ''}
                disabled
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label>First Name</Label>
                <Input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  error={!!errors.firstName}
                />
                {errors.firstName && <span className="mt-1 block text-xs text-red-600 font-medium">{errors.firstName}</span>}
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  error={!!errors.lastName}
                />
                {errors.lastName && <span className="mt-1 block text-xs text-red-600 font-medium">{errors.lastName}</span>}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label>Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-sand-500 font-medium z-10">+20</span>
                  <Input
                    type="tel"
                    placeholder="10XXXXX..."
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    error={!!errors.phone}
                    className="pl-[3.25rem]"
                  />
                </div>
                {errors.phone && <span className="mt-1 block text-xs text-red-600 font-medium">{errors.phone}</span>}
              </div>
              <div>
                <Label>Gender</Label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as Gender)}
                  className={cn(
                    "flex h-12 w-full rounded-lg border border-sand-200 bg-surface-card px-3 py-2 text-sm text-sand-900 transition-colors focus:border-nescafe focus:outline-none focus:ring-1 focus:ring-sand-100 disabled:cursor-not-allowed disabled:bg-surface appearance-none cursor-pointer",
                    "bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg_xmlns=%27http://www.w3.org/2000/svg%27_viewBox=%270_0_24_24%27_fill=%27none%27_stroke=%27%23475569%27_stroke-width=%272%27_stroke-linecap=%27round%27_stroke-linejoin=%27round%27%3e%3cpolyline_points=%276_9_12_15_18_9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[size:1rem]",
                    errors.gender && "border-red-600 focus:border-red-600 focus:ring-red-100"
                  )}
                >
                  <option value="" disabled>Select gender</option>
                  {GENDER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {errors.gender && <span className="mt-1 block text-xs text-red-600 font-medium">{errors.gender}</span>}
              </div>
            </div>

            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                error={!!errors.dateOfBirth}
              />
              {errors.dateOfBirth && <span className="mt-1 block text-xs text-red-600 font-medium">{errors.dateOfBirth}</span>}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label>Set Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  error={!!errors.password}
                />
                {errors.password && <span className="mt-1 block text-xs text-red-600 font-medium">{errors.password}</span>}
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  error={!!errors.confirmPassword}
                />
                {errors.confirmPassword && <span className="mt-1 block text-xs text-red-600 font-medium">{errors.confirmPassword}</span>}
              </div>
            </div>
            <div className="text-xs text-sand-500 font-medium">
              At least 8 characters, containing uppercase, lowercase, number, and special character.
            </div>

            <div className="mt-4">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save & Continue'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
