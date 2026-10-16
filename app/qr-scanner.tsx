import { CameraView, useCameraPermissions } from "expo-camera";
import {
  router,
  useLocalSearchParams,
} from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { decodeAnswerQr } from "../lib/grading/answerQr";

export default function QrScannerScreen() {
  const params = useLocalSearchParams<{
    examId?: string;
  }>();

  const examId = params.examId ?? "";

  const [permission, requestPermission] =
    useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Đang kiểm tra quyền camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.title}>MATH-HUY PHUNG</Text>

        <Text style={styles.permissionText}>
          Ứng dụng cần quyền sử dụng camera để quét mã QR đáp án.
        </Text>

        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>CHO PHÉP CAMERA</Text>
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Quay lại</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  async function handleBarcodeScanned({
  data,
}: {
  type: string;
  data: string;
}) {
  if (scanned) return;

  setScanned(true);
console.log(
  "QR RAW DATA:",
  JSON.stringify(data)
);
  try {
    const keys = decodeAnswerQr(data);

    const examCodes = keys
      .map((item) => item.examCode)
      .join(", ");

    const firstKey = keys[0];

    Alert.alert(
      "Đã nhận bộ đáp án",
      [
        `${keys.length} mã đề`,
        "",
        examCodes,
        "",
        `Phần I: ${firstKey?.part1.length ?? 0} câu`,
        `Phần II: ${firstKey?.part2.length ?? 0} câu`,
        `Phần III: ${firstKey?.part3.length ?? 0} câu`,
      ].join("\n"),
      [
        {
          text: "Quét lại",
          onPress: () => setScanned(false),
        },
        {
  text: "Lưu bộ đáp án",
  onPress: () => {
    void (async () => {
      try {
        if (!examId) {
          Alert.alert(
            "Không xác định được bài kiểm tra",
            "Hãy mở chức năng quét QR từ trang Đáp án của bài kiểm tra."
          );

          setScanned(false);
          return;
        }

        const answerStorageKey =
          `MHP_ANSWER_KEYS_${examId}`;

        const metaStorageKey =
          `MHP_ANSWER_KEYS_META_${examId}`;

        await AsyncStorage.setItem(
          answerStorageKey,
          JSON.stringify(keys)
        );

        await AsyncStorage.setItem(
          metaStorageKey,
          JSON.stringify({
            examId,
            count: keys.length,
            examCodes: keys.map(
              (item) => item.examCode
            ),
            savedAt: new Date().toISOString(),
          })
        );

        setTimeout(() => {
  router.replace({
    pathname: "/answer-keys",
    params: { examId },
  });
}, 500);
      } catch (error) {
        console.error(error);

        Alert.alert(
          "Lỗi",
          "Không thể lưu bộ đáp án vào điện thoại."
        );

        setScanned(false);
      }
    })();
  },
},
      ]
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "QR không hợp lệ.";

    Alert.alert(
  "Không đọc được QR",
  `${message}\n\nDữ liệu camera đọc được:\n${String(
    data
  ).slice(0, 300)}`,
  [
      {
        text: "Quét lại",
        onPress: () => setScanned(false),
      },
    ]);
  }
}

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Quét QR đáp án</Text>

          <View style={styles.placeholder} />
        </View>

        <View style={styles.scanArea}>
          <View style={styles.scanFrame} />

          <Text style={styles.instruction}>
            Đưa mã QR vào giữa khung
          </Text>

          <Text style={styles.subInstruction}>
            Camera sẽ tự động nhận diện
          </Text>
        </View>

        {scanned && (
          <Pressable
            style={styles.scanAgainButton}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.scanAgainText}>QUÉT LẠI</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  permissionContainer: {
    flex: 1,
    backgroundColor: "#f4f7fb",
    paddingHorizontal: 24,
    justifyContent: "center",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#16213e",
    textAlign: "center",
    marginBottom: 24,
  },

  permissionText: {
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
    color: "#667085",
    marginBottom: 28,
  },

  primaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  cancelButton: {
    marginTop: 16,
    alignItems: "center",
    padding: 12,
  },

  cancelText: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "600",
  },

  overlay: {
    flex: 1,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonText: {
    color: "#fff",
    fontSize: 36,
    lineHeight: 38,
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  placeholder: {
    width: 44,
  },

  scanArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },

  scanFrame: {
    width: 280,
    height: 280,
    borderWidth: 4,
    borderColor: "#ffffff",
    borderRadius: 24,
    backgroundColor: "transparent",
  },

  instruction: {
    marginTop: 28,
    color: "#fff",
    fontSize: 21,
    fontWeight: "700",
  },

  subInstruction: {
    marginTop: 8,
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
  },

  scanAgainButton: {
    marginHorizontal: 24,
    marginBottom: 30,
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },

  scanAgainText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});