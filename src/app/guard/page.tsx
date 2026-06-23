'use client';

import { useState } from 'react';
import { ShieldCheck, Phone, AlertTriangle, ScanLine, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

/**
 * Mobile-first guard interface.
 * Separate from the dashboard chrome by design — guard works on a cheap
 * Android phone at the gate. No sidebar, big tap targets, single-column.
 */
export default function GuardPage() {
  const [flatNumber, setFlatNumber]   = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [vehicle, setVehicle]         = useState('');
  const [purpose, setPurpose]         = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!flatNumber || !visitorName) {
      toast.error('Flat number aur visitor ka naam zaroori hai.');
      return;
    }
    toast.success(`Resident ko alert bheja gaya — Flat ${flatNumber}`);
    setVisitorName(''); setVehicle(''); setPurpose('');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          <div>
            <div className="font-semibold">Guard Console · गार्ड कंसोल</div>
            <div className="text-xs text-white/70">Krishna Greens — Main Gate</div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" /> New Visitor Entry
            </CardTitle>
            <CardDescription className="text-xs">Resident ko WhatsApp pe approval request jaayegi.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Flat Number · फ्लैट नंबर</label>
                <Input
                  inputMode="text" placeholder="e.g. A-018"
                  value={flatNumber} onChange={(e) => setFlatNumber(e.target.value.toUpperCase())}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Visitor Name · विज़िटर का नाम</label>
                <Input
                  placeholder="e.g. Ramesh Electrician"
                  value={visitorName} onChange={(e) => setVisitorName(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Vehicle · गाड़ी नंबर (optional)</label>
                <Input
                  placeholder="MP-09-AB-1234"
                  value={vehicle} onChange={(e) => setVehicle(e.target.value.toUpperCase())}
                  className="h-12 text-base font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Purpose · उद्देश्य (optional)</label>
                <Input
                  placeholder="e.g. Fan repair"
                  value={purpose} onChange={(e) => setPurpose(e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              <Button type="submit" className="w-full h-12 text-base">
                <Send className="h-5 w-5 mr-2" /> Send Approval Request
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ScanLine className="h-4 w-4" /> Scan Delivery QR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full h-12">Open Camera Scanner</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" /> Emergency
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            <EmergencyTile label="Police"    number="100" />
            <EmergencyTile label="Fire"      number="101" />
            <EmergencyTile label="Ambulance" number="108" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today's Pre-Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <PreApprovalRow flat="A-018" name="Plumber Suresh" time="10:00 - 12:00" />
            <PreApprovalRow flat="A-019" name="Maid Lakshmi"   time="07:00 - 09:00" />
          </CardContent>
        </Card>
      </main>

      <footer className="text-center text-xs text-muted-foreground py-4">
        Guard ID: SK-G-001 · Shift 06:00–18:00
      </footer>
    </div>
  );
}

function EmergencyTile({ label, number }: { label: string; number: string }) {
  return (
    <a
      href={`tel:${number}`}
      className="flex flex-col items-center justify-center gap-1 rounded-md bg-red-50 hover:bg-red-100 p-3 text-red-700"
    >
      <Phone className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
      <span className="text-[10px] font-mono">{number}</span>
    </a>
  );
}

function PreApprovalRow({ flat, name, time }: { flat: string; name: string; time: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
      <div>
        <div className="font-medium text-sm">{name}</div>
        <div className="text-xs text-muted-foreground">Flat {flat} · {time}</div>
      </div>
      <Badge variant="success" className="text-[10px]">Approved</Badge>
    </div>
  );
}
