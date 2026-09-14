import React, { useState, useEffect } from 'react';
import { BookOpen, FlaskConical, ChevronLeft, Server } from 'lucide-react';
import { PerspectiveMode, ScreenMode } from '../types';
import { checkBackendHealth, BackendHealthResponse } from '../services/api';

interface HeaderProps {
  perspective: PerspectiveMode;
  onPerspectiveChange: (mode: PerspectiveMode) => void;
  screenMode: ScreenMode;
  onNavigateHome: () => void;
  receptorTarget?: string;
  ligandTarget?: string;
}

export const Header: React.FC<HeaderProps> = ({
  perspective,
  onPerspectiveChange,
  screenMode,
  onNavigateHome,
  receptorTarget,
  ligandTarget,
}) => {
  const [backendStatus, setBackendStatus] = useState<BackendHealthResponse | null>(null);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const testHealth = async () => {
      const data = await checkBackendHealth();
      if (isMounted) {
        setBackendStatus(data);
        setIsCheckingBackend(false);
      }
    };
    testHealth();
    const interval = setInterval(testHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);
  return (
    <header className="relative z-20 border-b border-forest/10 bg-cream/80 backdrop-blur-sm sticky top-0 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand and Breadcrumbs */}
        <div className="flex items-center space-x-3.5">
          {screenMode === 'analysis' && (
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center text-xs font-sans font-medium text-forest hover:text-deep-forest px-2.5 py-1 rounded bg-cream-secondary border border-forest/15 hover:border-forest/30 transition-all gap-1 mr-1 cursor-pointer"
              title="Return to Target Selector"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Target Selector</span>
            </button>
          )}

          <button
            onClick={onNavigateHome}
            className="text-xl tracking-tight text-deep-forest font-editorial font-medium hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0 text-left"
          >
            EXO-TARGET
          </button>

          <span className="text-xs uppercase tracking-wider text-ink-subtle font-sans font-medium">
            / TNBC Target Prioritization
          </span>

          {screenMode === 'analysis' && receptorTarget && ligandTarget && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-forest/10 text-forest border border-forest/20">
              <span>{receptorTarget}</span>
              <span className="text-forest/60">×</span>
              <span>{ligandTarget}</span>
            </span>
          )}
        </div>

        {/* Backend API Status & Audience-Adaptive Perspective Segmented Toggle */}
        <div className="flex items-center space-x-3">
          <div
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono-code border bg-cream-secondary/70 border-forest/15 select-none"
            title={
              backendStatus
                ? `Backend: Online (Port 3000) | Gemini: ${backendStatus.geminiConfigured ? 'Configured' : 'Local Fallback'}`
                : isCheckingBackend
                ? 'Connecting to backend API service...'
                : 'Backend: Client Mode'
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                backendStatus ? 'bg-emerald-600 animate-pulse' : isCheckingBackend ? 'bg-amber-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-forest/80 font-medium">
              {backendStatus ? 'API Online' : isCheckingBackend ? 'API Ping...' : 'API Standby'}
            </span>
          </div>

          <span className="text-[11px] uppercase tracking-wider text-ink-subtle font-sans font-semibold hidden md:inline-block mr-1">
            Perspective:
          </span>
          <div
            aria-label="Audience perspective mode"
            className="inline-flex items-center p-1 bg-cream-secondary border border-forest/15 rounded-full shadow-inner text-xs font-sans font-medium"
            role="tablist"
          >
            <button
              onClick={() => onPerspectiveChange('primer')}
              aria-selected={perspective === 'primer'}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                perspective === 'primer'
                  ? 'bg-forest text-white shadow-sm'
                  : 'text-ink-muted hover:text-deep-forest'
              }`}
              role="tab"
              type="button"
            >
              <BookOpen className="w-3.5 h-3.5 opacity-90" />
              <span>Foundations & Primer</span>
            </button>

            <button
              onClick={() => onPerspectiveChange('deep')}
              aria-selected={perspective === 'deep'}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                perspective === 'deep'
                  ? 'bg-forest text-white shadow-sm'
                  : 'text-ink-muted hover:text-deep-forest'
              }`}
              role="tab"
              type="button"
            >
              <FlaskConical className="w-3.5 h-3.5 opacity-80" />
              <span>Deep Biocomputation</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
