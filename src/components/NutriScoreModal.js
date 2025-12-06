import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants';

const { width, height } = Dimensions.get('window');

/**
 * NutriScore Display Modal
 * Shows NutriScore grade and score in center of screen
 * Closes when user taps anywhere
 */
export const NutriScoreModal = ({ visible, nutriScore, onClose }) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible || !nutriScore || nutriScore.error || !nutriScore.grade) {
    return null;
  }

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return '#00A651'; // Green
      case 'B': return '#85BB2F'; // Light Green
      case 'C': return '#FECB00'; // Yellow
      case 'D': return '#EE8100'; // Orange
      case 'E': return '#E63E11'; // Red
      default: return COLORS.text.secondary;
    }
  };

  const getGradeDescription = (grade) => {
    switch (grade) {
      case 'A': return 'Excellent';
      case 'B': return 'Good';
      case 'C': return 'Fair';
      case 'D': return 'Poor';
      case 'E': return 'Very Poor';
      default: return '';
    }
  };

  const score = nutriScore.combinedScore_rounded || 
               nutriScore.roundedScore ||
               (nutriScore.combinedScore ? Math.round(nutriScore.combinedScore) : null) ||
               (nutriScore.euScore ? Math.round(nutriScore.euScore) : null) ||
               'N/A';

  const gradeColor = getGradeColor(nutriScore.grade);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={[styles.nutriscoreBadge, { borderColor: gradeColor }]}>
            <View style={styles.nutriscoreHeader}>
              <Ionicons name="shield-checkmark" size={32} color={gradeColor} />
              <Text style={styles.nutriscoreLabel}>Nutri-Score</Text>
            </View>
            
            <View style={styles.nutriscoreMain}>
              <Text style={[styles.nutriscoreGrade, { color: gradeColor }]}>
                {nutriScore.grade}
              </Text>
              <Text style={styles.nutriscoreScore}>
                {score}/10
              </Text>
            </View>
            
            <Text style={styles.nutriscoreDescription}>
              {getGradeDescription(nutriScore.grade)}
            </Text>
            
            {nutriScore.euScore !== undefined && nutriScore.combinedScore !== undefined && (
              <Text style={styles.nutriscoreDetails}>
                EU: {Math.round(nutriScore.euScore)} | Combined: {Math.round(nutriScore.combinedScore)}
              </Text>
            )}
          </View>
          
          <Text style={styles.tapToClose}>Tap anywhere to continue</Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  nutriscoreBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    borderWidth: 4,
    alignItems: 'center',
    minWidth: width * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  nutriscoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nutriscoreLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  nutriscoreMain: {
    alignItems: 'center',
    marginVertical: 20,
  },
  nutriscoreGrade: {
    fontSize: 80,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  nutriscoreScore: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  nutriscoreDescription: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginTop: 8,
    marginBottom: 12,
  },
  nutriscoreDetails: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  tapToClose: {
    fontSize: 14,
    color: COLORS.white,
    marginTop: 24,
    fontStyle: 'italic',
  },
});

