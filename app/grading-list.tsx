import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

type SheetType = "MOET_2025" | "MATH_3_PART";

type GradingExam = {
  id: string;
  title: string;
  sheetType: SheetType;
  scanStudentId: boolean;

  part1Questions: number;
  part1Point?: number;

  part2Questions: number;
  part2Point1?: number;
  part2Point2?: number;
  part2Point3?: number;
  part2Point4?: number;

  part3Questions: number;
  part3Point?: number;

  createdAt: string;
};

const EXAMS_STORAGE_KEY = "MHP_GRADING_EXAMS";

export default function GradingListScreen() {
  const [exams, setExams] =
    useState<GradingExam[]>([]);

  const [loading, setLoading] =
    useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadExams() {
        try {
          setLoading(true);

          const raw =
            await AsyncStorage.getItem(
              EXAMS_STORAGE_KEY
            );

          if (!raw) {
            setExams([]);
            return;
          }

          const parsed =
            JSON.parse(raw) as GradingExam[];

          const sorted = [...parsed].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );

          setExams(sorted);
        } catch (error) {
          console.error(
            "Không đọc được danh sách chấm:",
            error
          );

          setExams([]);
        } finally {
          setLoading(false);
        }
      }

      loadExams();
    }, [])
  );

  function getSheetName(
    sheetType: SheetType
  ) {
    if (sheetType === "MOET_2025") {
      return "Bộ GD&ĐT 2025";
    }

    return "Phiếu 2025 - Toán";
  }

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("vi-VN");
  }

  async function deleteExam(
    exam: GradingExam
  ) {
    try {
      const updated = exams.filter(
        (item) => item.id !== exam.id
      );

      await AsyncStorage.setItem(
        EXAMS_STORAGE_KEY,
        JSON.stringify(updated)
      );

      // Nếu đây đang là bài hiện tại thì xóa luôn.
      const currentRaw =
        await AsyncStorage.getItem(
          "MHP_CURRENT_EXAM"
        );

      if (currentRaw) {
        try {
          const current =
            JSON.parse(currentRaw);

          if (current?.id === exam.id) {
            await AsyncStorage.removeItem(
              "MHP_CURRENT_EXAM"
            );
          }
        } catch {
          // Không ảnh hưởng đến việc xóa bài.
        }
      }

      // Chuẩn bị cho các bước sau:
      // nếu có dữ liệu đáp án / bài đã chấm được
      // lưu theo examId thì xóa luôn dữ liệu đó.
      const allKeys =
        await AsyncStorage.getAllKeys();

      const examRelatedKeys =
        allKeys.filter(
          (key) =>
            key.startsWith("MHP_") &&
            key.includes(exam.id)
        );

      if (examRelatedKeys.length > 0) {
        await AsyncStorage.multiRemove(
          examRelatedKeys
        );
      }

      setExams(updated);
    } catch (error) {
      console.error(
        "Không thể xóa bài kiểm tra:",
        error
      );

      Alert.alert(
        "Không thể xóa",
        "Có lỗi khi xóa bài kiểm tra."
      );
    }
  }

  function confirmDelete(
    exam: GradingExam
  ) {
    Alert.alert(
      "Xóa bài kiểm tra?",
      `Thầy có chắc muốn xóa "${exam.title}"?\n\nĐáp án, bài đã chấm và kết quả thuộc bài này cũng sẽ được xóa khi có dữ liệu.`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            deleteExam(exam);
          },
        },
      ]
    );
  }

  function renderDeleteAction(
    exam: GradingExam
  ) {
    return (
      <Pressable
        style={styles.deleteButton}
        onPress={() =>
          confirmDelete(exam)
        }
      >
        <Text style={styles.deleteIcon}>
          🗑️
        </Text>

        <Text style={styles.deleteText}>
          Xóa
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          Danh sách chấm
        </Text>

        <Pressable
          style={styles.headerButton}
          onPress={() =>
            router.push("/exam-setup")
          }
        >
          <Text style={styles.plusIcon}>
            ＋
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={
          exams.length === 0
            ? styles.emptyContent
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={styles.statusText}>
            Đang tải danh sách...
          </Text>
        ) : exams.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>
              📝
            </Text>

            <Text style={styles.emptyTitle}>
              Chưa có bài kiểm tra
            </Text>

            <Text
              style={styles.emptyDescription}
            >
              Nhấn dấu + ở góc trên bên phải
              để tạo bài kiểm tra mới.
            </Text>
          </View>
        ) : (
          exams.map((exam) => (
            <View
              key={exam.id}
              style={styles.swipeContainer}
            >
              <Swipeable
                overshootRight={false}
                friction={2}
                rightThreshold={35}
                renderRightActions={() =>
                  renderDeleteAction(exam)
                }
              >
                <Pressable
                  style={styles.examCard}
                  onPress={() =>
                    router.push({
                      pathname:
                        "/exam-detail",
                      params: {
                        examId: exam.id,
                      },
                    })
                  }
                >
                  <View
                    style={
                      styles.examTopRow
                    }
                  >
                    <Text
                      style={styles.examTitle}
                    >
                      {exam.title}
                    </Text>

                    <Text
                      style={styles.arrow}
                    >
                      ›
                    </Text>
                  </View>

                  <Text
                    style={styles.examInfo}
                  >
                    Ngày:{" "}
                    {formatDate(
                      exam.createdAt
                    )}
                  </Text>

                  <Text
                    style={styles.examInfo}
                  >
                    Số câu:{" "}
                    {exam.part1Questions};{" "}
                    {exam.part2Questions};{" "}
                    {exam.part3Questions}
                  </Text>

                  <Text
                    style={styles.examInfo}
                  >
                    Phiếu:{" "}
                    {getSheetName(
                      exam.sheetType
                    )}
                  </Text>

                  <Text
                    style={[
                      styles.studentIdStatus,
                      exam.scanStudentId
                        ? styles.studentIdOn
                        : styles.studentIdOff,
                    ]}
                  >
                    {exam.scanStudentId
                      ? "✓ Quét số báo danh"
                      : "✕ Không quét số báo danh"}
                  </Text>
                </Pressable>
              </Swipeable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f7fb",
  },

  header: {
    paddingTop: 58,
    paddingBottom: 16,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    borderBottomWidth:
      StyleSheet.hairlineWidth,

    borderBottomColor: "#d0d5dd",
  },

  headerButton: {
    width: 50,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    fontSize: 48,
    lineHeight: 48,
    fontWeight: "300",
    color: "#2563eb",
  },

  plusIcon: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "300",
    color: "#2563eb",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    color: "#16213e",
  },

  scrollView: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 80,
  },

  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 100,
  },

  statusText: {
    textAlign: "center",
    color: "#667085",
    fontSize: 16,
  },

  emptyBox: {
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 54,
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#16213e",
  },

  emptyDescription: {
    marginTop: 10,
    maxWidth: 300,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    color: "#667085",
  },

  swipeContainer: {
    marginBottom: 14,
    borderRadius: 18,
    overflow: "hidden",
  },

  examCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    minHeight: 178,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 7,

    elevation: 2,
  },

  examTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  examTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#16213e",
  },

  arrow: {
    marginLeft: 10,
    fontSize: 36,
    fontWeight: "300",
    color: "#2563eb",
  },

  examInfo: {
    marginTop: 11,
    fontSize: 16,
    lineHeight: 22,
    color: "#344054",
  },

  studentIdStatus: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "600",
  },

  studentIdOn: {
    color: "#16803c",
  },

  studentIdOff: {
    color: "#d92d20",
  },

  deleteButton: {
    width: 92,
    height: "100%",
    backgroundColor: "#d92d20",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteIcon: {
    fontSize: 24,
    marginBottom: 5,
  },

  deleteText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
});
