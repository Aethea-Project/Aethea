import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStaffSchema, type CreateStaffInput } from '../../lib/validations/admin';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Label } from '../../components/ui/Label';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

interface CreateStaffFormProps {
  onSubmit: (data: CreateStaffInput) => Promise<void>;
  submitting: boolean;
}

export const CreateStaffForm: React.FC<CreateStaffFormProps> = React.memo(({ onSubmit, submitting }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateStaffInput>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      email: '',
      accountType: 'doctor',
      firstName: '',
      lastName: '',
    },
  });

  const handleFormSubmit = async (data: CreateStaffInput) => {
    try {
      await onSubmit(data);
      reset(); // Reset form values on success
    } catch {
      // The parent component handles setting global errors or notifying
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold text-sand-500 uppercase tracking-wider font-sans">
          Create Staff Account
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="staff@aethea.com"
              disabled={submitting}
              error={!!errors.email}
              aria-invalid={errors.email ? 'true' : 'false'}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs font-medium text-amber-600 mt-1">{errors.email.message}</p>
            )}
          </div>



          {/* Account Type */}
          <div className="space-y-1.5">
            <Label htmlFor="accountType">Account Type</Label>
            <Select
              id="accountType"
              disabled={submitting}
              error={!!errors.accountType}
              aria-invalid={errors.accountType ? 'true' : 'false'}
              {...register('accountType')}
            >
              <option value="doctor">Doctor</option>
              <option value="pharmacist">Pharmacist</option>
            </Select>
            {errors.accountType && (
              <p className="text-xs font-medium text-amber-600 mt-1">{errors.accountType.message}</p>
            )}
          </div>

          {/* First Name */}
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Jane"
              disabled={submitting}
              error={!!errors.firstName}
              aria-invalid={errors.firstName ? 'true' : 'false'}
              {...register('firstName')}
            />
            {errors.firstName && (
              <p className="text-xs font-medium text-amber-600 mt-1">{errors.firstName.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              disabled={submitting}
              error={!!errors.lastName}
              aria-invalid={errors.lastName ? 'true' : 'false'}
              {...register('lastName')}
            />
            {errors.lastName && (
              <p className="text-xs font-medium text-amber-600 mt-1">{errors.lastName.message}</p>
            )}
          </div>

          {/* Submit button row */}
          <div className="sm:col-span-2 flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="px-6"
            >
              {submitting ? 'Creating...' : 'Create Staff'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});
