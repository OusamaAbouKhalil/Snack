import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, Inbox } from 'lucide-react';

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-card ${
        padded ? 'p-5 sm:p-6' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-display">{title}</h1>
        {subtitle && <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone?: 'primary' | 'green' | 'red' | 'amber' | 'blue';
  trend?: string;
}) {
  const toneClasses: Record<string, string> = {
    primary: 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400',
    green: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    red: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
  };
  return (
    <Card className="flex items-start gap-4">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${toneClasses[tone]}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-tight mt-0.5">{value}</p>
        {trend && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{trend}</p>}
      </div>
    </Card>
  );
}

// ── Button ────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm disabled:opacity-50',
  secondary:
    'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50',
  ghost: 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-50',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ElementType;
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
    >
      {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" /> : Icon && <Icon size={size === 'sm' ? 14 : 17} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  className = '',
  tone = 'default',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ElementType;
  label: string;
  tone?: 'default' | 'danger' | 'primary';
}) {
  const toneClasses =
    tone === 'danger'
      ? 'text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600'
      : tone === 'primary'
        ? 'text-gray-500 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600'
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700';
  return (
    <button {...rest} aria-label={label} title={label} className={`p-2 rounded-lg transition-colors ${toneClasses} ${className}`}>
      <Icon size={16} />
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
}) {
  const toneClasses: Record<string, string> = {
    neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    success: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
    warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    danger: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    primary: 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400',
  };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${toneClasses[tone]}`}>{children}</span>;
}

// ── Form primitives ──────────────────────────────────────────────────────
export const inputClass =
  'w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-shadow';

export function Field({
  label,
  required,
  helper,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {helper && !error && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{helper}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...rest }, ref) => <input ref={ref} {...rest} className={`${inputClass} ${className}`} />
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...rest }, ref) => (
    <select ref={ref} {...rest} className={`${inputClass} ${className}`}>
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...rest }, ref) => <textarea ref={ref} {...rest} className={`${inputClass} resize-none ${className}`} />
);
Textarea.displayName = 'Textarea';

// ── Switch ────────────────────────────────────────────────────────────────
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[18px] rtl:-translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
      {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>}
    </label>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-16 px-4">
      <span className="inline-flex w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/40 items-center justify-center mb-4">
        <Icon size={28} className="text-primary-500 dark:text-primary-400" />
      </span>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      {message && <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto text-sm">{message}</p>}
      {action}
    </div>
  );
}

// ── Skeleton / loading ────────────────────────────────────────────────────
export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-700/60 animate-pulse" />
      ))}
    </div>
  );
}

export function Spinner({ size = 28 }: { size?: number }) {
  return (
    <div className="flex justify-center py-16">
      <Loader2 size={size} className="animate-spin text-primary-500" />
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────
export function TableShell({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto -mx-5 sm:mx-0"><table className="w-full text-sm">{children}</table></div>;
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="text-start text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-y border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, align = 'start' }: { children: React.ReactNode; align?: 'start' | 'end' }) {
  return <th className={`font-semibold px-4 py-3 first:ps-6 last:pe-6 ${align === 'end' ? 'text-end' : 'text-start'}`}>{children}</th>;
}

export function Td({ children, align = 'start', className = '' }: { children: React.ReactNode; align?: 'start' | 'end'; className?: string }) {
  return <td className={`px-4 py-3 first:ps-6 last:pe-6 ${align === 'end' ? 'text-end' : 'text-start'} ${className}`}>{children}</td>;
}

// ── Modal ─────────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && (
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; icon?: React.ElementType }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            active === id
              ? 'border-primary-600 text-primary-700 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {Icon && <Icon size={16} />}
          {label}
        </button>
      ))}
    </div>
  );
}
