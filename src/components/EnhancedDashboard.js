import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, LineChart } from 'react-native-chart-kit';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../constants';
import { NutritionTrackerService } from '../services/nutritionTrackerService';
import { HistoryService } from '../services/historyService';
import { generateAlerts } from '../helpers/alertHelper';

const GRADE_COLORS = { A: '#00A651', B: '#85BB2F', C: '#FECB00', D: '#EE8100', E: '#E63E11' };

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 20,
  marginBottom: 16,
  ...Platform.select({
    ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
    android: { elevation: 4 }
  }),
  borderWidth: 1,
  borderColor: '#F3F4F6',
};

export const EnhancedDashboard = ({ refreshTrigger }) => {
  const screenWidth = Dimensions.get('window').width - 64; // considering padding
  const [totals, setTotals] = useState({ calories: 0, carbs: 0, fat: 0, protein: 0, sugar: 0 });
  const [limits, setLimits] = useState({ calories: 2000, carbs: 300, fat: 65, protein: 50, sugar: 50 });
  const [weeklyTrend, setWeeklyTrend] = useState([]);
  const [avgNutriScore, setAvgNutriScore] = useState(null);
  const [riskTrend, setRiskTrend] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [frequentFoods, setFrequentFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [refreshTrigger]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dt, dl, wt, ans, rt, ff] = await Promise.all([
        NutritionTrackerService.getDailyTotals(),
        NutritionTrackerService.getDailyLimits(),
        HistoryService.getWeeklyCalorieTrend(),
        HistoryService.getAverageNutriScore(7),
        HistoryService.getRiskTrend(7),
        HistoryService.getMostFrequentFoods(5)
      ]);
      setTotals(dt); setLimits(dl); setWeeklyTrend(wt);
      setAvgNutriScore(ans); setRiskTrend(rt); setFrequentFoods(ff);
      setAlerts(generateAlerts(dt, dl, rt, ans));
    } catch (e) { console.error('Dashboard load error:', e); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <View style={styles.loadingWrap}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const calPct = limits.calories > 0 ? Math.min((totals.calories / limits.calories) * 100, 100) : 0;
  const calRemaining = Math.max(0, limits.calories - totals.calories);
  const calColor = calPct >= 100 ? '#e74c3c' : calPct >= 80 ? '#f39c12' : COLORS.primary;

  const macroTotal = (totals.carbs || 0) + (totals.protein || 0) + (totals.fat || 0);
  const carbsPct = macroTotal > 0 ? ((totals.carbs || 0) / macroTotal) * 100 : 0;
  const proteinPct = macroTotal > 0 ? ((totals.protein || 0) / macroTotal) * 100 : 0;
  const fatPct = macroTotal > 0 ? ((totals.fat || 0) / macroTotal) * 100 : 0;

  const nutrients = [
    { label: 'Calories', value: totals.calories, limit: limits.calories, unit: 'kcal' },
    { label: 'Carbs', value: totals.carbs, limit: limits.carbs, unit: 'g' },
    { label: 'Fat', value: totals.fat, limit: limits.fat, unit: 'g' },
    { label: 'Protein', value: totals.protein, limit: limits.protein, unit: 'g' },
    { label: 'Sugar', value: totals.sugar, limit: limits.sugar, unit: 'g' },
  ];

  const weekMax = Math.max(...weeklyTrend.map(d => d.calories), limits.calories, 1);
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short' });

  const getRiskColor = (val) => val > 0.6 ? '#e74c3c' : val > 0.3 ? '#f39c12' : COLORS.primary;
  const getBarColor = (pct) => pct >= 100 ? '#e74c3c' : pct >= 80 ? '#f39c12' : COLORS.primary;

  const RING_SIZE = 140;
  const RING_STROKE = 10;
  const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
  const RING_CIRC = 2 * Math.PI * RING_RADIUS;
  const ringOffset = RING_CIRC - (calPct / 100) * RING_CIRC;
  const ringStrokeColor = calPct >= 100 ? '#FFE4E6' : '#fff';

  return (
    <View style={{ paddingBottom: 24 }}>
      {/* 1. Today Summary */}
      <View style={[cardStyle, styles.heroCard]}>
        <Text style={[styles.sectionTitle, { color: '#fff', alignSelf: 'flex-start' }]}>Today's Summary</Text>
        <View style={styles.heroContent}>
          <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
              <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke="rgba(255,255,255,0.15)" strokeWidth={RING_STROKE} fill="none" />
              <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={ringStrokeColor} strokeWidth={RING_STROKE} fill="none" strokeDasharray={RING_CIRC} strokeDashoffset={ringOffset} strokeLinecap="round" rotation={-90} origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`} />
            </Svg>
            <Text style={[styles.calorieValue, { color: '#fff' }]}>{Math.round(totals.calories)}</Text>
            <Text style={[styles.calorieLabel, { color: 'rgba(255,255,255,0.8)' }]}>/ {limits.calories} kcal</Text>
          </View>
          <View style={styles.heroTextContent}>
            <Text style={[styles.heroStatusText, { color: calColor === '#e74c3c' ? '#FFE4E6' : '#fff' }]}>
              {calRemaining > 0 ? `${calRemaining} kcal\nremaining` : 'Goal exceeded!'}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Macro Breakdown */}
      {macroTotal > 0 && (
        <View style={cardStyle}>
          <Text style={styles.sectionTitle}>Macronutrients</Text>
          <PieChart
            data={[
              { name: 'Carbs', population: Math.round(totals.carbs || 0), color: '#4FC3F7', legendFontColor: '#1F2937' },
              { name: 'Protein', population: Math.round(totals.protein || 0), color: '#FF8A65', legendFontColor: '#1F2937' },
              { name: 'Fat', population: Math.round(totals.fat || 0), color: '#EF5350', legendFontColor: '#1F2937' },
            ]}
            width={screenWidth + 24}
            height={180}
            chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"0"}
            center={[10, 0]}
            absolute
          />
        </View>
      )}

      {/* 3. Nutrient Progress Bars */}
      <View style={cardStyle}>
        <Text style={styles.sectionTitle}>Nutrient Intake</Text>
        {nutrients.map((n, i) => {
          const pct = n.limit > 0 ? (n.value / n.limit) * 100 : 0;
          return (
            <View key={i} style={styles.progressRow}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>{n.label}</Text>
                <Text style={styles.progressValue}>{Math.round(n.value)} / {n.limit} {n.unit}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: Math.min(pct, 100) + '%', backgroundColor: getBarColor(pct) }]} />
              </View>
            </View>
          );
        })}
      </View>

      {/* 4. Alerts */}
      {alerts.length > 0 && (
        <View style={cardStyle}>
          <Text style={styles.sectionTitle}>Alerts</Text>
          {alerts.map((alert, i) => (
            <View key={alert.id || i} style={[styles.alertCard, { borderLeftColor: alert.color }]}>
              <View style={[styles.alertIcon, { backgroundColor: alert.color + '20' }]}>
                <Ionicons name={alert.icon} size={20} color={alert.color} />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 5. Weekly Calorie Trend */}
      {weeklyTrend.length > 0 && (
        <View style={cardStyle}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.weekChart}>
            {weeklyTrend.map((d, i) => {
              const barH = weekMax > 0 ? (d.calories / weekMax) * 120 : 0;
              const isToday = d.day === todayStr;
              return (
                <View key={i} style={styles.weekBarWrap}>
                  <Text style={styles.weekBarValue}>{d.calories > 0 ? d.calories : ''}</Text>
                  <View style={styles.weekBarTrack}>
                    <View style={[styles.weekBarFill, { height: barH, backgroundColor: isToday ? COLORS.primary : '#a5d6a7' }]} />
                  </View>
                  <Text style={[styles.weekBarLabel, isToday && { color: COLORS.primary, fontWeight: 'bold' }]}>{d.day}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 6. NutriScore Average */}
      {avgNutriScore && (
        <View style={cardStyle}>
          <Text style={styles.sectionTitle}>Average NutriScore</Text>
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <View style={[styles.gradeBadge, { backgroundColor: (GRADE_COLORS[avgNutriScore.averageGrade] || '#999') + '20', borderColor: GRADE_COLORS[avgNutriScore.averageGrade] || '#999' }]}>
              <Text style={[styles.gradeText, { color: GRADE_COLORS[avgNutriScore.averageGrade] || '#999' }]}>{avgNutriScore.averageGrade}</Text>
            </View>
            <Text style={styles.gradeSubtext}>Based on {avgNutriScore.count} scans this week</Text>
          </View>
        </View>
      )}

      {/* 7. Health Risk */}
      {riskTrend.length > 0 && (
        <View style={cardStyle}>
          <Text style={styles.sectionTitle}>Health Risk Summary</Text>
          {(() => {
            const latest = riskTrend[riskTrend.length - 1];
            return (
              <View>
                {latest.diabetesRisk !== null && (
                  <View style={styles.riskRow}>
                    <Text style={styles.riskLabel}>Diabetes Risk</Text>
                    <View style={styles.riskBarTrack}>
                      <View style={[styles.riskBarFill, { width: (latest.diabetesRisk * 100) + '%', backgroundColor: getRiskColor(latest.diabetesRisk) }]} />
                    </View>
                    <Text style={[styles.riskPct, { color: getRiskColor(latest.diabetesRisk) }]}>{Math.round(latest.diabetesRisk * 100)}%</Text>
                  </View>
                )}
                {latest.hypertensionRisk !== null && (
                  <View style={styles.riskRow}>
                    <Text style={styles.riskLabel}>Hypertension Risk</Text>
                    <View style={styles.riskBarTrack}>
                      <View style={[styles.riskBarFill, { width: (latest.hypertensionRisk * 100) + '%', backgroundColor: getRiskColor(latest.hypertensionRisk) }]} />
                    </View>
                    <Text style={[styles.riskPct, { color: getRiskColor(latest.hypertensionRisk) }]}>{Math.round(latest.hypertensionRisk * 100)}%</Text>
                  </View>
                )}
              </View>
            );
          })()}

          {/* Risk Trend Chart */}
          {riskTrend.length > 1 && (
            <View style={{ marginTop: 24, alignItems: 'center' }}>
              <Text style={[styles.sectionTitle, { fontSize: 14, color: '#6B7280', marginBottom: 8 }]}>Risk Trend (Recent Scans)</Text>
              <LineChart
                data={{
                  labels: riskTrend.map((_, i) => `#${i + 1}`),
                  datasets: [
                    {
                      data: riskTrend.map(r => (r.diabetesRisk || 0) * 100),
                      color: (opacity = 1) => `rgba(239, 83, 80, ${opacity})`,
                      strokeWidth: 2
                    },
                    {
                      data: riskTrend.map(r => (r.hypertensionRisk || 0) * 100),
                      color: (opacity = 1) => `rgba(79, 195, 247, ${opacity})`,
                      strokeWidth: 2
                    }
                  ],
                  legend: ['Diabetes', 'Hypertension']
                }}
                width={screenWidth + 8}
                height={180}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
                  propsForDots: { r: '4', strokeWidth: '1', stroke: '#fff' }
                }}
                bezier
                style={{ marginLeft: -8 }}
              />
            </View>
          )}
        </View>
      )}

      {/* 8. Most Scanned Scan Types */}
      {frequentFoods.length > 0 && (
        <View style={cardStyle}>
          <Text style={styles.sectionTitle}>Most Used Scanners</Text>
          {frequentFoods.map((food, i) => (
            <View key={i} style={styles.foodRow}>
              <Text style={styles.foodName}>{i + 1}. {food.name}</Text>
              <View style={styles.foodCountBadge}><Text style={styles.foodCountText}>{food.count} scans</Text></View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingWrap: { padding: 40, alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 16, letterSpacing: -0.5 },
  
  heroCard: {
    backgroundColor: COLORS.primary || '#4CAF50',
    alignItems: 'center',
    paddingVertical: 24,
    borderWidth: 0,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
  },
  heroTextContent: {
    flex: 1,
    paddingLeft: 20,
  },
  heroStatusText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  calorieCircle: { width: 130, height: 130, borderRadius: 65, borderWidth: 8, alignItems: 'center', justifyContent: 'center' },
  calorieValue: { fontSize: 32, fontWeight: '900' },
  calorieLabel: { fontSize: 13, marginTop: 2, fontWeight: '500' },

  macroBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  macroSegment: { height: '100%' },
  macroLabels: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  macroLabelItem: { flexDirection: 'row', alignItems: 'center' },
  macroDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  macroLabelText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },

  progressRow: { marginBottom: 14 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  progressValue: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  progressTrack: { height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },

  alertCard: { flexDirection: 'row', padding: 16, marginBottom: 10, borderLeftWidth: 4, backgroundColor: '#F9FAFB', borderRadius: 12 },
  alertIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  alertContent: { flex: 1, justifyContent: 'center' },
  alertTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  alertMessage: { fontSize: 13, color: '#4B5563', lineHeight: 18 },

  weekChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 180, paddingTop: 16 },
  weekBarWrap: { alignItems: 'center', flex: 1 },
  weekBarValue: { fontSize: 10, color: '#6B7280', marginBottom: 4, fontWeight: '600' },
  weekBarTrack: { width: '60%', maxWidth: 24, height: 130, justifyContent: 'flex-end', backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden' },
  weekBarFill: { width: '100%', borderRadius: 6 },
  weekBarLabel: { fontSize: 12, color: '#6B7280', marginTop: 8, fontWeight: '500' },

  gradeBadge: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  gradeText: { fontSize: 32, fontWeight: '900' },
  gradeSubtext: { fontSize: 14, color: '#6B7280', fontWeight: '500' },

  riskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  riskLabel: { width: 140, fontSize: 14, color: '#374151', fontWeight: '600' },
  riskBarTrack: { flex: 1, height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden', marginHorizontal: 12 },
  riskBarFill: { height: '100%', borderRadius: 5 },
  riskPct: { width: 45, fontSize: 14, fontWeight: '800', textAlign: 'right' },

  foodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  foodName: { fontSize: 15, color: '#1F2937', fontWeight: '500' },
  foodCountBadge: { backgroundColor: '#DEF7EC', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  foodCountText: { fontSize: 13, color: '#046C4E', fontWeight: '700' },
});
