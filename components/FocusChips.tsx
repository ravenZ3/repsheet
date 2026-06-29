'use client';

import Link from 'next/link';
import { Target } from 'lucide-react';
import type { FocusChip } from '@/lib/focusChips';

/**
 * Renders saved focus tags as one-tap launch chips. Used on both the dashboard
 * and the review page. Renders nothing when there are no chips.
 */
export default function FocusChips({ chips }: { chips: FocusChip[] }) {
  if (!chips || chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-gray-400 dark:text-[#666]">
        <Target className="w-3.5 h-3.5" />
        Focus
      </span>
      {chips.map((chip) => (
        <Link
          key={`${chip.kind}:${chip.label}`}
          href={chip.href}
          className={`inline-flex items-center rounded-[20px] px-3 py-1 text-[12px] font-medium border transition-colors ${
            chip.kind === 'pattern'
              ? 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20'
              : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300 hover:bg-blue-500/20'
          }`}
        >
          {chip.label}
        </Link>
      ))}
    </div>
  );
}
