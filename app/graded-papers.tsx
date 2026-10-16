import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Part2ScoreItem = {
  question: number;
  correctStatements: number;
  score: number;
};

type GradedPaper = {
  id: string;
  examId: string;
  examTitle?: string;
  sheetType?: string;
  createdAt: string;

  examCode: string;
  imageUrl: string;

  part1Correct: number;
  part1Total: number;
  part1Score: number;

  part2Scores: Part2ScoreItem[];
  part2Score: number;

  part3Correct: number;
  part3Total: number;
  part3Score: number;

  totalScore: number;
};

type SwipeablePaperCardProps = {
  paper: GradedPaper;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelected: () => void;
  onDelete: () => void;
};

function SwipeablePaperCard({
  paper,
  selectionMode,
  selected,
  onToggleSelected,
  onDelete,
}: SwipeablePaperCardProps) {
  const translateX =
    useRef(new Animated.Value(0)).current;

  const currentXRef = useRef(0);

  const closeSwipe = () => {
    currentXRef.current = 0;

    Animated.spring(
      translateX,
      {
        toValue: 0,
        useNativeDriver: true,
      }
    ).start();
  };

  const openSwipe = () => {
    currentXRef.current = -92;

    Animated.spring(
      translateX,
      {
        toValue: -92,
        useNativeDriver: true,
      }
    ).start();
  };

  useEffect(() => {
    if (selectionMode) {
      closeSwipe();
    }
  }, [selectionMode]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (
        _,
        gesture
      ) => {
        if (selectionMode) {
          return false;
        }

        return (
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) >
            Math.abs(gesture.dy)
        );
      },

      onPanResponderMove: (
        _,
        gesture
      ) => {
        if (selectionMode) {
          return;
        }

        let nextX =
          currentXRef.current +
          gesture.dx;

        if (nextX > 0) {
          nextX = 0;
        }

        if (nextX < -105) {
          nextX = -105;
        }

        translateX.setValue(nextX);
      },

      onPanResponderRelease: (
        _,
        gesture
      ) => {
        if (selectionMode) {
          closeSwipe();
          return;
        }

        if (
          gesture.dx < -35 ||
          currentXRef.current +
            gesture.dx <
            -45
        ) {
          openSwipe();
        } else {
          closeSwipe();
        }
      },

      onPanResponderTerminate: () => {
        closeSwipe();
      },
    })
  ).current;

  return (
    <View style={styles.swipeContainer}>
      {!selectionMode && (
        <View
          style={
            styles.swipeDeleteBackground
          }
        >
          <Pressable
            style={
              styles.swipeDeleteButton
            }
            onPress={onDelete}
          >
            <Text
              style={
                styles.swipeDeleteText
              }
            >
              XÓA
            </Text>
          </Pressable>
        </View>
      )}

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.paperCard,
          {
            transform: [
              {
                translateX,
              },
            ],
          },
        ]}
      >
        <View style={styles.paperTopRow}>
          {selectionMode && (
            <Pressable
              style={styles.checkboxArea}
              onPress={
                onToggleSelected
              }
            >
              <View
                style={[
                  styles.checkbox,
                  selected &&
                    styles.checkboxSelected,
                ]}
              >
                {selected && (
                  <Text
                    style={
                      styles.checkboxTick
                    }
                  >
                    ✓
                  </Text>
                )}
              </View>
            </Pressable>
          )}

          <View
            style={styles.paperHeaderInfo}
          >
            <Text style={styles.examCode}>
              Mã đề {paper.examCode}
            </Text>

            <Text style={styles.dateText}>
              {formatDate(
                paper.createdAt
              )}
            </Text>
          </View>

          <View
            style={styles.totalScoreBox}
          >
            <Text
              style={styles.totalScore}
            >
              {Number(
                paper.totalScore ?? 0
              ).toFixed(2)}
            </Text>

            <Text
              style={styles.pointText}
            >
              điểm
            </Text>
          </View>
        </View>

        <View
          style={styles.scoreDetails}
        >
          <Text style={styles.scoreLine}>
            P1: {paper.part1Correct}/
            {paper.part1Total}
            {" = "}
            {Number(
              paper.part1Score ?? 0
            ).toFixed(2)}
          </Text>

          <Text style={styles.scoreLine}>
            P2:{" "}
            {Number(
              paper.part2Score ?? 0
            ).toFixed(2)}
          </Text>

          <Text style={styles.scoreLine}>
            P3: {paper.part3Correct}/
            {paper.part3Total}
            {" = "}
            {Number(
              paper.part3Score ?? 0
            ).toFixed(2)}
          </Text>
        </View>

<View
  style={styles.imageContainer}
>
  <Image
    source={{
      uri: paper.imageUrl,
    }}
    style={styles.paperImage}
    resizeMode="contain"
  />
