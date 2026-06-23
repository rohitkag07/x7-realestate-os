'use client';

import { MessageCircle, Phone } from 'lucide-react';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatPhone, initials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ResidentFormDialog } from '@/components/colony/ResidentFormDialog';
import type { Resident } from '@/types/database';

interface ResidentTableProps {
  residents: Resident[];
}

export function ResidentTable({ residents }: ResidentTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resident</TableHead>
            <TableHead>Plot / Block</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Move-in</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {residents.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                No residents yet — onboard buyers from the Bookings page.
              </TableCell>
            </TableRow>
          )}
          {residents.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(r.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{r.name}</div>
                    {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.plot_id ? 'Plot mapped' : 'Awaiting allocation'}</TableCell>
              <TableCell className="text-sm">{formatPhone(r.phone)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">{r.status}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.move_in_date)}</TableCell>
              <TableCell className="text-right">
                <ResidentFormDialog projectId={r.project_id} resident={r} />
                <Button size="icon" variant="ghost" aria-label="WhatsApp" asChild>
                  <a href={`https://wa.me/${r.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </Button>
                <Button size="icon" variant="ghost" aria-label="Call" asChild>
                  <a href={`tel:${r.phone}`}>
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
