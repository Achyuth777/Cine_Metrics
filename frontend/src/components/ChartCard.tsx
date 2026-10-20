import React from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = ''
}: ChartCardProps) {
  return (
    <div
      className={`rounded-xl bg-[#161622] border border-[#252538] p-5 shadow-xl transition-all duration-300 hover:border-[#3b3b58] animate-fade-in ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-[#9aa0b8] mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
