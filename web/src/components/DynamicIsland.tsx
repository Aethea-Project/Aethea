import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { useAiUpload } from '../contexts/AiUploadContext';
import { NotificationToggle, NotificationContent } from './NotificationCenter';
import { ProfileToggle, ProfileContent } from './ProfileDropdown';
import { MenuIcon } from './Icons';

interface DynamicIslandProps {
  isMobileOpen: boolean;
  onMobileToggle: () => void;
  
}

type ActivePanel = 'none' | 'profile' | 'notifications';
type AnimationPhase =
  | 'compact'
  | 'expandingWidth'
  | 'expandingHeight'
  | 'expanded'
  | 'collapsingHeight'
  | 'collapsingWidth';

const COMPACT_WIDTH = 160;
const ISLAND_WIDTH = 320;
const COMPACT_HEIGHT = 48;
const PROFILE_HEIGHT = 330;
const NOTIFICATIONS_HEIGHT = 330;
const COMPACT_FADE_DURATION = 0.045;
const PANEL_FADE_DURATION = 0.055;
const PANEL_CLOSE_FADE_MS = 24;
const COMPACT_RESIZE_TRANSITION = { duration: 0.1, ease: "easeOut" } as const;
const OPEN_WIDTH_TRANSITION = { duration: 0.09, ease: "easeOut" } as const;
const OPEN_HEIGHT_TRANSITION = { duration: 0.115, ease: "easeOut" } as const;
const CLOSE_HEIGHT_TRANSITION = { duration: 0.105, ease: "easeOut" } as const;
const CLOSE_WIDTH_TRANSITION = { duration: 0.08, ease: "easeOut" } as const;

