import * as React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Home from '../screens/Home';
import {RootStackParamList} from './types';
import Intro from '../screens/Intro';
/**
 * Creates a native stack navigator for the root navigation stack.
 * This stack navigator is typed with RootStackParamList to ensure type safety
 * for the screens and their parameters in the navigation stack.
 *
 * @constant
 * @type {import('@react-navigation/native-stack').NativeStackNavigator<RootStackParamList>}
 */
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * This function represents the root stack navigator for the application.
 * It is responsible for rendering the initial screen and configuring stack navigation options.
 *
 * @returns {React.ReactElement} - A React element representing the root stack navigator.
 */
function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="Intro"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="Intro" component={Intro} />
      <Stack.Screen name="Home" component={Home} />
    </Stack.Navigator>
  );
}

/**
 * The main navigation component for the application.
 * It wraps the entire app with a NavigationContainer and renders the root stack navigator.
 *
 * @returns {React.ReactElement} A React element containing the NavigationContainer and RootStack.
 */
const Navigation = () => {
  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
};

export default Navigation;
