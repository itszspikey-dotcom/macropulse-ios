import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Sparkles,
  BookOpen,
  Database,
  Settings,
  Flame,
  Wifi,
  WifiOff,
  ArrowUpDown,
  DownloadCloud,
} from 'lucide-react';
import { UserProfile } from '../types/nutrition';

interface SidebarRailProps {
  activeTab: 'tracker' | 'analytics';
  setActiveTab: (tab: 'tracker' | 'analytics') => void;
  onOpenAiAdvisor: () => void;
  onOpenRecipeBuilder: () => void;
  onOpenSchemaModal: () => void;
  onOpenGoalsModal: () => void;
  onOpenDataManagement: () => void;
  isOnline: boolean;
  pendingSyncCount: number;
  userProfile: UserProfile;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({
  activeTab,
  setActiveTab,
  onOpenAiAdvisor,
  onOpenRecipeBuilder,
  onOpenSchemaModal,
  onOpenGoalsModal,
  onOpenDataManagement,
  isOnline,
  pendingSyncCount,
  userProfile,
}) => {
  return (
    <aside className="w-20 md:w-60 bg-[#0b0b0c] border-r border-white/10 flex flex-col p-4 md:p-8 shrink-0 z-30 select-none">
      {/* Brand Logo in Oswald Accent */}
      <div
        className="mb-8 md:mb-12 cursor-pointer flex items-center gap-2 group"
        onClick={() => setActiveTab('tracker')}
      >
        <span className="font-oswald text-xl md:text-2xl font-bold tracking-[0.12em] text-[#facc15] group-hover:text-yellow-300 transition">
          MACROPULSE
        </span>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex flex-col space-y-2 md:space-y-3 flex-1">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab('tracker')}
          className={`flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer font-geist ${
            activeTab === 'tracker'
              ? 'text-white bg-white/5 border border-white/10'
              : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0 text-[#facc15]" />
          <span className="hidden md:inline uppercase tracking-wider font-semibold">Dashboard</span>
        </button>

        {/* Analytics */}
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer font-geist ${
            activeTab === 'analytics'
              ? 'text-white bg-white/5 border border-white/10'
              : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <BarChart3 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="hidden md:inline uppercase tracking-wider font-semibold">Analytics</span>
        </button>

        {/* AI Nutrition Coach */}
        <button
          onClick={onOpenAiAdvisor}
          className="flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium text-white/40 hover:text-white hover:bg-white/[0.02] transition cursor-pointer font-geist"
        >
          <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
          <span className="hidden md:inline uppercase tracking-wider font-semibold">AI Coach</span>
        </button>

        {/* Recipe Builder */}
        <button
          onClick={onOpenRecipeBuilder}
          className="flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium text-white/40 hover:text-white hover:bg-white/[0.02] transition cursor-pointer font-geist"
        >
          <BookOpen className="w-4 h-4 shrink-0 text-sky-400" />
          <span className="hidden md:inline uppercase tracking-wider font-semibold">Recipes</span>
        </button>

        {/* Export / Import & APIs */}
        <button
          onClick={onOpenDataManagement}
          className="flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium text-white/40 hover:text-white hover:bg-white/[0.02] transition cursor-pointer font-geist"
        >
          <ArrowUpDown className="w-4 h-4 shrink-0 text-[#facc15]" />
          <span className="hidden md:inline uppercase tracking-wider font-semibold">Export / Import</span>
        </button>

        {/* Supabase Schema */}
        <button
          onClick={onOpenSchemaModal}
          className="flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium text-white/40 hover:text-white hover:bg-white/[0.02] transition cursor-pointer font-geist"
        >
          <Database className="w-4 h-4 shrink-0 text-indigo-400" />
          <span className="hidden md:inline uppercase tracking-wider font-semibold">Database</span>
        </button>

        {/* Goals & Settings */}
        <button
          onClick={onOpenGoalsModal}
          className="flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium text-white/40 hover:text-white hover:bg-white/[0.02] transition cursor-pointer font-geist"
        >
          <Settings className="w-4 h-4 shrink-0 text-slate-400" />
          <span className="hidden md:inline uppercase tracking-wider font-semibold">Target & TDEE</span>
        </button>
      </nav>

      {/* Bottom Footer with Streak and Sync Status */}
      <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
        {/* Daily Streak Highlight */}
        <div
          onClick={onOpenGoalsModal}
          className="cursor-pointer group"
          title="Daily Tracking Streak"
        >
          <div className="font-mono-meta text-[10px] text-white/40 uppercase mb-1">
            Daily Streak
          </div>
          <div className="font-oswald text-2xl md:text-3xl text-[#facc15] font-semibold tracking-wider group-hover:text-yellow-300 transition">
            {String(userProfile.streakDays || 1).padStart(2, '0')} DAYS
          </div>
        </div>

        {/* Sync Indicator */}
        <div
          onClick={onOpenDataManagement}
          className="flex items-center gap-2 pt-2 text-[11px] font-mono-meta text-white/40 cursor-pointer hover:text-white transition"
          title="Click to manage data or view open source APIs"
        >
          {isOnline ? (
            pendingSyncCount > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#facc15] animate-spin" />
                <span className="hidden md:inline">SYNCING ({pendingSyncCount})</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="hidden md:inline">LOCAL DB SYNCED</span>
              </>
            )
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="hidden md:inline">OFFLINE MODE</span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
