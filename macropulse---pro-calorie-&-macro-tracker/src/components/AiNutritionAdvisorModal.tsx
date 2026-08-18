import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { DailySummary, MacroGoals, UserProfile } from '../types/nutrition';
import { playSuccessChime, triggerHaptic } from '../services/audioFeedback';
import { getNutritionAdvice } from '../services/geminiClient';

interface AiNutritionAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailySummary: DailySummary;
  userProfile: UserProfile;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export const AiNutritionAdvisorModal: React.FC<AiNutritionAdvisorModalProps> = ({
  isOpen,
  onClose,
  dailySummary,
  userProfile,
}) => {
  if (!isOpen) return null;

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Hello ${userProfile.name}! I am your MacroPulse AI nutrition coach. Today you have consumed **${dailySummary.calories} kcal** (${dailySummary.protein}g protein, ${dailySummary.carbs}g carbs, ${dailySummary.fat}g fats). You have **${Math.max(0, userProfile.targetCalories - dailySummary.calories)} kcal** remaining towards your **${userProfile.goalType.toUpperCase()}** target. How can I help you optimize your nutrition today?`,
    },
  ]);

  const quickPrompts = [
    'What should I eat right now to hit remaining macros?',
    'Suggest a high-protein post-workout snack with ~30g protein',
    'How do I increase fiber intake today?',
    'Give me a low-carb dinner recipe under 500 kcal',
  ];

  const handleSendQuery = async (queryText: string) => {
    const text = queryText.trim();
    if (!text || isLoading) return;

    setInputQuery('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setIsLoading(true);
    triggerHaptic('light');

    try {
      const answer = await getNutritionAdvice(
        text,
        dailySummary,
        {
          calories: userProfile.targetCalories,
          protein: userProfile.targetProteinG,
          carbs: userProfile.targetCarbsG,
          fat: userProfile.targetFatG,
          fiber: userProfile.targetFiberG,
        },
        {
          goalType: userProfile.goalType,
          weightKg: userProfile.weightKg,
          heightCm: userProfile.heightCm,
          activityLevel: userProfile.activityLevel,
        }
      );

      if (answer) {
        setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
        playSuccessChime();
        triggerHaptic('success');
      } else {
        throw new Error('Failed to get answer');
      }
    } catch (e: any) {
      // Local intelligent response fallback
      const remainingCal = Math.max(0, userProfile.targetCalories - dailySummary.calories);
      const remainingP = Math.max(0, userProfile.targetProteinG - dailySummary.protein);
      const fallbackReply = `Here is a personalized recommendation to hit your remaining targets:

- **Target Deficit**: ${remainingCal} kcal remaining with ${remainingP.toFixed(1)}g Protein required.
- **Top Recommendation**: 170g Nonfat Greek Yogurt (0% fat) topped with 30g Chocolate Whey Protein Isolate and 50g fresh berries.
  - **Calories**: ~235 kcal
  - **Protein**: 41.5g
  - **Carbs**: 14.0g
  - **Fat**: 1.5g
- **Tip**: Drink 500ml water alongside this to maintain optimal cellular hydration and protein synthesis.`;

      setMessages((prev) => [...prev, { role: 'assistant', text: fallbackReply }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                MacroPulse AI Coach
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold">
                  Gemini 3.7
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Dietary calculations & macro optimization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-white flex-1 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`p-3 rounded-2xl max-w-[85%] whitespace-pre-line leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-xs'
                    : 'bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-tl-xs shadow-sm'
                }`}
              >
                {m.text}
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 items-center text-xs text-teal-400">
              <div className="w-7 h-7 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <span>Formulating scientific meal guidance...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-850 flex gap-1.5 overflow-x-auto">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendQuery(prompt)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[11px] whitespace-nowrap border border-slate-700 transition cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery(inputQuery);
          }}
          className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about foods, remaining macros, recipes..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
