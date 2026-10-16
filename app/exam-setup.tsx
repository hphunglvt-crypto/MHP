import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

type SheetType = "MOET_2025" | "MATH_3_PART";

type GradingExam = {
  id: string;
  title: string;
  sheetType: SheetType;
  scanStudentId: boolean;

  part1Questions: number;
  part1Point: number;

  part2Questions: number;
  part2Point1: number;
  part2Point2: number;
  part2Point3: number;
  part2Point4: number;

  part3Questions: number;
  part3Point: number;

  createdAt: string;
};

const EXAMS_STORAGE_KEY = "MHP_GRADING_EXAMS";

export default function ExamSetupScreen() {
  const [title, setTitle] = useState("");

  const [sheetType, setSheetType] =
    useState<SheetType>("MATH_3_PART");

  const [scanStudentId, setScanStudentId] =
    useState(false);

  const [part1Questions, setPart1Questions] =
    useState("12");

  const [part1Point, setPart1Point] =
    useState("0.25");

  const [part2Questions, setPart2Questions] =
    useState("4");

  const [part2Point1, setPart2Point1] =
    useState("0.10");

  const [part2Point2, setPart2Point2] =
    useState("0.25");

  const [part2Point3, setPart2Point3] =
    useState("0.50");

  const [part2Point4, setPart2Point4] =
    useState("1.00");

  const [part3Questions, setPart3Questions] =
    useState("6");

  const [part3Point, setPart3Point] =
    useState("0.50");

  const [saving, setSaving] = useState(false);

  function parseIntSafe(value: string) {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 0) {
      return 0;
    }

    return parsed;
  }

  function parseFloatSafe(value: string) {
    const normalized = value
      .trim()
      .replace(",", ".");

    const parsed = Number.parseFloat(normalized);

    if (Number.isNaN(parsed) || parsed < 0) {
      return 0;
    }

    return parsed;
  }
const p1MaxScore =
  parseIntSafe(part1Questions) *
  parseFloatSafe(part1Point);

const p2MaxScore =
  parseIntSafe(part2Questions) *
  parseFloatSafe(part2Point4);

const p3MaxScore =
  parseIntSafe(part3Questions) *
  parseFloatSafe(part3Point);

const totalMaxScore =
  p1MaxScore +
  p2MaxScore +
  p3MaxScore;

const scoreDifference =
  totalMaxScore - 10;

const isTenPointScale =
  Math.abs(scoreDifference) < 0.001;
async function saveExam() {
  const examTitle = title.trim();

  const p1Questions =
    parseIntSafe(part1Questions);

  const p2Questions =
    parseIntSafe(part2Questions);

  const p3Questions =
    parseIntSafe(part3Questions);

  try {
    setSaving(true);

    const exam: GradingExam = {
      id: `exam-${Date.now()}`,
      title: examTitle,
      sheetType,
      scanStudentId,

      part1Questions: p1Questions,
      part1Point:
        parseFloatSafe(part1Point),

      part2Questions: p2Questions,
      part2Point1:
        parseFloatSafe(part2Point1),
      part2Point2:
        parseFloatSafe(part2Point2),
      part2Point3:
        parseFloatSafe(part2Point3),
      part2Point4:
        parseFloatSafe(part2Point4),

      part3Questions: p3Questions,
      part3Point:
        parseFloatSafe(part3Point),

      createdAt: new Date().toISOString(),
    };

    const raw =
      await AsyncStorage.getItem(
        EXAMS_STORAGE_KEY
      );

    let currentExams: GradingExam[] = [];

    if (raw) {
      try {
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          currentExams = parsed;
        }
      } catch (error) {
        console.error(
          "Dữ liệu danh sách chấm cũ không hợp lệ:",
          error
        );
      }
    }
function normalizeExamName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi-VN");
}

const duplicatedName = currentExams.some(
  (item) =>
    normalizeExamName(item.title) ===
    normalizeExamName(examTitle)
);

