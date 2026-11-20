import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FilePlus2,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Microscope,
  RefreshCw,
  Server,
  ShieldCheck,
  X,
} from 'lucide-react';
import { fastApiClient } from '../services/fastApiClient';
import { setActiveDraftId } from '../services/caseStorageService';
import { FastApiServiceHealth } from '../types/clinical';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    to: '/new-analysis',
    label: 'New Analysis',
    icon: FilePlus2,
  },
  {
    to: '/analysis-results',
    label: 'Analysis Results',
    icon: Microscope,
  },
  {
    to: '/case-library',
    label: 'Case Library',
    icon: FolderKanban,
  },
  {
    to: '/research-reports',
    label: 'Research Reports',
    icon: BookOpen,
  },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiHealth, setApiHealth] = useState<FastApiServiceHealth | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [safetyNoticeExpanded, setSafetyNoticeExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const runHealthProbe = async () => {
    setCheckingHealth(true);
    try {
      const result = await fastApiClient.checkHealth();
      setApiHealth(result);
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    void runHealthProbe();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const currentNav =
    NAV_ITEMS.find((item) =>
      item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
    ) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden backdrop-blur-2xs"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-white text-sm">
                  GLAUCO-MIMIC AI
                </span>
                <span className="text-[10px] font-mono px-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Clinical Research UI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Đóng menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Cohorts Summary Pill */}
        <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/80">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            5 Nhóm Bệnh Mục Tiêu
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-teal-300">
              Glocom
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
              CON
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-rose-300">
              NAION
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">
              ON
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300">
              Healthy
            </span>
          </div>
        </div>

        {/* Navigation Links - Single line per item without subtitle */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto" aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* System Status & Scientific Integrity Footer - Compact with Progressive Disclosure */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/40 text-xs">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-amber-200">
            <button
              type="button"
              onClick={() => setSafetyNoticeExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between text-left font-semibold text-amber-300 text-[11px] cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>An toàn Nghiên cứu</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-amber-300/80">
                <span>{safetyNoticeExpanded ? 'Thu gọn' : 'Xem'}</span>
                {safetyNoticeExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </div>
            </button>
            {safetyNoticeExpanded && (
              <p className="text-[10px] text-amber-200/90 leading-relaxed mt-1.5 pt-1.5 border-t border-amber-500/20 animate-fadeIn">
                Mô hình AI đang kiểm định. Hệ thống không sinh xác suất chẩn đoán giả lập.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <Server className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">
                FastAPI: {apiHealth?.connected ? (apiHealth.engineState === 'INFERENCE_READY' ? 'Inference Ready' : 'Online') : 'Standalone'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void runHealthProbe()}
              disabled={checkingHealth}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-50 cursor-pointer"
              title="Kiểm tra kết nối FastAPI local"
            >
              <RefreshCw className={`w-3 h-3 ${checkingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold text-slate-900 truncate">
              {currentNav.label}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Dữ liệu nội bộ bảo mật</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveDraftId(null);
                navigate('/new-analysis', { state: { resetTs: Date.now() } });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Tạo ca mới</span>
            </button>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 sm:px-6 py-2.5 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>GLAUCO-MIMIC AI</strong> — Nghiên cứu phân biệt Glocom & Bệnh lý Thần kinh Thị giác (CON, NAION, ON, Healthy Control).
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Local Privacy Mode
          </div>
        </footer>
      </div>
    </div>
  );
};

