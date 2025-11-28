import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Camera } from 'expo-camera';
import { Alert } from 'react-native';

/**
 * Image Service for handling camera and gallery operations
 */
export class ImageService {
  // Maximum file size for Azure Computer Vision API (4MB)
  static MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB in bytes
  
  /**
   * Compress image to meet Azure API requirements
   * @param {string} imageUri - Original image URI
   * @returns {Promise<string>} Compressed image URI
   */
  static async compressImage(imageUri) {
    try {
      // Check current file size using legacy API
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      
      if (!fileInfo.exists) {
        throw new Error('Image file not found');
      }
      
      console.log(`Original image size: ${(fileInfo.size / 1024 / 1024).toFixed(2)}MB`);
      
      // If image is already under 4MB, return as is
      if (fileInfo.size <= this.MAX_FILE_SIZE) {
        console.log('Image is already under 4MB, no compression needed');
        return imageUri;
      }
      
      // Calculate compression quality based on file size
      let quality = 0.8; // Start with 80% quality
      if (fileInfo.size > 8 * 1024 * 1024) { // If > 8MB
        quality = 0.5; // Use 50% quality
      } else if (fileInfo.size > 6 * 1024 * 1024) { // If > 6MB
        quality = 0.6; // Use 60% quality
      }
      
      console.log(`Compressing image with quality: ${quality}`);
      
      // Compress the image
      const compressedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          // Resize to maximum width/height while maintaining aspect ratio
          { resize: { width: 2048 } } // Limit to 2048px width for OCR quality
        ],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false
        }
      );
      
      // Check compressed file size
      const compressedFileInfo = await FileSystem.getInfoAsync(compressedImage.uri);
      console.log(`Compressed image size: ${(compressedFileInfo.size / 1024 / 1024).toFixed(2)}MB`);
      
      // If still too large, try more aggressive compression
      if (compressedFileInfo.size > this.MAX_FILE_SIZE) {
        console.log('Still too large, applying more aggressive compression...');
        
        const secondCompression = await ImageManipulator.manipulateAsync(
          compressedImage.uri,
          [
            { resize: { width: 1536 } } // Reduce to 1536px width
          ],
          {
            compress: 0.4, // 40% quality
            format: ImageManipulator.SaveFormat.JPEG,
            base64: false
          }
        );
        
        const finalFileInfo = await FileSystem.getInfoAsync(secondCompression.uri);
        console.log(`Final compressed image size: ${(finalFileInfo.size / 1024 / 1024).toFixed(2)}MB`);
        
        return secondCompression.uri;
      }
      
      return compressedImage.uri;
      
    } catch (error) {
      console.error('Image compression error:', error);
      // Return original image if compression fails
      return imageUri;
    }
  }
  
  /**
   * Request camera and media library permissions
   * @returns {Promise<boolean>} Permission status
   */
  static async requestPermissions() {
    try {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      return (
        cameraPermission.status === 'granted' && 
        mediaLibraryPermission.status === 'granted'
      );
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  /**
   * Take photo using camera with flexible cropping and compression
   * @param {boolean} allowsEditing - Whether to show crop interface (default: true)
   * @returns {Promise<string|null>} Compressed image URI or null
   */
  static async takePhoto(allowsEditing = true) {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: allowsEditing,
        quality: 0.9, // Start with high quality, compress later if needed
        exif: false, // Reduce file size
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Photo taken, compressing for Azure API...');
        const compressedUri = await this.compressImage(result.assets[0].uri);
        return compressedUri;
      }
      return null;
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
      return null;
    }
  }

  /**
   * Pick image from gallery with flexible cropping and compression
   * @param {boolean} allowsEditing - Whether to show crop interface (default: true)
   * @returns {Promise<string|null>} Compressed image URI or null
   */
  static async pickImage(allowsEditing = true) {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: allowsEditing,
        quality: 0.9, // Start with high quality, compress later if needed
        exif: false, // Reduce file size
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Image selected, compressing for Azure API...');
        const compressedUri = await this.compressImage(result.assets[0].uri);
        return compressedUri;
      }
      return null;
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to pick image');
      return null;
    }
  }
}