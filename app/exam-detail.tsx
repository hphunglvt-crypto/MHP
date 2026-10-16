import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
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

const EXAMS_STORAGE_KEY = "MHP_GRADING_EXAMS";

export default function ExamDetailScreen() {
  const params = useLocalSearchParams<{
    examId?: string;
  }>();

  const examId = params.examId ?? "";

  const [exam, setExam] =
    useState<GradingExam | null>(null);

  const [loading, setLoading] =
    useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadExam() {
        try {
          setLoading(true);

          const raw =
            await AsyncStorage.getItem(
              EXAMS_STORAGE_KEY
            );

          if (!raw) {
            setExam(null);
            return;
          }

          const parsed =
            JSON.parse(raw) as GradingExam[];

          const found =
            parsed.find(
              (item) =>
                item.id === examId
            ) ?? null;

          setExam(found);
        } catch (error) {
          console.error(
            "Không đọc được bài kiểm tra:",
            error
          );

          setExam(null);
        } finally {
          setLoading(false);
        }
      }

      loadExam();
    }, [examId])
  );

  function getSheetName(
    sheetType: SheetType
  ) {
    if (sheetType === "MOET_2025") {
      return "Phiếu Bộ GD&ĐT 2025";
    }

    return "Phiếu 2025 - Toán";
  }

  function getPart1Score() {
    if (!exam) {
      return 0;
    }

    return (
      exam.part1Questions *
      (exam.part1Point ?? 0)
    );
  }

  function getPart2Score() {
    if (!exam) {
      return 0;
    }

    return (
      exam.part2Questions *
      (exam.part2Point4 ?? 0)
    );
  }

  function getPart3Score() {
    if (!exam) {
      return 0;
    }

    return (
      exam.part3Questions *
      (exam.part3Point ?? 0)
    );
  }

  function openScanner() {
    if (!exam) {
      return;
    }

    router.push({
      pathname: "/exam-scanner",
      params: {
        examId: exam.id,
        sheetType: exam.sheetType,
        scanStudentId:
          exam.scanStudentId
            ? "true"
            : "false",
      },
    });
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
            Đang tải bài kiểm tra...
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
            style={styles.backListButton}
            onPress={() =>
              router.replace(
                "/grading-list"
              )
            }
          >
            <Text
              style={
                styles.backListButtonText
              }
            >
              Về danh sách chấm
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const part1Score =
    getPart1Score();

  const part2Score =
    getPart2Score();

  const part3Score =
    getPart3Score();

  const totalScore =
    part1Score +
    part2Score +
    part3Score;

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

        <Text
          style={styles.headerTitle}
          numberOfLines={1}
        >
          Chi tiết bài
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
            style={styles.examInfo}
          >
            {getSheetName(
              exam.sheetType
            )}
          </Text>

          <Text
            style={[
              styles.studentStatus,
              exam.scanStudentId
                ? styles.studentOn
                : styles.studentOff,
            ]}
          >
            {exam.scanStudentId
              ? "✓ Quét số báo danh"
              : "✕ Không quét số báo danh"}
          </Text>

          <View
            style={styles.divider}
          />

          <View
            style={
              styles.structureRow
            }
          >
            <View
              style={
                styles.structureItem
              }
            >
              <Text
                style={
                  styles.structureLabel
                }
              >
                Phần I
              </Text>

              <Text
                style={
                  styles.structureValue
                }
              >
                {
                  exam.part1Questions
                }{" "}
                câu
              </Text>

              <Text
                style={
                  styles.structureScore
                }
              >
                {part1Score.toFixed(
                  2
                )}{" "}
                điểm
              </Text>
            </View>

            <View
              style={
                styles.structureItem
              }
            >
              <Text
                style={
                  styles.structureLabel
                }
              >
                Phần II
              </Text>

              <Text
                style={
                  styles.structureValue
                }
              >
                {
                  exam.part2Questions
                }{" "}
                câu
              </Text>

              <Text
                style={
                  styles.structureScore
                }
              >
                {part2Score.toFixed(
                  2
                )}{" "}
                điểm
              </Text>
            </View>

            <View
              style={
                styles.structureItem
              }
            >
              <Text
                style={
                  styles.structureLabel
                }
              >
                Phần III
              </Text>

              <Text
                style={
                  styles.structureValue
                }
              >
                {
                  exam.part3Questions
                }{" "}
                câu
              </Text>

              <Text
                style={
                  styles.structureScore
                }
              >
                {part3Score.toFixed(
                  2
                )}{" "}
                điểm
              </Text>
            </View>
          </View>

          <View
            style={styles.totalRow}
          >
            <Text
              style={styles.totalLabel}
            >
              Tổng điểm tối đa
            </Text>

            <Text
              style={styles.totalScore}
            >
              {totalScore.toFixed(2)}
            </Text>
          </View>
        </View>

        <Text
          style={styles.sectionTitle}
        >
          Chức năng
        </Text>

        <Pressable
          style={styles.menuCard}
          onPress={() =>
            router.push({
              pathname:
                "/answer-keys",
              params: {
                examId: exam.id,
              },
            })
          }
        >
          <View
            style={
              styles.menuIconBox
            }
          >
            <Text
              style={styles.menuIcon}
            >
              ✓
            </Text>
          </View>

          <View
            style={
              styles.menuTextBox
            }
          >
            <Text
              style={styles.menuTitle}
            >
              Đáp án
            </Text>

            <Text
              style={
                styles.menuDescription
              }
            >
              Nhập đáp án thủ công
              hoặc quét mã QR
            </Text>
          </View>

          <Text
            style={styles.arrow}
          >
            ›
          </Text>
        </Pressable>

        <Pressable
          style={styles.menuCard}
          onPress={openScanner}
        >
          <View
            style={
              styles.menuIconBox
            }
          >
            <Text
              style={styles.menuIcon}
            >
              ◉
            </Text>
          </View>

          <View
            style={
              styles.menuTextBox
            }
          >
            <Text
              style={styles.menuTitle}
            >
              Chấm bài
            </Text>

            <Text
              style={
                styles.menuDescription
              }
            >
              Dùng camera để quét
              và chấm phiếu
            </Text>
          </View>

          <Text
            style={styles.arrow}
          >
            ›
          </Text>
        </Pressable>

        <Pressable
          style={styles.menuCard}
          onPress={() =>
            router.push({
              pathname:
                "/graded-papers",
              params: {
                examId: exam.id,
              },
            })
          }
        >
          <View
            style={
              styles.menuIconBox
            }
          >
            <Text
              style={styles.menuIcon}
            >
              ☰
            </Text>
          </View>

          <View
            style={
              styles.menuTextBox
            }
          >
            <Text
              style={styles.menuTitle}
            >
              Bài đã chấm
            </Text>

            <Text
              style={
                styles.menuDescription
              }
            >
              Xem lại các bài và
              kết quả đã lưu
            </Text>
          </View>

          <Text
            style={styles.arrow}
          >
            ›
          </Text>
        </Pressable>

        <Pressable
          style={styles.menuCard}
          onPress={() =>
            router.push({
              pathname:
                "/export-results",
              params: {
                examId: exam.id,
              },
            })
          }
        >
          <View
            style={
              styles.menuIconBox
            }
          >
            <Text
              style={styles.menuIcon}
            >
              ⇩
            </Text>
          </View>

          <View
            style={
              styles.menuTextBox
            }
          >
            <Text
              style={styles.menuTitle}
            >
              Xuất kết quả
            </Text>

            <Text
              style={
                styles.menuDescription
              }
            >
              Xuất danh sách điểm
              và dữ liệu chấm
            </Text>
          </View>

          <Text
            style={styles.arrow}
          >
            ›
          </Text>
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
    },

    examInfo: {
      marginTop: 9,
      fontSize: 16,
      color: "#475467",
    },

    studentStatus: {
      marginTop: 10,
      fontSize: 15,
      fontWeight: "700",
    },

    studentOn: {
      color: "#16803c",
    },

    studentOff: {
      color: "#d92d20",
    },

    divider: {
      marginVertical: 18,
      height:
        StyleSheet.hairlineWidth,
      backgroundColor: "#d0d5dd",
    },

    structureRow: {
      flexDirection: "row",
    },

    structureItem: {
      flex: 1,
      alignItems: "center",
    },

    structureLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: "#344054",
    },

    structureValue: {
      marginTop: 6,
      fontSize: 16,
      fontWeight: "700",
      color: "#16213e",
    },

    structureScore: {
      marginTop: 4,
      fontSize: 14,
      color: "#667085",
    },

    totalRow: {
      marginTop: 18,
      paddingTop: 16,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor: "#d0d5dd",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    totalLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: "#344054",
    },

    totalScore: {
      fontSize: 26,
      fontWeight: "800",
      color: "#2563eb",
    },

    sectionTitle: {
      marginTop: 26,
      marginBottom: 12,
      fontSize: 20,
      fontWeight: "800",
      color: "#16213e",
    },

    menuCard: {
      minHeight: 92,
      marginBottom: 12,
      paddingHorizontal: 16,
      backgroundColor: "#ffffff",
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
    },

    menuIconBox: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: "#eff6ff",
      alignItems: "center",
      justifyContent: "center",
    },

    menuIcon: {
      fontSize: 25,
      fontWeight: "800",
      color: "#2563eb",
    },

    menuTextBox: {
      flex: 1,
      marginLeft: 14,
    },

    menuTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#16213e",
    },

    menuDescription: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      color: "#667085",
    },

    arrow: {
      marginLeft: 8,
      fontSize: 34,
      fontWeight: "300",
      color: "#2563eb",
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

    backListButton: {
      marginTop: 20,
      paddingHorizontal: 20,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: "#2563eb",
    },

    backListButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
    },
  });

