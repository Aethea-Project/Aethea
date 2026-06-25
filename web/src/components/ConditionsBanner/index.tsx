import React, { useState } from 'react';
import { useAuth } from '@core/auth/useAuth';
import { Modal } from '../Modal';
import { CONDITION_LABELS, PatientCondition, useConditions } from '../../hooks/useConditions';
import { cn } from '../../lib/utils';

export const ConditionsBanner: React.FC = () => {
  const { user } = useAuth();
  const { conditions, loading, saving, error, setConditions } = useConditions(!!user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localConditions, setLocalConditions] = useState<string[]>([]);

  const handleEditClick = () => {
    setLocalConditions(conditions);
    setIsModalOpen(true);
  };

  const toggleCondition = (key: string) => {
    setLocalConditions((prev) =>
      prev.includes(key) ? prev.filter((condition) => condition !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    try {
      await setConditions(localConditions);
      setIsModalOpen(false);
    } catch {
      // Error is surfaced through hook state.
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="relative my-4 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-5 border border-sand-200 rounded-lg bg-surface-card shadow-sm p-8 overflow-hidden">
        <div className="flex-1 w-full flex flex-col gap-3">
          <div className="font-serif text-2xl font-normal tracking-tight text-sand-900">Health Profile</div>
          <div className="text-sm font-medium text-sand-600 mb-1">Personalized safety checks based on your unique wellness journey.</div>

          {loading ? (
            <p className="m-0 text-sm text-sand-600">Loading profile...</p>
          ) : error ? (
            <p className="m-0 text-sm text-red-600">{error}</p>
          ) : conditions.length === 0 ? (
            <span className="inline-flex items-center rounded-full border border-sand-300 bg-sand-100/50 text-sand-500 px-4 py-1.5 text-xs font-semibold w-fit">
              No conditions set
            </span>
          ) : (
            <div className="flex flex-wrap gap-2" aria-label="Saved health conditions">
              {conditions.map((key) => {
                const label = CONDITION_LABELS[key as PatientCondition];
                if (!label) return null;

                return (
                  <span key={key} className="inline-flex items-center rounded-full border border-sand-200 bg-sand-50/60 text-sand-900 px-3 py-1.5 text-xs font-semibold">
                    {label.en}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleEditClick}
          disabled={loading || saving || !!error}
          className="w-full sm:w-auto rounded-lg bg-sand-900 text-white font-medium text-sm shadow-sm hover:bg-sand-900 transition-colors border border-transparent px-6 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        >
          Edit profile
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !saving && setIsModalOpen(false)}
        ariaLabel="Edit Health Profile"
        contentClassName="max-w-xl"
      >
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-lg font-bold text-sand-900">Edit health profile</h2>
            <p className="m-0 text-sm text-sand-600 leading-snug">
              Select the conditions we should use when checking medicines for safety.
            </p>
          </div>

          <div className="flex flex-col gap-3 max-h-[min(56vh,460px)] overflow-auto pr-1">
            {Object.entries(CONDITION_LABELS).map(([key, label]) => {
              const isSelected = localConditions.includes(key);

              return (
                <label
                  key={key}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 border rounded-lg bg-surface-card transition-colors cursor-pointer",
                    isSelected ? "bg-sand-50 border-aethea-200" : "border-sand-200",
                    saving && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCondition(key)}
                    disabled={saving}
                    className="w-4 h-4 accent-olive-600 shrink-0"
                  />
                  <span className="text-sm font-semibold text-sand-900">{label.en}</span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
              className="w-full sm:w-auto border border-sand-200 bg-surface-card text-sand-700 text-sm px-4 py-2 rounded-lg hover:bg-sand-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="w-full sm:w-auto bg-olive-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-sand-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed border border-transparent"
            >
              Save changes
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
