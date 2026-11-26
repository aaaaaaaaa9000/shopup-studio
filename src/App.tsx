import React, { useEffect, useRef } from 'react';
import { StudioProvider, useStudio } from './studio/StudioContext';
import { StudioOverlays } from './studio/Sheets';
import { TOOLS, toolInfo, type ToolId } from './studio/tools';
import { LogoutIcon, ToolIcon, TrayIcon } from './shared/icons';
import ExtractorTool from './tools/extractor/App';
import TryOnTool from './tools/tryon/App';
import ColoringTool from './tools/coloring/App';
import PosesTool from './tools/poses/App';
import ProductsTool from './tools/products/App';
import JpgTool from './tools/jpg/App';

const SECTIONS: Record<ToolId, React.FC> = {
  extractor: ExtractorTool,
  tryon: TryOnTool,
  coloring: ColoringTool,
  poses: PosesTool,
  products: ProductsTool,
  jpg: JpgTool,
};

function Shell() {
  const { active, setActive, tray, setTrayOpen } = useStudio();
  const info = toolInfo(active);
  const navRef = useRef<HTMLDivElement>(null);

  // Keep the open section's tab visible in the scrolling tab bar on phones.
  useEffect(() => {
    navRef.current?.querySelector(`[data-tool="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [active]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-cream-300/70 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-wine text-white shadow-card">
              <ToolIcon paths={info.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-lg font-extrabold">استوديو شوب اب</h1>
              <p className="truncate text-xs text-ink-muted">{info.subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setTrayOpen(true)}
              className="relative inline-flex h-10 items-center gap-2 rounded-2xl border border-cream-300 bg-white px-3 text-sm font-bold text-ink-soft shadow-card transition-colors hover:border-wine/40 hover:text-wine"
            >
              <TrayIcon className="h-5 w-5" />
              <span className="hidden sm:inline">صندوق الصور</span>
              {tray.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-wine px-1.5 text-[11px] font-bold text-white">
                  {tray.length}
                </span>
              )}
            </button>
            <a
              href="/logout"
              aria-label="خروج"
              title="خروج"
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-ink-muted transition-colors hover:bg-cream-200 hover:text-wine"
            >
              <LogoutIcon className="h-5 w-5 rtl:-scale-x-100" />
            </a>
          </div>
        </div>

        <nav aria-label="أقسام الاستوديو" className="mx-auto max-w-7xl px-4 pb-2.5 lg:px-8">
          <div ref={navRef} className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {TOOLS.map((t) => {
              const on = t.id === active;
              return (
                <button
                  key={t.id}
                  data-tool={t.id}
                  type="button"
                  onClick={() => setActive(t.id)}
                  aria-current={on ? 'page' : undefined}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition-colors ${
                    on ? 'bg-ink text-cream' : 'bg-white text-ink-soft shadow-card hover:text-ink'
                  }`}
                >
                  <ToolIcon paths={t.icon} className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Every section stays mounted, so its work isn't lost when switching tabs. */}
      {TOOLS.map((t) => {
        const Section = SECTIONS[t.id];
        return (
          <div key={t.id} hidden={t.id !== active}>
            <Section />
          </div>
        );
      })}

      <StudioOverlays />
    </div>
  );
}

export default function App() {
  return (
    <StudioProvider>
      <Shell />
    </StudioProvider>
  );
}
