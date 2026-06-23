import { Phone, MessageCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatRelative, formatINR, cn, formatPhone } from '@/lib/utils';
import type { Lead } from '@/types/database';

interface LeadCardProps {
  lead: Lead;
  onClick?: (lead: Lead) => void;
  compact?: boolean;
}

const sourceLabels: Record<Lead['source'], string> = {
  meta_ad: 'Meta Ad', google_ad: 'Google Ad', website: 'Website', whatsapp: 'WhatsApp',
  referral: 'Referral', walk_in: 'Walk-in', ghost_closer: 'Ghost Closer',
  telegram: 'Telegram', manual: 'Manual',
};

export function LeadCard({ lead, onClick, compact = false }: LeadCardProps) {
  const budgetText = lead.budget_range ? lead.budget_range.replace('-', '–') : 'Budget undisclosed';

  return (
    <Card
      onClick={() => onClick?.(lead)}
      className={cn(
        'cursor-pointer transition hover:shadow-md border-l-4',
        lead.temperature === 'hot'  && 'border-l-red-500',
        lead.temperature === 'warm' && 'border-l-amber-500',
        lead.temperature === 'cold' && 'border-l-blue-500',
        compact ? 'p-2.5' : 'p-3',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{lead.name}</div>
          <div className="text-xs text-muted-foreground truncate">{formatPhone(lead.phone)}</div>
        </div>
        <StatusBadge kind={{ type: 'temperature', value: lead.temperature }} showHindi={false} />
      </div>

      {!compact && (
        <>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-medium">{budgetText}</span>
            <span className="text-muted-foreground">{sourceLabels[lead.source]}</span>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatRelative(lead.created_at)}
          </div>

          <div className="mt-2.5 flex gap-1.5">
            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] flex-1" onClick={(e) => e.stopPropagation()}>
              <MessageCircle className="h-3 w-3 mr-1" /> WA
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] flex-1" onClick={(e) => e.stopPropagation()}>
              <Phone className="h-3 w-3 mr-1" /> Call
            </Button>
          </div>
        </>
      )}

      {lead.lead_score >= 80 && (
        <div className="mt-2 inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
          ★ Score {lead.lead_score}
        </div>
      )}
    </Card>
  );
}

export { formatINR };
