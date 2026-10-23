import type { InputHTMLAttributes, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

import { useTranslation, translateValidation } from '@/lib/i18n';
import { cn } from '@/utils/cn';

const fieldBase =
  'w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-foreground placeholder:text-faint transition-colors focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

export function Input({ className, ref, ...props }: InputProps) {
  return <input ref={ref} className={cn(fieldBase, 'h-10', className)} {...props} />;
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ className, ref, ...props }: TextareaProps) {
  return (
    <textarea ref={ref} className={cn(fieldBase, 'min-h-24 resize-y', className)} {...props} />
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  ref?: Ref<HTMLSelectElement>;
}

export function Select({ className, ref, children, ...props }: SelectProps) {
  return (
    <select ref={ref} className={cn(fieldBase, 'h-10 appearance-none pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function FieldError({ message }: { message?: string }) {
  const { language } = useTranslation();
  if (!message) return null;
  return (
    <p className="text-danger mt-1 text-xs font-medium">{translateValidation(language, message)}</p>
  );
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-faint mt-1 text-xs">{children}</p>;
}

export function Label({
  children,
  htmlFor,
  className,
  required,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-muted mb-1.5 block text-xs font-semibold', className)}
    >
      {children}
      {required ? <span className="text-danger ml-0.5">*</span> : null}
    </label>
  );
}