export const DynamicIsland: React.FC<DynamicIslandProps> = ({ isMobileOpen, onMobileToggle }) => {
  const [customNotification, setCustomNotification] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [visiblePanel, setVisiblePanel] = useState<Exclude<ActivePanel, 'none'> | null>(null);
  const [phase, setPhase] = useState<AnimationPhase>('compact');
  const containerRef = useRef<HTMLDivElement>(null);
  const isTransitioningRef = useRef(false);
  const shellControls = useAnimationControls();
  const location = useLocation();
  const { isUploading, status, elapsedSeconds } = useAiUpload();

  // Listen for custom notifications
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const handleNotify = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; duration?: number }>;
      const { message, duration = 4000 } = customEvent.detail;
      setCustomNotification(message);
      
      if (timer) {
        clearTimeout(timer);
      }
      
      timer = setTimeout(() => {
        setCustomNotification(null);
      }, duration);
    };

    window.addEventListener('dynamic-island-notify', handleNotify);
    return () => {
      window.removeEventListener('dynamic-island-notify', handleNotify);
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  const getStatusText = () => {
    if (status === 'starting' || status === 'downloaded' || status === 'analyzing' || status === 'extracting') {
      return 'Working...';
    }
    if (status === 'saving') {
      return 'Almost done...';
    }
    return 'Analyzing...';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showUploadProgress = isUploading && location.pathname !== '/lab-results';
  
  // Calculate dynamic dimensions based on state
  const hasSystemMessage = !!customNotification || showUploadProgress;
  const compactTargetWidth = hasSystemMessage ? ISLAND_WIDTH : COMPACT_WIDTH;
  const isPanelOpen = activePanel !== 'none' || visiblePanel !== null || phase !== 'compact';
  const compactVisible = phase === 'compact' || phase === 'expandingWidth' || phase === 'collapsingWidth';
  const panelContentVisible = visiblePanel !== null && (phase === 'expanded' || phase === 'collapsingHeight');
  const targetPanelHeight = (panel: Exclude<ActivePanel, 'none'>) =>
    panel === 'notifications' ? NOTIFICATIONS_HEIGHT : PROFILE_HEIGHT;

  useEffect(() => {
    if (isPanelOpen || isTransitioningRef.current) return;

    void shellControls.start({
      width: compactTargetWidth,
      height: COMPACT_HEIGHT,
      borderRadius: 9999,
      transition: COMPACT_RESIZE_TRANSITION,
    });
  }, [compactTargetWidth, isPanelOpen, shellControls]);

  const closePanel = useCallback(async () => {
    if (isTransitioningRef.current || activePanel === 'none') return;

    isTransitioningRef.current = true;
    setPhase('collapsingHeight');
    setActivePanel('none');

    await new Promise((resolve) => window.setTimeout(resolve, PANEL_CLOSE_FADE_MS));
    setVisiblePanel(null);

    await shellControls.start({
      width: ISLAND_WIDTH,
      height: COMPACT_HEIGHT,
      borderRadius: 24,
      transition: CLOSE_HEIGHT_TRANSITION,
    });

    shellControls.set({
      width: ISLAND_WIDTH,
      height: COMPACT_HEIGHT,
      borderRadius: 9999,
    });

    setPhase('collapsingWidth');
    await shellControls.start({
      width: compactTargetWidth,
      height: COMPACT_HEIGHT,
      borderRadius: 9999,
      transition: CLOSE_WIDTH_TRANSITION,
    });

    setPhase('compact');
    isTransitioningRef.current = false;
  }, [activePanel, compactTargetWidth, shellControls]);

  const openPanel = useCallback(async (panel: Exclude<ActivePanel, 'none'>) => {
    if (isTransitioningRef.current) return;
    if (activePanel === panel) {
      await closePanel();
      return;
    }

    if (activePanel !== 'none') {
      await closePanel();
      if (isTransitioningRef.current) return;
    }

    isTransitioningRef.current = true;
    setActivePanel(panel);
    setVisiblePanel(null);
    setPhase('expandingWidth');

    await shellControls.start({
      width: ISLAND_WIDTH,
      height: COMPACT_HEIGHT,
      borderRadius: 9999,
      transition: OPEN_WIDTH_TRANSITION,
    });

    shellControls.set({
      width: ISLAND_WIDTH,
      height: COMPACT_HEIGHT,
      borderRadius: 24,
    });

    setPhase('expandingHeight');
    await shellControls.start({
      width: ISLAND_WIDTH,
      height: targetPanelHeight(panel),
      borderRadius: 24,
      transition: OPEN_HEIGHT_TRANSITION,
    });

    setVisiblePanel(panel);
    setPhase('expanded');
    isTransitioningRef.current = false;
  }, [activePanel, closePanel, shellControls]);

  // Handle click outside to close panels
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        void closePanel();
      }
    };
    if (activePanel !== 'none') {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activePanel, closePanel]);

  // Hologram Anchor: fixed h-12 height to prevent page push, relative positioning to anchor the absolute island
  return (
    <div className="sticky top-4 z-40 mx-auto flex justify-center mb-6 h-12 relative w-full">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
        <motion.div
          ref={containerRef}
          style={{ transformOrigin: "top center" }}
          className="pointer-events-auto relative overflow-hidden bg-surface-card shadow-sm border border-sand-200"
          initial={{
            width: compactTargetWidth,
            height: COMPACT_HEIGHT,
            borderRadius: 9999,
          }}
          animate={shellControls}
        >
          <AnimatePresence initial={false}>
            {compactVisible ? (
              <motion.div
                key="compact-view"
                initial={{ opacity: 0, scale: 0.98, filter: "blur(3px)" }}
                animate={{ opacity: phase === 'expandingWidth' ? 0 : 1, scale: phase === 'expandingWidth' ? 0.96 : 1, filter: phase === 'expandingWidth' ? "blur(3px)" : "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.98, filter: "blur(3px)" }}
                transition={{ duration: COMPACT_FADE_DURATION, ease: "easeOut" }}
                className="absolute inset-0 flex h-12 items-center justify-center gap-4 px-4 py-1.5"
              >
                {/* Custom Notification State */}
                {customNotification && (
                  <motion.div className="absolute left-6 right-28 flex min-w-0 items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="truncate text-sm font-bold text-sand-900">{customNotification}</span>
                  </motion.div>
                )}

                {/* Upload Progress Fallback */}
                {showUploadProgress && !customNotification && (
                  <motion.div className="absolute left-6 right-28 flex min-w-0 items-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand-50 text-olive-600 relative overflow-hidden">
                      <div className="absolute inset-0 border-2 border-aethea-200 border-t-olive-600 animate-spin rounded-full" />
                      <svg className="w-3.5 h-3.5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-bold text-sand-900 whitespace-nowrap">{getStatusText()}</span>
                      <span className="text-[10px] font-medium text-sand-500 leading-none">{formatTime(elapsedSeconds)} elapsed</span>
                    </div>
                  </motion.div>
                )}

                {/* Default Persistent Icons */}
                <motion.div className={`flex items-center gap-3 shrink-0 ${hasSystemMessage ? 'absolute right-6' : ''}`}>
                  <button
                    className={`inline-flex h-8 w-8 items-center justify-center text-sand-500 hover:bg-sand-50 hover:text-sand-700 transition-colors lg:hidden ${'rounded-full'}`}
                    onClick={onMobileToggle}
                    aria-label={isMobileOpen ? "Close menu" : "Open menu"}
                    aria-expanded={isMobileOpen}
                  >
                    <MenuIcon aria-hidden="true" className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3">
                    <NotificationToggle 
                      isActive={false} 
                      onClick={() => void openPanel('notifications')} 
                    />
                    <ProfileToggle 
                      isActive={false} 
                      onClick={() => void openPanel('profile')} 
                    />
                  </div>
                </motion.div>
              </motion.div>
            ) : null}

            {panelContentVisible ? (
              <motion.div
                key="expanded-view"
                initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                transition={{ duration: PANEL_FADE_DURATION, ease: "easeOut" }}
                className="absolute inset-0 w-[320px]"
              >
                {visiblePanel === 'notifications' && <NotificationContent onDismiss={() => void closePanel()} />}
                {visiblePanel === 'profile' && <ProfileContent onDismiss={() => void closePanel()} />}
              </motion.div>
            ) : null}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
};
