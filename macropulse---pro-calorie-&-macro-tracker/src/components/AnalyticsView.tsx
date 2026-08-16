import React from 'react';
import { Flame, TrendingUp } from 'lucide-react';
import { UserProfile } from '../types/nutrition';
import { syncEngine } from '../services/syncEngine';

interface AnalyticsViewProps {
  userProfile: UserProfile;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ userProfile }) => {
  // Generate last 7 days metrics
  const days: {
    dateStr: string;
    label: string;
    dayNum: string;
    calories: number;
    target: number;
    protein: number;
    carbs: number;
    fat: number;
  }[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const summary = syncEngine.getDailySummary(dateStr);
    days.push({
      dateStr,
      label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.toLocaleDateString('en-US', { day: 'numeric' }),
      calories: summary.calories,
      target: userProfile.targetCalories,
      protein: summary.protein,
      carbs: summary.carbs,
      fat: summary.fat,
    });
  }

  const totalLoggedCals = days.reduce((acc, d) => acc + d.calories, 0);
  const activeDaysCount = days.filter((d) => d.calories > 0).length || 1;
  const avgCalories = Math.round(totalLoggedCals / activeDaysCount);
  const avgProtein = Math.round(days.reduce((acc, d) => acc + d.protein, 0) / activeDaysCount);
  const avgCarbs = Math.round(days.reduce((acc, d) => acc + d.carbs, 0) / activeDaysCount);
  const avgFat = Math.round(days.reduce((acc, d) => acc + d.fat, 0) / activeDaysCount);

  const maxCal = Math.max(userProfile.targetCalories * 1.25, ...days.map((d) => d.calories), 2400);

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="cinematic-card p-6 rounded-sm">
          <div className="font-mono-meta text-xs text-white/40">
            Daily Average
          </div>
          <div className="font-oswald text-3xl sm:text-4xl text-white font-semibold my-2">
            {avgCalories} <span className="text-sm font-normal text-white/40">KCAL</span>
          </div>
          <div className="font-mono-meta text-xs text-[#facc15]">
            Target: {userProfile.targetCalories} KCAL
          </div>
        </div>

        <div className="cinematic-card p-6 rounded-sm">
          <div className="font-mono-meta text-xs text-white/40">
            Avg Protein
          </div>
          <div className="font-oswald text-3xl sm:text-4xl text-[#facc15] font-semibold my-2">
            {avgProtein}g <span className="text-sm font-normal text-white/40">/ DAY</span>
          </div>
          <div className="font-mono-meta text-xs text-white/40">
            Goal: {userProfile.targetProteinG}g ({Math.round((avgProtein / (userProfile.targetProteinG || 1)) * 100)}%)
          </div>
        </div>

        <div className="cinematic-card p-6 rounded-sm">
          <div className="font-mono-meta text-xs text-white/40">
            Active Streak
          </div>
          <div className="font-oswald text-3xl sm:text-4xl text-amber-400 font-semibold my-2 flex items-center gap-2">
            <Flame className="w-6 h-6 fill-amber-400 text-amber-400" />
            {String(userProfile.streakDays).padStart(2, '0')} DAYS
          </div>
          <div className="font-mono-meta text-xs text-white/40">
            Continuous Performance
          </div>
        </div>

        <div className="cinematic-card p-6 rounded-sm">
          <div className="font-mono-meta text-xs text-white/40">
            Strategy Profile
          </div>
          <div className="font-oswald text-3xl sm:text-4xl text-white font-semibold my-2 uppercase">
            {userProfile.goalType}
          </div>
          <div className="font-mono-meta text-xs text-white/40 uppercase">
            {userProfile.activityLevel.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* 7-Day Adherence Chart */}
      <div className="cinematic-card p-6 sm:p-8 rounded-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="font-mono-meta text-xs text-white/40 mb-1">
              Consistency Adherence
            </div>
            <h3 className="font-oswald text-2xl font-semibold text-white uppercase tracking-tight">
              7-Day Energy Intake vs Target
            </h3>
          </div>
          <div className="flex items-center gap-6 font-mono-meta text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#facc15] rounded-xs" />
              <span className="text-white/70">Consumed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-t border-dashed border-white/40" />
              <span className="text-white/40">Target Line</span>
            </div>
          </div>
        </div>

        {/* Visualizer */}
        <div className="h-64 flex items-end justify-between gap-4 pt-6 border-b border-white/10">
          {days.map((day) => {
            const heightPct = Math.min(100, Math.round((day.calories / maxCal) * 100));
            const targetHeightPct = Math.min(100, Math.round((day.target / maxCal) * 100));
            const isMet = day.calories > 0 && Math.abs(day.calories - day.target) <= 200;

            return (
              <div
                key={day.dateStr}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
              >
                <div className="relative w-full max-w-[54px] flex items-end justify-center h-full">
                  {/* Target line */}
                  <div
                    className="absolute w-full border-t border-dashed border-white/20 pointer-events-none z-10"
                    style={{ bottom: `${targetHeightPct}%` }}
                    title={`Target: ${day.target} kcal`}
                  />

                  {/* Bar */}
                  <div
                    className={`w-full rounded-xs transition-all duration-500 relative ${
                      day.calories === 0
                        ? 'bg-white/5 h-2'
                        : isMet
                        ? 'bg-[#facc15] shadow-lg shadow-yellow-400/20'
                        : day.calories > day.target
                        ? 'bg-amber-500'
                        : 'bg-white/30'
                    }`}
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                  >
                    {/* Hover tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-[#141416] border border-white/20 text-white font-oswald text-xs py-1 px-2.5 rounded whitespace-nowrap pointer-events-none transition z-20">
                      {day.calories} KCAL
                    </div>
                  </div>
                </div>

                <div className="text-center mt-3">
                  <div className="font-oswald text-sm font-medium text-white uppercase">{day.label}</div>
                  <div className="font-mono-meta text-[10px] text-white/30">{day.dayNum}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Average Daily Macro Split */}
      <div className="cinematic-card p-6 sm:p-8 rounded-sm">
        <div className="font-mono-meta text-xs text-white/40 mb-1">
          Macronutrient Energy Distribution
        </div>
        <h3 className="font-oswald text-2xl font-semibold text-white uppercase tracking-tight mb-6">
          Macro Energy Split (4 / 4 / 9 kcal)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 bg-[#0b0b0c] border border-white/10 rounded-sm">
            <div className="font-mono-meta text-xs text-white/40">Protein</div>
            <div className="font-oswald text-3xl font-semibold text-[#facc15] my-1">{avgProtein}g</div>
            <div className="font-mono-meta text-xs text-white/40">{avgProtein * 4} KCAL (4 kcal/g)</div>
          </div>

          <div className="p-6 bg-[#0b0b0c] border border-white/10 rounded-sm">
            <div className="font-mono-meta text-xs text-white/40">Carbohydrates</div>
            <div className="font-oswald text-3xl font-semibold text-white my-1">{avgCarbs}g</div>
            <div className="font-mono-meta text-xs text-white/40">{avgCarbs * 4} KCAL (4 kcal/g)</div>
          </div>

          <div className="p-6 bg-[#0b0b0c] border border-white/10 rounded-sm">
            <div className="font-mono-meta text-xs text-white/40">Fats</div>
            <div className="font-oswald text-3xl font-semibold text-white my-1">{avgFat}g</div>
            <div className="font-mono-meta text-xs text-white/40">{avgFat * 9} KCAL (9 kcal/g)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
