import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  titleHi?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, titleHi, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {titleHi && <p className="text-sm text-muted-foreground mt-0.5">{titleHi}</p>}
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
