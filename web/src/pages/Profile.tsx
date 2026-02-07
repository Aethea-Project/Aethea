/**
 * Profile Page — Aethea Medical Platform
 *
 * Displays user profile (personal + medical info from registration)
 * and allows editing with validation.
 *
 * Sections:
 *  1. Personal Information  (from registration: name, email, DOB, gender, phone)
 *  2. Medical Information   (blood type, allergies, chronic conditions, height, weight, notes)
 *  3. Emergency Contact     (name, phone)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@shared/auth/useAuth';
import { GENDER_OPTIONS, BLOOD_TYPE_OPTIONS, ALLERGY_OPTIONS, CHRONIC_CONDITION_OPTIONS } from '@shared/auth/auth-types';
import type { ProfileUpdateRequest, UserProfile, BloodType, Gender } from '@shared/auth/auth-types';
import './Profile.css';

const ProfilePage: React.FC = () => {
  const { profile, loading, updateProfile, refreshProfile, user } = useAuth();

  // Edit mode toggle
  const [isEditing, setIsEditing] = useState(false);

  // Form state — mirrors ProfileUpdateRequest
  const [form, setForm] = useState<ProfileUpdateRequest>({});

  // UI feedback
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Populate form when profile loads or changes
  useEffect(() => {
    if (profile) {
      setForm(profileToForm(profile));
    }
  }, [profile]);

  // ── Handlers ───────────────────────────────
  const handleChange = useCallback(
    (field: keyof ProfileUpdateRequest, value: string | number | undefined) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleEdit = () => {
    setIsEditing(true);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrorMsg('');
    // Reset form to current profile
    if (profile) setForm(profileToForm(profile));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    // full_name is auto-generated in database from first_name + last_name
    const result = await updateProfile(form);

    setSaving(false);

    if (result.success) {
      setSuccessMsg(result.message ?? 'Profile updated successfully');
      setIsEditing(false);
      // Re-fetch the latest profile
      await refreshProfile();
    } else {
      setErrorMsg(result.message ?? 'Update failed');
    }
  };

  // ── Loading state ──────────────────────────
  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Loading profile…</div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────
  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <h1>👤 My Profile</h1>
          {!isEditing && (
            <button className="btn btn-edit" onClick={handleEdit}>
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {/* Feedback messages */}
        {successMsg && <div className="profile-success">{successMsg}</div>}
        {errorMsg && <div className="profile-error">{errorMsg}</div>}

        {/* ── Section 1: Personal Information ────── */}
        <div className="profile-card">
          <h2>🧑 Personal Information</h2>
          <div className="profile-grid">
            <Field
              label="First Name"
              value={form.firstName}
              editing={isEditing}
              onChange={(v) => handleChange('firstName', v)}
            />
            <Field
              label="Last Name"
              value={form.lastName}
              editing={isEditing}
              onChange={(v) => handleChange('lastName', v)}
            />
            <Field
              label="Email"
              value={user?.email ?? profile?.email ?? ''}
              editing={false}
              hint="Email cannot be changed"
            />
            <Field
              label="Date of Birth"
              value={form.dateOfBirth}
              editing={isEditing}
              type="date"
              onChange={(v) => handleChange('dateOfBirth', v)}
            />
            <SelectField
              label="Gender"
              value={form.gender ?? ''}
              editing={isEditing}
              options={GENDER_OPTIONS.map((g) => ({ value: g.value, label: g.label }))}
              onChange={(v) => handleChange('gender', v as Gender)}
            />
            <Field
              label="Phone"
              value={form.phone}
              editing={isEditing}
              type="tel"
              onChange={(v) => handleChange('phone', v)}
            />
          </div>
        </div>

        {/* ── Section 2: Medical Information ──────── */}
        <div className="profile-card">
          <h2>🏥 Medical Information</h2>
          <div className="profile-grid">
            <SelectField
              label="Blood Type"
              value={form.bloodType ?? ''}
              editing={isEditing}
              options={BLOOD_TYPE_OPTIONS.map((b) => ({ value: b.value, label: b.label }))}
              onChange={(v) => handleChange('bloodType', v as BloodType)}
            />
            <NumberField
              label="Height (cm)"
              value={form.heightCm}
              editing={isEditing}
              min={30}
              max={300}
              onChange={(v) => handleChange('heightCm', v)}
            />
            <NumberField
              label="Weight (kg)"
              value={form.weightKg}
              editing={isEditing}
              min={1}
              max={500}
              onChange={(v) => handleChange('weightKg', v)}
            />
            <div className="profile-field full-width">
              <label>Allergies</label>
              {isEditing ? (
                <ChipSelect
                  options={ALLERGY_OPTIONS}
                  selected={parseCommaSeparated(form.allergies)}
                  onChange={(items) => handleChange('allergies', items.join(', '))}
                />
              ) : (
                <span className={`field-value ${!form.allergies ? 'empty' : ''}`}>
                  {form.allergies ? (
                    <span className="chip-display">
                      {parseCommaSeparated(form.allergies).map((a) => (
                        <span key={a} className="chip chip-readonly">{a}</span>
                      ))}
                    </span>
                  ) : 'Not specified'}
                </span>
              )}
            </div>
            <div className="profile-field full-width">
              <label>Chronic Conditions</label>
              {isEditing ? (
                <ChipSelect
                  options={CHRONIC_CONDITION_OPTIONS}
                  selected={parseCommaSeparated(form.chronicConditions)}
                  onChange={(items) => handleChange('chronicConditions', items.join(', '))}
                />
              ) : (
                <span className={`field-value ${!form.chronicConditions ? 'empty' : ''}`}>
                  {form.chronicConditions ? (
                    <span className="chip-display">
                      {parseCommaSeparated(form.chronicConditions).map((c) => (
                        <span key={c} className="chip chip-readonly">{c}</span>
                      ))}
                    </span>
                  ) : 'Not specified'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 3: Emergency Contact ────────── */}
        <div className="profile-card">
          <h2>🚨 Emergency Contact</h2>
          <div className="profile-grid">
            <Field
              label="Contact Name"
              value={form.emergencyContactName}
              editing={isEditing}
              onChange={(v) => handleChange('emergencyContactName', v)}
              placeholder="Full name"
            />
            <Field
              label="Contact Phone"
              value={form.emergencyContactPhone}
              editing={isEditing}
              type="tel"
              onChange={(v) => handleChange('emergencyContactPhone', v)}
              placeholder="+966 5XXXXXXXX"
            />
          </div>
        </div>

        {/* ── Action buttons (edit mode) ──────────── */}
        {isEditing && (
          <div className="profile-actions">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Changes'}
            </button>
            <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Sub-components for DRY field rendering
// ──────────────────────────────────────────────

/** Parse comma-separated string into array of trimmed non-empty strings */
function parseCommaSeparated(value: string | undefined | null): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

interface ChipSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

/** Multi-select chip/tag picker */
const ChipSelect: React.FC<ChipSelectProps> = ({ options, selected, onChange }) => {
  const toggle = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  return (
    <div className="chip-select">
      {options.map((opt) => {
        const isActive = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            className={`chip ${isActive ? 'chip-active' : ''}`}
            onClick={() => toggle(opt)}
            aria-pressed={isActive}
          >
            {isActive && <span className="chip-check">✓</span>}
            {opt}
          </button>
        );
      })}
    </div>
  );
};

interface FieldProps {
  label: string;
  value: string | undefined | null;
  editing: boolean;
  type?: string;
  placeholder?: string;
  hint?: string;
  onChange?: (value: string) => void;
}

const Field: React.FC<FieldProps> = ({ label, value, editing, type = 'text', placeholder, hint, onChange }) => (
  <div className="profile-field">
    <label>{label}</label>
    {editing && onChange ? (
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <>
        <span className={`field-value ${!value ? 'empty' : ''}`}>
          {value || 'Not specified'}
        </span>
        {hint && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{hint}</span>}
      </>
    )}
  </div>
);

interface SelectFieldProps {
  label: string;
  value: string;
  editing: boolean;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, editing, options, onChange }) => (
  <div className="profile-field">
    <label>{label}</label>
    {editing && onChange ? (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ) : (
      <span className={`field-value ${!value ? 'empty' : ''}`}>
        {options.find((o) => o.value === value)?.label || value || 'Not specified'}
      </span>
    )}
  </div>
);

interface NumberFieldProps {
  label: string;
  value: number | undefined | null;
  editing: boolean;
  min?: number;
  max?: number;
  onChange?: (value: number | undefined) => void;
}

const NumberField: React.FC<NumberFieldProps> = ({ label, value, editing, min, max, onChange }) => (
  <div className="profile-field">
    <label>{label}</label>
    {editing && onChange ? (
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? undefined : Number(v));
        }}
      />
    ) : (
      <span className={`field-value ${value == null ? 'empty' : ''}`}>
        {value != null ? value : 'Not specified'}
      </span>
    )}
  </div>
);

// ── Helpers ──────────────────────────────────

/** Map UserProfile → form state */
function profileToForm(p: UserProfile): ProfileUpdateRequest {
  return {
    firstName: p.firstName ?? undefined,
    lastName: p.lastName ?? undefined,
    gender: p.gender ?? undefined,
    phone: p.phone ?? undefined,
    dateOfBirth: p.dateOfBirth ?? undefined,
    bloodType: p.bloodType ?? undefined,
    allergies: p.allergies ?? undefined,
    chronicConditions: p.chronicConditions ?? undefined,
    heightCm: p.heightCm ?? undefined,
    weightKg: p.weightKg ?? undefined,
    emergencyContactName: p.emergencyContactName ?? undefined,
    emergencyContactPhone: p.emergencyContactPhone ?? undefined,
  };
}

export default ProfilePage;
