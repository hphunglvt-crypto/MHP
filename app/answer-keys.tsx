import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Swipeable } from "react-native-gesture-handler";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

type AnswerKey = {
  examCode: string;
  part1: unknown[];
  part2: unknown[];
  part3: unknown[];
};

const EXAMS_STORAGE_KEY =
  "MHP_GRADING_EXAMS";

export default function AnswerKeysScreen() {
  const params = useLocalSearchParams<{
    examId?: string;
  }>();

  const examId = params.examId ?? "";

  const [exam, setExam] =
    useState<GradingExam | null>(null);

  const [answerKeys, setAnswerKeys] =
    useState<AnswerKey[]>([]);

  const [loading, setLoading] =
    useState(true);

  const answerStorageKey =
    `MHP_ANSWER_KEYS_${examId}`;

  useFocusEffect(
    useCallback(() => {
      async function loadData() {
        try {
          setLoading(true);

          const [examRaw, answerRaw] =
            await Promise.all([
              AsyncStorage.getItem(
                EXAMS_STORAGE_KEY
              ),
              AsyncStorage.getItem(
                answerStorageKey
              ),
            ]);

          if (examRaw) {
            const parsed =
              JSON.parse(
                examRaw
              ) as GradingExam[];

            const found =
              parsed.find(
                (item) =>
                  item.id === examId
              ) ?? null;

            setExam(found);
          } else {
            setExam(null);
          }

          if (answerRaw) {
            const parsed =
              JSON.parse(answerRaw);

            if (Array.isArray(parsed)) {
              const sorted =
                [...parsed].sort(
                  (a, b) =>
                    String(
                      a.examCode
                    ).localeCompare(
                      String(
                        b.examCode
                      ),
                      "vi",
                      {
                        numeric: true,
                      }
                    )
                );

              setAnswerKeys(sorted);
            } else {
              setAnswerKeys([]);
            }
          } else {
            setAnswerKeys([]);
          }
        } catch (error) {
          console.error(
            "Không đọc được đáp án:",
            error
          );

          setAnswerKeys([]);
        } finally {
          setLoading(false);
        }
      }

      loadData();
    }, [examId, answerStorageKey])
  );

  function openQrScanner() {
    router.push({
      pathname: "/qr-scanner",
      params: {
        examId,
      },
    });
  }

  function addExamCode() {
    router.push({
      pathname: "/answer-key-edit",
      params: {
        examId,
      },
    });
  }

  function editExamCode(
    examCode: string
  ) {
    router.push({
      pathname: "/answer-key-edit",
      params: {
        examId,
        examCode,
      },
    });
  }
function deleteExamCode(examCode: string) {
  Alert.alert(
    "Xóa mã đề",
    `Thầy có chắc muốn xóa mã đề ${examCode}?`,
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
            const next = answerKeys.filter(
              (item) =>
                item.examCode !== examCode
            );

            await AsyncStorage.setItem(
              answerStorageKey,
              JSON.stringify(next)
            );

            setAnswerKeys(next);
          } catch (error) {
            console.error(error);

            Alert.alert(
              "Lỗi",
              "Không thể xóa mã đề."
            );
          }
        },
      },
    ]
  );
}
  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={styles.centerContent}
        >
          <Text
            style={styles.statusText}
          >
            Đang tải đáp án...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!exam) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={styles.centerContent}
        >
          <Text
            style={styles.notFoundTitle}
          >
            Không tìm thấy bài kiểm tra
          </Text>

          <Pressable
            style={styles.backButtonLarge}
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={
                styles.backButtonLargeText
              }
            >
              Quay lại
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          Đáp án
        </Text>

        <View
          style={styles.headerButton}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.examCard}>
          <Text
            style={styles.examTitle}
          >
            {exam.title}
          </Text>

          <Text
            style={styles.examStructure}
          >
            Phần I:{" "}
            {exam.part1Questions} câu
          </Text>

          <Text
            style={styles.examStructure}
          >
            Phần II:{" "}
            {exam.part2Questions} câu
          </Text>

          <Text
            style={styles.examStructure}
          >
            Phần III:{" "}
            {exam.part3Questions} câu
          </Text>
        </View>

        <View
          style={styles.sectionHeader}
        >
          <Text
            style={styles.sectionTitle}
          >
            Bộ đáp án
          </Text>

          <View
            style={styles.countBadge}
          >
            <Text
              style={styles.countText}
            >
              {answerKeys.length} mã đề
            </Text>
          </View>
        </View>

        {answerKeys.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text
              style={styles.emptyIcon}
            >
              ✓
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              Chưa có đáp án
            </Text>

            <Text
              style={
                styles.emptyDescription
              }
            >
              Thầy có thể nhập đáp án
              thủ công cho từng mã đề
              hoặc quét QR để nhập
              nhiều mã đề cùng lúc.
            </Text>
          </View>
        ) : (
          <View
            style={styles.answerList}
          >
            {answerKeys.map((answer, index) => (
  <Swipeable
    key={answer.examCode}
    overshootRight={false}
    renderRightActions={() => (
      <Pressable
        style={styles.deleteAction}
        onPress={() =>
          deleteExamCode(answer.examCode)
        }
      >
        <Text style={styles.deleteActionText}>
          XÓA
        </Text>
      </Pressable>
    )}
  >
    <Pressable
      style={[
        styles.answerRow,
        index < answerKeys.length - 1 &&
          styles.answerRowBorder,
      ]}
      onPress={() =>
        editExamCode(answer.examCode)
      }
    >
      <View style={styles.codeBox}>
        <Text style={styles.codeText}>
          {answer.examCode}
        </Text>
      </View>

      <View style={styles.answerInfo}>
        <Text style={styles.answerTitle}>
          Mã đề {answer.examCode}
        </Text>

        <Text style={styles.answerStatus}>
          ✓ Đã có đáp án
        </Text>
      </View>

      <Text style={styles.rowArrow}>
        ›
      </Text>
    </Pressable>
  </Swipeable>
))}
          </View>
        )}

        <Pressable
          style={styles.addButton}
          onPress={addExamCode}
        >
          <Text
            style={styles.addButtonIcon}
          >
            ＋
          </Text>

          <Text
            style={styles.addButtonText}
          >
            THÊM MÃ ĐỀ
          </Text>
        </Pressable>

        <Pressable
          style={styles.qrButton}
          onPress={openQrScanner}
        >
          <Text
            style={styles.qrButtonIcon}
          >
            ▣
          </Text>

          <View
            style={styles.qrTextBox}
          >
            <Text
              style={styles.qrButtonText}
            >
              QUÉT QR ĐÁP ÁN
            </Text>

            <Text
              style={styles.qrDescription}
            >
              Nhập nhiều mã đề cùng lúc
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#f4f7fb",
    },

    header: {
      minHeight: 64,
      paddingHorizontal: 12,
      backgroundColor: "#ffffff",
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor: "#d0d5dd",
    },

    headerButton: {
      width: 50,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
    },

    backIcon: {
      fontSize: 46,
      lineHeight: 48,
      fontWeight: "300",
      color: "#2563eb",
    },

    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 22,
      fontWeight: "800",
      color: "#16213e",
    },

    scrollView: {
      flex: 1,
    },

    content: {
      padding: 18,
      paddingBottom: 80,
    },

    examCard: {
      backgroundColor: "#ffffff",
      borderRadius: 18,
      padding: 20,
    },

    examTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: "#16213e",
      marginBottom: 12,
    },

    examStructure: {
      marginTop: 5,
      fontSize: 16,
      color: "#475467",
    },

    sectionHeader: {
      marginTop: 26,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#16213e",
    },

    countBadge: {
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: "#eaf2ff",
    },

    countText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#2563eb",
    },

    emptyCard: {
      backgroundColor: "#ffffff",
      borderRadius: 18,
      paddingHorizontal: 24,
      paddingVertical: 30,
      alignItems: "center",
    },

    emptyIcon: {
      fontSize: 38,
      fontWeight: "800",
      color: "#2563eb",
    },

    emptyTitle: {
      marginTop: 8,
      fontSize: 20,
      fontWeight: "800",
      color: "#16213e",
    },

    emptyDescription: {
      marginTop: 9,
      maxWidth: 300,
      textAlign: "center",
      fontSize: 15,
      lineHeight: 22,
      color: "#667085",
    },

    answerList: {
      backgroundColor: "#ffffff",
      borderRadius: 18,
      overflow: "hidden",
    },

    answerRow: {
      minHeight: 82,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
    },

    answerRowBorder: {
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor: "#e4e7ec",
    },

    codeBox: {
      minWidth: 58,
      height: 48,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: "#eff6ff",
      alignItems: "center",
      justifyContent: "center",
    },

    codeText: {
      fontSize: 17,
      fontWeight: "800",
      color: "#2563eb",
    },

    answerInfo: {
      flex: 1,
      marginLeft: 14,
    },

    answerTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#16213e",
    },

    answerStatus: {
      marginTop: 4,
      fontSize: 14,
      fontWeight: "600",
      color: "#16803c",
    },

    rowArrow: {
      marginLeft: 8,
      fontSize: 34,
      fontWeight: "300",
      color: "#2563eb",
    },
