import { router } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.logoContainer}>
  <Image
    source={require("../../assets/images/logo-math-huy.png")}
    style={styles.logo}
    resizeMode="contain"
  />
</View>

        <Text style={styles.subtitle}>
          Chấm bài trắc nghiệm
        </Text>
      </View>

      <View style={styles.menu}>
        <Pressable
          style={styles.menuItem}
          onPress={() =>
            router.push("/grading-list")
          }
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>📝</Text>
          </View>

          <View style={styles.menuTextBox}>
            <Text style={styles.menuTitle}>
              Danh sách chấm
            </Text>

            <Text style={styles.menuDescription}>
              Tạo bài kiểm tra, chấm bài và xem kết quả
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <Pressable
  style={styles.menuItem}
  onPress={() =>
    router.push("/settings")
  }
>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>⚙️</Text>
          </View>

          <View style={styles.menuTextBox}>
            <Text style={styles.menuTitle}>
              Cài đặt
            </Text>

            <Text style={styles.menuDescription}>
              Thiết lập chấm bài và ứng dụng
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() =>
            router.push("/account")
          }
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>👤</Text>
          </View>

          <View style={styles.menuTextBox}>
            <Text style={styles.menuTitle}>
              Tài khoản
            </Text>

            <Text style={styles.menuDescription}>
              Thông tin giáo viên và tài khoản
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          MATH-HUY PHUNG
        </Text>

        <Text style={styles.footerSubtext}>
          Hỗ trợ chấm bài trắc nghiệm bằng điện thoại
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f7fb",
  },
  logoContainer: {
    alignItems: "flex-start",
    justifyContent: "center",
    marginBottom: 8,
  },

  logo: {
    width: 118,
    height: 118,
  },
  contentContainer: {
    paddingHorizontal: 22,
    paddingTop: 70,
    paddingBottom: 100,
  },

  header: {
    marginBottom: 34,
  },

  brand: {
    fontSize: 30,
    fontWeight: "800",
    color: "#16213e",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 17,
    color: "#667085",
  },

  menu: {
    gap: 16,
  },

  menuItem: {
    minHeight: 112,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,

    elevation: 3,
  },

  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#eef4ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  icon: {
    fontSize: 29,
  },

  menuTextBox: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#16213e",
  },

  menuDescription: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#667085",
  },

  arrow: {
    marginLeft: 10,
    fontSize: 38,
    fontWeight: "300",
    color: "#2563eb",
  },

  footer: {
    marginTop: 42,
    alignItems: "center",
  },

  footerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#98a2b3",
  },

  footerSubtext: {
    marginTop: 5,
    fontSize: 13,
    color: "#b0b8c4",
    textAlign: "center",
  },
});