'use client';

import { useMemo, useState, useTransition } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PLAYBOOK_TEMPLATES, VERTICALS, type PlaybookQuestion, type VerticalKey } from '@/lib/playbook-defaults';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function PlaybookSetupClient() {
  const [vertical, setVertical] = useState<VerticalKey>('real_estate');
  const template = PLAYBOOK_TEMPLATES[vertical];
  const [questions, setQuestions] = useState<PlaybookQuestion[]>(template.questions);
  const [keywords, setKeywords] = useState(template.handoffKeywords.join(', '));
  const [minAnswers, setMinAnswers] = useState(String(template.minAnswers));
  const [safetyOverride, setSafetyOverride] = useState(template.safetyOverride);
  const [pending, startTransition] = useTransition();
  const sortedQuestions = useMemo(() => [...questions].sort((a, b) => a.order - b.order), [questions]);

  function choose(next: VerticalKey) {
    const nextTemplate = PLAYBOOK_TEMPLATES[next];
    setVertical(next);
    setQuestions(nextTemplate.questions);
    setKeywords(nextTemplate.handoffKeywords.join(', '));
    setMinAnswers(String(nextTemplate.minAnswers));
    setSafetyOverride(nextTemplate.safetyOverride);
  }

  function updateQuestion(index: number, patch: Partial<PlaybookQuestion>) {
    setQuestions((current) => current.map((question, i) => i === index ? { ...question, ...patch } : question));
  }

  function addQuestion() {
    setQuestions((current) => [...current, { key: `custom_${current.length + 1}`, question: '', type: 'text', required: true, order: current.length + 1 }]);
  }

  function deleteQuestion(index: number) {
    if (!window.confirm('Delete this qualification question?')) return;
    setQuestions((current) => current.filter((_, i) => i !== index).map((question, i) => ({ ...question, order: i + 1 })));
  }

  function save() {
    startTransition(async () => {
      const response = await fetch('/api/playbooks/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          vertical,
          system_prompt: template.systemPrompt,
          qualification_questions: sortedQuestions,
          handoff_rules: {
            trigger_on_keywords: keywords.split(',').map((item) => item.trim()).filter(Boolean),
            min_answers_before_handoff: Number(minAnswers) || 1,
            safety_override: safetyOverride,
            message: template.handoffMessage,
          },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error ?? 'Playbook save failed');
        return;
      }
      toast.success('Playbook saved.');
    });
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {VERTICALS.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.vertical} type="button" onClick={() => choose(item.vertical)} className={cn('rounded-lg border bg-card p-4 text-left transition hover:border-primary', vertical === item.vertical && 'border-primary ring-1 ring-primary')}>
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <div className="font-semibold">{item.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </button>
          );
        })}
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div><CardTitle className="text-base">Qualification Questions</CardTitle><p className="text-sm text-muted-foreground">{template.name}</p></div>
          <Button size="sm" variant="outline" onClick={addQuestion}><Plus className="mr-2 h-4 w-4" /> Add question</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedQuestions.map((question, index) => (
            <QuestionRow key={`${question.key}-${index}`} question={question} index={index} update={updateQuestion} remove={deleteQuestion} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Handoff Rules</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
          <div className="space-y-1.5">
            <Label>Trigger keywords</Label>
            <Textarea rows={3} value={keywords} onChange={(event) => setKeywords(event.target.value)} />
            <p className="text-xs text-muted-foreground">Comma separated keywords that should alert the owner.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Minimum answers</Label>
            <Input type="number" min={1} value={minAnswers} onChange={(event) => setMinAnswers(event.target.value)} />
          </div>
          <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
            <input type="checkbox" checked={safetyOverride} onChange={(event) => setSafetyOverride(event.target.checked)} />
            Never diagnose / prescribe
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}><Save className="mr-2 h-4 w-4" /> {pending ? 'Saving...' : 'Save Playbook'}</Button>
      </div>
    </div>
  );
}

function QuestionRow({ question, index, update, remove }: {
  question: PlaybookQuestion;
  index: number;
  update: (index: number, patch: Partial<PlaybookQuestion>) => void;
  remove: (index: number) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 lg:grid-cols-[70px_180px_minmax(0,1fr)_110px_90px]">
      <div className="space-y-1.5"><Label>Order</Label><Input type="number" value={question.order} onChange={(e) => update(index, { order: Number(e.target.value) })} /></div>
      <div className="space-y-1.5"><Label>Key</Label><Input value={question.key} onChange={(e) => update(index, { key: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Question</Label><Input value={question.question} onChange={(e) => update(index, { question: e.target.value })} /></div>
      <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={question.required} onChange={(e) => update(index, { required: e.target.checked })} /> Required</label>
      <div className="flex items-end justify-end"><Button size="icon" variant="ghost" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button></div>
      {question.choices?.length ? <Badge variant="outline" className="w-fit lg:col-span-5">{question.choices.join(' / ')}</Badge> : null}
    </div>
  );
}
