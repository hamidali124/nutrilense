import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TopBar, HomePage, ScannerPage, HistoryPage, BottomBar } from '../components';
import { useScanner } from '../hooks';
import { COLORS } from '../constants';

/**
 * Home Screen Component - Main navigation container
 */
export const HomeScreen = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [scanMode, setScanMode] = useState(null); // 'nutrition' or 'ingredients'
  
  const {
    hasPermission,
    scannedText,
    nutritionData,
    ingredientData,
    isLoading,
    ocrService,
    currentScanMode,
    takePhoto,
    pickImage,
    clearResults,
    setScanMode: setHookScanMode,
    toggleOCRService,
    requestPermissions
  } = useScanner(scanMode);

  const handleRescan = () => {
    clearResults();
    takePhoto();
  };

  const handleScanModeSelect = (mode) => {
    setScanMode(mode);
    setHookScanMode(mode); // Update the hook's scan mode
    if (mode) {
      clearResults(); // Clear previous results when selecting a new mode
      // Pass the mode directly to takePhoto to ensure immediate processing with correct mode
      console.log(`Scan mode selected: ${mode}, starting camera...`);
      takePhoto(mode); // Pass mode directly to avoid state sync issues
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== 'scanner') {
      setScanMode(null); // Reset scan mode when leaving scanner tab
    }
  };

  const handleBottomBarScan = () => {
    // When scan button is pressed from bottom bar, go to scanner tab
    setActiveTab('scanner');
    clearResults();
    setScanMode(null);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission denied</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" backgroundColor="white" />
      
      <TopBar 
        ocrService={ocrService}
        onToggleOCR={toggleOCRService}
      />
      
      <View style={styles.mainContent}>
        {activeTab === 'home' && <HomePage />}
        
        {activeTab === 'scanner' && (
          <ScannerPage
            scanMode={scanMode}
            onSelectMode={handleScanModeSelect}
            onTakePhoto={takePhoto}
            onPickImage={pickImage}
            isLoading={isLoading}
            nutritionData={nutritionData}
            ingredientData={ingredientData}
            scannedText={scannedText}
            onRescan={handleRescan}
            onClear={clearResults}
          />
        )}
        
        {activeTab === 'history' && <HistoryPage />}
      </View>

      <BottomBar 
        onScanPress={handleBottomBarScan}
        isLoading={isLoading} 
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});