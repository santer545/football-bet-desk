import { cva, type VariantProps } from 'class-variance-authority';
import type { ElementType, HTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

const cardVariants = cva('surface rounded-[var(--radius-card)]', {
  variants: {
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6 sm:p-7',
    },
    interactive: {
      true: 'surface-hover',
    },
  },
  defaultVariants: {
    padding: 'md',
  },
});

export interface CardProps extends HTMLAttributes<HTMLElement>, VariantProps<typeof cardVariants> {
  as?: 'div' | 'article' | 'section' | 'li';
}

export function Card({ className, padding, interactive, as = 'div', ...props }: CardProps) {
  const Component = as as ElementType;
  return <Component className={cn(cardVariants({ padding, interactive }), className)} {...props} />;
}
