import React, { useState } from 'react';
import { useAuth } from '@core/auth/useAuth';
import { Modal } from '../Modal';
import { CONDITION_LABELS, PatientCondition, useConditions } from '../../hooks/useConditions';
import { cn } from '../../lib/cn';

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
      <div className="my-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 border border-gray-200 rounded-lg bg-white p-4">
          <div className="flex-1 w-full flex flex-col gap-2">
            <div className="text-sm font-bold text-gray-900">Health profile</div>

            {loading ? (
              <p className="m-0 text-sm text-gray-600">Loading profile...</p>
            ) : conditions.length === 0 ? (
              <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 px-3 py-1 text-xs font-semibold w-fit">
                No conditions set
              </span>
            ) : (
              <div className="flex flex-wrap gap-2" aria-label="Saved health conditions">
                {conditions.map((key) => {
                  const label = CONDITION_LABELS[key as PatientCondition];      
                  if (!label) return null;

                  return (
                    <span key={key} className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 px-2 py-1 text-xs font-semibold">
                      {label.en}
                    </span>
                  );
                })}
              </div>
            )}

            {error && <p className="m-0 text-xs text-red-700">{error}</p>}
          </div>

          <button
            type="button"
            onClick={handleEditClick}
            disabled={loading || saving}
            className="w-full sm:w-auto border border-gray-300 bg-white text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Edit profile
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !saving && setIsModalOpen(false)}
        ariaLabel="Edit Health Profile"
        contentClassName="max-w-xl"
      >
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-lg font-bold text-gray-900">Edit health profile</h2>
            <p className="m-0 text-sm text-gray-600 leading-snug">
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
                    "flex items-center gap-3 px-4 py-3 border rounded-xl bg-white transition-colors cursor-pointer",
                    isSelected ? "bg-teal-50 border-teal-200" : "border-gray-200",
                    saving && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCondition(key)}
                    disabled={saving}
                    className="w-4 h-4 accent-teal-600 shrink-0"
                  />
                  <span className="text-sm font-semibold text-gray-900">{label.en}</span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
              className="w-full sm:w-auto border border-gray-300 bg-white text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="w-full sm:w-auto bg-teal-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed border border-transparent"
            >
              Save changes
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
