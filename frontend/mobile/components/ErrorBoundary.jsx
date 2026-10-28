import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';
import { colors } from '../constants/colors';
import i18n from '../i18n';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ADMA Global ErrorBoundary caught error]:', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.retry) {
      this.props.retry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <AlertTriangle size={36} color={colors.danger} strokeWidth={2.2} />
            </View>

            <Text style={styles.title}>
              {i18n.t('common.appCrashTitle', 'Une interruption est survenue')}
            </Text>

            <Text style={styles.body}>
              {i18n.t(
                'common.appCrashBody',
                "L'application a rencontré un incident. Vos données sont préservées."
              )}
            </Text>

            <TouchableOpacity
              style={styles.retryBtn}
              onPress={this.handleRestart}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={i18n.t('common.restartApp', "Relancer l'application")}
            >
              <RotateCcw size={18} color={colors.white} style={styles.retryIcon} />
              <Text style={styles.retryText}>
                {i18n.t('common.restartApp', "Relancer l'application")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Pour Expo Router convention d'export ErrorBoundary
export function AppErrorBoundary(props) {
  return <ErrorBoundary {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  retryBtn: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: colors.navy,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ErrorBoundary;
