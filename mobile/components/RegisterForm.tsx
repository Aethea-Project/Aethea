/**
 * Registration Form Component - React Native
 * Professional medical app design with Turnstile CAPTCHA via WebView
 * Follows accessibility best practices
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useAuth } from '@shared/auth/useAuth';
import { GENDER_OPTIONS, type Gender } from '@shared/auth/auth-types';
import { TURNSTILE_CONFIG } from '@shared/auth/constants';
import {
  isValidEmail,
  validatePassword,
  isValidPhone,
  isValidName,
  isValidDateOfBirth,
  doPasswordsMatch,
  COUNTRY_PHONE_RULES,
} from '@shared/auth/auth-utils';

// Design tokens
const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  errorDark: '#DC2626',
  success: '#16A34A',
  successLight: '#F0FDF4',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  inputBorder: '#CBD5E1',
  inputFocus: '#2563EB',
};

/** Field-level error state */
interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  countryCode?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  password?: string;
  confirmPassword?: string;
  captcha?: string;
}

/** Turnstile HTML for WebView */
const getTurnstileHtml = (siteKey: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 8px; display: flex; justify-content: center; background: transparent; }
  </style>
</head>
<body>
  <div id="turnstile-container"></div>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      var interval = setInterval(function() {
        if (window.turnstile) {
          clearInterval(interval);
          window.turnstile.render('#turnstile-container', {
            sitekey: '${siteKey}',
            callback: function(token) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', token: token }));
            },
            'expired-callback': function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expired' }));
            },
            'error-callback': function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
            },
            theme: 'light'
          });
        }
      }, 100);
    });
  </script>
