import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  titleHi?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, titleHi, description, actions }: PageHeaderProps) {
  void titleHi;

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="wa-page-title">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 sm:pb-0.5">{actions}</div>}
    </div>
  );
}
