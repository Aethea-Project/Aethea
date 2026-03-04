/**
 * Shared Modal component
 *
 * Provides backdrop-click-to-close, stopPropagation on content,
 * accessibility attributes, and the common overlay + content shell
 * used across many pages.
 *
 * Pages keep their own CSS for `.modal-content` extensions (e.g. `.scan-modal`)
 * — pass extra classes via `contentClassName`.
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

  const contentCls = contentClassName
    ? `modal-content ${contentClassName}`
    : 'modal-content';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={contentCls}
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
