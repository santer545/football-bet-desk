import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import { cn } from '@/utils/cn';

const linkButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-canvas shadow-[0_8px_24px_-12px_rgba(61,255,139,0.8)] hover:bg-accent-strong',
        secondary: 'border border-line-strong bg-surface-2 text-foreground hover:bg-surface-3',
        ghost: 'text-muted hover:bg-surface-2 hover:text-foreground',
        outline:
          'border border-line-strong text-foreground hover:border-accent/50 hover:bg-accent/5',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-5 text-sm',
        icon: 'size-9 p-0',
        'icon-sm': 'size-7 p-0',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  },
);

export interface LinkButtonProps extends LinkProps, VariantProps<typeof linkButtonVariants> {
  icon?: ReactNode;
}

export function LinkButton({
  className,
  variant,
  size,
  fullWidth,
  icon,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={cn(linkButtonVariants({ variant, size, fullWidth }), className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
