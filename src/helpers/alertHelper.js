/**
 * Alert Helper - Generates health and nutrition alerts
 * Used by dashboard and coach for proactive notifications
 */

const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

/**
 * Generate alerts based on daily totals, goals, and risk data
 * @param {Object} dailyTotals - { calories, carbs, fat, protein, sugar }
 * @param {Object} goals - { calories, carbs, fat, protein, sugar } limits
 * @param {Array} riskData - Array of { diabetesRisk, hypertensionRisk } from scans
 * @param {Object} weeklyAvg - { averageScore, averageGrade } from NutriScore history
 * @returns {Array} Array of alert objects
 */
export function generateAlerts(dailyTotals, goals, riskData, weeklyAvg) {
  const alerts = [];
  const totals = dailyTotals || {};
  const safeGoals = goals || {};
  const safeRisk = riskData || [];
  const defaults = { calories: 2000, carbs: 300, fat: 65, protein: 50, sugar: 50 };
  const limits = { ...defaults, ...safeGoals };

  // Sugar threshold alerts
  const sugarPct = limits.sugar > 0 ? (totals.sugar || 0) / limits.sugar * 100 : 0;
  if (sugarPct >= 100) {
    alerts.push({
      id: 'sugar_exceeded',
      type: 'nutrient',
      severity: SEVERITY.HIGH,
      title: 'Sugar Limit Exceeded',
      message: "You've consumed " + Math.round(totals.sugar || 0) + "g of sugar today (goal: " + limits.sugar + "g). Consider water or unsweetened beverages for the rest of the day.",
      icon: 'warning',
      color: '#e74c3c'
    });
  } else if (sugarPct >= 80) {
    alerts.push({
      id: 'sugar_warning',
      type: 'nutrient',
      severity: SEVERITY.MEDIUM,
      title: 'Approaching Sugar Limit',
      message: "You're at " + Math.round(sugarPct) + "% of your daily sugar goal. You have " + Math.round(limits.sugar - (totals.sugar || 0)) + "g remaining.",
      icon: 'alert-circle',
      color: '#f39c12'
    });
  }

  // Calorie threshold alerts
  const calPct = limits.calories > 0 ? (totals.calories || 0) / limits.calories * 100 : 0;
  if (calPct >= 100) {
    alerts.push({
      id: 'calories_exceeded',
      type: 'nutrient',
      severity: SEVERITY.HIGH,
      title: 'Calorie Goal Exceeded',
      message: "You've consumed " + Math.round(totals.calories || 0) + " kcal today (goal: " + limits.calories + " kcal). Focus on low-calorie foods if eating more.",
      icon: 'flame',
      color: '#e74c3c'
    });
  } else if (calPct >= 90) {
    alerts.push({
      id: 'calories_warning',
      type: 'nutrient',
      severity: SEVERITY.MEDIUM,
      title: 'Near Calorie Limit',
      message: "You're at " + Math.round(calPct) + "% of your daily calorie goal. " + Math.round(limits.calories - (totals.calories || 0)) + " kcal remaining.",
      icon: 'flame-outline',
      color: '#f39c12'
    });
  }

  // Fat alert
  const fatPct = limits.fat > 0 ? (totals.fat || 0) / limits.fat * 100 : 0;
  if (fatPct >= 100) {
    alerts.push({
      id: 'fat_exceeded',
      type: 'nutrient',
      severity: SEVERITY.MEDIUM,
      title: 'Fat Limit Exceeded',
      message: "Fat intake is at " + Math.round(totals.fat || 0) + "g (goal: " + limits.fat + "g). Choose lean proteins and vegetables for remaining meals.",
      icon: 'alert-circle-outline',
      color: '#e74c3c'
    });
  }

  // Carbs alert
  const carbsPct = limits.carbs > 0 ? (totals.carbs || 0) / limits.carbs * 100 : 0;
  if (carbsPct >= 100) {
    alerts.push({
      id: 'carbs_exceeded',
      type: 'nutrient',
      severity: SEVERITY.MEDIUM,
      title: 'Carbs Limit Exceeded',
      message: "Carb intake is at " + Math.round(totals.carbs || 0) + "g (goal: " + limits.carbs + "g). Consider reducing starchy foods.",
      icon: 'alert-circle-outline',
      color: '#e74c3c'
    });
  }

  // Protein alerts (overage and deficiency)
  const proteinPct = limits.protein > 0 ? (totals.protein || 0) / limits.protein * 100 : 0;
  if (proteinPct >= 100) {
    alerts.push({
      id: 'protein_exceeded',
      type: 'nutrient',
      severity: SEVERITY.LOW,
      title: 'Protein Goal Reached',
      message: "Protein intake is at " + Math.round(totals.protein || 0) + "g (goal: " + limits.protein + "g). Excellent job hitting your protein target!",
      icon: 'fitness',
      color: '#4CAF50' // Green for positive reinforcement
    });
  } else if (proteinPct < 30 && calPct > 60) {
    alerts.push({
      id: 'protein_low',
      type: 'deficiency',
      severity: SEVERITY.MEDIUM,
      title: 'Low Protein Intake',
      message: "Only " + Math.round(totals.protein || 0) + "g protein consumed (" + Math.round(proteinPct) + "% of goal). Consider adding lean meat, eggs, or legumes.",
      icon: 'fitness',
      color: '#2196F3'
    });
  }

  // Health risk alerts from ML predictions
  if (safeRisk && safeRisk.length > 0) {
    const latestRisk = safeRisk[safeRisk.length - 1];
    
    if (latestRisk.diabetesRisk > 0.6) {
      alerts.push({
        id: 'diabetes_risk',
        type: 'health',
        severity: latestRisk.diabetesRisk > 0.8 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
        title: 'Elevated Diabetes Risk',
        message: "Your recent scan shows " + Math.round(latestRisk.diabetesRisk * 100) + "% diabetes risk. Consider reducing sugar and refined carbs.",
        icon: 'medkit',
        color: latestRisk.diabetesRisk > 0.8 ? '#e74c3c' : '#f39c12'
      });
    }

    if (latestRisk.hypertensionRisk > 0.6) {
      alerts.push({
        id: 'hypertension_risk',
        type: 'health',
        severity: latestRisk.hypertensionRisk > 0.8 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
        title: 'Elevated Hypertension Risk',
        message: "Your recent scan shows " + Math.round(latestRisk.hypertensionRisk * 100) + "% hypertension risk. Monitor sodium intake.",
        icon: 'heart',
        color: latestRisk.hypertensionRisk > 0.8 ? '#e74c3c' : '#f39c12'
      });
    }
  }

  // Poor NutriScore trend
  if (weeklyAvg && weeklyAvg.averageGrade && ['D', 'E'].includes(weeklyAvg.averageGrade)) {
    alerts.push({
      id: 'nutriscore_trend',
      type: 'trend',
      severity: SEVERITY.MEDIUM,
      title: 'Low NutriScore Average',
      message: "Your average NutriScore this week is " + weeklyAvg.averageGrade + ". Try choosing products with NutriScore A or B.",
      icon: 'trending-down',
      color: '#f39c12'
    });
  }

  // Sort by severity (high first)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}
