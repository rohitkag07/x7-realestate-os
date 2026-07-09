import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-primary text-primary-foreground shadow-[0_0_28px_rgba(37,211,102,0.18)] hover:bg-primary/90',
        secondary:   'border-white/10 bg-white/8 text-secondary-foreground hover:bg-white/12',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline:     'border-white/12 bg-white/5 text-foreground',
        success:     'border-emerald-300/20 bg-emerald-400/12 text-emerald-200',
        warning:     'border-amber-300/20 bg-amber-400/12 text-amber-200',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
