'use client';

import { useMemo, useState, useTransition, type ComponentType } from 'react';
import { Building2, FileDown, IndianRupee, Link2, Receipt, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatINR, buildUpiLink } from '@/lib/utils';
import { DEMO_PROJECT } from '@/lib/sales-data';
import type { Lead } from '@/types/database';
import type { BookingWorkbenchItem, PlotInventoryItem } from '@/lib/sales-data';
import { toast } from 'sonner';

interface BookingWorkbenchProps {
  leads: Lead[];
  plots: PlotInventoryItem[];
  bookings: BookingWorkbenchItem[];
}

export function BookingWorkbench({ leads, plots, bookings }: BookingWorkbenchProps) {
  const [inventory, setInventory] = useState(plots);
  const [records, setRecords] = useState(bookings);
  const [selectedPlotId, setSelectedPlotId] = useState(plots[0]?.id ?? '');
  const [open, setOpen] = useState(false);
  const [leadId, setLeadId] = useState(leads.find((lead) => lead.lead_stage !== 'lost')?.id ?? '');
  const [tokenAmount, setTokenAmount] = useState('50000');
  const [paymentMode, setPaymentMode] = useState<'upi' | 'neft'>('upi');
  const [pending, startTransition] = useTransition();

  const eligibleLeads = useMemo(
    () => leads.filter((lead) => lead.lead_stage !== 'lost'),
    [leads],
  );
  const selectedPlot = inventory.find((plot) => plot.id === selectedPlotId) ?? null;
  const selectedLead = eligibleLeads.find((lead) => lead.id === leadId) ?? null;

  const legend = useMemo(() => [
    { label: 'Available', className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { label: 'Token', className: 'bg-amber-50 border-amber-200 text-amber-700' },
    { label: 'Blocked', className: 'bg-blue-50 border-blue-200 text-blue-700' },
    { label: 'Booked', className: 'bg-zinc-100 border-zinc-200 text-zinc-700' },
  ], []);

  function bookingLink() {
    if (!selectedLead || !selectedPlot) return '';
    return buildUpiLink({
      pa: DEMO_PROJECT.paymentVpa,
      pn: DEMO_PROJECT.paymentName,
      am: Number(tokenAmount || 0),
      tn: `${DEMO_PROJECT.name} token ${selectedPlot.plot_number} for ${selectedLead.name}`,
    });
  }

  function createBooking() {
    if (!selectedLead || !selectedPlot) return;

    startTransition(async () => {
      try {
        const response = await fetch('/api/sales/bookings/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: selectedLead.id,
            builder_id: selectedLead.builder_id,
            project_id: DEMO_PROJECT.id,
            plot_id: selectedPlot.id,
            plot_number: selectedPlot.plot_number,
            lead_name: selectedLead.name,
            phone: selectedLead.phone,
            token_amount: Number(tokenAmount || 0),
            total_amount: selectedPlot.total_price,
            payment_mode: paymentMode,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message || 'Booking creation failed');

        const newBooking: BookingWorkbenchItem = {
          id: String(payload.booking?.id ?? `bk-${crypto.randomUUID()}`),
          lead_id: selectedLead.id,
          project_id: DEMO_PROJECT.id,
          plot_id: selectedPlot.id,
          token_amount: Number(payload.booking?.token_amount ?? Number(tokenAmount || 0)),
          total_amount: Number(payload.booking?.total_amount ?? selectedPlot.total_price),
          payment_mode: (payload.booking?.payment_mode ?? paymentMode) as BookingWorkbenchItem['payment_mode'],
          payment_reference: String(payload.booking?.payment_reference ?? (paymentMode === 'upi' ? 'UPI-PENDING' : 'NEFT-PENDING')),
          upi_payment_link: payload.booking?.upi_payment_link ?? payload.upi_link ?? null,
          booking_date: String(payload.booking?.booking_date ?? new Date().toISOString()),
          status: (payload.booking?.status ?? 'token_paid') as BookingWorkbenchItem['status'],
          agreement_url: null,
          registry_url: null,
          notes: 'Created from Phase 2 booking workbench.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          buyer_name: selectedLead.name,
          plot_label: selectedPlot.plot_number,
          project_name: DEMO_PROJECT.name,
        };

        setInventory((current) => current.map((plot) => (
          plot.id === selectedPlot.id
            ? {
                ...plot,
                status: 'booked',
                booked_by: selectedLead.id,
                token_amount: Number(tokenAmount || 0),
                token_date: new Date().toISOString(),
                lead_name: selectedLead.name,
                updated_at: new Date().toISOString(),
              }
            : plot
        )));
        setRecords((current) => [newBooking, ...current]);
        setOpen(false);
        toast.success('Booking created, receipt ready, and payment instruction queued.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Booking creation failed');
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_380px] gap-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Plot Selection Grid</CardTitle>
              <CardDescription>Visual inventory for token capture, payment-link generation, and booking conversion.</CardDescription>
            </div>
            <Button size="sm" disabled={!eligibleLeads.length || !selectedPlot || (selectedPlot.status !== 'available' && selectedPlot.status !== 'token')} onClick={() => setOpen(true)}>
              <Receipt className="h-4 w-4 mr-2" /> Create Booking
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {legend.map((item) => (
                <span key={item.label} className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${item.className}`}>
                  {item.label}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {inventory.map((plot) => (
                <button
                  key={plot.id}
                  type="button"
                  onClick={() => setSelectedPlotId(plot.id)}
                  className={plot.id === selectedPlotId ? plotButtonClass(plot.status, true) : plotButtonClass(plot.status, false)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm">{plot.plot_number}</div>
                      <div className="text-[11px] opacity-80">{plot.area_sqft} sqft</div>
                    </div>
                    <Badge variant="outline" className="capitalize border-current/20 bg-white/60">{plot.status}</Badge>
                  </div>
                  <div className="mt-3 text-left text-xs">
                    <div>{plot.facing ?? 'Facing TBD'}</div>
                    <div className="font-medium mt-1">{formatINR(plot.total_price, { compact: false })}</div>
                    {plot.lead_name && <div className="mt-1 opacity-80">Held by {plot.lead_name}</div>}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Console</CardTitle>
            <CardDescription>Token amount, buyer fit, and payment-link preview for the selected plot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedPlot ? (
              <>
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <InfoRow icon={Building2} label="Selected plot" value={`${selectedPlot.plot_number} · ${selectedPlot.area_sqft} sqft · ${selectedPlot.facing ?? 'Facing TBD'}`} />
                  <InfoRow icon={IndianRupee} label="Total value" value={formatINR(selectedPlot.total_price, { compact: false })} />
                  <InfoRow icon={Sparkles} label="Current holder" value={selectedPlot.lead_name ?? 'Open inventory'} />
                </div>

                {selectedPlot.status === 'available' || selectedPlot.status === 'token' ? (
                  <div className="rounded-lg border bg-background p-4 space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommended next step</div>
                    <div className="text-sm leading-6">
                      Create a booking, generate a token payment link, and send the receipt summary over WhatsApp.
                    </div>
                    <Button className="w-full" onClick={() => setOpen(true)}>
                      <Link2 className="h-4 w-4 mr-2" /> Open Booking Modal
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                    This inventory is already {selectedPlot.status}. Use the booking list below for agreement and registry follow-up.
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent bookings</div>
                  <div className="space-y-2">
                    {records.slice(0, 4).map((booking) => (
                      <div key={booking.id} className="rounded-lg border bg-background px-3 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm">{booking.buyer_name}</div>
                            <div className="text-xs text-muted-foreground">{booking.plot_label} · {formatDate(booking.booking_date)}</div>
                          </div>
                          <Badge variant="outline" className="capitalize">{booking.status.replace('_', ' ')}</Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                          <span>{formatINR(booking.token_amount, { compact: false })} · {booking.payment_mode?.toUpperCase() ?? '—'}</span>
                          <a
                            href={receiptUrlFor(booking)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            Receipt PDF
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground text-center py-12">
                Select a plot from the inventory grid to view booking actions.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Booking & Token Link</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lead</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select buyer" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleLeads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} · {lead.budget_range ?? 'Budget pending'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Token amount</Label>
                <Input value={tokenAmount} onChange={(event) => setTokenAmount(event.target.value)} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label>Payment mode</Label>
                <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as typeof paymentMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI Deeplink</SelectItem>
                    <SelectItem value="neft">NEFT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4 text-sm space-y-2">
              <div className="font-medium">Receipt Preview</div>
              <div>{selectedLead?.name ?? 'Select a lead'} · {selectedPlot?.plot_number ?? 'Select plot'}</div>
              <div>{formatINR(Number(tokenAmount || 0), { compact: false })} token toward {formatINR(selectedPlot?.total_price ?? 0, { compact: false })}</div>
              {paymentMode === 'upi' && (
                <div className="rounded-md border bg-background px-3 py-2 text-xs break-all">
                  {bookingLink()}
                </div>
              )}
              {selectedLead && selectedPlot && (
                <a
                  href={receiptUrlFor({
                    id: 'preview',
                    lead_id: selectedLead.id,
                    project_id: DEMO_PROJECT.id,
                    plot_id: selectedPlot.id,
                    token_amount: Number(tokenAmount || 0),
                    total_amount: selectedPlot.total_price ?? 0,
                    payment_mode: paymentMode,
                    payment_reference: null,
                    upi_payment_link: null,
                    booking_date: new Date().toISOString(),
                    status: 'token_paid',
                    agreement_url: null,
                    registry_url: null,
                    notes: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    buyer_name: selectedLead.name,
                    plot_label: selectedPlot.plot_number,
                    project_name: DEMO_PROJECT.name,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Preview receipt PDF
                </a>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createBooking} disabled={pending || !selectedLead || !selectedPlot}>Confirm Booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function plotButtonClass(status: PlotInventoryItem['status'], selected: boolean) {
  const base = 'rounded-xl border px-3 py-3 text-left transition';
  const ring = selected ? ' ring-2 ring-primary/35 shadow-sm' : '';
  switch (status) {
    case 'available':
      return `${base} bg-emerald-50 border-emerald-200 text-emerald-900 hover:border-emerald-300${ring}`;
    case 'token':
      return `${base} bg-amber-50 border-amber-200 text-amber-900 hover:border-amber-300${ring}`;
    case 'blocked':
      return `${base} bg-blue-50 border-blue-200 text-blue-900 hover:border-blue-300${ring}`;
    default:
      return `${base} bg-zinc-100 border-zinc-200 text-zinc-800 hover:border-zinc-300${ring}`;
  }
}

function receiptUrlFor(booking: BookingWorkbenchItem) {
  return `/api/sales/bookings/receipt?${new URLSearchParams({
    buyer_name: booking.buyer_name,
    plot_label: booking.plot_label,
    project_name: booking.project_name,
    token_amount: String(booking.token_amount),
    total_amount: String(booking.total_amount ?? 0),
    payment_mode: booking.payment_mode ?? 'upi',
    booking_date: booking.booking_date,
    status: booking.status,
  }).toString()}`;
}
