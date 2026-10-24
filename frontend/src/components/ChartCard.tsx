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
      className={`rounded-xl bg-[#191B20] border border-[#282A30] p-5 shadow-sm transition-all duration-200 hover:border-[#3A3D46] ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#282A30]">
        <div>
          <h3 className="text-sm font-semibold text-[#F4F4F5] tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-[#A1A1AA] mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
