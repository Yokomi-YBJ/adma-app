import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { colors } from '../../constants/colors';

export function LoadingScreen() {
  const [message, setMessage] = useState("Chargement...");

  useEffect(() => {
    // Si Render est endormi, au bout de 5s on prévient l'utilisateur
    const timer = setTimeout(() => {
      setMessage("Connexion au serveur en cours...\n(Le serveur se réveille, merci de patienter)");
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/icon.png')} 
        style={styles.logo} 
        resizeMode="contain" 
      />
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC', // La même couleur que ton splash natif
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  spinner: {
    marginBottom: 20,
  },
  text: {
    fontSize: 14,
    color: '#3B556D',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
});
