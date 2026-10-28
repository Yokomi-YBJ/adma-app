import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { colors } from '../../constants/colors';

export function LoadingScreen() {
  const [serverWaking, setServerWaking] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setServerWaking(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primaryDark} style={styles.spinner} />
      <Text style={styles.text}>
        {serverWaking
          ? 'Connexion au serveur...\n(Le serveur se réveille, merci de patienter)'
          : 'Chargement...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC', // ⚠️ Identique à app.json
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: { 
    marginBottom: 20 
  },
  text: {
    fontSize: 14,
    color: '#3B556D',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    paddingHorizontal: 32,
  },
});
