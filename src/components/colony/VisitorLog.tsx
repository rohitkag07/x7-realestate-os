'use client';

import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPhone, formatRelative, cn } from '@/lib/utils';
import { VisitorActions } from '@/components/colony/VisitorActions';
import type { Visitor } from '@/types/database';

interface VisitorLogProps {
  visitors: Visitor[];
}

export function VisitorLog({ visitors }: VisitorLogProps) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Visitor</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Entry</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visitors.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                No visitor entries logged yet today.
              </TableCell>
            </TableRow>
          )}
          {visitors.map((v) => (
            <TableRow key={v.id}>
              <TableCell>
                <div className="font-medium text-sm">{v.visitor_name}</div>
                {v.visitor_phone && <div className="text-xs text-muted-foreground">{formatPhone(v.visitor_phone)}</div>}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">{v.visitor_type}</Badge>
              </TableCell>
              <TableCell className="text-sm">{v.purpose ?? '—'}</TableCell>
              <TableCell className="text-sm font-mono">{v.vehicle_number ?? '—'}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatRelative(v.entry_time)}</TableCell>
              <TableCell>
                <ApprovalPill status={v.approval_status} />
              </TableCell>
              <TableCell className="text-right">
                {v.approval_status === 'pending' ? (
                  <VisitorActions visitorId={v.id} />
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {v.approved_by ? `By ${v.approved_by}` : 'Logged by guard'}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ApprovalPill({ status }: { status: Visitor['approval_status'] }) {
  const cfg = {
    approved: { Icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700', label: 'Approved' },
    denied:   { Icon: XCircle,      color: 'bg-red-100 text-red-700',         label: 'Denied' },
    pending:  { Icon: Clock,        color: 'bg-amber-100 text-amber-700',     label: 'Pending' },
    expired:  { Icon: XCircle,      color: 'bg-zinc-100 text-zinc-600',       label: 'Expired' },
  }[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', cfg.color)}>
      <cfg.Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}
