import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Premium() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Mark as premium locally for demo (Paystack integration pending)
      await AsyncStorage.setItem('is_premium', 'true');
      
      Alert.alert(
        'Success! 🎉',
        'Your account has been upgraded to Premium! You can now access Security Escort and all premium features.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/home')
          }
        ]
      );
            } catch (error) {
              Alert.alert('Error', 'Failed to initialize payment');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade to Premium</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.premiumIcon}>
          <Ionicons name="star" size={80} color="#FFD700" />
        </View>

        <Text style={styles.title}>Go Premium</Text>
        <Text style={styles.subtitle}>Unlock advanced security features</Text>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={20} color="#10B981" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Security Escort</Text>
              <Text style={styles.featureDescription}>
                Real-time GPS tracking for your journeys
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={20} color="#10B981" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Priority Support</Text>
              <Text style={styles.featureDescription}>
                Faster response from security agencies
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={20} color="#10B981" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Unlimited Reports</Text>
              <Text style={styles.featureDescription}>
                No limits on video/audio reports
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={20} color="#10B981" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Enhanced Privacy</Text>
              <Text style={styles.featureDescription}>
                Advanced encryption for all your data
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.pricingBox}>
          <Text style={styles.priceAmount}>₦5,000</Text>
          <Text style={styles.pricePeriod}>per month</Text>
        </View>

        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={handleUpgrade}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <>
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
              <Ionicons name="arrow-forward" size={20} color="#0F172A" />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Cancel anytime. No hidden fees.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  premiumIcon: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  featuresContainer: {
    marginTop: 40,
    gap: 24,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 16,
  },
  checkCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#94A3B8',
  },
  pricingBox: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 8,
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  disclaimer: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
  },
});
