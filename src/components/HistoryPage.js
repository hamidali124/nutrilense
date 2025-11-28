import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  RefreshControl,
  SafeAreaView,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HistoryService } from '../services/historyService';
import { COLORS, SIZES } from '../constants';
import { IngredientsDisplay } from './IngredientsDisplay';

const { width } = Dimensions.get('window');

export const HistoryPage = ({ navigation }) => {
  const [historyData, setHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'nutrition', 'ingredients'
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterHistory();
  }, [historyData, activeFilter]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const history = await HistoryService.getHistory();
      setHistoryData(history);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load scan history');
    } finally {
      setLoading(false);
    }
  };

  const filterHistory = () => {
    let filtered = historyData;
    
    if (activeFilter === 'nutrition') {
      filtered = historyData.filter(item => item.hasNutritionData);
    } else if (activeFilter === 'ingredients') {
      filtered = historyData.filter(item => item.hasIngredientData);
    }
    
    setFilteredData(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleItemPress = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  const renderFilterButtons = () => {
    const filters = [
      { key: 'all', label: 'All', icon: 'albums-outline' },
      { key: 'nutrition', label: 'Nutrition', icon: 'nutrition-outline' },
      { key: 'ingredients', label: 'Ingredients', icon: 'list-outline' }
    ];

    return (
      <View style={styles.filterContainer}>
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              activeFilter === filter.key && styles.activeFilterButton
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Ionicons 
              name={filter.icon} 
              size={18} 
              color={activeFilter === filter.key ? COLORS.white : COLORS.primary} 
            />
            <Text style={[
              styles.filterButtonText,
              activeFilter === filter.key && styles.activeFilterButtonText
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderNutritionModal = (item) => {
    if (!item.nutritionData) return null;

    const nutrition = item.nutritionData;
    
    return (
      <ScrollView style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Nutrition Facts</Text>
          <Text style={styles.modalDate}>{item.date} at {item.time}</Text>
        </View>

        {/* Calories */}
        {nutrition.calories && (
          <View style={styles.nutritionSection}>
            <Text style={styles.sectionTitle}>Calories</Text>
            <View style={styles.caloriesRow}>
              {nutrition.calories.total && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Total</Text>
                  <Text style={styles.nutritionValue}>{nutrition.calories.total}</Text>
                </View>
              )}
              {nutrition.calories.fromFat && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>From Fat</Text>
                  <Text style={styles.nutritionValue}>{nutrition.calories.fromFat}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Serving Info */}
        {nutrition.servingInfo && (
          <View style={styles.nutritionSection}>
            <Text style={styles.sectionTitle}>Serving Information</Text>
            {nutrition.servingInfo.servingSize && (
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>Serving Size</Text>
                <Text style={styles.nutritionValue}>{nutrition.servingInfo.servingSize}</Text>
              </View>
            )}
            {nutrition.servingInfo.servingsPerContainer && (
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>Servings Per Container</Text>
                <Text style={styles.nutritionValue}>{nutrition.servingInfo.servingsPerContainer}</Text>
              </View>
            )}
          </View>
        )}

        {/* Macronutrients */}
        {nutrition.macronutrients && Object.keys(nutrition.macronutrients).length > 0 && (
          <View style={styles.nutritionSection}>
            <Text style={styles.sectionTitle}>Macronutrients</Text>
            {Object.entries(nutrition.macronutrients).map(([key, value]) => (
              <View key={key} style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>{formatNutrientName(key)}</Text>
                <Text style={styles.nutritionValue}>
                  {value.value}{value.unit ? ` ${value.unit}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderIngredientsModal = (item) => {
    if (!item.ingredientData) return null;

    return (
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Ingredients Analysis</Text>
          <Text style={styles.modalDate}>{item.date} at {item.time}</Text>
        </View>
        
        <IngredientsDisplay ingredientData={item.ingredientData} />
      </View>
    );
  };

  const formatNutrientName = (name) => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const handleDeleteItem = async (itemId) => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await HistoryService.deleteScan(itemId);
              await loadHistory();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete scan');
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (historyData.length === 0) return;

    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all scan history? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await HistoryService.clearHistory();
              setHistoryData([]);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history');
            }
          },
        },
      ]
    );
  };

  const renderHistoryItem = ({ item }) => {
    const isNutrition = !!item.nutritionData;
    const isIngredient = !!item.ingredientData;
    
    return (
      <TouchableOpacity
        style={styles.historyItem}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemTypeRow}>
            <Ionicons 
              name={isNutrition ? "nutrition-outline" : "list-outline"} 
              size={20} 
              color={COLORS.primary} 
            />
            <View style={[
              styles.typeBadge,
              { backgroundColor: isNutrition ? COLORS.primary : COLORS.secondary }
            ]}>
              <Text style={styles.typeBadgeText}>
                {isNutrition ? 'Nutrition' : 'Ingredients'}
              </Text>
            </View>
          </View>
          <Text style={styles.itemDate}>{item.date}</Text>
        </View>

        <View style={styles.itemContent}>
          {isNutrition && item.nutritionData && (
            <View style={styles.nutritionPreview}>
              {item.nutritionData.calories?.total && (
                <Text style={styles.previewText}>
                  Calories: {item.nutritionData.calories.total}
                </Text>
              )}
              {item.nutritionData.servingInfo?.servingSize && (
                <Text style={styles.previewText}>
                  Serving: {item.nutritionData.servingInfo.servingSize}
                </Text>
              )}
            </View>
          )}

          {isIngredient && item.ingredientData && (
            <View style={styles.ingredientPreview}>
              <Text style={styles.previewText}>
                {item.ingredientData.totalCount} ingredient{item.ingredientData.totalCount !== 1 ? 's' : ''} found
              </Text>
              {item.ingredientData.ingredients.slice(0, 3).map((ingredient, index) => (
                <Text key={index} style={styles.ingredientPreviewItem}>
                  {ingredient.order}. {ingredient.name}
                </Text>
              ))}
              {item.ingredientData.totalCount > 3 && (
                <Text style={styles.moreText}>
                  +{item.ingredientData.totalCount - 3} more...
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.itemFooter}>
          <Text style={styles.itemTime}>{item.time}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteItem(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#ff4757" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Scans Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start scanning nutrition labels to build your history
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Scan History</Text>
          <Text style={styles.headerSubtitle}>
            {filteredData.length} {filteredData.length === 1 ? 'scan' : 'scans'}
          </Text>
        </View>
        
        {historyData.length > 0 && (
          <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {historyData.length > 0 && renderFilterButtons()}

      <FlatList
        data={filteredData}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalTopBar}>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            
            {selectedItem && (
              selectedItem.nutritionData 
                ? renderNutritionModal(selectedItem)
                : renderIngredientsModal(selectedItem)
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
  },
  clearAllButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearAllText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: 'white',
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  activeFilterButtonText: {
    color: COLORS.white,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  historyItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  itemDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  nutritionPreview: {
    gap: 4,
  },
  ingredientPreview: {
    gap: 2,
  },
  previewText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  ingredientPreviewItem: {
    fontSize: 12,
    color: '#666',
  },
  moreText: {
    fontSize: 12,
    color: COLORS.primary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTime: {
    fontSize: 12,
    color: '#666',
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  itemContent: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  nutritionBadge: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  nutritionBadgeText: {
    fontSize: 10,
    color: '#2e7d32',
    fontWeight: '500',
  },
  nutritionSummary: {
    gap: 4,
  },
  caloriesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
  },
  servingText: {
    fontSize: 12,
    color: '#666',
  },
  extractedText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#555',
    flex: 1,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.8,
    minHeight: Dimensions.get('window').height * 0.5,
  },
  modalTopBar: {
    alignItems: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ingredientCount: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  nutritionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  caloriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 6,
    minWidth: 150,
  },
  nutritionLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  ingredientsGrid: {
    gap: 8,
  },
  ingredientCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ingredientNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: 'white',
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
    marginRight: 8,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  ingredientMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eNumberBadge: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  eNumberText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  confidenceText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
});