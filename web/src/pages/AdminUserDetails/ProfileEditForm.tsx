import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminUpdateProfileSchema, type AdminUpdateProfileInput } from '../../lib/validations/admin';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Label } from '../../components/ui/Label';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

interface ProfileEditFormProps {
  initialData: AdminUpdateProfileInput;
  onSubmit: (data: AdminUpdateProfileInput) => Promise<void>;
  saving: boolean;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = React.memo(({
  initialData,
  onSubmit,
  saving,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AdminUpdateProfileInput>({
    resolver: zodResolver(adminUpdateProfileSchema),
    defaultValues: initialData,
  });

  // Keep form values in sync if user details finish loading asynchronously
  useEffect(() => {
    reset(initialData);
  }, [initialData, reset]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold text-sand-500 uppercase tracking-wider font-sans">
          Edit Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          {/* First Name */}
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Jane"
              disabled={saving}
              error={!!errors.firstName}
              aria-invalid={errors.firstName ? 'true' : 'false'}
              {...register('firstName')}
            />
            {errors.firstName && (
              <p className="text-xs font-medium text-amber-600 mt-1">{errors.firstName.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              disabled={saving}
              error={!!errors.lastName}
              aria-invalid={errors.lastName ? 'true' : 'false'}
              {...register('lastName')}
            />
            {errors.lastName && (
              <p className="text-xs font-medium text-amber-600 mt-1">{errors.lastName.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="01XXXXXXXXX"
              disabled={saving}
              error={!!errors.phone}
              aria-invalid={errors.phone ? 'true' : 'false'}
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-xs font-medium text-amber-600 mt-1">{errors.phone.message}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="sm:col-span-2 flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={saving || !isDirty}
              className="px-6"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});
