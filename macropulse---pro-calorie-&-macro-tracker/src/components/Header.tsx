import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  QrCode,
  Sparkles,
  Zap,
  ArrowUpDown,
} from 'lucide-react';
import { DailySummary, UserProfile } from '../types/nutrition';

interface HeaderProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  userProfile: UserProfile;
  dailySummary: DailySummary;
  activeTab: 'tracker' | 'analytics';
  setActiveTab: (tab: 'tracker' | 'analytics') => void;
  onOpenSearch: () => void;
  onOpenBarcode: () => void;
  onOpenAiScan: () => void;
  onOpenQuickAdd: () => void;
  onOpenDataManagement: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onDateChange,
  userProfile,
  dailySummary,
  activeTab,
  setActiveTab,
  onOpenSearch,
  onOpenBarcode,
  onOpenAiScan,
  onOpenQuickAdd,
  onOpenDataManagement,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = currentDate === todayStr;

  const handlePrevDay = () => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const formattedDateTitle = () => {
    const d = new Date(currentDate + 'T12:00:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return `${dayName} / ${monthDay}`;
  };

  const targetCal = userProfile.targetCalories || 2000;
  const remainingCal = targetCal - dailySummary.calories;

  return (
    <header className="px-6 md:px-12 pt-8 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 select-none z-20 border-b border-white/5 bg-[#0b0b0c]/80 backdrop-blur-md">
      {/* Title and Date Strips */}
      <div>
        <div className="flex items-center gap-3 font-mono-meta text-xs text-white/40 tracking-wider">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevDay}
              className="p-1 text-white/40 hover:text-white rounded hover:bg-white/5 transition cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-medium text-white/80">{formattedDateTitle()}</span>
            <button
              onClick={handleNextDay}
              className="p-1 text-white/40 hover:text-white rounded hover:bg-white/5 transition cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {!isToday && (
            <button
              onClick={() => onDateChange(todayStr)}
              className="px-2 py-0.5 text-[10px] bg-[#facc15]/10 border border-[#facc15]/30 text-[#facc15] rounded font-semibold uppercase tracking-wider hover:bg-[#facc15]/20 transition cursor-pointer"
            >
              Today
            </button>
          )}

          <span className="hidden sm:inline text-white/20">•</span>
          <span className="hidden sm:inline text-white/40 font-mono-meta text-[11px]">
            {remainingCal >= 0
              ? `${remainingCal.toLocaleString()} KCAL REMAINING`
              : `${Math.abs(remainingCal).toLocaleString()} KCAL OVER`}
          </span>
        </div>

        <h1 className="font-oswald text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white uppercase mt-2">
          {activeTab === 'tracker' ? 'Daily Performance' : 'Performance Analytics'}
        </h1>
      </div>

      {/* Action Controls & Add Meal Button */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Export / Import & APIs */}
        <button
          onClick={onOpenDataManagement}
          className="flex items-center gap-2 px-3 py-2 bg-[#141416] hover:bg-white/10 text-white/80 hover:text-white border border-white/10 rounded font-mono-meta text-xs transition cursor-pointer"
          title="Export / Import Data & Open APIs"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-[#facc15]" />
          <span className="hidden sm:inline">DATA / APIS</span>
        </button>

        {/* Barcode Quick Trigger */}
        <button
          onClick={onOpenBarcode}
          className="flex items-center gap-2 px-3 py-2 bg-[#141416] hover:bg-white/10 text-white/80 hover:text-white border border-white/10 rounded font-mono-meta text-xs transition cursor-pointer"
          title="Scan Barcode / QR"
        >
          <QrCode className="w-3.5 h-3.5 text-[#facc15]" />
          <span className="hidden sm:inline">BARCODE</span>
        </button>

        {/* AI Snap Recognition */}
        <button
          onClick={onOpenAiScan}
          className="flex items-center gap-2 px-3 py-2 bg-[#141416] hover:bg-white/10 text-white/80 hover:text-white border border-white/10 rounded font-mono-meta text-xs transition cursor-pointer"
          title="AI Photo Recognition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">AI SNAP</span>
        </button>

        {/* Quick Add */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center gap-2 px-3 py-2 bg-[#141416] hover:bg-white/10 text-white/80 hover:text-white border border-white/10 rounded font-mono-meta text-xs transition cursor-pointer"
          title="Quick Add Food"
        >
          <Zap className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">QUICK ADD</span>
        </button>

        {/* Primary Pill Button */}
        <button
          onClick={onOpenSearch}
          className="pill-btn-accent flex items-center gap-2 px-6 py-2.5 rounded text-sm sm:text-base font-bold shadow-lg shadow-yellow-400/10 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Meal</span>
        </button>
      </div>
    </header>
  );
};
