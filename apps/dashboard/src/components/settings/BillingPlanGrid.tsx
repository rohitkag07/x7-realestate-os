import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Plan = {
  key: string;
  name: string;
  priceLabel: string;
  period: string;
  badge: string | null;
  badgeColor: string;
  features: string[];
  cta: string;
  ctaVariant: 'default' | 'outline';
  highlight: boolean;
};

export function BillingPlanGrid({
  plans,
  currentPlanKey,
  ownerPhone,
}: {
  plans: Plan[];
  currentPlanKey: string;
  ownerPhone: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((plan) => {
        const isCurrent = plan.key === currentPlanKey;
        const href = upgradeHref(ownerPhone, plan.name);
        return (
          <div
            key={plan.key}
            className={`relative flex flex-col gap-4 rounded-xl border p-5 ${
              plan.highlight ? 'border-primary bg-primary/5 shadow-md' : 'bg-card'
            }`}
          >
            {plan.badge && (
              <Badge className={`absolute -top-2.5 left-4 ${plan.badgeColor}`}>
                {plan.badge}
              </Badge>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{plan.name}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold">{plan.priceLabel}</span>
                <span className="text-xs text-muted-foreground">{plan.period}</span>
              </div>
            </div>

            <ul className="flex-1 space-y-1.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>

            {isCurrent ? (
              <Button variant="outline" size="sm" className="w-full" disabled>Current Plan</Button>
            ) : (
              <Button asChild variant={plan.ctaVariant} size="sm" className="w-full">
                <a href={href} target="_blank" rel="noreferrer">
                  Contact us to upgrade
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function upgradeHref(ownerPhone: string, planName: string) {
  const phone = ownerPhone.replace(/\D/g, '') || '919876543210';
  const message = encodeURIComponent(`Hi X7 team, I want to upgrade my WhatsAI Assistant trial to the ${planName} plan. Please share next steps.`);
  return `https://wa.me/${phone}?text=${message}`;
}
