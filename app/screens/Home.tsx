import React, {useState, useEffect} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  StatusBar,
  ActivityIndicator,
  Platform,
  BackHandler,
} from 'react-native';
import {
  ImageLibraryOptions,
  ImagePickerResponse,
  launchImageLibrary,
} from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import Video from 'react-native-video';
import {useCustomTheme} from '../themes/ThemeProvider';
import {CustomTheme} from '../themes/types';
import {HomeScreenProps} from './types/Home';
import {createGlobalStyles} from '../themes/CustomStyles';
import Share from 'react-native-share';
import RNFetchBlob from 'rn-fetch-blob';
import {useFocusEffect} from '@react-navigation/native';
const MAX_FILE_SIZE = 20;
const MB_TO_BYTES = 1024 * 1024;
const Home: React.FC<HomeScreenProps> = () => {
  const {theme} = useCustomTheme();
  const styles = createStyles(theme);
  const globalStyles = createGlobalStyles(theme);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [videoList, setVideoList] = useState<{id: string; uri: string}[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{
    id: string;
    uri: string;
  } | null>(null);
  const [videoSelectedUri, setVideoSelectedUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCheckingFileSize, setIsCheckingFileSize] = useState(false);
  const [checkingProgress, setCheckingProgress] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('videos_uri')
      .orderBy('timestamp', 'desc')
      .onSnapshot(snapshot => {
        const videos = snapshot.docs.map(doc => ({
          id: doc.id,
          uri: doc.data().uri,
        }));
        setVideoList(videos);
      });

    return () => unsubscribe();
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Exit App',
          'Do you want to exit the app?',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Exit', onPress: () => BackHandler.exitApp()},
          ],
          {cancelable: false},
        );
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () =>
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, []),
  );

  const checkVideoSize = async (uri: string): Promise<number> => {
    setIsCheckingFileSize(true);
    setCheckingProgress(0);

    const progressInterval = setInterval(() => {
      setCheckingProgress(prev => Math.min(prev + 10, 90));
    }, 300);

    try {
      if (uri.startsWith('file://')) {
        try {
          const stat = await RNFetchBlob.fs.stat(uri.replace('file://', ''));
          clearInterval(progressInterval);
          setCheckingProgress(100);
          setIsCheckingFileSize(false);
          return stat.size;
        } catch (error) {
          console.error('Error getting file size:', error);
          throw new Error('Failed to get file size');
        }
      }

      const response = await fetch(uri, {method: 'HEAD'});
      const contentLength = response.headers.get('content-length');
      if (!contentLength) {
        throw new Error('Content-Length header not available');
      }

      clearInterval(progressInterval);
      setCheckingProgress(100);
      setIsCheckingFileSize(false);
      return parseInt(contentLength);
    } catch (error) {
      clearInterval(progressInterval);
      setIsCheckingFileSize(false);
      setCheckingProgress(0);
      console.error('Error getting file size:', error);
      throw new Error('Failed to get file size');
    }
  };

  const handleDelete = async () => {
    if (selectedVideo) {
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = async () => {
    if (selectedVideo) {
      try {
        await firestore()
          .collection('videos_uri')
          .doc(selectedVideo.id)
          .delete();
        setSelectedVideo(null);
        setShowDeleteModal(false);
        console.log('Video deleted successfully');
      } catch (error) {
        console.error('Error deleting video: ', error);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const validateFileSize = (fileSize: number): boolean => {
    const fileSizeInMB = fileSize / MB_TO_BYTES;
    return fileSizeInMB <= MAX_FILE_SIZE;
  };
  const handleFileSizeError = (fileSize: number) => {
    const actualSize = formatFileSize(fileSize);
    const maxSize = formatFileSize(MAX_FILE_SIZE * MB_TO_BYTES);

    setUploadError(`File size (${actualSize}) exceeds limit of ${maxSize}`);

    // Clear selected video
    setVideoSelectedUri(null);
  };

  const openGallery = async () => {
    setUploadError(null);
    setUploadProgress(0);
    setVideoSelectedUri(null);

    const options: ImageLibraryOptions = {
      mediaType: 'video',
      selectionLimit: 1,
      videoQuality: 'high',
      includeExtra: true,
    };

    try {
      const response = await new Promise<ImagePickerResponse>(resolve => {
        launchImageLibrary(options, resolve);
      });

      if (
        response.didCancel ||
        !response.assets ||
        response.assets.length === 0
      ) {
        return;
      }

      if (response.errorCode) {
        throw new Error(response.errorMessage || 'Failed to select video');
      }

      const selectedVideoData = response.assets[0];

      // Show checking size UI
      if (selectedVideoData.uri) {
        try {
          const actualSize = await checkVideoSize(selectedVideoData.uri);
          if (!validateFileSize(actualSize)) {
            handleFileSizeError(actualSize);
            return;
          }
          // If size check passes
          setVideoSelectedUri(selectedVideoData.uri);
        } catch (error) {
          console.error('Error checking file size:', error);
          setUploadError('Unable to verify file size. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error selecting video:', error);
      setUploadError('Failed to select video. Please try again.');
      Alert.alert('Error', 'Failed to select video');
    }
  };

  const handleShare = async () => {
    if (selectedVideo) {
      try {
        const options = {
          type: 'video/*',
          url:
            Platform.OS === 'ios'
              ? selectedVideo.uri
              : `file://${selectedVideo.uri}`,
          failOnCancel: false,
        };

        await Share.open(options);
      } catch (error) {
        console.error('Error sharing video:', error);
        Alert.alert('Error', 'Failed to share video');
      }
    }
  };

  const handleUpload = async () => {
    if (!videoSelectedUri) return;

    try {
      const finalSizeCheck = await checkVideoSize(videoSelectedUri);
      if (!validateFileSize(finalSizeCheck)) {
        handleFileSizeError(finalSizeCheck);
        return;
      }

      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      // Upload to Firestore
      await firestore().collection('videos_uri').add({
        uri: videoSelectedUri,
        timestamp: firestore.FieldValue.serverTimestamp(),
        fileSize: finalSizeCheck,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        setVideoSelectedUri(null);
        setIsUploading(false);
        setUploadProgress(0);
        setIsModalVisible(false);
      }, 1000);
    } catch (error) {
      console.error('Error uploading video:', error);
      setUploadError('Failed to upload video. Please try again.');
      setIsUploading(false);
    }
  };

  const renderItem = ({item}: {item: {id: string; uri: string}}) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => setSelectedVideo(item)}>
      <Image
        source={{uri: `${item.uri}#t=1`}}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <Image
        source={require('../assets/images/play_icon.png')}
        style={styles.playIcon}
      />
    </TouchableOpacity>
  );

  return (
    <View style={[globalStyles.pageContainer, {padding: 6}]}>
      <FlatList
        data={videoList}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.flatListContainer}
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsModalVisible(true)}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isUploading) {
            setIsModalVisible(false);
            setUploadError(null);
            setVideoSelectedUri(null);
          }
        }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Video</Text>
              {!isUploading && (
                <TouchableOpacity
                  onPress={() => {
                    setIsModalVisible(false);
                    setUploadError(null);
                    setVideoSelectedUri(null);
                  }}
                  style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              )}
            </View>

            {uploadError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{uploadError}</Text>
              </View>
            )}

            {!isUploading && (
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  uploadError && styles.selectButtonWithError,
                ]}
                onPress={openGallery}>
                <Image
                  source={require('../assets/images/upload_icon.png')}
                  style={[
                    styles.uploadIcon,
                    uploadError && styles.uploadIconError,
                  ]}
                />
                <Text
                  style={[
                    styles.selectButtonText,
                    uploadError && styles.selectButtonTextError,
                  ]}>
                  {videoSelectedUri ? 'Select Different Video' : 'Select Video'}
                </Text>
              </TouchableOpacity>
            )}

            {isCheckingFileSize && (
              <View style={styles.checkingSizeContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.checkingSizeText}>
                  Checking file size... {checkingProgress}%
                </Text>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {width: `${checkingProgress}%`},
                    ]}
                  />
                </View>
              </View>
            )}

            {videoSelectedUri && !uploadError && (
              <View style={styles.selectedVideoContainer}>
                {!isUploading && (
                  <>
                    <View style={styles.videoInfoContainer}>
                      <Image
                        source={require('../assets/images/tick_icon.png')}
                        style={styles.tickIcon}
                      />
                      <Text style={styles.videoSelectedText}>
                        Video Selected
                      </Text>
                    </View>
                    <Text
                      style={styles.videoPath}
                      numberOfLines={1}
                      ellipsizeMode="middle">
                      {videoSelectedUri}
                    </Text>
                  </>
                )}

                {isUploading ? (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator
                      size="large"
                      color={theme.colors.primary}
                    />
                    <Text style={styles.uploadingText}>
                      Uploading... {uploadProgress}%
                    </Text>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          {width: `${uploadProgress}%`},
                        ]}
                      />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handleUpload}>
                    <Text style={styles.uploadButtonText}>Upload Video</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!selectedVideo}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedVideo(null)}>
        <View style={styles.videoModalContainer}>
          <StatusBar barStyle="light-content" />
          {selectedVideo && (
            <>
              <View style={styles.videoModalHeader}>
                <TouchableOpacity
                  style={styles.videoModalButton}
                  onPress={() => setSelectedVideo(null)}>
                  <Image
                    source={require('../assets/images/close_icon.png')}
                    style={styles.videoModalIcon}
                  />
                </TouchableOpacity>
                <Text style={styles.videoModalTitle}>Video Player</Text>
                <View style={styles.headerButtonsContainer}>
                  <TouchableOpacity
                    style={styles.videoModalButton}
                    onPress={handleShare}>
                    <Image
                      source={require('../assets/images/share_icon.png')}
                      style={styles.videoModalIcon}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.videoModalButton,
                      {backgroundColor: 'rgba(255, 59, 48, 0.2)'},
                    ]}
                    onPress={handleDelete}>
                    <Image
                      source={require('../assets/images/delete_icon.png')}
                      style={[styles.videoModalIcon, {tintColor: '#FF3B30'}]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.videoPlayerContainer}>
                <Video
                  source={{uri: selectedVideo.uri}}
                  style={styles.fullScreenVideo}
                  resizeMode="contain"
                  controls
                  poster={`${selectedVideo.uri}#t=1`}
                  posterResizeMode="contain"
                />
              </View>
            </>
          )}
        </View>
      </Modal>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <Image
              source={require('../assets/images/delete_icon.png')}
              style={styles.deleteModalIcon}
            />
            <Text style={styles.deleteModalTitle}>Delete Video</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete this video? This action cannot be
              undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmDelete}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    // Container and Layout Styles
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    row: {
      justifyContent: 'space-between',
      marginVertical: 3,
      paddingHorizontal: 10,
    },
    flatListContainer: {
      paddingHorizontal: 0,
      paddingBottom: 80,
    },

    // Video Item Styles
    itemContainer: {
      margin: 5,
      backgroundColor: '#fff',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      height: 150,
      width: '46%',
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    thumbnail: {
      height: '100%',
      width: '100%',
      backgroundColor: theme.colors.background,
    },
    playIcon: {
      position: 'absolute',
      width: 40,
      height: 40,
      tintColor: '#fff',
      opacity: 0.9,
    },

    // FAB Styles
    addButton: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      backgroundColor: theme.colors.primary,
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    addButtonText: {
      color: '#fff',
      fontSize: 32,
      fontWeight: 'bold',
      marginTop: -2, // Visual alignment
    },

    // Upload Modal Styles
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: 20,
    },
    modalContent: {
      backgroundColor: '#fff',
      width: '90%',
      maxWidth: 400,
      borderRadius: 15,
      padding: 20,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.25,
          shadowRadius: 4,
        },
        android: {
          elevation: 5,
        },
      }),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    closeButton: {
      padding: 8,
      marginRight: -8,
    },
    closeButtonText: {
      fontSize: 24,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    selectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      padding: 15,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    uploadIcon: {
      width: 24,
      height: 24,
      marginRight: 10,
      tintColor: theme.colors.primary,
    },
    selectButtonText: {
      fontSize: 16,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    selectedVideoContainer: {
      marginTop: 20,
      width: '100%',
    },
    videoInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    tickIcon: {
      width: 20,
      height: 20,
      marginRight: 8,
      tintColor: '#4CAF50',
    },
    videoSelectedText: {
      fontSize: 14,
      color: '#4CAF50',
      fontWeight: '500',
    },
    videoPath: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      backgroundColor: theme.colors.background,
      padding: 8,
      borderRadius: 6,
      marginBottom: 15,
    },
    uploadButton: {
      backgroundColor: theme.colors.primary,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
    },
    uploadButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },

    // Video Player Modal Styles
    videoModalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullScreenVideo: {
      width: '100%',
      height: '80%',
    },
    videoControls: {
      position: 'absolute',
      bottom: 40,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    deleteButton: {
      position: 'absolute',
      top: 20,
      right: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderRadius: 20,
      padding: 10,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.25,
          shadowRadius: 4,
        },
        android: {
          elevation: 5,
        },
      }),
    },
    deleteIcon: {
      width: 24,
      height: 24,
      tintColor: '#FF3B30',
    },
    closeVideoButton: {
      position: 'absolute',
      top: 20,
      left: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderRadius: 20,
      padding: 10,
    },
    closeVideoIcon: {
      width: 24,
      height: 24,
      tintColor: theme.colors.textPrimary,
    },

    // Loading and Error States
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
      marginTop: 10,
    },
    // Empty State
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 10,
    },
    // Text Styles
    subText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    headerText: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 10,
    },
    videoModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      marginTop: 25,
    },
    videoModalTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
    videoModalButton: {
      padding: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    videoModalIcon: {
      width: 20,
      height: 20,
      // tintColor: '#fff',
    },
    videoPlayerContainer: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: '#000',
    },
    videoModalFooter: {
      padding: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    footerButton: {
      backgroundColor: theme.colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.25,
          shadowRadius: 4,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    footerButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    headerButtonsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerButton: {
      marginLeft: 8,
    },
    errorContainer: {
      backgroundColor: 'rgba(255, 59, 48, 0.1)',
      padding: 12,
      borderRadius: 8,
      marginVertical: 12,
    },

    uploadingContainer: {
      alignItems: 'center',
      padding: 20,
    },
    uploadingText: {
      marginTop: 12,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    progressBarContainer: {
      width: '100%',
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      marginTop: 12,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: theme.colors.primary,
    },

    selectButtonWithError: {
      borderColor: '#FF3B30',
    },
    uploadIconError: {
      tintColor: '#FF3B30',
    },
    selectButtonTextError: {
      color: '#FF3B30',
    },
    // Add these to your StyleSheet
    checkingSizeContainer: {
      marginTop: 15,
      alignItems: 'center',
      padding: 10,
    },
    checkingSizeText: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },

    // Add new styles for delete confirmation modal
    deleteModalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    deleteModalContent: {
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: 24,
      width: '90%',
      maxWidth: 340,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.25,
          shadowRadius: 4,
        },
        android: {
          elevation: 5,
        },
      }),
    },
    deleteModalIcon: {
      width: 40,
      height: 40,
      tintColor: '#FF3B30',
      marginBottom: 16,
    },
    deleteModalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    deleteModalText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    deleteModalButtons: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    cancelButton: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cancelButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    confirmDeleteButton: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      backgroundColor: '#FF3B30',
      alignItems: 'center',
    },
    confirmDeleteText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default Home;
