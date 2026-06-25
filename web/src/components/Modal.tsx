/**
 * Shared Modal component
 *
 * Provides backdrop-click-to-close, stopPropagation on content,
 * accessibility attributes, and the common overlay + content shell
 * used across many pages. Pass extra classes via `contentClassName`.
 */

import React, { useCallback, useEffect, type ReactNode } from 'react';

export interface ModalProps {
  /** Whether the modal is visible. */
  isOpen: boolean;
  /** Called when the user requests to close (backdrop click, Escape key). */
  onClose: () => void;
  /** Extra class(es) appended to `.modal-content`. */
  contentClassName?: string;
  /** Accessible label for the dialog. */
  ariaLabel?: string;
  /** ID of the element that labels the dialog. Overrides `ariaLabel`. */
  ariaLabelledBy?: string;
  children: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  contentClassName,
  ariaLabel,
  ariaLabelledBy,
  children,
}) => {
  /* ---- Close on Escape ---- */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const overlayCls =
    'modal-overlay fixed inset-0 z-50 flex items-start justify-center bg-sand-900/40 p-4 overflow-y-auto';

  const contentCls = contentClassName
    ? `modal-content w-full max-w-xl bg-surface-card border border-sand-200 rounded-lg shadow-sm ${contentClassName}`
    : 'modal-content w-full max-w-xl bg-surface-card border border-sand-200 rounded-lg shadow-sm';

  return (
    <div className={overlayCls} onClick={onClose}>
      <div
        className={`${contentCls} m-auto max-h-[calc(100dvh-2rem)] overflow-y-auto`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