</body>
</html>
`;

export const RegisterForm: React.FC = () => {
  const { signUp, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+966'); // Default Saudi Arabia
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Captcha state
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  // UI state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  /** Clear specific field error */
  const clearFieldError = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setGlobalError(null);
  }, []);

  /** Handle Turnstile WebView messages */
  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'token') {
        setCaptchaToken(data.token);
        setFieldErrors((prev) => ({ ...prev, captcha: undefined }));
      } else {
        setCaptchaToken(null);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  /** Validate DOB string in YYYY-MM-DD format */
  const handleDobChange = useCallback((text: string) => {
    // Auto-format: add dashes as user types
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }
    if (cleaned.length > 6) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    }
    setDateOfBirth(formatted);
    clearFieldError('dateOfBirth');
  }, [clearFieldError]);

  /** Validate all fields */
  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    // First name
    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    } else {
      const firstNameValidation = isValidName(firstName);
      if (!firstNameValidation.valid) {
        errors.firstName = firstNameValidation.error;
      }
    }

    // Last name
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else {
      const lastNameValidation = isValidName(lastName);
      if (!lastNameValidation.valid) {
        errors.lastName = lastNameValidation.error;
      }
    }

    // Email
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email';
    }

    // Country code
    if (!countryCode) {
      errors.countryCode = 'Country code is required';
    }

    // Phone
    if (!phone.trim()) {
      errors.phone = 'Phone number is required';
    } else {
      const phoneValidation = isValidPhone(countryCode, phone);
      if (!phoneValidation.valid) {
        errors.phone = phoneValidation.error;
      }
    }

    if (!dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      const dobValidation = isValidDateOfBirth(dateOfBirth);
      if (!dobValidation.valid) {
        errors.dateOfBirth = dobValidation.error;
      }
    }

    if (!gender) {
      errors.gender = 'Please select a gender';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else {
      const pv = validatePassword(password);
      if (!pv.valid) errors.password = pv.error;
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (!doPasswordsMatch(password, confirmPassword)) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!captchaToken) {
      errors.captcha = 'Complete the CAPTCHA verification';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /** Handle submission */
  const handleSubmit = async () => {
    setGlobalError(null);
    if (!validateForm()) return;

    const result = await signUp({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      countryCode,
      phone: phone.trim(),
      dateOfBirth,
      gender: gender as Gender,
      password,
      captchaToken: captchaToken!,
    });

    if (result.success) {
      Alert.alert(
        'Account Created!',
        result.message || 'Please check your email to confirm your account.',
        [{ text: 'Go to Login', onPress: () => router.replace('/(auth)/login') }],
      );
    } else {
      setGlobalError(result.message || 'Registration failed. Please try again.');
      setCaptchaToken(null);
    }
  };

  /** Get label for selected gender */
  const genderLabel = gender
    ? GENDER_OPTIONS.find((g) => g.value === gender)?.label || ''
    : '';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🏥</Text>
          </View>
          <Text style={styles.appName}>Aethea</Text>
          <Text style={styles.tagline}>Create Your Account</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Global Error */}
          {globalError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{globalError}</Text>
            </View>
          )}

          {/* Name Row */}
          <View style={styles.row}>
            {/* First Name */}
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'firstName' && styles.inputFocused,
                  fieldErrors.firstName && styles.inputError,
                ]}
                value={firstName}
                onChangeText={(t) => { setFirstName(t); clearFieldError('firstName'); }}
                onFocus={() => setFocusedField('firstName')}
                onBlur={() => setFocusedField(null)}
                placeholder="John"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
                editable={!loading}
              />
              {fieldErrors.firstName && <Text style={styles.fieldError}>{fieldErrors.firstName}</Text>}
            </View>

            {/* Last Name */}
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'lastName' && styles.inputFocused,
                  fieldErrors.lastName && styles.inputError,
                ]}
                value={lastName}
                onChangeText={(t) => { setLastName(t); clearFieldError('lastName'); }}
                onFocus={() => setFocusedField('lastName')}
                onBlur={() => setFocusedField(null)}
                placeholder="Doe"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                autoComplete="family-name"
                textContentType="familyName"
                editable={!loading}
              />
              {fieldErrors.lastName && <Text style={styles.fieldError}>{fieldErrors.lastName}</Text>}
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === 'email' && styles.inputFocused,
                fieldErrors.email && styles.inputError,
              ]}
              value={email}
              onChangeText={(t) => { setEmail(t); clearFieldError('email'); }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!loading}
            />
            {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
          </View>

          {/* Phone */}
          <View style={styles.inputRow}>
            {/* Country Code Picker */}
            <View style={[styles.inputGroup, { flex: 0.4 }]}>
              <Text style={styles.label}>Code</Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.pickerButton,
                  fieldErrors.countryCode && styles.inputError,
                ]}
                onPress={() => setShowCountryPicker(true)}
                disabled={loading}
              >
                <Text style={[styles.pickerText, countryCode ? styles.pickerTextSelected : {}]}>
                  {countryCode || 'Select'}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>
              {fieldErrors.countryCode && <Text style={styles.fieldError}>{fieldErrors.countryCode}</Text>}
            </View>

            {/* Phone Number */}
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'phone' && styles.inputFocused,
                  fieldErrors.phone && styles.inputError,
                ]}
                value={phone}
                onChangeText={(t) => { setPhone(t); clearFieldError('phone'); }}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                placeholder="5XX XXX XXXX"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                editable={!loading}
              />
              {fieldErrors.phone && <Text style={styles.fieldError}>{fieldErrors.phone}</Text>}
            </View>
          </View>

          {/* Date of Birth */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === 'dob' && styles.inputFocused,
                fieldErrors.dateOfBirth && styles.inputError,
              ]}
              value={dateOfBirth}
              onChangeText={handleDobChange}
              onFocus={() => setFocusedField('dob')}
              onBlur={() => setFocusedField(null)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={10}
              editable={!loading}
            />
            {fieldErrors.dateOfBirth && <Text style={styles.fieldError}>{fieldErrors.dateOfBirth}</Text>}
          </View>

          {/* Gender Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <TouchableOpacity
              style={[
                styles.input,
                styles.pickerButton,
                fieldErrors.gender && styles.inputError,
              ]}
              onPress={() => setShowGenderPicker(true)}
              disabled={loading}
            >
              <Text style={[styles.pickerText, gender ? styles.pickerTextSelected : {}]}>
                {genderLabel || 'Select gender'}
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
            {fieldErrors.gender && <Text style={styles.fieldError}>{fieldErrors.gender}</Text>}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                <Text style={styles.togglePassword}>{showPassword ? '🙈 Hide' : '👁️ Show'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                styles.input,
                focusedField === 'password' && styles.inputFocused,
                fieldErrors.password && styles.inputError,
              ]}
              value={password}
              onChangeText={(t) => { setPassword(t); clearFieldError('password'); }}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!loading}
            />
            {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Confirm Password</Text>
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} disabled={loading}>
                <Text style={styles.togglePassword}>{showConfirmPassword ? '🙈 Hide' : '👁️ Show'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                styles.input,
                focusedField === 'confirmPassword' && styles.inputFocused,
                fieldErrors.confirmPassword && styles.inputError,
              ]}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); clearFieldError('confirmPassword'); }}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
              placeholder="Re-enter your password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!loading}
            />
            {fieldErrors.confirmPassword && (
              <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>
            )}
          </View>

          {/* Turnstile CAPTCHA via WebView */}
          <View style={styles.captchaContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: getTurnstileHtml(TURNSTILE_CONFIG.SITE_KEY) }}
              style={styles.captchaWebView}
              scrollEnabled={false}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
              originWhitelist={['*']}
            />
            {captchaToken && <Text style={styles.captchaSuccess}>✓ Verified</Text>}
            {fieldErrors.captcha && <Text style={styles.fieldError}>{fieldErrors.captcha}</Text>}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={styles.signinContainer}>
            <Text style={styles.signinText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} disabled={loading}>
              <Text style={styles.signinLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Country Code Picker Modal */}
      {showCountryPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Country Code</Text>
            <ScrollView style={styles.modalScroll}>
              {Object.entries(COUNTRY_PHONE_RULES).map(([country, rule]) => (
                <TouchableOpacity
                  key={rule.code}
                  style={styles.modalOption}
                  onPress={() => {
                    setCountryCode(rule.code);
                    setShowCountryPicker(false);
                    clearFieldError('countryCode');
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    {rule.code} - {country}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowCountryPicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Gender Picker Modal (existing) */}
      {showGenderPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.modalOption}
                onPress={() => {
                  setGender(option.value);
                  setShowGenderPicker(false);
                  clearFieldError('gender');
                }}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowGenderPicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 32,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  errorContainer: {
    backgroundColor: colors.errorLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  errorText: {
    color: colors.errorDark,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  togglePassword: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.inputFocus,
    borderWidth: 2,
    backgroundColor: colors.primaryLight,
  },
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    fontSize: 11,
    color: colors.errorDark,
    marginTop: 4,
    fontWeight: '500',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  pickerTextSelected: {
    color: colors.textPrimary,
  },
  pickerArrow: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  captchaContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  captchaWebView: {
    width: 310,
    height: 80,
    backgroundColor: 'transparent',
  },
  captchaSuccess: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
    marginTop: 4,
  },
  button: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signinText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  signinLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  modalClose: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
