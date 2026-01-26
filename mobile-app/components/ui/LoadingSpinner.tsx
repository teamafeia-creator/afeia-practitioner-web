import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../constants/Colors';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = Colors.teal,
  message,
  fullScreen = false,
  overlay = false,
  style,
}) => {
  const containerStyle: ViewStyle[] = [styles.container];

  if (fullScreen) {
    containerStyle.push(styles.fullScreen);
  }

  if (overlay) {
    containerStyle.push(styles.overlay);
  }

  if (style) {
    containerStyle.push(style);
  }

  return (
    <View style={containerStyle}>
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size={size} color={color} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
};

// Composant pour écran de chargement plein écran
export const FullScreenLoader: React.FC<{ message?: string }> = ({ message = 'Chargement...' }) => (
  <LoadingSpinner fullScreen message={message} />
);

// Composant pour overlay de chargement
export const LoadingOverlay: React.FC<{ message?: string }> = ({ message }) => (
  <LoadingSpinner overlay fullScreen message={message} />
);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: Colors.sable,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    zIndex: 1000,
  },
  spinnerContainer: {
    backgroundColor: Colors.blanc,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.charcoal,
    textAlign: 'center',
  },
});

export default LoadingSpinner;