deleteAction: {
  width: 90,
  backgroundColor: "#dc2626",
  alignItems: "center",
  justifyContent: "center",
},

deleteActionText: {
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "800",
},
    addButton: {
      marginTop: 18,
      minHeight: 58,
      borderWidth: 1.5,
      borderColor: "#2563eb",
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#ffffff",
    },

    addButtonIcon: {
      marginRight: 8,
      fontSize: 25,
      color: "#2563eb",
    },

    addButtonText: {
      fontSize: 16,
      fontWeight: "800",
      color: "#2563eb",
    },

    qrButton: {
      marginTop: 12,
      minHeight: 72,
      paddingHorizontal: 18,
      borderRadius: 14,
      backgroundColor: "#2563eb",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },

    qrButtonIcon: {
      marginRight: 14,
      fontSize: 28,
      color: "#ffffff",
    },

    qrTextBox: {
      alignItems: "flex-start",
    },

    qrButtonText: {
      fontSize: 16,
      fontWeight: "800",
      color: "#ffffff",
    },

    qrDescription: {
      marginTop: 3,
      fontSize: 13,
      color:
        "rgba(255,255,255,0.82)",
    },

    centerContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },

    statusText: {
      fontSize: 16,
      color: "#667085",
    },

    notFoundTitle: {
      fontSize: 21,
      fontWeight: "800",
      color: "#16213e",
    },

    backButtonLarge: {
      marginTop: 20,
      paddingHorizontal: 20,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: "#2563eb",
    },

    backButtonLargeText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
    },
  });
