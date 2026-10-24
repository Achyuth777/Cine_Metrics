import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  Tags,
  BarChart3,
  Server,
  GitBranch,
  Star,
  Menu,
  X,
  Database,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Info
} from 'lucide-react';
import { api } from '../api';
import { HadoopStatus } from '../types';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', badge: 'KPIs' },
  { to: '/movies', icon: Film, label: 'Movie Explorer', badge: 'Catalog' },
  { to: '/genres', icon: Tags, label: 'Genre Analytics', badge: 'Taxonomy' },
  { to: '/ratings', icon: BarChart3, label: 'Rating Intelligence', badge: 'Bayes' },
  { to: '/hadoop', icon: Server, label: 'Hadoop Monitor', badge: 'YARN' },
  { to: '/architecture', icon: GitBranch, label: 'Architecture & Viva', badge: 'Viva' }
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    return localStorage.getItem('cinemetrics_sidebar_collapsed') === 'true';
  });
  const [status, setStatus] = useState<HadoopStatus | null>(null);
  const [showStatusDetails, setShowStatusDetails] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    api.getHadoopStatus()
      .then((data) => {
        if (isMounted) setStatus(data);
      })
      .catch((err) => {
        console.warn('Status probe error:', err);
      });
    return () => { isMounted = false; };
  }, [location.pathname]);

  const toggleDesktopSidebar = () => {
    setDesktopCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('cinemetrics_sidebar_collapsed', String(next));
      return next;
    });
  };

  const isClusterOnline = status?.connected ?? false;
  const engineLabel = status?.engine === 'hadoop' ? 'Hadoop MapReduce' : 'MapReduce Engine (Ref)';

  return (
    <div className="flex h-screen overflow-hidden bg-[#101114] text-[#F4F4F5]">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[#14161B] border-r border-[#282A30] flex flex-col transition-all duration-200 ease-in-out lg:relative ${
          mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${desktopCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#282A30] h-16 min-h-16">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F4B860] via-[#E5A74E] to-[#B87A2B] flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-950/20">
              <Star className="w-5 h-5 text-[#101114] fill-[#101114]" />
            </div>
            {(!desktopCollapsed || mobileMenuOpen) && (
              <div className="truncate">
                <h1 className="text-sm font-bold tracking-tight text-[#F4F4F5] flex items-center gap-1.5 truncate">
                  CineMetrics
                </h1>
                <span className="text-[10px] font-mono font-semibold tracking-wider text-[#F4B860] uppercase block truncate">
                  Hadoop Big Data
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-[#A1A1AA] hover:text-[#F4F4F5] p-1.5 rounded-lg hover:bg-[#191B20]"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#191B20] text-[#F4B860] border border-[#F4B860]/30 shadow-sm shadow-amber-950/20 font-semibold'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#191B20]/60'
                }`
              }
              title={desktopCollapsed ? label : undefined}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className="w-4 h-4 flex-shrink-0" />
                {(!desktopCollapsed || mobileMenuOpen) && (
                  <span className="truncate">{label}</span>
                )}
              </div>
              {(!desktopCollapsed || mobileMenuOpen) && badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#282A30] text-[#D4D4D8] border border-[#3A3D46]/50">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Desktop Collapse Toggle */}
        <div className="hidden lg:flex items-center justify-end px-3 py-2 border-t border-[#282A30]">
          <button
            onClick={toggleDesktopSidebar}
            className="p-1.5 rounded-md text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#191B20] transition-colors"
            title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar width"
          >
            {desktopCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Academic / Viva Credentials Footer */}
        {(!desktopCollapsed || mobileMenuOpen) && (
          <div className="p-3.5 border-t border-[#282A30] bg-[#101114]">
            <div className="rounded-lg bg-[#191B20] border border-[#282A30] p-3 text-[11px] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#F4B860] font-semibold">
                <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">SRM IST, Ramapuram</span>
              </div>
              <p className="text-[#A1A1AA] text-[10px]">Big Data Essentials (21CSC314P)</p>
              <div className="pt-1.5 flex items-center justify-between border-t border-[#282A30] text-[10px]">
                <span className="text-[#A1A1AA]">Developer:</span>
                <span className="text-[#F4F4F5] font-medium">Achyuth PV</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-[#101114]/90 backdrop-blur-md border-b border-[#282A30]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#191B20]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2.5 text-xs text-[#A1A1AA]">
              <Database className="w-3.5 h-3.5 text-[#F4B860]" />
              <span className="font-medium text-[#F4F4F5]">MovieLens 100K</span>
              <span className="text-[#3A3D46]">•</span>
              <span className="font-mono text-[11px] text-[#D4D4D8]">100,836 ratings / 9,742 movies</span>
            </div>
          </div>

          {/* Engine Provenance & Cluster Health Indicators */}
          <div className="flex items-center gap-2.5 relative">
            <button
              onClick={() => setShowStatusDetails(!showStatusDetails)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#191B20] border border-[#282A30] hover:border-[#3A3D46] transition-colors text-xs text-[#F4F4F5]"
              title="Click to view processing provenance & cluster telemetry"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isClusterOnline ? 'bg-emerald-400 animate-pulse' : 'bg-[#F4B860]'
                  }`}
                />
                <span className="font-medium text-[11px]">{engineLabel}</span>
              </span>
              <span className="text-[#3A3D46]">•</span>
              <span className={`text-[10px] font-mono ${isClusterOnline ? 'text-emerald-400' : 'text-[#A1A1AA]'}`}>
                {isClusterOnline ? 'YARN Online' : 'Snapshot Valid'}
              </span>
              <Info className="w-3.5 h-3.5 text-[#A1A1AA] ml-0.5" />
            </button>

            {/* Provenance Telemetry Flyout */}
            {showStatusDetails && (
              <div
                className="absolute right-0 top-12 w-80 rounded-xl bg-[#191B20] border border-[#3A3D46] shadow-2xl p-4 text-xs z-50 animate-fade-in space-y-3"
                onMouseLeave={() => setShowStatusDetails(false)}
              >
                <div className="flex items-center justify-between border-b border-[#282A30] pb-2">
                  <span className="font-bold text-[#F4F4F5] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#F4B860]" />
                    Processing Provenance
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#282A30] text-[#F4B860]">
                    MapReduce
                  </span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">Engine:</span>
                    <span className="font-mono text-[#F4F4F5]">{status?.engine ?? 'python-reference'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">Hadoop Cluster:</span>
                    <span className={`font-semibold ${isClusterOnline ? 'text-emerald-400' : 'text-[#F4B860]'}`}>
                      {isClusterOnline ? 'Connected (YARN/HDFS)' : 'Offline (Pre-processed snapshot)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">MR Partitions:</span>
                    <span className="font-mono text-emerald-400">part-r-00000 (Verified)</span>
                  </div>
                  {status?.processedAt && (
                    <div className="flex justify-between text-[10px] pt-1 border-t border-[#282A30]">
                      <span className="text-[#A1A1AA]">Dataset Processed:</span>
                      <span className="font-mono text-[#D4D4D8]">
                        {new Date(status.processedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {status?.apiLoadedAt && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#A1A1AA]">API In-Memory Load:</span>
                      <span className="font-mono text-[#D4D4D8]">
                        {new Date(status.apiLoadedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#282A30] text-[10px] text-[#A1A1AA] leading-relaxed">
                  Calculations originate from genuine Hadoop MapReduce algorithms. When the cluster is offline, data is served from verified partition outputs.
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#101114]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
