import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'violet' | 'blue' | 'emerald' | 'amber' | 'cyan' | 'rose' | 'indigo';
  badge?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'violet',
  badge
}: StatCardProps) {
  const colorStyles: Record<string, { bg: string; border: string; iconBg: string; iconColor: string; glow: string }> = {
    violet: {
      bg: 'from-violet-950/40 to-slate-900/60',
      border: 'border-violet-500/20 hover:border-violet-500/40',
      iconBg: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
      iconColor: 'text-violet-400',
      glow: 'shadow-violet-500/5'
    },
    blue: {
      bg: 'from-blue-950/40 to-slate-900/60',
      border: 'border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      iconColor: 'text-blue-400',
      glow: 'shadow-blue-500/5'
    },
    emerald: {
      bg: 'from-emerald-950/40 to-slate-900/60',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      iconColor: 'text-emerald-400',
      glow: 'shadow-emerald-500/5'
    },
    amber: {
      bg: 'from-amber-950/40 to-slate-900/60',
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      iconColor: 'text-amber-400',
      glow: 'shadow-amber-500/5'
    },
    cyan: {
      bg: 'from-cyan-950/40 to-slate-900/60',
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      iconColor: 'text-cyan-400',
      glow: 'shadow-cyan-500/5'
    },
    rose: {
      bg: 'from-rose-950/40 to-slate-900/60',
      border: 'border-rose-500/20 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      iconColor: 'text-rose-400',
      glow: 'shadow-rose-500/5'
    },
    indigo: {
      bg: 'from-indigo-950/40 to-slate-900/60',
      border: 'border-indigo-500/20 hover:border-indigo-500/40',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      iconColor: 'text-indigo-400',
      glow: 'shadow-indigo-500/5'
    }
  };

  const style = colorStyles[color] || colorStyles.violet;

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${style.bg} border ${style.border} p-5 shadow-lg ${style.glow} transition-all duration-300 hover:-translate-y-0.5 animate-fade-in`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-[#9aa0b8] uppercase">
            {title}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-white font-mono">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
            {badge && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/10 text-[#9aa0b8]">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs text-[#646a84] line-clamp-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${style.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
