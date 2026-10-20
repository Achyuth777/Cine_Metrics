import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
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
  GraduationCap
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', badge: null },
  { to: '/movies', icon: Film, label: 'Movie Explorer', badge: 'Search' },
  { to: '/genres', icon: Tags, label: 'Genre Analytics', badge: null },
  { to: '/ratings', icon: BarChart3, label: 'Rating Intelligence', badge: null },
  { to: '/hadoop', icon: Server, label: 'Hadoop Monitor', badge: 'MR' },
  { to: '/architecture', icon: GitBranch, label: 'Architecture & Viva', badge: 'Viva' }
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f] text-[#f1f1f8]">
      {/* Sidebar for Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#12121a] border-r border-[#252538] flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#252538]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                CineMetrics
              </h1>
              <span className="text-[10px] font-semibold tracking-wider text-violet-400 uppercase">
                Hadoop MapReduce
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-[#9aa0b8] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm shadow-violet-500/10'
                    : 'text-[#9aa0b8] hover:text-white hover:bg-[#1a1a2e]'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </div>
              {badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#252538] text-[#9aa0b8]">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Academic / Viva Badge Footer */}
        <div className="p-4 border-t border-[#252538] bg-[#0d0d14]/60">
          <div className="rounded-lg bg-[#161622] border border-[#252538] p-3 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 text-violet-400 font-semibold">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>SRM IST, Ramapuram</span>
            </div>
            <p className="text-[#9aa0b8] text-[10px]">Big Data Essentials (21CSC314P)</p>
            <div className="pt-1 flex items-center justify-between border-t border-[#252538] text-[10px]">
              <span className="text-[#646a84]">Developer:</span>
              <span className="text-white font-medium">Achyuth PV</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-[#252538]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-[#9aa0b8] hover:text-white hover:bg-[#161622]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#9aa0b8]">
              <Database className="w-3.5 h-3.5 text-violet-400" />
              <span>Dataset: MovieLens (100k)</span>
              <span className="text-[#646a84]">•</span>
              <span className="text-emerald-400">Processed via MapReduce</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Hadoop Analytics Ready</span>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
