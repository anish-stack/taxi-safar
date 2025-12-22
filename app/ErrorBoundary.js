import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log("🔥 ErrorBoundary caught an error:", error);
    console.log("📍 Component Stack:", errorInfo?.componentStack);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRestart = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⚠️</Text>
          </View>

          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.description}>
            We're sorry for the inconvenience. The error has been logged and we'll look into it.
          </Text>

          <View style={styles.errorContainer}>
            <Text style={styles.subtitle}>Error Message</Text>
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {this.state.error?.message || "Unknown error"}
              </Text>
            </View>
          </View>

          <View style={styles.errorContainer}>
            <Text style={styles.subtitle}>Component Stack</Text>
            <ScrollView style={styles.stackBox} nestedScrollEnabled={true}>
              <Text style={styles.stackText}>
                {this.state.errorInfo?.componentStack || "Not available"}
              </Text>
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  errorContainer: {
    width: "100%",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  errorBox: {
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: "#FFE0B2",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: "#E65100",
    fontFamily: "monospace",
    lineHeight: 18,
  },
  stackBox: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  stackText: {
    fontSize: 11,
    color: "#424242",
    fontFamily: "monospace",
    lineHeight: 16,
  },
  button: {
    backgroundColor: "#000000",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 12,
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default ErrorBoundary