import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const OMR_SERVER =
  "https://math-huy-phung-omr-cloud.onrender.com";

type AnalysisResult = {
  ok: boolean;
  filename?: string;
  width?: number;
  height?: number;

  candidate_count?: number;

  left_marker_count?: number;
  right_marker_count?: number;
  marker_count?: number;

  markers_found?: boolean;

  debug_image?: string;
  marker_debug_image?: string;
  warped_image?: string;

  message?: string;
  error?: string;
};

export default function OmrAnalysisScreen() {
  const params = useLocalSearchParams<{
    photoUri?: string;
    rawPhotoUri?: string;
    examId?: string;
    examTitle?: string;
    sheetType?: string;
  }>();

  const photoUri =
    typeof params.photoUri === "string"
      ? params.photoUri
      : "";

  const rawPhotoUri =
    typeof params.rawPhotoUri === "string"
      ? params.rawPhotoUri
      : photoUri;

  const [status, setStatus] = useState(
    "Đang gửi ảnh tới OpenCV..."
  );

  const [loading, setLoading] =
    useState(true);

  const [result, setResult] =
    useState<AnalysisResult | null>(null);

  const [debugImageUri, setDebugImageUri] =
    useState("");
const [markerDebugImageUri, setMarkerDebugImageUri] =
  useState("");

const [warpedImageUri, setWarpedImageUri] =
  useState("");
  useEffect(() => {
    analyzeImage();
  }, []);

  async function analyzeImage() {
    try {
      setLoading(true);
      setStatus(
        "Đang gửi ảnh trong khung tới máy chủ OMR..."
      );

            if (!photoUri) {
        throw new Error(
          "Không tìm thấy ảnh trong khung."
        );
      }

      const formData = new FormData();

      formData.append(
        "file",
        {
          uri: photoUri,
          name: "exam-photo.jpg",
          type: "image/jpeg",
        } as any
      );

      const response = await fetch(
        `${OMR_SERVER}/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data: AnalysisResult =
        await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            "Máy chủ OMR không phân tích được ảnh."
        );
      }

      setResult(data);

            if (data.debug_image) {
        setDebugImageUri(
          `${OMR_SERVER}${data.debug_image}`
        );
      }

      if (data.marker_debug_image) {
        setMarkerDebugImageUri(
          `${OMR_SERVER}${data.marker_debug_image}`
        );
      }

      if (data.warped_image) {
        setWarpedImageUri(
          `${OMR_SERVER}${data.warped_image}`
        );
      }

      setStatus(
        `OpenCV đã tìm thấy ${
          data.candidate_count ?? 0
        } vùng có khả năng là mốc đen.`
      );
    } catch (error) {
      console.error(
        "Lỗi phân tích OMR:",
        error
      );

      setStatus(
        error instanceof Error
          ? `Lỗi: ${error.message}`
          : "Không kết nối được máy chủ OMR."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={
          styles.container
        }
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.brand}>
              MATH-HUY PHUNG
            </Text>

            <Text style={styles.title}>
              Phân tích phiếu
            </Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: "#ffffff",
            padding: 12,
            borderRadius: 12,
            marginBottom: 18,
          }}
        >
          <Text
            selectable
            style={{
              fontSize: 12,
              color: "#111111",
              marginBottom: 8,
            }}
          >
            photoUri: {photoUri}
          </Text>

          <Text
            selectable
            style={{
              fontSize: 12,
              color: "#111111",
            }}
          >
            rawPhotoUri: {rawPhotoUri}
          </Text>
        </View>
        {!!photoUri && (
          <>
            <Text style={styles.sectionTitle}>
              Ảnh trong khung
            </Text>

            <View style={styles.imageCard}>
              <Image
                source={{ uri: photoUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </View>
          </>
        )}
        {!!rawPhotoUri && (
          <>
            <Text style={styles.sectionTitle}>
              Ảnh GỐC gửi OpenCV
            </Text>

            <View style={styles.imageCard}>
              <Image
                source={{ uri: rawPhotoUri }}
                style={styles.debugImage}
                resizeMode="contain"
              />
            </View>
          </>
        )}
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>
            Phân tích OpenCV
          </Text>

          {loading && (
            <ActivityIndicator
              size="large"
              style={styles.loader}
            />
          )}

          <Text style={styles.statusText}>
            {status}
          </Text>

          <View style={styles.step}>
            <Text style={styles.done}>
              ✓
            </Text>
            <Text style={styles.stepText}>
              Đã nhận ảnh phiếu
            </Text>
          </View>

          <View style={styles.step}>
            <Text
              style={
                result?.candidate_count
                  ? styles.done
                  : styles.pending
              }
            >
              {result?.candidate_count
                ? "✓"
                : "○"}
            </Text>

            <Text style={styles.stepText}>
              Phát hiện vùng đen
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.pending}>
              ○
            </Text>
            <Text style={styles.stepText}>
              Xác định mốc định vị chuẩn
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.pending}>
              ○
            </Text>
            <Text style={styles.stepText}>
              Hiệu chỉnh phối cảnh
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.pending}>
              ○
            </Text>
            <Text style={styles.stepText}>
              Đọc mã đề và đáp án
            </Text>
          </View>
        </View>

        {!!debugImageUri && (
          <>
            <Text style={styles.sectionTitle}>
              OpenCV phát hiện mốc
            </Text>

            <View style={styles.imageCard}>
              <Image
                source={{
                  uri: debugImageUri,
                }}
                style={styles.debugImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.debugText}>
              Khung đỏ là các vùng OpenCV
              đang nghi là mốc định vị.
            </Text>
          </>
        )}
        {!!markerDebugImageUri && (
          <>
            <Text style={styles.sectionTitle}>
              Mốc định vị chuẩn
            </Text>

            <View style={styles.imageCard}>
              <Image
                source={{
                  uri: markerDebugImageUri,
                }}
                style={styles.debugImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.debugText}>
              Xanh lá: cột mốc trái. Xanh dương:
              cột mốc phải. Vàng P1-P4:
              bốn điểm dùng để nắn phối cảnh.
            </Text>
          </>
        )}

        {!!warpedImageUri && (
          <>
            <Text style={styles.sectionTitle}>
              Phiếu sau hiệu chỉnh phối cảnh
            </Text>

            <View style={styles.imageCard}>
              <Image
                source={{
                  uri: warpedImageUri,
                }}
                style={styles.debugImage}
                resizeMode="contain"
              />
            </View>
          </>
        )}
        {!loading && !result?.ok && (
          <Pressable
            style={styles.retryButton}
            onPress={analyzeImage}
          >
            <Text
              style={
                styles.retryButtonText
              }
            >
              THỬ PHÂN TÍCH LẠI
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f7fc",
  },

  container: {
    padding: 20,
    paddingBottom: 50,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  backButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#e8eef8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  backText: {
    fontSize: 42,
    lineHeight: 44,
    color: "#10224b",
  },

  headerText: {
    flex: 1,
  },

  brand: {
    color: "#2563eb",
    fontWeight: "800",
    fontSize: 16,
  },

  title: {
    color: "#0f1f46",
    fontSize: 30,
    fontWeight: "900",
  },

  sectionTitle: {
    color: "#0f1f46",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },

  imageCard: {
    backgroundColor: "#111111",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 22,
  },

  previewImage: {
    width: "100%",
    height: 390,
  },

  debugImage: {
    width: "100%",
    height: 500,
  },

  statusCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 22,
    marginBottom: 24,
  },

  cardTitle: {
    color: "#0f1f46",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 16,
  },

  loader: {
    marginBottom: 16,
  },

  statusText: {
    color: "#2563eb",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 20,
  },

  step: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  done: {
    width: 34,
    color: "#159447",
    fontSize: 30,
    fontWeight: "700",
  },

  pending: {
    width: 34,
    color: "#9aa7bb",
    fontSize: 30,
  },

  stepText: {
    flex: 1,
    color: "#526078",
    fontSize: 18,
  },

  debugText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    marginTop: -12,
    marginBottom: 20,
  },

  retryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
});

