import React, { useEffect } from 'react';
import { StyleSheet, View, Image, useWindowDimensions, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const Intro: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('Home'); // Replace 'Home' with the actual route name of your Home screen
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Image
        source={require('../assets/images/intro_image.png')}
        style={{ width: width * 0.8, height: height * 0.6 }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff', // Default background color; adjust based on your theme
  },
});

export default Intro;
