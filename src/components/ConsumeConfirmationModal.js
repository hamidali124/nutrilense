import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants';
import { NutritionTrackerService } from '../services/nutritionTrackerService';

/**
 * Confirmation Modal for consuming scanned nutrition
 */
export const ConsumeConfirmationModal = ({ visible, nutritionData, onConfirm, onCancel }) => {
  if (!nutritionData) return null;

  const extracted = NutritionTrackerService.extractNutritionValues(nutritionData);

  const renderNutrientRow = (label, value, unit, icon, color) => {
    if (!value || value === 0) return null;
    
    return (
      <View style={styles.nutrientRow}>
        <View style={[styles.nutrientIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.nutrientLabel}>{label}:</Text>
        <Text style={styles.nutrientValue}>
          {Math.round(value)} {unit}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.primary} />
            <Text style={styles.modalTitle}>Add to Daily Intake?</Text>
            <Text style={styles.modalSubtitle}>
              This will add the nutrition values to your daily totals
            </Text>
          </View>

          <ScrollView style={styles.nutrientsList} showsVerticalScrollIndicator={false}>
            {renderNutrientRow(
              'Calories',
              extracted.calories,
              'kcal',
              'flame',
              '#FF6B35'
            )}
            
            {renderNutrientRow(
              'Carbs',
              extracted.carbs,
              'g',
              'nutrition',
              '#4ECDC4'
            )}
            
            {renderNutrientRow(
              'Fat',
              extracted.fat,
              'g',
              'water',
              '#FFE66D'
            )}
            
            {renderNutrientRow(
              'Protein',
              extracted.protein,
              'g',
              'fitness',
              '#95E1D3'
            )}
            
            {renderNutrientRow(
              'Sugar',
              extracted.sugar,
              'g',
              'cafe',
              '#F38181'
            )}

            {extracted.calories === 0 && extracted.carbs === 0 && extracted.fat === 0 && 
             extracted.protein === 0 && extracted.sugar === 0 && (
              <Text style={styles.noDataText}>
                No nutrition values found to add
              </Text>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={onConfirm}
            >
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
              <Text style={styles.confirmButtonText}>Add to Intake</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  nutrientsList: {
    maxHeight: 200,
    marginBottom: 20,
  },
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  nutrientIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nutrientLabel: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  nutrientValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  noDataText: {
    textAlign: 'center',
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    padding: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

