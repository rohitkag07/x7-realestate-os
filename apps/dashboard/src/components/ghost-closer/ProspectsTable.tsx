import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatRelative, cn } from '@/lib/utils';
import type { GhostProspectItem } from '@/lib/marketing-data';
export function ProspectsTable({ prospects }: { prospects: GhostProspectItem[] }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Prospect</TableHead><TableHead>Occupation</TableHead><TableHead>City</TableHead>
          <TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead><TableHead>Last Contact</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {prospects.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No prospects yet.</TableCell></TableRow>}
          {prospects.map((p) => (
            <TableRow key={p.id}>
              <TableCell><div className="font-medium">{p.full_name}</div><div className="text-xs text-muted-foreground">{p.phone ?? p.email ?? '—'}</div></TableCell>
              <TableCell className="text-sm">{p.occupation ?? '—'}</TableCell>
              <TableCell className="text-sm">{p.city ?? '—'}{p.is_nri && <Badge variant="outline" className="ml-2 text-[9px]">NRI</Badge>}</TableCell>
              <TableCell><span className={cn('inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold', (p.propensity_score ?? 0) >= 75 ? 'bg-red-100 text-red-700' : (p.propensity_score ?? 0) >= 55 ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-600')}>{p.propensity_score ?? '—'}</span></TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{p.status}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground capitalize">{p.source.replace('_', ' ')}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{p.last_contacted_at ? formatRelative(p.last_contacted_at) : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
