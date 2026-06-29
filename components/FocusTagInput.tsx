'use client';

import { useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { parseFocusTag, formatFocusTag, type FocusTag } from '@/lib/focusTags';

export interface PatternOption {
  id: string;
  name: string;
}

interface Suggestion {
  tag: string; // stored "kind:value"
  label: string;
  kind: 'pattern' | 'skill';
}

/**
 * Obsidian-style multi-tag input for selecting focus patterns/skills.
 * Self-contained: inputs are the available patterns/skills and the current
 * value array (stored "kind:value" strings); output is the new value array.
 */
export default function FocusTagInput({
  value,
  patterns,
  skills,
  onChange,
}: {
  value: string[];
  patterns: PatternOption[];
  skills: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [openSuggest, setOpenSuggest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const patternById = useMemo(
    () => new Map(patterns.map((p) => [p.id, p.name])),
    [patterns]
  );

  const labelFor = (tag: FocusTag): string =>
    tag.kind === 'pattern' ? patternById.get(tag.value) ?? tag.value : tag.value;

  const allSuggestions: Suggestion[] = useMemo(() => {
    const p: Suggestion[] = patterns.map((pat) => ({
      tag: `pattern:${pat.id}`,
      label: pat.name,
      kind: 'pattern',
    }));
    const s: Suggestion[] = skills.map((sk) => ({
      tag: `skill:${sk}`,
      label: sk,
      kind: 'skill',
    }));
    return [...p, ...s];
  }, [patterns, skills]);

  const selected = new Set(value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allSuggestions
      .filter((s) => !selected.has(s.tag))
      .filter((s) => (q ? s.label.toLowerCase().includes(q) : true))
      .slice(0, 50);
  }, [allSuggestions, query, value]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (tag: string) => {
    if (!selected.has(tag)) onChange([...value, tag]);
    setQuery('');
    inputRef.current?.focus();
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const patternSuggestions = filtered.filter((s) => s.kind === 'pattern');
  const skillSuggestions = filtered.filter((s) => s.kind === 'skill');

  return (
    <div className="w-full max-w-[320px] relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] p-2 min-h-[38px]">
        {value.map((raw) => {
          const tag = parseFocusTag(raw);
          if (!tag) return null;
          const isPattern = tag.kind === 'pattern';
          return (
            <span
              key={raw}
              className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[11px] font-medium ${
                isPattern
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300'
                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
              }`}
            >
              {labelFor(tag)}
              <button
                type="button"
                onClick={() => remove(raw)}
                className="opacity-60 hover:opacity-100"
                aria-label={`Remove ${labelFor(tag)}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpenSuggest(true);
          }}
          onFocus={() => setOpenSuggest(true)}
          onBlur={() => setTimeout(() => setOpenSuggest(false), 150)}
          placeholder={value.length === 0 ? 'Add a pattern or skill…' : ''}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-[12px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#555]"
        />
      </div>

      {openSuggest && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-[220px] overflow-y-auto rounded-md border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#1a1a1a] shadow-xl">
          {patternSuggestions.length > 0 && (
            <Group label="Patterns">
              {patternSuggestions.map((s) => (
                <SuggestionRow key={s.tag} s={s} onPick={add} />
              ))}
            </Group>
          )}
          {skillSuggestions.length > 0 && (
            <Group label="Skills">
              {skillSuggestions.map((s) => (
                <SuggestionRow key={s.tag} s={s} onPick={add} />
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-gray-400 dark:text-[#555]">
        {label}
      </div>
      {children}
    </div>
  );
}

function SuggestionRow({ s, onPick }: { s: Suggestion; onPick: (tag: string) => void }) {
  return (
    <button
      type="button"
      // onMouseDown (not onClick) so it fires before the input's onBlur closes the list.
      onMouseDown={(e) => {
        e.preventDefault();
        onPick(s.tag);
      }}
      className="w-full text-left px-3 py-1.5 text-[12px] text-gray-700 dark:text-[#ccc] hover:bg-gray-100 dark:hover:bg-white/[0.06]"
    >
      {s.label}
    </button>
  );
}
