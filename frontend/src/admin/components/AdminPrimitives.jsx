import React, { useContext } from 'react';
import { AdminSettingsContext } from '../AdminShell.jsx';

export const StatBadge = ({ label, value, accent, className = '' }) => {
  const { density } = useContext(AdminSettingsContext);
  const pad = density === 'compact' ? 'p-5' : 'p-6';
  return (
    <div
      className={`group relative w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 ${pad} backdrop-blur transition focus-within:ring-2 focus-within:ring-indigo-400/60 focus:outline-none hover:border-white/20 ${className}`.trim()}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white lg:text-4xl">{value}</p>
      {accent && <p className="mt-2 text-xs font-semibold text-indigo-300">{accent}</p>}
    </div>
  );
};

export const DataPanel = ({
  title,
  description,
  actions,
  children,
  className = '',
  bodyClassName = '',
}) => {
  const { density } = useContext(AdminSettingsContext);
  const pad = density === 'compact' ? 'p-6' : 'p-7';
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 ${pad} shadow-[0_30px_80px_-35px_rgba(59,130,246,0.35)] backdrop-blur-xl ${className}`.trim()}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-transparent" />
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div>
          <h3 className="text-lg font-semibold text-white lg:text-xl">{title}</h3>
          {description && <p className="text-sm text-slate-400/90">{description}</p>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/80">
            {actions}
          </div>
        )}
      </header>
      <div className={`mt-6 lg:mt-8 ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
};

export const TableShell = ({ headers, children }) => {
  const { density } = useContext(AdminSettingsContext);
  const thPad = density === 'compact' ? 'px-3 py-3' : 'px-4 py-4';
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.2em] text-slate-300">
            <tr>
              {headers.map((header) => (
                <th key={header} className={`${thPad} font-semibold`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-slate-200">{children}</tbody>
        </table>
      </div>
    </div>
  );
};
