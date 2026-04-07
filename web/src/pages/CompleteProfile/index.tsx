import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { isValidName, isValidPhone, validatePassword, doPasswordsMatch } from '@core/auth/auth-utils';
import { GENDER_OPTIONS } from '@core/auth/auth-types';
import type { Gender } from '@core/auth/auth-types';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';

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
    <div style={{ minHeight: '100vh', padding: '2rem 1rem', background: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#0f172a' }}>Complete your profile</h2>
          <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.95rem' }}>
            Before accessing the platform, please provide your remaining details and set a local password.
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
          {globalError && (
            <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            
            {/* Email (Read-only) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Email Address</label>
              <input 
                type="email" 
                value={profile?.email || ''} 
                disabled 
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
              />
            </div>

            {/* Name Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>First Name</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
                {errors.firstName && <span style={{ color: '#b91c1c', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.firstName}</span>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Last Name</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
                {errors.lastName && <span style={{ color: '#b91c1c', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.lastName}</span>}
              </div>
            </div>

            {/* Phone & Gender */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.875rem' }}>+20</span>
                  <input 
                    type="tel"
                    placeholder="10XXXXX..."
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.625rem 0.625rem 0.625rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
                {errors.phone && <span style={{ color: '#b91c1c', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.phone}</span>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Gender</label>
                <select 
                  value={gender}
                  onChange={e => setGender(e.target.value as Gender)}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff' }}
                >
                  <option value="" disabled>Select gender</option>
                  {GENDER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {errors.gender && <span style={{ color: '#b91c1c', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.gender}</span>}
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Date of Birth</label>
              <input 
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
              {errors.dateOfBirth && <span style={{ color: '#b91c1c', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.dateOfBirth}</span>}
            </div>

            {/* Password Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Set Password</label>
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
                {errors.password && <span style={{ color: '#b91c1c', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.password}</span>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Confirm Password</label>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
                {errors.confirmPassword && <span style={{ color: '#b91c1c', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.confirmPassword}</span>}
              </div>
            </div>
            {/* Password conditions hint */}
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              At least 8 characters, containing uppercase, lowercase, number, and special character.
            </div>

            {/* Submit */}
            <div style={{ marginTop: '1rem' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: loading ? '#cbd5e1' : '#0f766e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
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