if (duplicatedName) {
  Alert.alert(
    "Tên bài kiểm tra đã tồn tại",
    `Đã có bài kiểm tra tên "${examTitle}".\n\nVui lòng đặt tên khác.`
  );

  return;
}
    const updatedExams = [
      exam,
      ...currentExams,
    ];

    await AsyncStorage.setItem(
      EXAMS_STORAGE_KEY,
      JSON.stringify(updatedExams)
    );

    await AsyncStorage.setItem(
      "MHP_CURRENT_EXAM",
      JSON.stringify(exam)
    );

    router.replace("/grading-list");
  } catch (error) {
    console.error(
      "Không thể tạo bài kiểm tra:",
      error
    );

    Alert.alert(
      "Không thể lưu",
      "Có lỗi khi tạo bài kiểm tra."
    );
  } finally {
    setSaving(false);
  }
}  
async function createExam() {
    const examTitle = title.trim();

    if (!examTitle || saving) {
      return;
    }

    const p1Questions =
      parseIntSafe(part1Questions);

    const p2Questions =
      parseIntSafe(part2Questions);

    const p3Questions =
      parseIntSafe(part3Questions);

    if (
      p1Questions +
        p2Questions +
        p3Questions <=
      0
    ) {
      Alert.alert(
        "Cấu trúc đề chưa hợp lệ",
        "Bài kiểm tra phải có ít nhất một câu."
      );

      return;
    }
if (!isTenPointScale) {
  const action =
    totalMaxScore < 10
      ? `Thiếu ${(10 - totalMaxScore).toFixed(2)} điểm`
      : `Vượt ${(totalMaxScore - 10).toFixed(2)} điểm`;

  Alert.alert(
    "Tổng điểm khác 10",
    `Tổng điểm tối đa hiện tại là ${totalMaxScore.toFixed(
      2
    )}/10.\n${action}.\n\nThầy vẫn muốn lưu bài kiểm tra này?`,
    [
      {
        text: "Quay lại chỉnh",
        style: "cancel",
      },
      {
        text: "Vẫn lưu",
        style: "destructive",
        onPress: () => {
          saveExam();
        },
      },
    ]
  );

  return;
}

await saveExam();
    
  }

  function ScoreInput({
    value,
    onChangeText,
  }: {
    value: string;
    onChangeText: (value: string) => void;
  }) {
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        selectTextOnFocus
        style={styles.scoreInput}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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

          <View>
            <Text style={styles.brand}>
              MATH-HUY PHUNG
            </Text>

            <Text style={styles.pageTitle}>
              Tạo bài kiểm tra
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>
            1. Tên bài kiểm tra
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ví dụ: Kiểm tra Toán 12"
            placeholderTextColor="#98a2b3"
            style={styles.input}
          />

          <Text style={styles.sectionTitle}>
            2. Loại phiếu
          </Text>

          <Pressable
            style={[
              styles.sheetCard,
              sheetType === "MATH_3_PART" &&
                styles.sheetCardActive,
            ]}
            onPress={() =>
              setSheetType("MATH_3_PART")
            }
          >
            <Text style={styles.sheetTitle}>
              {sheetType === "MATH_3_PART"
                ? "● "
                : "○ "}
              Phiếu 2025 - Toán
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.sheetCard,
              sheetType === "MOET_2025" &&
                styles.sheetCardActive,
            ]}
            onPress={() =>
              setSheetType("MOET_2025")
            }
          >
            <Text style={styles.sheetTitle}>
              {sheetType === "MOET_2025"
                ? "● "
                : "○ "}
              Phiếu Bộ GD&ĐT 2025
            </Text>
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchTitle}>
              3. Quét số báo danh
            </Text>

            <Switch
              value={scanStudentId}
              onValueChange={setScanStudentId}
            />
          </View>

          <Text style={styles.bigSectionTitle}>
            4. Cấu trúc đề
          </Text>

          <Text style={styles.partTitle}>
            Phần I
          </Text>

          <TextInput
            value={part1Questions}
            onChangeText={setPart1Questions}
            keyboardType="number-pad"
            placeholder="Tổng số câu"
            placeholderTextColor="#98a2b3"
            style={styles.input}
          />

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>
              Điểm mỗi câu
            </Text>

            <ScoreInput
              value={part1Point}
              onChangeText={setPart1Point}
            />
          </View>

          <Text style={styles.partTitle}>
            Phần II
          </Text>

          <TextInput
            value={part2Questions}
            onChangeText={setPart2Questions}
            keyboardType="number-pad"
            placeholder="Tổng số câu"
            placeholderTextColor="#98a2b3"
            style={styles.input}
          />

          <Text style={styles.subTitle}>
            Số điểm 1 câu:
          </Text>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>
              Đúng 1 ý
            </Text>

            <ScoreInput
              value={part2Point1}
              onChangeText={setPart2Point1}
            />
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>
              Đúng 2 ý
            </Text>

            <ScoreInput
              value={part2Point2}
              onChangeText={setPart2Point2}
            />
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>
              Đúng 3 ý
            </Text>

            <ScoreInput
              value={part2Point3}
              onChangeText={setPart2Point3}
            />
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>
              Đúng 4 ý
            </Text>

            <ScoreInput
              value={part2Point4}
              onChangeText={setPart2Point4}
            />
          </View>

          <Text style={styles.partTitle}>
            Phần III
          </Text>

          <TextInput
            value={part3Questions}
            onChangeText={setPart3Questions}
            keyboardType="number-pad"
            placeholder="Tổng số câu"
            placeholderTextColor="#98a2b3"
            style={styles.input}
          />

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>
              Điểm mỗi câu
            </Text>

            <ScoreInput
              value={part3Point}
              onChangeText={setPart3Point}
            />
          </View>
