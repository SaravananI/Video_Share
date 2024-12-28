import {StyleSheet} from 'react-native';
import {CustomTheme} from './types';

export const createGlobalStyles = (theme: CustomTheme) => {
  const {colors} = theme;
  return StyleSheet.create({
    pageContainer: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
    },
    card: {
      backgroundColor: colors.card,
    },
    centerAlign: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    btn: {
      height: 56,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      padding: 8,
      backgroundColor: colors.primary,
    },
    input: {
      height: 56,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'stretch',
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontFamily: 'Inter-Regular',
      color: colors.black,
      fontSize: 14,
    },
    inputWithIcon: {
      height: 56,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'stretch',
      paddingHorizontal: 12,
      // paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    btn2: {
      height: 56,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      padding: 8,
      backgroundColor: colors.primary,
      alignSelf: 'stretch',
    },
    btnText: {
      color: colors.white,
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      letterSpacing: 1,
    },
    inputLabel: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      color: colors.black,
      letterSpacing: 1,
    },
    spacer: {
      height: 20,
    },
    headerText: {
      fontFamily: 'Inter-Bold',
      fontSize: 20,
      color: colors.black,
    },
    subText: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.gray,
      lineHeight: 21,
    },
    modalContainer: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: 'red',
      marginTop: 5,
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    heading1: {
      fontFamily: 'Mulish-Bold',
      fontSize: 32,
      color: colors.textPrimary,
    },
    heading2: {
      fontFamily: 'Mulish-Bold',
      fontSize: 24,
      color: colors.textPrimary,
    },
    subheading1: {
      fontFamily: 'Mulish-SemiBold',
      fontSize: 18,
      color: colors.textPrimary,
    },
    subheading2: {
      fontFamily: 'Mulish-SemiBold',
      fontSize: 16,
      color: colors.textPrimary,
    },
    bodyText1: {
      fontFamily: 'Mulish-SemiBold',
      fontSize: 14,
      color: colors.textPrimary,
    },
    bodyText2: {
      fontFamily: 'Mulish-Regular',
      fontSize: 14,
      color: colors.textPrimary,
    },
  });
};
