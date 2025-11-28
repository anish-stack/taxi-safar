import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import logo from '../../../assets/taxisafar-logo.png';
import { Colors } from '../../../constant/ui';
import { API_URL_APP } from '../../../constant/api';
import axios from 'axios';
import loginStore from '../../../store/auth.store';

export default function LoginScreen({ navigation }) {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  // Error states
  const [mobileError, setMobileError] = useState('');
  const [otpError, setOtpError] = useState('');

  const { setToken, setAuthenticated } = loginStore();

  // Countdown timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // ==============================
  // Handle Get OTP
  // ==============================
  const handleGetOtp = async () => {
    await Haptics.selectionAsync();
    setMobileError('');

    if (!mobile || mobile.length < 10) {
      setMobileError('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL_APP}/api/v1/login`, { number: mobile });
      const { success, message, redirect, driver } = res.data;

      if (success) {
        setShowOtpScreen(true);
        setTimer(60);
        setMobileError('');
      } else if (redirect) {
        handleRedirect(redirect, message, driver);
      } else {
        setMobileError(message || 'Failed to send OTP. Try again.');
      }
    } catch (error) {
      console.log('Login Error:', error.response?.data || error.message);
      const errData = error.response?.data;
      console.log("Error Data",errData)
      if (errData?.redirect || errData?.driver) {
        handleRedirect(errData.redirect, errData.message, errData.driver);
      } else {
        setMobileError(errData?.message || 'Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // Handle Verify OTP
  // ==============================
  const handleVerifyOtp = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOtpError('');

    if (!otp || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL_APP}/api/v1/verify-login-otp`, {
        number: mobile,
        otp,
      });

      if (res.data.success) {
        const { accessToken, data } = res.data;

        if (!accessToken) throw new Error('No token returned');

        setToken(accessToken);
        setAuthenticated(true);
        loginStore.setState({ driver: data });

        setTimeout(() => {
          if (navigation.isFocused()) {
            navigation.replace('Home');
          }
        }, 300);

        return;
      }

      setOtpError(res.data.message || 'Invalid OTP. Please try again.');
    } catch (error) {
      console.log('Verify OTP Error:', error.response?.data || error.message);
      setOtpError(error.response?.data?.message || 'Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // Handle Resend OTP
  // ==============================
  const handleResendOtp = async () => {
    if (timer > 0) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL_APP}/api/v1/resend-otp`, { number: mobile });

      if (res.data.success) {
        setTimer(60);
        setOtpError('');
      } else {
        setOtpError(res.data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      setOtpError(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // Handle Redirects
  // ==============================
  const handleRedirect = (redirect, message, driver) => {
    console.log(redirect)
    if(redirect === 'step-1'){
      navigation.navigate('Signup', { step: 1 });

    }
    else if (redirect === 'step-2') {
      navigation.navigate('Signup', { step: 2, driver });
    } else if (redirect === 'step-3') {
      navigation.navigate('addVehcile', { step: 3, driverId: driver?._id });
    } else if (redirect === 'step-4') {
      navigation.navigate('bankAdd', { step: 5, driverId: driver?._id });
    } else if (redirect === 'step-5') {
      navigation.navigate('wait_screen', { driverId: driver?._id });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Image source={logo} style={styles.logo} resizeMode="contain" />

          {!showOtpScreen ? (
            <>
              <Text style={styles.title}>Welcome Back!</Text>
              <Text style={styles.subtitle}>Login with your mobile number</Text>

              {/* Mobile Input with Error */}
              <View style={[styles.inputWrapper, mobileError && styles.inputError]}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryText}>+91 ▼</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter mobile number"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={mobile}
                  onChangeText={(text) => {
                    setMobile(text);
                    setMobileError('');
                  }}
                  placeholderTextColor={Colors.placeholder}
                />
              </View>
              {mobileError ? <Text style={styles.errorText}>{mobileError}</Text> : null}

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleGetOtp}
                disabled={loading}
              >
                <Text style={styles.btnText}>
                  {loading ? 'Sending OTP...' : 'Get OTP'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.signupText}>
                New User?{' '}
                <Text style={styles.signupLink} onPress={() => navigation.navigate('Signup')}>
                  Sign up
                </Text>
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Enter OTP</Text>
              <Text style={styles.subtitle}>Sent to +91 {mobile}</Text>

              {/* OTP Input */}
              <View style={[styles.otpContainer, otpError && styles.inputError]}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="------"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(text) => {
                    setOtp(text.replace(/[^0-9]/g, '')); // Only numbers
                    setOtpError('');
                  }}
                  placeholderTextColor={Colors.placeholder}
                />
              </View>
              {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                <Text style={styles.btnText}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resendBtn, timer > 0 && styles.resendDisabled]}
                onPress={handleResendOtp}
                disabled={timer > 0}
              >
                <Text style={[styles.resendText, timer > 0 && { color: Colors.textSecondary }]}>
                  {timer > 0 ? `Resend in ${timer}s` : 'Didn’t receive OTP? Resend'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowOtpScreen(false)}>
                <Text style={styles.changeNumber}>Change Number</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// ==============================
// Styles
// ==============================
const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  logo: {
    width: 170,
    height: 70,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Input Wrapper
  inputWrapper: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fff5f5',
  },
  countryCode: {
    backgroundColor: Colors.greyLight,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  countryText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 17,
    color: Colors.textPrimary,
    paddingVertical: 16,
  },

  // OTP Input
  otpContainer: {
    width: '100%',
    marginBottom: 8,
  },
  otpInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: '600',
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },

  // Error Text
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    alignSelf: 'flex-start',
    marginLeft: 4,
    marginBottom: 12,
    fontWeight: '500',
  },

  // Buttons
  btn: {
    backgroundColor: Colors.primary,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: Colors.textOnPrimary,
    fontSize: 17,
    fontWeight: '700',
  },

  // Resend
  resendBtn: {
    marginTop: 20,
    padding: 8,
  },
  resendDisabled: {
    opacity: 0.6,
  },
  resendText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },

  // Links
  changeNumber: {
    marginTop: 16,
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  signupText: {
    marginTop: 24,
    color: Colors.textSecondary,
    fontSize: 15,
  },
  signupLink: {
    color: Colors.black,
    fontWeight: '800',
  },
});