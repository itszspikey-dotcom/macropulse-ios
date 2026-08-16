import React, { useState } from 'react';
import {
  X,
  Target,
  Calculator,
  Flame,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types/nutrition';
import {
  calculateBMR,
  calculateRecommendedMacros,
  calculateTDEE,
} from '../services/nutritionMath';
import { playSuccessChime, triggerHaptic } from '../services/audioFeedback';

interface GoalsAndTdeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onSaveProfile: (updated: Partial<UserProfile>) => void;
}

export const GoalsAndTdeeModal: React.FC<GoalsAndTdeeModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSaveProfile,
}) => {
  if (!isOpen) return null;

  const [gender, setGender] = useState<UserProfile['gender']>(userProfile.gender);
  const [age, setAge] = useState<number>(userProfile.age);
  const [heightCm, setHeightCm] = useState<number>(userProfile.heightCm);
  const [weightKg, setWeightKg] = useState<number>(userProfile.weightKg);
  const [activityLevel, setActivityLevel] = useState<UserProfile['activityLevel']>(
    userProfile.activityLevel
  );
  const [goalType, setGoalType] = useState<UserProfile['goalType']>(userProfile.goalType);

  // Computed BMR & TDEE
  const bmr = calculateBMR(gender, weightKg, heightCm, age);
  const tdee = calculateTDEE(bmr, activityLevel);
  const rec = calculateRecommendedMacros(tdee, weightKg, goalType);

  // Target overrides
  const [targetCalories, setTargetCalories] = useState<number>(userProfile.targetCalories);
  const [targetProteinG, setTargetProteinG] = useState<number>(userProfile.targetProteinG);
  const [targetCarbsG, setTargetCarbsG] = useState<number>(userProfile.targetCarbsG);
  const [targetFatG, setTargetFatG] = useState<number>(userProfile.targetFatG);
  const [targetFiberG, setTargetFiberG] = useState<number>(userProfile.targetFiberG);
  const [targetWaterMl, setTargetWaterMl] = useState<number>(userProfile.targetWaterMl);

  const handleApplyRecommended = () => {
    setTargetCalories(rec.targetCalories);
    setTargetProteinG(rec.targetProteinG);
    setTargetCarbsG(rec.targetCarbsG);
    setTargetFatG(rec.targetFatG);
    setTargetFiberG(rec.targetFiberG);
    setTargetWaterMl(rec.targetWaterMl);
    triggerHaptic('light');
  };

  const handleSave = () => {
    onSaveProfile({
      gender,
      age,
      heightCm,
      weightKg,
      activityLevel,
      goalType,
      bmr,
      tdee,
      targetCalories,
      targetProteinG,
      targetCarbsG,
      targetFatG,
      targetFiberG,
      targetWaterMl,
    });

    playSuccessChime();
    triggerHaptic('success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 text-white">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Goals & TDEE Calculator</h3>
              <p className="text-[11px] text-slate-400">Mifflin-St Jeor scientific energy expenditure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-white flex-1">
          {/* Biometrics Input Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Age</label>
              <input
                type="number"
                min="14"
                max="100"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value, 10) || 25)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white text-center"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Height (cm)</label>
              <input
                type="number"
                min="100"
                max="250"
                value={heightCm}
                onChange={(e) => setHeightCm(parseFloat(e.target.value) || 175)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white text-center"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Weight (kg)</label>
              <input
                type="number"
                min="30"
                max="300"
                step="0.5"
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 70)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white text-center"
              />
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Daily Activity Multiplier
            </label>
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="sedentary">Sedentary (Desk Job, Little to no exercise - 1.2x)</option>
              <option value="light">Light Activity (Exercise 1-3 days/wk - 1.375x)</option>
              <option value="moderate">Moderate Activity (Exercise 3-5 days/wk - 1.55x)</option>
              <option value="very_active">Very Active (Heavy training 6-7 days/wk - 1.725x)</option>
              <option value="extra_active">Extra Active (Athlete / physical labor - 1.9x)</option>
            </select>
          </div>

          {/* Goal Preset Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Fitness Strategy
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'cut', label: 'Fat Loss Cut (-20%)' },
                  { id: 'maintain', label: 'Maintenance (0%)' },
                  { id: 'bulk', label: 'Lean Bulk (+12%)' },
                  { id: 'keto', label: 'Ketogenic' },
                ] as const
              ).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoalType(g.id)}
                  className={`py-2 px-1 text-[11px] font-bold rounded-xl text-center transition cursor-pointer ${
                    goalType === g.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Energy Breakdown Card */}
          <div className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">BMR: <strong className="text-white">{bmr} kcal</strong></div>
              <div className="text-xs text-slate-400">TDEE: <strong className="text-white">{tdee} kcal/day</strong></div>
            </div>
            <div className="text-right">
              <div className="text-xs text-emerald-400 font-bold">Recommended Target</div>
              <div className="text-lg font-black text-white">{rec.targetCalories} kcal</div>
            </div>
          </div>

          {/* Custom Targets Form with Recalculate Button */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Custom Target Goals</span>
              <button
                type="button"
                onClick={handleApplyRecommended}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Apply Scientific Recommendation
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-2.5">
                <label className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                  Daily Calories (kcal)
                </label>
                <input
                  type="number"
                  value={targetCalories}
                  onChange={(e) => setTargetCalories(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white text-center"
                />
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-2.5">
                <label className="text-[10px] uppercase font-bold text-sky-400 block mb-1">
                  Water Target (ml)
                </label>
                <input
                  type="number"
                  value={targetWaterMl}
                  onChange={(e) => setTargetWaterMl(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-2 text-center">
                <label className="text-[10px] font-bold text-indigo-400 block mb-1">Protein (g)</label>
                <input
                  type="number"
                  value={targetProteinG}
                  onChange={(e) => setTargetProteinG(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-xs font-bold text-white text-center"
                />
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-2 text-center">
                <label className="text-[10px] font-bold text-amber-400 block mb-1">Carbs (g)</label>
                <input
                  type="number"
                  value={targetCarbsG}
                  onChange={(e) => setTargetCarbsG(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-xs font-bold text-white text-center"
                />
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-2 text-center">
                <label className="text-[10px] font-bold text-rose-400 block mb-1">Fat (g)</label>
                <input
                  type="number"
                  value={targetFatG}
                  onChange={(e) => setTargetFatG(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-xs font-bold text-white text-center"
                />
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-2 text-center">
                <label className="text-[10px] font-bold text-teal-400 block mb-1">Fiber (g)</label>
                <input
                  type="number"
                  value={targetFiberG}
                  onChange={(e) => setTargetFiberG(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-xs font-bold text-white text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Save Biometric Goals
          </button>
        </div>
      </div>
    </div>
  );
};
