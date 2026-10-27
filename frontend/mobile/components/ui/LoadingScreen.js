import React, { useRef, useEffect, useState } from 'react';
import { View, Image, StyleSheet, Animated, Text, ActivityIndicator } from 'react-native';
import { colors } from '../../constants/colors';

export function LoadingScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState("Chargement...");

  useEffect(() => {
    // Fondu d'apparition doux
    Animated.timing(opacity, { 
      toValue: 1, 
      duration: 400, 
      useNativeDriver: true 
    }).start();

    // Si Render met du temps à se réveiller, on rassure l'utilisateur après 5s
    const timer = setTimeout(() => {
      setMessage("Connexion au serveur...\n(Le serveur se réveille, merci de patienter)");
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity }}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo} 
          resizeMode="contain"
        />
      </Animated.View>
      
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
      <Text style={styles.text}>{message}</Text>
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
  logo: { 
    width: 150, // ⚠️ Identique à "imageWidth" dans app.json
    height: 150, 
    marginBottom: 30 
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
