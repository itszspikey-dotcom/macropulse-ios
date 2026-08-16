import { FoodItem, LoggedFood, ServingUnit, UserProfile } from '../types/nutrition';

/**
 * PRODUCTION-GRADE NUTRITIONAL MATHEMATICS
 * Rule 1: Always calculate macros and calories dynamically based on weight in grams:
 *   Calories = (consumed_serving_g / 100) * calories_per_100g
 * Rule 2: Round macros to 1 decimal place and total calories to whole integers.
 */

// Common standard gram conversions (water density 1g = 1ml)
export const UNIT_TO_GRAM_MULTIPLIERS: Record<ServingUnit, number> = {
  g: 1,
  oz: 28.3495,
  ml: 1, // assumes ~1.0 g/ml baseline unless custom food specifies otherwise
  fl_oz: 29.5735,
  serving: 100, // fallback if not specified on food item
  cup: 240,
  tbsp: 15,
  tsp: 5,
  piece: 50,
  slice: 45,
  pack: 250,
};

/**
 * Converts any quantity and serving unit into weight in grams (g)
 */
export function convertToGrams(
  amount: number,
  unit: ServingUnit,
  food?: Pick<FoodItem, 'servingOptions' | 'defaultServingSize' | 'defaultServingUnit'>
): number {
  if (amount <= 0 || isNaN(amount)) return 0;

  // 1. Check if the food item provides an explicit custom serving option match
  if (food?.servingOptions && food.servingOptions.length > 0) {
    const matchedOption = food.servingOptions.find((opt) => opt.unit === unit);
    if (matchedOption && matchedOption.gramWeight > 0) {
      return (amount * matchedOption.gramWeight);
    }
  }

  // 2. If unit is 'serving' and default serving is defined
  if (unit === 'serving' && food?.defaultServingSize) {
    const baseGrams = food.defaultServingUnit === 'g' || food.defaultServingUnit === 'ml'
      ? food.defaultServingSize
      : food.defaultServingSize * (UNIT_TO_GRAM_MULTIPLIERS[food.defaultServingUnit] || 1);
    return amount * baseGrams;
  }

  // 3. Fallback to standard universal conversion table
  const multiplier = UNIT_TO_GRAM_MULTIPLIERS[unit] || 1;
  return amount * multiplier;
}

/**
 * Precision Rounding Helpers:
 * Calories -> Whole Integer
 * Macros (P, C, F, Fiber) -> 1 Decimal Place
 */
export function roundCalories(val: number): number {
  if (!val || isNaN(val)) return 0;
  return Math.round(val);
}

export function roundMacro(val: number): number {
  if (!val || isNaN(val)) return 0;
  return Math.round(val * 10) / 10;
}

/**
 * Core Dynamic Nutritional Computation Engine
 * Given a base food (with per 100g values) and a consumed serving portion,
 * computes exact portion grams and exact scaled macros.
 */
export function computeNutritionForPortion(
  food: FoodItem,
  amount: number,
  unit: ServingUnit
): {
  servingGramWeight: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  micros?: Record<string, number>;
} {
  const gramWeight = convertToGrams(amount, unit, food);
  const ratio = gramWeight / 100;

  const rawCalories = (food.caloriesPer100g || 0) * ratio;
  const rawProtein = (food.proteinPer100g || 0) * ratio;
  const rawCarbs = (food.carbsPer100g || 0) * ratio;
  const rawFat = (food.fatPer100g || 0) * ratio;
  const rawFiber = (food.fiberPer100g || 0) * ratio;

  const scaledMicros: Record<string, number> = {};
  if (food.micros) {
    Object.entries(food.micros).forEach(([key, val]) => {
      if (typeof val === 'number') {
        scaledMicros[key] = roundMacro(val * ratio);
      }
    });
  }

  return {
    servingGramWeight: roundMacro(gramWeight),
    calories: roundCalories(rawCalories),
    protein: roundMacro(rawProtein),
    carbs: roundMacro(rawCarbs),
    fat: roundMacro(rawFat),
    fiber: roundMacro(rawFiber),
    micros: scaledMicros,
  };
}

