'use client';

import { MousePointerClick, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InteractiveReplyButton } from '@/types/database';

export function InteractiveButtonsEditor({
  buttons,
  onChange,
  defaultPayload,
}: {
  buttons: InteractiveReplyButton[];
  onChange: (buttons: InteractiveReplyButton[]) => void;
  defaultPayload: (index: number) => string;
}) {
  function addButton() {
    if (buttons.length >= 3) return;
    const index = buttons.length;
    onChange([...buttons, {
      id: `button-${Date.now()}-${index + 1}`,
      title: '',
      payload: defaultPayload(index),
    }]);
  }

  function update(index: number, patch: Partial<InteractiveReplyButton>) {
    onChange(buttons.map((button, buttonIndex) => buttonIndex === index ? { ...button, ...patch } : button));
  }

  return (
    <div className="rounded-2xl border border-[#d8dee4] bg-[#f8faf9] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#111b21]">
            <MousePointerClick className="h-4 w-4 text-[#00a884]" />
            Quick reply buttons
          </div>
          <p className="mt-1 text-xs leading-5 text-[#667781]">Add up to 3 actions. The payload should point to another rule, for example <code>rule:book-visit</code>.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addButton} disabled={buttons.length >= 3}>
          <Plus className="mr-1 h-3.5 w-3.5" />Add button
        </Button>
      </div>
      {buttons.length ? (
        <div className="mt-4 space-y-3">
          {buttons.map((button, index) => (
            <div key={button.id} className="grid gap-3 rounded-xl border border-[#e1e6e4] bg-white p-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_36px]">
              <div className="space-y-1.5">
                <Label className="text-xs">Button label</Label>
                <Input value={button.title} maxLength={20} onChange={(event) => update(index, { title: event.target.value })} placeholder="Book Visit" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Action payload</Label>
                <Input value={button.payload} maxLength={256} onChange={(event) => update(index, { payload: event.target.value })} placeholder="rule:book-visit" />
              </div>
              <Button type="button" variant="ghost" size="icon" className="self-end" onClick={() => onChange(buttons.filter((_, buttonIndex) => buttonIndex !== index))} aria-label={`Remove ${button.title || `button ${index + 1}`}`}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
