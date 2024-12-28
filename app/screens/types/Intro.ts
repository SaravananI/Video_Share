import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigations/types';

// Define the navigation prop type
export type IntroScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Intro'
>;

export type IntroScreenProps = {};
