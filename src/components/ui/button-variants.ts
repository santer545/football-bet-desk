import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-45 active:translate-y-px',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-canvas shadow-[0_8px_24px_-12px_rgba(61,255,139,0.8)] hover:bg-accent-strong',
        secondary: 'border border-line-strong bg-surface-2 text-foreground hover:bg-surface-3',
        ghost: 'text-muted hover:bg-surface-2 hover:text-foreground',
        outline:
          'border border-line-strong text-foreground hover:border-accent/50 hover:bg-accent/5',
        danger: 'border border-danger/30 bg-danger-soft text-danger hover:border-danger/60',
        link: 'text-accent underline-offset-4 hover:underline',
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
