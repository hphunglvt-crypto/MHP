import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type TrueFalseValue = boolean | null;

type TrueFalseAnswer = {
  a: TrueFalseValue;
  b: TrueFalseValue;
  c: TrueFalseValue;
  d: TrueFalseValue;
};

type MobileAnswerKey = {
  examCode: string;
  part1: string[];
  part2: TrueFalseAnswer[];
  part3: string[];
};

type ExamData = {
  id: string;
  title: string;
  part1Questions?: number;
  part2Questions?: number;
  part3Questions?: number;
};

export default function AnswerKeyEditScreen() {
  const params = useLocalSearchParams<{
    examId?: string;
    examCode?: string;
  }>();

  const examId = params.examId ?? "";
  const originalExamCode = params.examCode ?? "";

  const [exam, setExam] = useState<ExamData | null>(null);
  const [examCode, setExamCode] = useState(originalExamCode);

  const [part1, setPart1] = useState<string[]>([]);
  const [part2, setPart2] = useState<TrueFalseAnswer[]>([]);
  const [part3, setPart3] = useState<string[]>([]);

  const storageKey = useMemo(
    () => `MHP_ANSWER_KEYS_${examId}`,
    [examId]
  );

  useEffect(() => {
    void loadData();
  }, [examId, originalExamCode]);

  async function loadData() {
    try {
      const examRaw = await AsyncStorage.getItem(
        "MHP_GRADING_EXAMS"
      );

      const exams: ExamData[] = examRaw
        ? JSON.parse(examRaw)
        : [];

      const foundExam =
        exams.find((item) => item.id === examId) ?? null;

      setExam(foundExam);

      const answerRaw =
        await AsyncStorage.getItem(storageKey);

      const keys: MobileAnswerKey[] = answerRaw
        ? JSON.parse(answerRaw)
        : [];

      const existing = originalExamCode
        ? keys.find(
            (item) =>
              item.examCode === originalExamCode
          )
        : undefined;

      if (existing) {
        setExamCode(existing.examCode);
        setPart1(existing.part1 ?? []);
        setPart2(existing.part2 ?? []);
        setPart3(existing.part3 ?? []);
        return;
      }

      const p1Count =
        foundExam?.part1Questions ?? 0;
      const p2Count =
        foundExam?.part2Questions ?? 0;
      const p3Count =
        foundExam?.part3Questions ?? 0;

      setPart1(
        Array.from(
          { length: p1Count },
          () => ""
        )
      );

      setPart2(
  Array.from(
    { length: p2Count },
    () => ({
      a: null,
      b: null,
      c: null,
      d: null,
    })
  )
);

      setPart3(
        Array.from(
          { length: p3Count },
          () => ""
        )
      );
    } catch (error) {
      console.error(error);

      Alert.alert(
        "Lỗi",
        "Không thể tải dữ liệu đáp án."
      );
    }
  }

  function choosePart1(
    questionIndex: number,
    value: string
  ) {
    setPart1((current) => {
      const next = [...current];
      next[questionIndex] = value;
      return next;
    });
  }

  function setPart2Value(
  questionIndex: number,
  key: keyof TrueFalseAnswer,
  value: boolean
) {
  setPart2((current) => {
    const next = current.map((item) => ({
      ...item,
    }));

    next[questionIndex][key] = value;

    return next;
  });
}

  function updatePart3(
    questionIndex: number,
    value: string
  ) {
    setPart3((current) => {
      const next = [...current];
      next[questionIndex] = value;
      return next;
    });
  }

  async function saveAnswerKey() {
    const code = examCode.trim();

    if (!code) {
      Alert.alert(
        "Thiếu mã đề",
        "Thầy (cô) hãy nhập mã đề."
      );
      return;
    }
const missingPart1 = part1
  .map((answer, index) =>
    answer ? null : index + 1
  )
  .filter(
    (value): value is number =>
      value !== null
  );

if (missingPart1.length > 0) {
  Alert.alert(
    "Thiếu đáp án Phần I",
    `Chưa chọn đáp án cho câu: ${missingPart1.join(", ")}`
  );
  return;
}

const missingPart2: string[] = [];

part2.forEach((answer, questionIndex) => {
  (
    ["a", "b", "c", "d"] as const
  ).forEach((key) => {
    if (answer[key] === null) {
      missingPart2.push(
        `${questionIndex + 1}${key}`
      );
    }
  });
});

if (missingPart2.length > 0) {
  Alert.alert(
    "Thiếu đáp án Phần II",
    `Chưa chọn Đ/S cho: ${missingPart2.join(", ")}`
  );
  return;
}

const missingPart3 = part3
  .map((answer, index) =>
    answer.trim() ? null : index + 1
  )
  .filter(
    (value): value is number =>
      value !== null
  );

if (missingPart3.length > 0) {
  Alert.alert(
    "Thiếu đáp án Phần III",
    `Chưa nhập đáp án cho câu: ${missingPart3.join(", ")}`
  );
  return;
}
    try {
      const raw =
        await AsyncStorage.getItem(storageKey);

      const current: MobileAnswerKey[] = raw
        ? JSON.parse(raw)
        : [];

      const duplicated = current.some(
        (item) =>
          item.examCode === code &&
          item.examCode !== originalExamCode
      );

      if (duplicated) {
        Alert.alert(
          "Mã đề đã tồn tại",
          `Mã đề ${code} đã có trong bộ đáp án.`
        );
        return;
      }

      const newKey: MobileAnswerKey = {
        examCode: code,
        part1,
        part2,
        part3,
      };

      const next = originalExamCode
        ? current.map((item) =>
            item.examCode === originalExamCode
              ? newKey
              : item
          )
        : [...current, newKey];

      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(next)
      );

      router.replace({
        pathname: "/answer-keys",
        params: { examId },
      });
    } catch (error) {
      console.error(error);

      Alert.alert(
        "Lỗi",
        "Không thể lưu đáp án."
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {originalExamCode
              ? `Mã đề ${originalExamCode}`
              : "Thêm mã đề"}
          </Text>

          {!!exam?.title && (
            <Text style={styles.examTitle}>
              {exam.title}
            </Text>
          )}
        </View>

        <View style={styles.headerSpace} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.label}>
            Mã đề
          </Text>

          <TextInput
            value={examCode}
            onChangeText={setExamCode}
            placeholder="Ví dụ: 101"
            keyboardType="number-pad"
            style={styles.examCodeInput}
          />
        </View>

        {part1.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              PHẦN I
            </Text>

            {part1.map((answer, index) => (
              <View
                key={`p1-${index}`}
                style={styles.questionRow}
              >
                <Text style={styles.questionNumber}>
                  Câu {index + 1}
                </Text>

                <View style={styles.optionGroup}>
                  {["A", "B", "C", "D"].map(
                    (option) => (
                      <Pressable
                        key={option}
                        style={[
                          styles.optionButton,
                          answer === option &&
                            styles.optionButtonSelected,
                        ]}
                        onPress={() =>
                          choosePart1(
                            index,
                            option
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.optionText,
                            answer === option &&
                              styles.optionTextSelected,
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    )
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {part2.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              PHẦN II
            </Text>

            {part2.map((answer, index) => (
              <View
                key={`p2-${index}`}
                style={styles.part2Question}
              >
                <Text style={styles.questionNumber}>
                  Câu {index + 1}
                </Text>

                {(
                  ["a", "b", "c", "d"] as const
                ).map((key) => (
                  <View
                    key={key}
                    style={styles.trueFalseRow}
                  >
                    <Text style={styles.statementText}>
                      {key})
                    </Text>

                    <Pressable
  style={[
    styles.trueFalseButton,
    answer[key] === true &&
      styles.trueButtonSelected,
  ]}
  onPress={() =>
    setPart2Value(index, key, true)
  }
>
  <Text
    style={[
      styles.trueFalseText,
      answer[key] === true &&
        styles.selectedText,
    ]}
  >
    Đ
  </Text>
</Pressable>

<Pressable
  style={[
    styles.trueFalseButton,
    answer[key] === false &&
      styles.falseButtonSelected,
  ]}
  onPress={() =>
    setPart2Value(index, key, false)
  }
>
  <Text
    style={[
      styles.trueFalseText,
      answer[key] === false &&
        styles.selectedText,
    ]}
  >
    S
  </Text>
</Pressable>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
        {part3.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              PHẦN III
            </Text>

            {part3.map((answer, index) => (
              <View
                key={`p3-${index}`}
                style={styles.shortAnswerRow}
              >
                <Text style={styles.questionNumber}>
                  Câu {index + 1}
                </Text>

                <TextInput
                  value={answer}
                  onChangeText={(value) =>
                    updatePart3(index, value)
                  }
                  placeholder="Đáp án"
                  style={styles.shortAnswerInput}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={styles.saveButton}
          onPress={saveAnswerKey}
        >
          <Text style={styles.saveButtonText}>
            LƯU ĐÁP ÁN
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  header: {
    minHeight: 72,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E4E7EB",
  },

  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },

  backText: {
    fontSize: 36,
    lineHeight: 40,
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  examTitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#687076",
  },

  headerSpace: {
    width: 44,
  },

  content: {
    padding: 16,
    paddingBottom: 50,
    gap: 14,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
  },

  examCodeInput: {
    borderWidth: 1,
    borderColor: "#D7DCE1",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 18,
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  questionRow: {
    gap: 8,
    paddingVertical: 7,
  },

  questionNumber: {
    fontSize: 15,
    fontWeight: "600",
  },

  optionGroup: {
    flexDirection: "row",
    gap: 8,
  },

  optionButton: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: "#CDD3D8",
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },

  optionButtonSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },

  optionText: {
    fontSize: 16,
    fontWeight: "700",
  },

  optionTextSelected: {
    color: "#FFFFFF",
  },

  part2Question: {
    paddingVertical: 8,
    gap: 8,
  },

  trueFalseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  statementText: {
    width: 24,
    fontSize: 15,
    fontWeight: "700",
  },

  trueFalseButton: {
    width: 58,
    height: 38,
    borderWidth: 1,
    borderColor: "#CDD3D8",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  trueButtonSelected: {
    backgroundColor: "#111827",
  },

  falseButtonSelected: {
    backgroundColor: "#111827",
  },

  trueFalseText: {
    fontSize: 15,
    fontWeight: "700",
  },

  selectedText: {
    color: "#FFFFFF",
  },

  shortAnswerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  shortAnswerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D7DCE1",
    borderRadius: 9,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 16,
  },

  saveButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});