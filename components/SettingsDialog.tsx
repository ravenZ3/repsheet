'use client';

import { useState, useEffect } from 'react';
import { Settings, Loader2, Plus, Minus, Lock, Unlock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(20);
  const [targetRetention, setTargetRetention] = useState(0.90);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leetcodeUsername, setLeetcodeUsername] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [originalUsername, setOriginalUsername] = useState("");

  const [codeforcesHandle, setCodeforcesHandle] = useState("");
  const [isCFLocked, setIsCFLocked] = useState(false);
  const [cfOriginalUsername, setCfOriginalUsername] = useState("");

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.dailyReviewLimit) setLimit(data.dailyReviewLimit);
          if (data.fsrsTargetRetention) setTargetRetention(data.fsrsTargetRetention);
          if (data.leetcodeUsername) {
            setLeetcodeUsername(data.leetcodeUsername);
            setOriginalUsername(data.leetcodeUsername);
            setIsLocked(true);
          }
          if (data.codeforcesHandle) {
            setCodeforcesHandle(data.codeforcesHandle);
            setCfOriginalUsername(data.codeforcesHandle);
            setIsCFLocked(true);
          }
        })
        .catch(() => toast.error('Failed to load settings'))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyReviewLimit: Number(limit), leetcodeUsername: leetcodeUsername.trim(), fsrsTargetRetention: targetRetention }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      toast.success('Settings saved successfully');
      setOpen(false);
      
      // Since dashboard relies on Server Components natively fetching data, we reload to sync UI metric widget.
      window.location.reload(); 
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!leetcodeUsername.trim() && !codeforcesHandle.trim()) return;
    setSyncing(true);
    try {
      // Auto-save the usernames first if unlocked
      const patchData: Record<string, unknown> = {};
      
      const lUser = leetcodeUsername.trim();
      const cUser = codeforcesHandle.trim();
      
      if (lUser && !isLocked && lUser !== originalUsername) patchData.leetcodeUsername = lUser;
      if (cUser && !isCFLocked && cUser !== cfOriginalUsername) patchData.codeforcesHandle = cUser;

      if (Object.keys(patchData).length > 0) {
        const sr = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchData),
        });
        if (!sr.ok) {
           const se = await sr.json();
           throw new Error(se.error || "Failed to patch handles");
        }
      }
      
      const promises = [];
      if (lUser) promises.push(fetch('/api/sync/leetcode', { method: 'POST' }).then(r => r.json()));
      if (cUser) promises.push(fetch('/api/sync/codeforces', { method: 'POST' }).then(r => r.json()));

      const results = await Promise.all(promises);
      
      const err = results.find(r => r.error);
      if (err) throw new Error(err.error);

      const totalSynced = results.reduce((acc, curr) => acc + (curr.synced || 0), 0);
      const totalSkipped = results.reduce((acc, curr) => acc + (curr.skipped || 0), 0);
      
      toast.success(`Success! Synced ${totalSynced} new problems. ${totalSkipped} skipped.`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors text-gray-600 dark:text-[rgba(255,255,255,0.7)] text-[13px] font-medium">
          <Settings className="w-4 h-4" />
          <span className="md:hidden">Global Settings</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#111] border border-gray-200 dark:border-white/[0.08] shadow-2xl overflow-hidden [&>button:first-of-type]:hidden p-0 gap-0">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mix-blend-overlay pointer-events-none" />
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
          <DialogTitle className="text-[15px] font-medium text-gray-900 dark:text-[rgba(255,255,255,0.95)]">Global Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 p-6">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="text-center">
                <label className="text-[13px] font-semibold text-gray-700 dark:text-[#888] tracking-wide block">
                  Daily Review Limit
                </label>
                <p className="text-[12px] text-gray-500 dark:text-[#555] mt-1 max-w-[280px] mx-auto">
                  Maximum number of due problems shown in your daily backlog. Capping this ensures consistent pacing.
                </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
              </div>
            ) : (
              <div className="flex justify-center items-center">
                <div className="relative flex items-center">
                  <span className="text-6xl font-light tracking-tighter text-gray-900 dark:text-[rgba(255,255,255,0.95)] mr-6 w-24 text-right tabular-nums select-none flex-shrink-0">
                    {limit}
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setLimit((prev) => Math.min(500, prev + 1))}
                      className="w-8 h-8 rounded-md bg-gray-100 dark:bg-white/[0.04] border border-transparent dark:border-white/[0.04] flex items-center justify-center text-gray-600 dark:text-[#888] hover:dark:bg-white/[0.08] hover:dark:text-[rgba(255,255,255,0.9)] transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4 stroke-[2]" />
                    </button>
                    <button
                      onClick={() => setLimit((prev) => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-md bg-gray-100 dark:bg-white/[0.04] border border-transparent dark:border-white/[0.04] flex items-center justify-center text-gray-600 dark:text-[#888] hover:dark:bg-white/[0.08] hover:dark:text-[rgba(255,255,255,0.9)] transition-all active:scale-95"
                    >
                      <Minus className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

            <div className="w-full h-[1px] bg-gray-100 dark:bg-white/[0.06] my-2" />
            <div className="flex flex-col items-center justify-center space-y-4 px-2 py-2">
                <div className="text-center">
                    <label className="text-[13px] font-semibold text-gray-700 dark:text-[#888] tracking-wide block">
                      Target Retention
                    </label>
                    <p className="text-[12px] text-gray-500 dark:text-[#555] mt-1 max-w-[280px] mx-auto leading-relaxed">
                      Controls FSRS algorithm aggression. High retention pushes more daily reviews.
                    </p>
                </div>
                <div className="w-full max-w-[240px] mt-2">
                    <div className="flex justify-between text-[11px] font-medium text-gray-400 dark:text-[#666] mb-2 px-1">
                        <span>Maintenance<br/>(80%)</span>
                        <span className="text-center ml-2">Default<br/>(90%)</span>
                        <span className="text-right">Exam Mode<br/>(96%)</span>
                    </div>
                    <input 
                        type="range" 
                        min="0.75" 
                        max="0.99" 
                        step="0.01" 
                        value={targetRetention}
                        onChange={(e) => setTargetRetention(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 dark:bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                    />
                    <div className="text-center mt-3 font-semibold text-[15px] text-gray-900 dark:text-white">
                        {Math.round(targetRetention * 100)}%
                    </div>
                </div>
            </div>

            <div className="w-full h-[1px] bg-gray-100 dark:bg-white/[0.06] my-4" />
            <div className="w-full px-6 flex flex-col items-center">
                <label className="text-[13px] font-semibold text-gray-700 dark:text-[#888] tracking-wide block mb-3 text-center">
                  Platform Integrations
                </label>
                <div className="flex flex-col gap-2 w-full max-w-[320px]">
                    <div className="relative w-full">
                        <Input 
                            placeholder="LeetCode Handle" 
                            value={leetcodeUsername}
                            onChange={(e) => setLeetcodeUsername(e.target.value)}
                            disabled={isLocked}
                            className={`bg-gray-50 dark:bg-white/[0.03] border-[#ffa116]/20 text-sm h-9 pr-9 transition-opacity ${isLocked ? 'opacity-60 cursor-not-allowed select-none' : 'opacity-100'}`}
                        />
                        {isLocked ? (
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (window.confirm("Warning: Changing your LeetCode handle will synchronize problems from a different account. Are you sure you want to unlock this?")) setIsLocked(false);
                                }}
                                title="Click to unlock"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-[#666] dark:hover:text-white transition-colors"
                            >
                                <Lock className="w-4 h-4" />
                            </button>
                        ) : originalUsername && (
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    setLeetcodeUsername(originalUsername);
                                    setIsLocked(true);
                                }}
                                title="Lock handle"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-600 dark:text-emerald-500/80 dark:hover:text-emerald-400 transition-colors"
                            >
                                <Unlock className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    
                    <div className="relative w-full">
                        <Input 
                            placeholder="Codeforces Handle" 
                            value={codeforcesHandle}
                            onChange={(e) => setCodeforcesHandle(e.target.value)}
                            disabled={isCFLocked}
                            className={`bg-gray-50 dark:bg-white/[0.03] border-[#318ce7]/20 text-sm h-9 pr-9 transition-opacity ${isCFLocked ? 'opacity-60 cursor-not-allowed select-none' : 'opacity-100'}`}
                        />
                        {isCFLocked ? (
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (window.confirm("Warning: Changing your Codeforces handle will synchronize problems from a different account. Are you sure you want to unlock this?")) setIsCFLocked(false);
                                }}
                                title="Click to unlock"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-[#666] dark:hover:text-white transition-colors"
                            >
                                <Lock className="w-4 h-4" />
                            </button>
                        ) : cfOriginalUsername && (
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    setCodeforcesHandle(cfOriginalUsername);
                                    setIsCFLocked(true);
                                }}
                                title="Lock handle"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-600 dark:text-emerald-500/80 dark:hover:text-emerald-400 transition-colors"
                            >
                                <Unlock className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <Button 
                        onClick={handleSync} 
                        disabled={syncing || (!leetcodeUsername.trim() && !codeforcesHandle.trim())}
                        className="w-full bg-[#10b981] hover:bg-[#059669] text-white shadow-sm transition-all focus:ring-0 h-9 text-[12px] mt-1"
                    >
                        {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sync Recent Activity"}
                    </Button>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-[#555] mt-3 text-center px-4">
                  Automatically downloads your recent accepted submissions. Existing problems will not be overwritten.
                </p>
            </div>

        </div>
        <div className="flex justify-end gap-3 p-4 px-6 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-black/20 mt-auto">
          <Button variant="outline" onClick={() => setOpen(false)} className="transition-all duration-200 border-gray-200 bg-transparent dark:border-white/[0.08] dark:text-[#888] hover:bg-gray-100 dark:hover:bg-white/[0.05] dark:hover:text-white h-8 text-[12px] px-4 shadow-none">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving} className="transition-all duration-200 bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-white/90 shadow-sm active:scale-95 h-8 text-[12px] px-5 font-medium border-0">
            {saving ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