<View style={styles.totalScoreBox}>
  <Text style={styles.totalScoreTitle}>
    Tổng điểm tối đa
  </Text>

  <View style={styles.totalScoreRow}>
    <Text style={styles.totalScoreNumber}>
      {totalMaxScore.toFixed(2)}
    </Text>

    <Text style={styles.totalScoreOutOf}>
      {" "}/ 10
    </Text>
  </View>

  <View style={styles.scoreBreakdown}>
    <Text style={styles.breakdownText}>
      Phần I: {p1MaxScore.toFixed(2)}
    </Text>

    <Text style={styles.breakdownText}>
      Phần II: {p2MaxScore.toFixed(2)}
    </Text>

    <Text style={styles.breakdownText}>
      Phần III: {p3MaxScore.toFixed(2)}
    </Text>
  </View>

  {isTenPointScale ? (
    <Text style={styles.scoreOk}>
      ✓ Cấu trúc đề đủ 10 điểm
    </Text>
  ) : totalMaxScore < 10 ? (
    <Text style={styles.scoreWarning}>
      ⚠ Cấu trúc đề đang thiếu{" "}
      {(10 - totalMaxScore).toFixed(2)} điểm
    </Text>
  ) : (
    <Text style={styles.scoreError}>
      ⚠ Cấu trúc đề đang vượt{" "}
      {(totalMaxScore - 10).toFixed(2)} điểm
    </Text>
  )}
</View>
          <Pressable
            style={[
              styles.createButton,
              (!title.trim() || saving) &&
                styles.createButtonDisabled,
            ]}
            disabled={!title.trim() || saving}
            onPress={createExam}
          >
            <Text style={styles.createButtonText}>
              {saving
                ? "ĐANG LƯU..."
                : "LƯU BÀI KIỂM TRA"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f7fb",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 80,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  backText: {
    fontSize: 40,
    color: "#2563eb",
  },

  brand: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563eb",
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#16213e",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
  },

  label: {
    fontSize: 17,
    fontWeight: "700",
    color: "#16213e",
    marginBottom: 8,
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#16213e",
  },

  bigSectionTitle: {
    marginTop: 28,
    fontSize: 22,
    fontWeight: "800",
    color: "#16213e",
  },

  partTitle: {
    marginTop: 24,
    marginBottom: 10,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#16213e",
  },

  subTitle: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 17,
    fontWeight: "700",
    color: "#344054",
  },

  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: "#d0d5dd",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    color: "#101828",
    backgroundColor: "#ffffff",
  },

  sheetCard: {
    borderWidth: 1.5,
    borderColor: "#d0d5dd",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },

  sheetCardActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },

  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16213e",
  },

  switchRow: {
    marginTop: 22,
    minHeight: 60,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  switchTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#16213e",
  },

  scoreRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  scoreLabel: {
    flex: 1,
    fontSize: 16,
    color: "#344054",
  },

  scoreInput: {
    width: 120,
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: "#d0d5dd",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 17,
    color: "#101828",
    backgroundColor: "#ffffff",
  },

  createButton: {
    marginTop: 30,
    backgroundColor: "#2563eb",
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: "center",
  },

  createButtonDisabled: {
    opacity: 0.45,
  },

  createButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
totalScoreBox: {
  marginTop: 28,
  padding: 18,
  borderRadius: 14,
  backgroundColor: "#f8fafc",
  borderWidth: 1.5,
  borderColor: "#e4e7ec",
},

totalScoreTitle: {
  textAlign: "center",
  fontSize: 17,
  fontWeight: "700",
  color: "#344054",
},

totalScoreRow: {
  marginTop: 8,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "baseline",
},

totalScoreNumber: {
  fontSize: 34,
  fontWeight: "800",
  color: "#16213e",
},

totalScoreOutOf: {
  fontSize: 20,
  fontWeight: "600",
  color: "#667085",
},

scoreBreakdown: {
  marginTop: 15,
  paddingTop: 13,
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: "#d0d5dd",
},

breakdownText: {
  marginTop: 5,
  fontSize: 15,
  color: "#475467",
},

scoreOk: {
  marginTop: 14,
  textAlign: "center",
  fontSize: 16,
  fontWeight: "700",
  color: "#16803c",
},

scoreWarning: {
  marginTop: 14,
  textAlign: "center",
  fontSize: 16,
  fontWeight: "700",
  color: "#b54708",
},

scoreError: {
  marginTop: 14,
  textAlign: "center",
  fontSize: 16,
  fontWeight: "700",
  color: "#d92d20",
},
});
