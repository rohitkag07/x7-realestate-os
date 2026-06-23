import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LEAD_STAGE_LABELS, TEMPERATURE_LABELS, COMPLAINT_STATUS_LABELS,
  COMPLAINT_PRIORITY_LABELS, CONTENT_STATUS_LABELS, BOOKING_STATUS_LABELS,
} from '@/lib/constants';
import type {
  LeadStage, LeadTemperature, ComplaintStatus, ComplaintPriority,
  ContentStatus, BookingStatus,
} from '@/types/database';

interface StatusBadgeProps {
  kind:
    | { type: 'lead_stage';        value: LeadStage }
    | { type: 'temperature';       value: LeadTemperature }
    | { type: 'complaint_status';  value: ComplaintStatus }
    | { type: 'complaint_priority';value: ComplaintPriority }
    | { type: 'content_status';    value: ContentStatus }
    | { type: 'booking_status';    value: BookingStatus };
  showHindi?: boolean;
}

export function StatusBadge({ kind, showHindi = true }: StatusBadgeProps) {
  let label = '';
  let labelHi = '';
  let colorClass = '';

  switch (kind.type) {
    case 'lead_stage': {
      const def = LEAD_STAGE_LABELS[kind.value];
      label = def.en;  labelHi = def.hi;  colorClass = def.color;
      break;
    }
    case 'temperature': {
      const def = TEMPERATURE_LABELS[kind.value];
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          <span className={cn('h-2 w-2 rounded-full', def.dot)} />
          {def.en}{showHindi && <span className="text-muted-foreground">· {def.hi}</span>}
        </span>
      );
    }
    case 'complaint_status': {
      const def = COMPLAINT_STATUS_LABELS[kind.value];
      label = def.en;  labelHi = def.hi;  colorClass = def.color;
      break;
    }
    case 'complaint_priority': {
      const def = COMPLAINT_PRIORITY_LABELS[kind.value];
      label = def.en;  labelHi = def.hi;  colorClass = def.color;
      break;
    }
    case 'content_status': {
      const def = CONTENT_STATUS_LABELS[kind.value];
      label = def.en;  labelHi = def.hi;  colorClass = def.color;
      break;
    }
    case 'booking_status': {
      const def = BOOKING_STATUS_LABELS[kind.value];
      label = def.en;  labelHi = def.hi;  colorClass = def.color;
      break;
    }
  }

  return (
    <Badge variant="outline" className={cn('font-medium border-transparent', colorClass)}>
      {label}{showHindi && labelHi && <span className="ml-1 opacity-70">· {labelHi}</span>}
    </Badge>
  );
}
