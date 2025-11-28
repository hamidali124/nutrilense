import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

/**
 * Component to display analyzed ingredients with allergen and haram badges
 */
export const IngredientsDisplay = ({ ingredientData }) => {
  if (!ingredientData || !ingredientData.ingredients || ingredientData.ingredients.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="warning-outline" size={48} color="#999" />
        <Text style={styles.emptyText}>No ingredients found</Text>
      </View>
    );
  }

  const { ingredients, analysisSummary } = ingredientData;

  // Render warning summary if allergens or haram ingredients found
  const renderWarningBanner = () => {
    if (!analysisSummary) return null;

    const hasWarnings = analysisSummary.allergenCount > 0 || 
                       analysisSummary.haramCount > 0 || 
                       analysisSummary.doubtfulCount > 0;

    if (!hasWarnings) {
      return (
        <View style={styles.safeBanner}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
          <Text style={styles.safeBannerText}>No allergens or haram ingredients detected</Text>
        </View>
      );
    }

    return (
      <View style={styles.warningBanner}>
        {analysisSummary.allergenCount > 0 && (
          <View style={styles.warningItem}>
            <Ionicons name="alert-circle" size={20} color="#ff6b6b" />
            <Text style={styles.warningText}>
              {analysisSummary.allergenCount} Allergen{analysisSummary.allergenCount > 1 ? 's' : ''} found
            </Text>
          </View>
        )}
        
        {analysisSummary.haramCount > 0 && (
          <View style={styles.warningItem}>
            <Ionicons name="close-circle" size={20} color="#e74c3c" />
            <Text style={styles.warningText}>
              {analysisSummary.haramCount} Haram ingredient{analysisSummary.haramCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        
        {analysisSummary.doubtfulCount > 0 && (
          <View style={styles.warningItem}>
            <Ionicons name="help-circle" size={20} color="#f39c12" />
            <Text style={styles.warningText}>
              {analysisSummary.doubtfulCount} Doubtful ingredient{analysisSummary.doubtfulCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        
        {analysisSummary.allergenTypes && analysisSummary.allergenTypes.length > 0 && (
          <View style={styles.allergenTypesList}>
            <Text style={styles.allergenTypesLabel}>Allergen types:</Text>
            <Text style={styles.allergenTypesText}>
              {analysisSummary.allergenTypes.join(', ')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Render individual ingredient card
  const renderIngredient = (ingredient, index) => {
    const hasIssues = ingredient.hasAllergens || ingredient.isHaram || ingredient.isDoubtful;
    
    return (
      <View 
        key={index} 
        style={[
          styles.ingredientCard,
          hasIssues && styles.ingredientCardWarning
        ]}
      >
        <View style={styles.ingredientHeader}>
          <View style={styles.ingredientNumber}>
            <Text style={styles.ingredientNumberText}>{ingredient.order}</Text>
          </View>
          <Text style={styles.ingredientName}>{ingredient.name}</Text>
        </View>

        {/* Badges Row */}
        <View style={styles.badgesContainer}>
          {/* E-Number Badge */}
          {ingredient.isENumber && (
            <View style={styles.eNumberBadge}>
              <Text style={styles.badgeText}>E-Number</Text>
            </View>
          )}

          {/* Allergen Badges */}
          {ingredient.hasAllergens && ingredient.allergenInfo.matches.map((allergen, idx) => (
            <View key={idx} style={[styles.allergenBadge, allergen.severity === 'major' && styles.allergenBadgeMajor]}>
              <Ionicons name="alert-circle" size={12} color="white" />
              <Text style={styles.badgeText}>{allergen.displayName}</Text>
            </View>
          ))}

          {/* Haram Badge */}
          {ingredient.isHaram && (
            <View style={styles.haramBadge}>
              <Ionicons name="close-circle" size={12} color="white" />
              <Text style={styles.badgeText}>Haram</Text>
            </View>
          )}

          {/* Doubtful Badge */}
          {ingredient.isDoubtful && !ingredient.isHaram && (
            <View style={styles.doubtfulBadge}>
              <Ionicons name="help-circle" size={12} color="white" />
              <Text style={styles.badgeText}>Doubtful</Text>
            </View>
          )}
        </View>

        {/* Additional Info */}
        {(ingredient.haramInfo?.notes || ingredient.haramInfo?.reason) && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              {ingredient.haramInfo.notes || ingredient.haramInfo.reason}
            </Text>
          </View>
        )}

        {/* Confidence Score */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceText}>
            {Math.round(ingredient.confidence * 100)}% confident
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Stats */}
      <View style={styles.header}>
        <Text style={styles.title}>Ingredients List</Text>
        <Text style={styles.subtitle}>
          {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Warning Banner */}
      {renderWarningBanner()}

      {/* Ingredients List */}
      <View style={styles.ingredientsList}>
        {ingredients.map((ingredient, index) => renderIngredient(ingredient, index))}
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Doubtful ingredients require verification of source and processing method
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  safeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  safeBannerText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  warningBanner: {
    backgroundColor: '#fff9e6',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginLeft: 8,
  },
  allergenTypesList: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1c40f',
  },
  allergenTypesLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  allergenTypesText: {
    fontSize: 12,
    color: '#333',
  },
  ingredientsList: {
    padding: 16,
  },
  ingredientCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  ingredientCardWarning: {
    borderLeftColor: '#ff6b6b',
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ingredientNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ingredientNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  eNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#95a5a6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  allergenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  allergenBadgeMajor: {
    backgroundColor: '#ff6b6b',
  },
  haramBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  doubtfulBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f39c12',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  noteContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  confidenceContainer: {
    marginTop: 4,
  },
  confidenceText: {
    fontSize: 11,
    color: '#999',
  },
  footer: {
    padding: 16,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
