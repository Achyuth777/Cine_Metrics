import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accent?: 'amber' | 'teal' | 'neutral';
  badge?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = 'amber',
  badge
}: StatCardProps) {
  const accentStyles = {
    amber: {
      iconBg: 'bg-[#F4B860]/10 border-[#F4B860]/20 text-[#F4B860]',
      highlight: 'text-[#F4F4F5]',
    },
    teal: {
      iconBg: 'bg-[#2DD4BF]/10 border-[#2DD4BF]/20 text-[#2DD4BF]',
      highlight: 'text-[#F4F4F5]',
    },
    neutral: {
      iconBg: 'bg-[#282A30] border-[#3A3D46] text-[#D4D4D8]',
      highlight: 'text-[#F4F4F5]',
    }
  };

  const currentAccent = accentStyles[accent] || accentStyles.amber;

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#191B20] border border-[#282A30] p-5 transition-all duration-200 hover:border-[#3A3D46] hover:bg-[#21242B] shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#A1A1AA] tracking-wide uppercase">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className={`text-3xl sm:text-4xl font-bold tracking-tight font-mono tabular-nums ${currentAccent.highlight}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {badge && (
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[#282A30] text-[#D4D4D8] border border-[#3A3D46]">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-2 text-xs text-[#A1A1AA] leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg border flex-shrink-0 ${currentAccent.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
