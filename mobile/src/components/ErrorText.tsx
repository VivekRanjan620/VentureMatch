import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

export interface ErrorTextProps {
  message?: string | null;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const ErrorText: React.FC<ErrorTextProps> = ({ message, style, textStyle }) => {
  if (!message) return null;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, textStyle]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radius.input,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  text: {
    color: colors.error,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
  },
});
