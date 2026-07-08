'use client';

import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ---------------------------------------------------------------------
// Leads-over-time area chart (default to last 14 days demo data)
// ---------------------------------------------------------------------
type LeadsTrendPoint = { day: string; leads: number; visits: number };

export function LeadsTrendChart({ data }: { data?: LeadsTrendPoint[] }) {
  const series: LeadsTrendPoint[] = data ?? [
    { day: 'Mon', leads: 12, visits: 3 }, { day: 'Tue', leads: 18, visits: 5 },
    { day: 'Wed', leads: 9,  visits: 2 }, { day: 'Thu', leads: 22, visits: 7 },
    { day: 'Fri', leads: 15, visits: 4 }, { day: 'Sat', leads: 28, visits: 9 },
    { day: 'Sun', leads: 14, visits: 3 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leads & Appointments — Last 7 days</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-leads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="grad-visits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis              tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
            <Area type="monotone" dataKey="leads"  stroke="#3B82F6" fill="url(#grad-leads)"  strokeWidth={2} />
            <Area type="monotone" dataKey="visits" stroke="#10B981" fill="url(#grad-visits)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Revenue line chart
// ---------------------------------------------------------------------
type RevenuePoint = { month: string; revenue: number };

export function RevenueChart({ data }: { data?: RevenuePoint[] }) {
  const series: RevenuePoint[] = data ?? [
    { month: 'Jan', revenue: 12 }, { month: 'Feb', revenue: 18 },
    { month: 'Mar', revenue: 22 }, { month: 'Apr', revenue: 30 },
    { month: 'May', revenue: 41 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue (₹ Lakh) — Last 5 months</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis                  tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
            <Line type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Source-of-leads bar chart
// ---------------------------------------------------------------------
type SourcePoint = { source: string; count: number };

export function LeadSourceChart({ data }: { data?: SourcePoint[] }) {
  const series: SourcePoint[] = data ?? [
    { source: 'Meta Ad',      count: 84 },
    { source: 'WhatsApp',     count: 42 },
    { source: 'Google Ad',    count: 31 },
    { source: 'Referral',     count: 22 },
    { source: 'Walk-in',      count: 9  },
    { source: 'Ghost Closer', count: 6  },
  ];
  const palette = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#0EA5E9'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leads by Source — This month</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="source" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis                  tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {series.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
