import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const ACCOUNT_KEY = "mhp_account";

type AccountData = {
  fullName: string;
  email: string;
  province: string;
  accountType: string;
};

const DEFAULT_ACCOUNT: AccountData = {
  fullName: "",
  email: "",
  province: "",
  accountType: "Giáo viên",
};

export default function AccountScreen() {
  const [account, setAccount] =
    useState<AccountData>(DEFAULT_ACCOUNT);

  useEffect(() => {
    loadAccount();
  }, []);

  async function loadAccount() {
    try {
      const raw =
        await AsyncStorage.getItem(
          ACCOUNT_KEY
        );

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);

      setAccount({
        ...DEFAULT_ACCOUNT,
        ...parsed,
      });
    } catch (error) {
      console.log(
        "LOAD ACCOUNT ERROR:",
        error
      );
    }
  }

  function updateField(
    field: keyof AccountData,
    value: string
  ) {
    setAccount((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveAccount() {
    try {
      await AsyncStorage.setItem(
        ACCOUNT_KEY,
        JSON.stringify(account)
      );

      Alert.alert(
        "Đã lưu",
        "Thông tin tài khoản đã được lưu."
      );
    } catch (error) {
      console.log(
        "SAVE ACCOUNT ERROR:",
        error
      );

      Alert.alert(
        "Lỗi",
        "Không lưu được thông tin tài khoản."
      );
    }
  }

  function logout() {
    Alert.alert(
      "Đăng xuất",
      "Thầy có chắc muốn đăng xuất khỏi tài khoản này không?",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Thông báo",
              "Phần đăng xuất sẽ được kết nối với hệ thống đăng nhập ở bước sau."
            );
          },
        },
      ]
    );
  }

  function deleteAccount() {
    Alert.alert(
      "Xóa tài khoản",
      "Thầy có chắc muốn xóa tài khoản này không? Hành động này không thể hoàn tác.",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xóa tài khoản",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(
                ACCOUNT_KEY
              );

              setAccount({
                ...DEFAULT_ACCOUNT,
              });

              Alert.alert(
                "Đã xóa",
                "Thông tin tài khoản trên thiết bị đã được xóa."
              );
            } catch (error) {
              console.log(
                "DELETE ACCOUNT ERROR:",
                error
              );

              Alert.alert(
                "Lỗi",
                "Không xóa được tài khoản."
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
          Tài khoản
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Họ tên
              </Text>

              <TextInput
                value={account.fullName}
                onChangeText={(value) =>
                  updateField(
                    "fullName",
                    value
                  )
                }
                placeholder="Nhập họ tên"
                style={styles.input}
                returnKeyType="next"
              />
            </View>

            <View style={styles.separator} />

            <View style={styles.field}>
              <Text style={styles.label}>
                Email
              </Text>

              <TextInput
                value={account.email}
                onChangeText={(value) =>
                  updateField(
                    "email",
                    value
                  )
                }
                placeholder="Nhập email"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
                returnKeyType="next"
              />
            </View>

            <View style={styles.separator} />

            <View style={styles.field}>
              <Text style={styles.label}>
                Tỉnh
              </Text>

              <TextInput
                value={account.province}
                onChangeText={(value) =>
                  updateField(
                    "province",
                    value
                  )
                }
                placeholder="Nhập tỉnh / thành phố"
                style={styles.input}
                returnKeyType="done"
              />
            </View>

            <View style={styles.separator} />

            <View style={styles.field}>
              <Text style={styles.label}>
                Loại tài khoản
              </Text>

              <View style={styles.readOnlyBox}>
                <Text style={styles.readOnlyText}>
                  {account.accountType}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            style={styles.saveButton}
            onPress={saveAccount}
          >
            <Text style={styles.saveButtonText}>
              Lưu thông tin
            </Text>
          </Pressable>

          <Pressable
            style={styles.logoutButton}
            onPress={logout}
          >
            <Text style={styles.logoutText}>
              Đăng xuất
            </Text>
          </Pressable>

          <Pressable
            style={styles.deleteButton}
            onPress={deleteAccount}
          >
            <Text style={styles.deleteText}>
              Xóa tài khoản
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },

  keyboardAvoidingView: {
    flex: 1,
  },

  header: {
    minHeight: 68,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E4E7EB",
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
    color: "#2563EB",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  headerSpacer: {
    width: 44,
  },

  content: {
    padding: 16,
    paddingBottom: 180,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },

  field: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },

  readOnlyBox: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  readOnlyText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "600",
  },

  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  saveButton: {
    marginTop: 20,
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },

  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  logoutButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },

  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  deleteButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
  },

  deleteText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#B91C1C",
  },
});