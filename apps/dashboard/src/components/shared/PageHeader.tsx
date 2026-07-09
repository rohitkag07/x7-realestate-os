import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  titleHi?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, titleHi, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-3 h-1 w-12 rounded-full bg-gradient-to-r from-primary via-accent to-transparent" />
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {titleHi && <p className="mt-1 text-sm text-emerald-100/70">{titleHi}</p>}
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