</View>

        {!selectionMode && (
          <Text
            style={styles.swipeHint}
          >
            Vuốt sang trái để xóa
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

function formatDate(value: string) {
  try {
    return new Date(
      value
    ).toLocaleString("vi-VN");
  } catch {
    return value;
  }
}

export default function GradedPapersScreen() {
  const params =
    useLocalSearchParams<{
      examId?: string;
    }>();

  const examId =
    String(
      params.examId ?? ""
    ).trim();

  const [papers, setPapers] =
    useState<GradedPaper[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    selectionMode,
    setSelectionMode,
  ] = useState(false);

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<string[]>([]);

  const allSelected =
    papers.length > 0 &&
    selectedIds.length ===
      papers.length;

  const selectedCount =
    selectedIds.length;

  const storageKey =
    `MHP_GRADED_PAPERS_${examId}`;

  useEffect(() => {
    void loadPapers();
  }, [examId]);

  const selectedIdSet =
    useMemo(
      () =>
        new Set(
          selectedIds
        ),
      [selectedIds]
    );

  async function loadPapers() {
    if (!examId) {
      setPapers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const stored =
        await AsyncStorage.getItem(
          storageKey
        );

      if (!stored) {
        setPapers([]);
        return;
      }

      const parsed =
        JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        setPapers([]);
        return;
      }

      setPapers(parsed);
    } catch (error) {
      console.log(
        "LOAD GRADED PAPERS ERROR:",
        error
      );

      setPapers([]);
    } finally {
      setLoading(false);
    }
  }

  async function savePapers(
    nextPapers: GradedPaper[]
  ) {
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify(
        nextPapers
      )
    );

    setPapers(nextPapers);
  }

  function togglePaper(
    paperId: string
  ) {
    setSelectedIds(
      (current) => {
        if (
          current.includes(
            paperId
          )
        ) {
          return current.filter(
            (id) =>
              id !== paperId
          );
        }

        return [
          ...current,
          paperId,
        ];
      }
    );
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(
      papers.map(
        (paper) =>
          paper.id
      )
    );
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds([]);
  }

  function confirmDeleteOne(
    paper: GradedPaper
  ) {
    Alert.alert(
      "Xóa bài đã chấm",
      `Thầy có chắc muốn xóa bài mã đề ${paper.examCode} không?`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            void deleteOnePaper(
              paper.id
            );
          },
        },
      ]
    );
  }

  async function deleteOnePaper(
    paperId: string
  ) {
    try {
      const nextPapers =
        papers.filter(
          (paper) =>
            paper.id !==
            paperId
        );

      await savePapers(
        nextPapers
      );

      setSelectedIds(
        (current) =>
          current.filter(
            (id) =>
              id !== paperId
          )
      );
    } catch (error) {
      console.log(
        "DELETE GRADED PAPER ERROR:",
        error
      );

      Alert.alert(
        "Không xóa được bài",
        String(error)
      );
    }
  }

  function confirmDeleteSelected() {
    if (
      selectedIds.length === 0
    ) {
      return;
    }

    Alert.alert(
      "Xóa bài đã chọn",
      `Thầy có chắc muốn xóa ${selectedIds.length} bài đã chọn không?`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            void deleteSelected();
          },
        },
      ]
    );
  }

  async function deleteSelected() {
    try {
      const selected =
        new Set(
          selectedIds
        );

      const nextPapers =
        papers.filter(
          (paper) =>
            !selected.has(
              paper.id
            )
        );

      await savePapers(
        nextPapers
      );

      setSelectedIds([]);
      setSelectionMode(false);
    } catch (error) {
      console.log(
        "DELETE SELECTED PAPERS ERROR:",
        error
      );

      Alert.alert(
        "Không xóa được bài",
        String(error)
      );
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={styles.center}
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Đang tải bài đã chấm...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            if (selectionMode) {
              exitSelectionMode();
              return;
            }

            router.back();
          }}
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            ‹
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Bài đã chấm
        </Text>

        <Pressable
          style={
            styles.selectButton
          }
          onPress={() => {
            if (selectionMode) {
              exitSelectionMode();
            } else {
              setSelectionMode(
                true
              );
            }
          }}
        >
          <Text
            style={
              styles.selectButtonText
            }
          >
            {selectionMode
              ? "XONG"
              : "CHỌN"}
          </Text>
        </Pressable>
      </View>

      {selectionMode &&
        papers.length > 0 && (
          <View
            style={
              styles.selectionToolbar
            }
          >
            <Pressable
              style={
                styles.selectAllButton
              }
              onPress={
                toggleSelectAll
              }
            >
              <View
                style={[
                  styles.checkbox,
                  allSelected &&
                    styles.checkboxSelected,
                ]}
              >
                {allSelected && (
                  <Text
                    style={
                      styles.checkboxTick
                    }
                  >
                    ✓
                  </Text>
                )}
              </View>

              <Text
                style={
                  styles.selectAllText
                }
              >
                Chọn tất cả
              </Text>
            </Pressable>

            {selectedCount > 0 && (
              <Pressable
                style={
                  styles.deleteSelectedButton
                }
                onPress={
                  confirmDeleteSelected
                }
              >
                <Text
                  style={
                    styles.deleteSelectedText
                  }
                >
                  XÓA ({selectedCount})
                </Text>
              </Pressable>
            )}
          </View>
        )}

      {papers.length === 0 ? (
        <View
          style={styles.emptyBox}
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            Chưa có bài đã chấm
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            Sau khi chấm bài và
            bấm ĐÓNG, bài sẽ được
            lưu tại đây.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={
            styles.listContent
          }
        >
          <Text
            style={
              styles.countText
            }
          >
            Tổng số bài:{" "}
            {papers.length}
          </Text>

          {papers.map(
            (paper) => (
              <SwipeablePaperCard
                key={paper.id}
                paper={paper}
                selectionMode={
                  selectionMode
                }
                selected={selectedIdSet.has(
                  paper.id
                )}
                onToggleSelected={() =>
                  togglePaper(
                    paper.id
                  )
                }
                onDelete={() =>
                  confirmDeleteOne(
                    paper
                  )
                }
              />
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#f3f4f6",
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#f3f4f6",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: "#374151",
    },

    header: {
      height: 60,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      backgroundColor:
        "#ffffff",
      borderBottomWidth: 1,
      borderBottomColor:
        "#e5e7eb",
    },

    backButton: {
      width: 64,
      height: 44,
      alignItems:
        "flex-start",
      justifyContent:
        "center",
      paddingLeft: 4,
    },

    backButtonText: {
      fontSize: 38,
      lineHeight: 40,
      color: "#111827",
    },

    title: {
      flex: 1,
      textAlign: "center",
      fontSize: 21,
      fontWeight: "800",
      color: "#111827",
    },

    selectButton: {
      width: 64,
      height: 44,
      alignItems: "flex-end",
      justifyContent:
        "center",
    },

    selectButtonText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#2563eb",
    },

    selectionToolbar: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor:
        "#ffffff",
      borderBottomWidth: 1,
      borderBottomColor:
        "#e5e7eb",
    },

    selectAllButton: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 42,
    },

    selectAllText: {
      marginLeft: 9,
      fontSize: 16,
      fontWeight: "700",
      color: "#111827",
    },

    deleteSelectedButton: {
      paddingHorizontal: 16,
      height: 40,
      borderRadius: 10,
      justifyContent:
        "center",
      backgroundColor:
        "#dc2626",
    },

    deleteSelectedText: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "900",
    },

    checkbox: {
      width: 27,
      height: 27,
      borderRadius: 7,
      borderWidth: 2,
      borderColor:
        "#9ca3af",
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#ffffff",
    },

    checkboxSelected: {
      borderColor:
        "#2563eb",
      backgroundColor:
        "#2563eb",
    },

    checkboxTick: {
      color: "#ffffff",
      fontSize: 18,
      lineHeight: 20,
      fontWeight: "900",
    },

    emptyBox: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 30,
    },

    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#111827",
    },

    emptyText: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      color: "#6b7280",
    },

    listContent: {
      padding: 14,
      paddingBottom: 60,
    },

    countText: {
      marginBottom: 12,
      fontSize: 15,
      fontWeight: "700",
      color: "#4b5563",
    },

    swipeContainer: {
      marginBottom: 16,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor:
        "#dc2626",
    },

    swipeDeleteBackground: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "flex-end",
      justifyContent:
        "center",
      backgroundColor:
        "#dc2626",
    },

    swipeDeleteButton: {
      width: 92,
      height: "100%",
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#dc2626",
    },

    swipeDeleteText: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "900",
    },

    paperCard: {
      padding: 16,
      backgroundColor:
        "#ffffff",
      borderWidth: 1,
      borderColor:
        "#e5e7eb",
      borderRadius: 16,
    },

    paperTopRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    checkboxArea: {
      marginRight: 10,
      paddingVertical: 8,
    },

    paperHeaderInfo: {
      flex: 1,
    },

    examCode: {
      fontSize: 22,
      fontWeight: "900",
      color: "#111827",
    },

    dateText: {
      marginTop: 4,
      fontSize: 13,
      color: "#6b7280",
    },

    totalScoreBox: {
      minWidth: 82,
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor:
        "#fef2f2",
    },

    totalScore: {
      fontSize: 27,
      fontWeight: "900",
      color: "#dc2626",
    },

    pointText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#dc2626",
    },

    scoreDetails: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        "#e5e7eb",
    },

    scoreLine: {
      marginBottom: 5,
      fontSize: 17,
      fontWeight: "700",
      color: "#374151",
    },

    imageContainer: {
      position: "relative",
      marginTop: 12,
      width: "100%",
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor:
        "#000000",
    },

    paperImage: {
      width: "100%",
      aspectRatio: 1.84,
      backgroundColor:
        "#000000",
    },

    imageCheckboxOverlay: {
      position: "absolute",
      left: 8,
      top: 8,
      zIndex: 5,
      padding: 4,
    },

    imageCheckbox: {
      width: 30,
      height: 30,
      borderRadius: 8,
      borderWidth: 2,
      borderColor:
        "#ffffff",
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(0,0,0,0.45)",
    },

    swipeHint: {
      marginTop: 8,
      textAlign: "right",
      fontSize: 12,
      color: "#9ca3af",
    },
  });