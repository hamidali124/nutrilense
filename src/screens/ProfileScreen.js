import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants';
import allergensData from '../data/allergens.json';

export const ProfileScreen = ({ navigation }) => {
  const { user, updateProfile, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    gender: '',
    allergens: [],
    hba1c: '',
    dailyCalorieGoal: '',
    dailySugarGoal: '',
    dailySodiumGoal: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        age: user.age?.toString() || '',
        height: user.height?.toString() || '',
        weight: user.weight?.toString() || '',
        gender: user.gender || '',
        allergens: user.allergens || [],
        hba1c: user.hba1c?.toString() || '',
        dailyCalorieGoal: (user.dailyCalorieGoal || 2000).toString(),
        dailySugarGoal: (user.dailySugarGoal || 50).toString(),
        dailySodiumGoal: (user.dailySodiumGoal || 2300).toString()
      });
    }
  }, [user]);

  // Get all allergen options
  const getAllergenOptions = () => {
    const options = [];
    
    Object.keys(allergensData.majorAllergens || {}).forEach(key => {
      options.push({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        category: 'major'
      });
    });
    
    Object.keys(allergensData.commonAllergens || {}).forEach(key => {
      options.push({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        category: 'common'
      });
    });
    
    Object.keys(allergensData.rareAllergens || {}).forEach(key => {
      options.push({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        category: 'rare'
      });
    });
    
    return options.sort((a, b) => a.label.localeCompare(b.label));
  };

  const allergenOptions = getAllergenOptions();

  const toggleAllergen = (allergenKey) => {
    setFormData(prev => {
      const allergens = prev.allergens.includes(allergenKey)
        ? prev.allergens.filter(a => a !== allergenKey)
        : [...prev.allergens, allergenKey];
      return { ...prev, allergens };
    });
  };

  const calculateBMI = (height, weight) => {
    if (!height || !weight) return null;
    const heightInMeters = parseFloat(height) / 100;
    return parseFloat((parseFloat(weight) / (heightInMeters * heightInMeters)).toFixed(2));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name');
      return false;
    }
    if (!formData.age || parseInt(formData.age) < 1) {
      Alert.alert('Validation Error', 'Please enter a valid age');
      return false;
    }
    if (!formData.height || parseFloat(formData.height) < 50) {
      Alert.alert('Validation Error', 'Please enter a valid height (in cm, minimum 50cm)');
      return false;
    }
    if (!formData.weight || parseFloat(formData.weight) < 10) {
      Alert.alert('Validation Error', 'Please enter a valid weight (in kg, minimum 10kg)');
      return false;
    }
    if (!formData.gender) {
      Alert.alert('Validation Error', 'Please select your gender');
      return false;
    }
    return true;
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await updateProfile({
        name: formData.name.trim(),
        age: parseInt(formData.age),
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        gender: formData.gender,
        allergens: formData.allergens,
        hba1c: formData.hba1c ? parseFloat(formData.hba1c) : null,
        dailyCalorieGoal: formData.dailyCalorieGoal ? parseInt(formData.dailyCalorieGoal) : 2000,
        dailySugarGoal: formData.dailySugarGoal ? parseInt(formData.dailySugarGoal) : 50,
        dailySodiumGoal: formData.dailySodiumGoal ? parseInt(formData.dailySodiumGoal) : 2300
      });

      if (result.success) {
        Alert.alert('Success', result.message || 'Profile updated successfully');
      } else {
        Alert.alert('Update Failed', result.message || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const bmi = calculateBMI(formData.height, formData.weight);

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No user data found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>{user.email}</Text>
        </View>

        <View style={styles.form}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              autoCapitalize="words"
            />
          </View>

          {/* Age */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your age"
              value={formData.age}
              onChangeText={(text) => setFormData({ ...formData, age: text.replace(/[^0-9]/g, '') })}
              keyboardType="numeric"
            />
          </View>

          {/* Height and Weight Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Height (cm) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Height"
                value={formData.height}
                onChangeText={(text) => setFormData({ ...formData, height: text.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Weight (kg) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Weight"
                value={formData.weight}
                onChangeText={(text) => setFormData({ ...formData, weight: text.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* BMI Display */}
          {bmi && (
            <View style={styles.bmiContainer}>
              <Text style={styles.bmiLabel}>Current BMI:</Text>
              <Text style={styles.bmiValue}>{bmi}</Text>
            </View>
          )}

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender *</Text>
            <View style={styles.genderContainer}>
              {['male', 'female', 'other'].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.genderButton,
                    formData.gender === gender && styles.genderButtonActive
                  ]}
                  onPress={() => setFormData({ ...formData, gender })}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      formData.gender === gender && styles.genderButtonTextActive
                    ]}
                  >
                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Blood Sugar (HbA1c) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Blood Sugar (HbA1c %)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter HbA1c percentage (optional)"
              value={formData.hba1c}
              onChangeText={(text) => {
                // Allow numbers and one decimal point
                const cleaned = text.replace(/[^0-9.]/g, '');
                // Prevent multiple decimal points
                const parts = cleaned.split('.');
                const formatted = parts.length > 2 
                  ? parts[0] + '.' + parts.slice(1).join('')
                  : cleaned;
                setFormData({ ...formData, hba1c: formatted });
              }}
              keyboardType="decimal-pad"
            />
            <Text style={styles.hintText}>
              Normal range: 4.0% - 5.6%. Leave empty if not available.
            </Text>
          </View>

          {/* Allergens */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Daily Goals</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.hintText}>Calories (kcal)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2000"
                  value={formData.dailyCalorieGoal}
                  onChangeText={(text) => setFormData({ ...formData, dailyCalorieGoal: text.replace(/[^0-9]/g, '') })}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 4, marginRight: 4 }]}>
                <Text style={styles.hintText}>Sugar (g)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="50"
                  value={formData.dailySugarGoal}
                  onChangeText={(text) => setFormData({ ...formData, dailySugarGoal: text.replace(/[^0-9]/g, '') })}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.hintText}>Sodium (mg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2300"
                  value={formData.dailySodiumGoal}
                  onChangeText={(text) => setFormData({ ...formData, dailySodiumGoal: text.replace(/[^0-9]/g, '') })}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Allergens */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Allergens (Select all that apply)</Text>
            <View style={styles.allergensContainer}>
              {allergenOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.allergenChip,
                    formData.allergens.includes(option.key) && styles.allergenChipActive
                  ]}
                  onPress={() => toggleAllergen(option.key)}
                >
                  <Ionicons
                    name={formData.allergens.includes(option.key) ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={formData.allergens.includes(option.key) ? COLORS.white : COLORS.text.secondary}
                  />
                  <Text
                    style={[
                      styles.allergenChipText,
                      formData.allergens.includes(option.key) && styles.allergenChipTextActive
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={[styles.updateButton, loading && styles.updateButtonDisabled]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.updateButtonText}>Update Profile</Text>
            )}
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.alert.error} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  row: {
    flexDirection: 'row',
  },
  bmiContainer: {
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bmiLabel: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  bmiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  genderButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  genderButtonText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  allergensContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  allergenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    gap: 6,
  },
  allergenChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  allergenChipText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  allergenChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.alert.error,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  logoutButtonText: {
    color: COLORS.alert.error,
    fontSize: 16,
    fontWeight: '600',
  },
});