/**
 * Calculates sum of logged foods with precision
 */
export function aggregateLoggedFoods(items: LoggedFood[]) {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;

  items.forEach((item) => {
    calories += item.calories || 0;
    protein += item.protein || 0;
    carbs += item.carbs || 0;
    fat += item.fat || 0;
    fiber += item.fiber || 0;
  });

  return {
    calories: roundCalories(calories),
    protein: roundMacro(protein),
    carbs: roundMacro(carbs),
    fat: roundMacro(fat),
    fiber: roundMacro(fiber),
  };
}

/**
 * Calculates Mifflin-St Jeor Basal Metabolic Rate (BMR)
 * Men: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
 * Women: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
 */
export function calculateBMR(
  gender: 'male' | 'female' | 'other',
  weightKg: number,
  heightCm: number,
  age: number
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'female') {
    return Math.round(base - 161);
  }
  if (gender === 'male') {
    return Math.round(base + 5);
  }
  return Math.round(base - 78); // Average for non-binary / other
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE) based on activity multiplier
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: UserProfile['activityLevel']
): number {
  const multipliers: Record<UserProfile['activityLevel'], number> = {
    sedentary: 1.2,       // Little to no exercise, desk job
    light: 1.375,         // Light exercise 1-3 days/week
    moderate: 1.55,       // Moderate exercise 3-5 days/week
    very_active: 1.725,   // Heavy exercise 6-7 days/week
    extra_active: 1.9,    // Very heavy athletic training / physical labor
  };

  const mult = multipliers[activityLevel] || 1.375;
  return Math.round(bmr * mult);
}

/**
 * Calculates recommended macro targets based on goal
 */
export function calculateRecommendedMacros(
  tdee: number,
  weightKg: number,
  goalType: UserProfile['goalType'],
  customDistribution?: { proteinPct: number; carbsPct: number; fatPct: number }
): {
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  targetFiberG: number;
  targetWaterMl: number;
} {
  let targetCalories = tdee;

  if (goalType === 'cut') {
    // 20% caloric deficit for sustainable fat loss
    targetCalories = Math.round(tdee * 0.8);
  } else if (goalType === 'bulk') {
    // 10-15% caloric surplus for lean muscle gain
    targetCalories = Math.round(tdee * 1.12);
  }

  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;

  if (goalType === 'keto') {
    // Keto: 5% Carbs, 25% Protein, 70% Fat
    proteinG = Math.round((targetCalories * 0.25) / 4);
    carbsG = Math.round((targetCalories * 0.05) / 4);
    fatG = Math.round((targetCalories * 0.70) / 9);
  } else if (customDistribution) {
    proteinG = Math.round((targetCalories * (customDistribution.proteinPct / 100)) / 4);
    carbsG = Math.round((targetCalories * (customDistribution.carbsPct / 100)) / 4);
    fatG = Math.round((targetCalories * (customDistribution.fatPct / 100)) / 9);
  } else {
    // High-performance sports baseline:
    // Protein: 2.0g per kg of bodyweight
    proteinG = Math.round(Math.min(targetCalories * 0.35 / 4, weightKg * 2.0));
    // Fat: 25% of total calories
    const fatCalories = targetCalories * 0.28;
    fatG = Math.round(fatCalories / 9);
    // Remaining calories from complex carbs (4 kcal/g)
    const remainingCalories = Math.max(0, targetCalories - (proteinG * 4 + fatG * 9));
    carbsG = Math.round(remainingCalories / 4);
  }

  // Dietary fiber baseline: 14g per 1000 kcal consumed
  const fiberG = Math.round((targetCalories / 1000) * 14);

  // Water baseline: ~35ml per kg bodyweight + activity buffer
  const waterMl = Math.round(weightKg * 38);

  return {
    targetCalories,
    targetProteinG: roundMacro(proteinG),
    targetCarbsG: roundMacro(carbsG),
    targetFatG: roundMacro(fatG),
    targetFiberG: roundMacro(fiberG),
    targetWaterMl: Math.max(2000, waterMl),
  };
}
