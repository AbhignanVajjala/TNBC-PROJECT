import { ThemeSwitcher } from './ThemeSwitcher';
import React from 'react';
import { BookOpen, FlaskConical, ChevronLeft } from 'lucide-react';
import { PerspectiveMode, ScreenMode } from '../types';
import { useScienceApiStatus } from '../hooks/useScienceApiStatus';

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
  const apiStatus = useScienceApiStatus();
  const healthLabel = {
    connecting: 'Science API Connecting',
    available: 'Science API Online',
    'temporary-unavailable': 'Science API Retrying',
    unavailable: 'Science API Unavailable',
  }[apiStatus];
  const healthDescription = {
    connecting: 'Connecting to the scientific API. Structure loading is verified separately.',
    available: 'Scientific API reachable. Each molecular structure is checked separately.',
    'temporary-unavailable': 'A scientific API check did not complete. Retrying automatically.',
    unavailable: 'Three consecutive scientific API checks failed. Recovery checks continue automatically.',
  }[apiStatus];
  return (
    <header className="app-header relative z-20 border-b border-forest/10 bg-cream/80 backdrop-blur-sm sticky top-0 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand and Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-3.5">
          {screenMode === 'analysis' && (
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center text-xs font-sans font-medium text-[var(--forest-ink)] hover:text-[var(--deep-forest-ink)] px-2.5 py-1 rounded bg-cream-secondary border border-forest/15 hover:border-forest/30 transition-all gap-1 mr-1 cursor-pointer"
              title="Return to Target Selector"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Target Selector</span>
            </button>
          )}

          <button
            onClick={onNavigateHome}
            className="text-xl tracking-tight text-[var(--deep-forest-ink)] font-editorial font-medium hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0 text-left"
          >
            EXO-TARGET
          </button>

          <span className="text-xs uppercase tracking-wider text-ink-subtle font-sans font-medium">
            / TNBC Target Prioritization
          </span>

          {screenMode === 'analysis' && receptorTarget && ligandTarget && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-forest/10 text-[var(--forest-ink)] border border-forest/20">
              <span>{receptorTarget}</span>
              <span className="text-[var(--forest-ink)]/60">×</span>
              <span>{ligandTarget}</span>
            </span>
          )}
        </div>

        {/* Backend API Status & Audience-Adaptive Perspective Segmented Toggle */}
        <div className="header-controls flex flex-wrap items-center gap-3">
          <div
            className="api-status hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono-code border bg-cream-secondary/70 border-forest/15 select-none"
            title={healthDescription}
            role="status"
            aria-live="polite"
            data-status={apiStatus}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                apiStatus === 'available' ? 'bg-emerald-600' : apiStatus === 'unavailable' ? 'bg-gray-400' : 'bg-amber-500'
              }`}
            />
            <span className="text-[var(--forest-ink)]/80 font-medium">
              {healthLabel}
            </span>
          </div>

          <span className="text-[11px] uppercase tracking-wider text-ink-subtle font-sans font-semibold hidden md:inline-block mr-1">
            Perspective:
          </span>
          <div
            aria-label="Audience perspective mode"
            className="perspective-switch inline-flex items-center p-1 bg-cream-secondary border border-forest/15 rounded-full shadow-inner text-xs font-sans font-medium"
            role="group"
          >
            <button
              onClick={() => onPerspectiveChange('primer')}
              aria-pressed={perspective === 'primer'}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                perspective === 'primer'
                  ? 'bg-forest text-white shadow-sm'
                  : 'text-ink-muted hover:text-[var(--deep-forest-ink)]'
              }`}
              type="button"
            >
              <BookOpen className="w-3.5 h-3.5 opacity-90" />
              <span>Foundations & Primer</span>
            </button>

            <button
              onClick={() => onPerspectiveChange('deep')}
              aria-pressed={perspective === 'deep'}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                perspective === 'deep'
                  ? 'bg-forest text-white shadow-sm'
                  : 'text-ink-muted hover:text-[var(--deep-forest-ink)]'
              }`}
              type="button"
            >
              <FlaskConical className="w-3.5 h-3.5 opacity-80" />
              <span>Deep Biocomputation</span>
            </button>
          </div>
          <ThemeSwitcher/>
        </div>
      </div>
    </header>
  );
};
