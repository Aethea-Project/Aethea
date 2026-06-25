import React, { useState } from 'react';
import { AccountType } from '../../services/adminApi';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Label } from '../../components/ui/Label';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

interface AccountControlsProps {
  currentAccountType: AccountType;
  isSelfProfile: boolean;
  saving: boolean;
  onChangeAccountType: (nextType: AccountType) => Promise<void>;
  onSendResetLink: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

const accountTypes: AccountType[] = ['patient', 'doctor', 'pharmacist', 'admin'];

export const AccountControls: React.FC<AccountControlsProps> = React.memo(({
  currentAccountType,
  isSelfProfile,
  saving,
  onChangeAccountType,
  onSendResetLink,
  onDeleteAccount,
}) => {
  const [nextAccountType, setNextAccountType] = useState<AccountType>(currentAccountType);
  const [confirmingAction, setConfirmingAction] = useState<'reset' | 'delete' | null>(null);

  const handleResetLink = async () => {
    if (isSelfProfile) return;
    await onSendResetLink();
    setConfirmingAction(null);
  };

  const handleDelete = async () => {
    await onDeleteAccount();
    setConfirmingAction(null);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold text-sand-500 uppercase tracking-wider font-sans">
          Account Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Change Account Type */}
        <div className="flex flex-col sm:flex-row items-end gap-3 pb-6 border-b border-sand-100">
          <div className="flex-1 w-full space-y-1.5">
            <Label htmlFor="nextAccountType">Account Type</Label>
            <Select
              id="nextAccountType"
              value={nextAccountType}
              onChange={(e) => setNextAccountType(e.target.value as AccountType)}
              disabled={saving || isSelfProfile}
              className="h-10 text-sm"
            >
              {accountTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={saving || isSelfProfile || nextAccountType === currentAccountType}
            onClick={() => void onChangeAccountType(nextAccountType)}
            className="h-10 px-4 text-sm w-full sm:w-auto shrink-0"
          >
            Update Account Type
          </Button>
        </div>

        {/* Password and Reset Controls */}
        <div className="rounded-lg border border-sand-200/80 bg-surface p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-sand-900">Password Recovery</h3>
            <p className="text-xs text-sand-500">
              Send a secure password reset link to the user's email.
            </p>
          </div>
          <div className="flex flex-wrap justify-start gap-2 pt-2">
            {confirmingAction === 'reset' ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetLink}
                  disabled={saving}
                  className="h-9 px-4 text-xs font-sans border-sand-300 text-sand-800"
                >
                  Yes, Send Link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmingAction(null)}
                  disabled={saving}
                  className="h-9 px-4 text-xs font-sans"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={saving || isSelfProfile}
                onClick={() => setConfirmingAction('reset')}
                className="h-9 px-4 text-xs font-sans"
              >
                Send Reset Link
              </Button>
            )}
          </div>

          {isSelfProfile && (
            <p className="text-xs text-sand-500 font-sans text-center bg-sand-50/50 p-2.5 rounded-lg border border-sand-100">
              Note: For your own account, please use the standard password change flow in your personal settings page.
            </p>
          )}
        </div>

        {/* Delete Account Area */}
        <div className="rounded-lg border border-sand-200/80 bg-surface-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-sand-900 uppercase tracking-wide">Danger Zone</h4>
            <p className="text-xs text-sand-600 leading-relaxed">
              Permanently remove this account and all linked records. This action is irreversible.
            </p>
          </div>
          <div className="flex gap-2">
            {confirmingAction === 'delete' ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={saving}
                  className="border-sand-200 text-sand-900 text-xs h-9 hover:bg-sand-50 shrink-0 font-sans px-4"
                >
                  Yes, Delete
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmingAction(null)}
                  disabled={saving}
                  className="border-sand-200 text-sand-600 text-xs h-9 hover:bg-sand-50 shrink-0 font-sans px-4"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingAction('delete')}
                disabled={saving || isSelfProfile}
                className="border-sand-200 text-sand-900 text-xs h-9 hover:bg-sand-50 shrink-0 font-sans px-4"
              >
                Delete Account
              </Button>
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );
});
