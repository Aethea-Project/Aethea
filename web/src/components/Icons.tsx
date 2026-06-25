import React from 'react';

export const DashboardIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  // 4-square grid Icon
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const LabIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  // Erlenmeyer Flask Icon
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3H15" />
    <path d="M12 3V12" />
    <path d="M10 3V9" />
    <path d="M14 3V9" />
    <path d="M10 9L6.5 15.5C5.8 16.8 6.5 18.5 8 19H16C17.5 18.5 18.2 16.8 17.5 15.5L14 9" />
    <path d="M7 16H17" />
  </svg>
);

export const DoctorIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  // Stethoscope Icon (Doctor)
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 15v2h2v-2h2v-2h-2v-2h-2v2H9v2h2z" />
    <path d="M5.5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1.5" />
    <path d="M16 21v-4H8v4h8z" />
  </svg>
);

export const ScanIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  // Picture/Mountain Icon
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

export const MedicineIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  // Pill Capsule Icon
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.5 7.5L7.5 16.5C6.1 17.9 3.9 17.9 2.5 16.5C1.1 15.1 1.1 12.9 2.5 11.5L11.5 2.5C12.9 1.1 15.1 1.1 16.5 2.5C17.9 3.9 17.9 6.1 16.5 7.5Z" />
    <line x1="7.5" y1="7.5" x2="16.5" y2="16.5" />
  </svg>
);

export const LocationIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  // Map Pin Icon
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const ProfileIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  // Stethoscope Icon (Book a Doctor)
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 15v2h2v-2h2v-2h-2v-2h-2v2H9v2h2z" />
    <path d="M5.5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1.5" />
    <path d="M16 21v-4H8v4h8z" />
  </svg>
);

export const CalendarIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  // Calendar Icon
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const QueueIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  // Ordered list / queue icon
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="4" cy="6" r="1" fill="currentColor" />
    <circle cx="4" cy="12" r="1" fill="currentColor" />
    <circle cx="4" cy="18" r="1" fill="currentColor" />
  </svg>
);

export const FeedbackIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  // Star-in-chat-bubble icon for feedback/reviews
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    <path d="M12 7l1.12 2.27 2.5.36-1.81 1.77.43 2.5L12 12.77 9.76 13.9l.43-2.5L8.38 9.63l2.5-.36L12 7z" />
  </svg>
);

export const MenuIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="12" x2="20" y2="12"></line>
    <line x1="4" y1="6" x2="20" y2="6"></line>
    <line x1="4" y1="18" x2="20" y2="18"></line>
  </svg>
);

export const AetheaLogoIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  // Ankh Icon
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4"></circle>
    <path d="M12 11v11" />
    <path d="M8 15h8" />
  </svg>
);

export const CloseIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const PencilIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

export const TrashIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const CheckIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const AlertTriangleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const PinIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const SendIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
