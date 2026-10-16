import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

const AUTO_DELETE_KEY =
  "mhp_auto_delete_after_grading";

export default function SettingsScreen() {
  const [autoDelete, setAutoDelete] =
    useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const savedValue =
        await AsyncStorage.getItem(
          AUTO_DELETE_KEY
        );

      if (savedValue === null) {
        setAutoDelete(false);
        return;
      }

      setAutoDelete(
        savedValue === "true"
      );
    } catch (error) {
      console.log(
        "Không đọc được cài đặt:",
        error
      );
    }
  }

  async function updateAutoDelete(
    value: boolean
  ) {
    try {
      setAutoDelete(value);

      await AsyncStorage.setItem(
        AUTO_DELETE_KEY,
        value ? "true" : "false"
      );
    } catch (error) {
      console.log(
        "Không lưu được cài đặt:",
        error
      );

      Alert.alert(
        "Lỗi",
        "Không lưu được cài đặt."
      );
    }
  }

  function clearTemporaryFiles() {
  Alert.alert(
    "Xóa bộ nhớ tạm",
    "Chức năng này sẽ xóa ảnh và tệp tạm dùng trong quá trình chấm bài. Dữ liệu bài chấm và đáp án đã lưu sẽ không bị xóa.",
    [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            const cacheDirectory =
              FileSystem.cacheDirectory;

            if (!cacheDirectory) {
              Alert.alert(
                "Thông báo",
                "Không xác định được thư mục bộ nhớ tạm."
              );
              return;
            }

            const files =
              await FileSystem.readDirectoryAsync(
                cacheDirectory
              );

            for (const fileName of files) {
              const fileUri =
                `${cacheDirectory}${fileName}`;

              await FileSystem.deleteAsync(
                fileUri,
                {
                  idempotent: true,
                }
              );
            }

            Alert.alert(
              "Đã xóa",
              "Bộ nhớ tạm đã được xóa."
            );
          } catch (error) {
            console.log(
              "CLEAR CACHE ERROR:",
              error
            );

            Alert.alert(
              "Lỗi",
              "Không xóa được bộ nhớ tạm."
            );
          }
        },
      },
    ]
  );
}

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          Cài đặt
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Pressable
            style={styles.row}
            onPress={clearTemporaryFiles}
          >
            <View style={styles.rowTextBox}>
              <Text style={styles.rowTitle}>
                Xóa bộ nhớ tạm
              </Text>

              <Text
                style={styles.rowDescription}
              >
                Xóa ảnh và tệp tạm của quá
                trình chấm bài
              </Text>
            </View>

            <Text style={styles.arrow}>
              ›
            </Text>
          </Pressable>

          <View style={styles.separator} />

          <View style={styles.row}>
            <View style={styles.rowTextBox}>
              <Text style={styles.rowTitle}>
                Tự động xóa ảnh sau khi chấm
              </Text>

              <Text
                style={styles.rowDescription}
              >
                Mặc định tắt để có thể xem
                lại ảnh khi cần
              </Text>
            </View>

            <Switch
              value={autoDelete}
              onValueChange={
                updateAutoDelete
              }
            />
          </View>
        </View>

        <View style={styles.versionCard}>
          <Text style={styles.versionLabel}>
            Phiên bản
          </Text>

          <Text style={styles.versionValue}>
            1.0.0
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f7fb",
  },

  header: {
    minHeight: 68,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e7eb",
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontSize: 38,
    lineHeight: 40,
    color: "#1976d2",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#17202a",
  },

  headerSpacer: {
    width: 44,
  },

  content: {
    padding: 16,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
  },

  row: {
    minHeight: 86,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  rowTextBox: {
    flex: 1,
    paddingRight: 12,
  },

  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#17202a",
  },

  rowDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: "#68737d",
  },

  arrow: {
    fontSize: 30,
    color: "#8a96a3",
  },

  separator: {
    height: 1,
    marginLeft: 18,
    backgroundColor: "#eceff2",
  },

  versionCard: {
    marginTop: 16,
    paddingHorizontal: 18,
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 16,
  },

  versionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#17202a",
  },

  versionValue: {
    fontSize: 15,
    color: "#68737d",
  },
});