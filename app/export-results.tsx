import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as XLSX from "xlsx-js-style/dist/xlsx.min.js";

type SheetType =
  | "MOET_2025"
  | "MATH_3_PART";

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

type GradedPaper = {
  id: string;
  examId: string;
  examTitle?: string;
  sheetType?: string;
  createdAt: string;

  /*
   * Các field này được để mở sẵn
   * cho chức năng quét SBD / danh sách HS
   * sau này.
   */
  studentId?: string;
  sbd?: string;
  candidateNumber?: string;

  studentName?: string;
  fullName?: string;

  className?: string;
  studentClass?: string;

  examCode: string;
  imageUrl: string;

  part1Correct: number;
  part1Total: number;
  part1Score: number;

  part2Scores: Array<{
    question: number;
    correctStatements: number;
    uncertainStatements?: number;
    score: number;
  }>;

  part2Score: number;

  part3Correct: number;
  part3Total: number;
  part3Score: number;

  totalScore: number;
};

const EXAMS_STORAGE_KEY =
  "MHP_GRADING_EXAMS";

export default function ExportResultsScreen() {
  const params =
    useLocalSearchParams<{
      examId?: string;
    }>();

  const examId =
    String(
      params.examId ?? ""
    ).trim();

  const [exam, setExam] =
    useState<GradingExam | null>(
      null
    );

  const [papers, setPapers] =
    useState<GradedPaper[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [exporting, setExporting] =
    useState(false);

  useEffect(() => {
    void loadData();
  }, [examId]);

  async function loadData() {
    if (!examId) {
      setExam(null);
      setPapers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      /*
       * -----------------------------------------
       * 1. Đọc cấu hình bài kiểm tra
       * -----------------------------------------
       */
      const examsText =
        await AsyncStorage.getItem(
          EXAMS_STORAGE_KEY
        );

      let foundExam:
        | GradingExam
        | null = null;

      if (examsText) {
        try {
          const parsed =
            JSON.parse(examsText);

          if (Array.isArray(parsed)) {
            foundExam =
              parsed.find(
                (item) =>
                  String(
                    item?.id ?? ""
                  ) === examId
              ) ?? null;
          }
        } catch {
          foundExam = null;
        }
      }

      setExam(foundExam);

      /*
       * -----------------------------------------
       * 2. Đọc toàn bộ bài đã chấm
       * -----------------------------------------
       */
      const papersStorageKey =
        `MHP_GRADED_PAPERS_${examId}`;

      const papersText =
        await AsyncStorage.getItem(
          papersStorageKey
        );

      if (!papersText) {
        setPapers([]);
        return;
      }

      try {
        const parsed =
          JSON.parse(papersText);

        if (Array.isArray(parsed)) {
          /*
           * Bài đã chấm đang lưu mới nhất
           * lên đầu.
           *
           * Khi xuất Excel, đảo lại để
           * STT đi theo thứ tự chấm từ cũ
           * đến mới.
           */
          setPapers(
            [...parsed].reverse()
          );
        } else {
          setPapers([]);
        }
      } catch {
        setPapers([]);
      }
    } catch (error) {
      console.log(
        "LOAD EXPORT DATA ERROR:",
        error
      );

      Alert.alert(
        "Không tải được dữ liệu",
        String(error)
      );

      setExam(null);
      setPapers([]);
    } finally {
      setLoading(false);
    }
  }

  function getStudentId(
    paper: GradedPaper
  ) {
    return String(
      paper.studentId ??
        paper.sbd ??
        paper.candidateNumber ??
        ""
    ).trim();
  }

  function getStudentName(
    paper: GradedPaper
  ) {
    return String(
      paper.studentName ??
        paper.fullName ??
        ""
    ).trim();
  }

  function getClassName(
    paper: GradedPaper
  ) {
    return String(
      paper.className ??
        paper.studentClass ??
        ""
    ).trim();
  }

  function safeNumber(
    value: unknown
  ) {
    const numberValue =
      Number(value);

    return Number.isFinite(
      numberValue
    )
      ? numberValue
      : 0;
  }

  function sanitizeFileName(
    value: string
  ) {
    const cleaned =
      value
        .trim()
        .replace(
          /[\\/:*?"<>|]/g,
          "_"
        )
        .replace(/\s+/g, "_");

    return cleaned || "BAI_KIEM_TRA";
  }

async function exportExcel() {
  if (!exam) {
    Alert.alert(
      "Không xuất được",
      "Không tìm thấy thông tin bài kiểm tra."
    );
    return;
  }

  if (papers.length === 0) {
    Alert.alert(
      "Chưa có dữ liệu",
      "Bài kiểm tra này chưa có bài đã chấm để xuất."
    );
    return;
  }

  if (exporting) {
    return;
  }

  setExporting(true);

  try {
    const includeStudentId =
      exam.scanStudentId === true;

    /*
     * =========================================
     * 1. CẤU TRÚC CỘT
     * =========================================
     */
    const fixedColumnCount =
      includeStudentId ? 5 : 4;

    const scoreStartColumn =
      fixedColumnCount;

    const totalColumnCount =
      fixedColumnCount + 4;

    const lastColumnIndex =
      totalColumnCount - 1;

    /*
     * =========================================
     * 2. DỮ LIỆU EXCEL
     * =========================================
     */
    const title =
      `KẾT QUẢ ${exam.title}`.trim();

    const rows: any[][] = [];

    // Dòng 1: tiêu đề lớn
    rows.push([title]);

    // Dòng 2: trống
    rows.push([]);

    if (includeStudentId) {
      rows.push([
        "STT",
        "Họ và tên",
        "Lớp",
        "Số báo danh",
        "Mã đề",
        "Điểm",
        "",
        "",
        "",
      ]);

      rows.push([
        "",
        "",
        "",
        "",
        "",
        "P.I",
        "P.II",
        "P.III",
        "Tổng",
      ]);
    } else {
      rows.push([
        "STT",
        "Họ và tên",
        "Lớp",
        "Mã đề",
        "Điểm",
        "",
        "",
        "",
      ]);

      rows.push([
        "",
        "",
        "",
        "",
        "P.I",
        "P.II",
        "P.III",
        "Tổng",
      ]);
    }

    papers.forEach(
      (paper, index) => {
        const baseRow: any[] = [
          index + 1,
          getStudentName(paper),
          getClassName(paper),
        ];

        if (includeStudentId) {
          baseRow.push(
            getStudentId(paper)
          );
        }

        baseRow.push(
          String(
            paper.examCode ?? ""
          ),
          safeNumber(
            paper.part1Score
          ),
          safeNumber(
            paper.part2Score
          ),
          safeNumber(
            paper.part3Score
          ),
          safeNumber(
            paper.totalScore
          )
        );

        rows.push(baseRow);
      }
    );

    /*
     * =========================================
     * 3. TẠO WORKSHEET
     * =========================================
     */
    const worksheet =
      XLSX.utils.aoa_to_sheet(
        rows
      );

    /*
     * =========================================
     * 4. GỘP Ô
     * =========================================
     */
    const merges: any[] = [
      // Tiêu đề lớn
      {
        s: { r: 0, c: 0 },
        e: {
          r: 0,
          c: lastColumnIndex,
        },
      },
    ];

    /*
     * Các cột thông tin được
     * gộp dọc dòng 3 và dòng 4.
     */
    for (
      let columnIndex = 0;
      columnIndex <
      fixedColumnCount;
      columnIndex++
    ) {
      merges.push({
        s: {
          r: 2,
          c: columnIndex,
        },
        e: {
          r: 3,
          c: columnIndex,
        },
      });
    }

    /*
     * Gộp chữ "Điểm" trên
     * 4 cột P.I - P.II - P.III - Tổng
     */
    merges.push({
      s: {
        r: 2,
        c: scoreStartColumn,
      },
      e: {
        r: 2,
        c:
          scoreStartColumn + 3,
      },
    });

    worksheet["!merges"] =
      merges;

    /*
     * =========================================
     * 5. ĐỘ RỘNG CỘT
     * =========================================
     */
    if (includeStudentId) {
      worksheet["!cols"] = [
        { wch: 7 },  // STT
        { wch: 30 }, // Họ tên
        { wch: 14 }, // Lớp
        { wch: 16 }, // SBD
        { wch: 12 }, // Mã đề
        { wch: 11 }, // P.I
        { wch: 11 }, // P.II
        { wch: 11 }, // P.III
        { wch: 12 }, // Tổng
      ];
    } else {
      worksheet["!cols"] = [
        { wch: 7 },  // STT
        { wch: 30 }, // Họ tên
        { wch: 14 }, // Lớp
        { wch: 12 }, // Mã đề
        { wch: 11 }, // P.I
        { wch: 11 }, // P.II
        { wch: 11 }, // P.III
        { wch: 12 }, // Tổng
      ];
    }

    /*
     * =========================================
     * 6. CHIỀU CAO DÒNG
     * =========================================
     */
    worksheet["!rows"] = [
      { hpt: 30 }, // Tiêu đề
      { hpt: 8 },  // Dòng trống
      { hpt: 24 }, // Header 1
      { hpt: 24 }, // Header 2
    ];

    /*
     * =========================================
     * 7. STYLE DÙNG CHUNG
     * =========================================
     */
    const thinBorder = {
      top: {
        style: "thin",
        color: {
          rgb: "808080",
        },
      },
      bottom: {
        style: "thin",
        color: {
          rgb: "808080",
        },
      },
      left: {
        style: "thin",
        color: {
          rgb: "808080",
        },
      },
      right: {
        style: "thin",
        color: {
          rgb: "808080",
        },
      },
    };

    /*
     * =========================================
     * 8. STYLE TIÊU ĐỀ
     * =========================================
     */
    const titleCell =
      worksheet["A1"];

    if (titleCell) {
      titleCell.s = {
        font: {
          bold: true,
          sz: 16,
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
        },
      };
    }

    /*
     * =========================================
     * 9. STYLE HEADER
     * =========================================
     */
    for (
      let rowIndex = 2;
      rowIndex <= 3;
      rowIndex++
    ) {
      for (
        let columnIndex = 0;
        columnIndex <
        totalColumnCount;
        columnIndex++
      ) {
        const address =
          XLSX.utils.encode_cell({
            r: rowIndex,
            c: columnIndex,
          });

        let cell =
          worksheet[address];

        /*
         * Các ô nằm trong vùng merge
         * đôi khi chưa tồn tại.
         * Tạo cell rỗng để border
         * hiển thị đầy đủ.
         */
        if (!cell) {
          cell = {
            t: "s",
            v: "",
          };

          worksheet[address] =
            cell;
        }

        cell.s = {
          font: {
            bold: true,
          },
          fill: {
            patternType:
              "solid",
            fgColor: {
              rgb: "D9EAF7",
            },
          },
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },
          border: thinBorder,
        };
      }
    }

    /*
     * =========================================
     * 10. STYLE DỮ LIỆU
     * =========================================
     */
    const firstDataRowIndex = 4;

    const lastDataRowIndex =
      rows.length - 1;

    for (
      let rowIndex =
        firstDataRowIndex;
      rowIndex <=
      lastDataRowIndex;
      rowIndex++
    ) {
      for (
        let columnIndex = 0;
        columnIndex <
        totalColumnCount;
        columnIndex++
      ) {
        const address =
          XLSX.utils.encode_cell({
            r: rowIndex,
            c: columnIndex,
          });

        let cell =
          worksheet[address];

        if (!cell) {
          cell = {
            t: "s",
            v: "",
          };

          worksheet[address] =
            cell;
        }

        /*
         * Mặc định:
         * có khung, căn giữa theo chiều dọc.
         */
        cell.s = {
          alignment: {
            vertical: "center",
          },
          border: thinBorder,
        };

        /*
         * Họ tên và lớp:
         * căn trái.
         */
        if (
          columnIndex === 1 ||
          columnIndex === 2
        ) {
          cell.s.alignment = {
            horizontal: "left",
            vertical: "center",
          };
        } else {
          /*
           * STT, SBD, mã đề,
           * các cột điểm:
           * căn giữa.
           */
          cell.s.alignment = {
            horizontal: "center",
            vertical: "center",
          };
        }

        /*
         * Bốn cột điểm.
         */
        if (
          columnIndex >=
            scoreStartColumn &&
          columnIndex <=
            scoreStartColumn + 3
        ) {
          cell.z = "0.00";
        }

        /*
         * Cột Tổng:
         * in đậm.
         */
        if (
          columnIndex ===
          scoreStartColumn + 3
        ) {
          cell.s.font = {
            bold: true,
          };
        }
      }
    }

    /*
     * =========================================
     * 11. AUTO FILTER
     * =========================================
     *
     * Filter đặt ở dòng header dưới,
     * thuận tiện khi mở trên Excel PC.
     */
    const headerBottomLeft =
      XLSX.utils.encode_cell({
        r: 3,
        c: 0,
      });

    const headerBottomRight =
      XLSX.utils.encode_cell({
        r: 3,
        c: lastColumnIndex,
      });

    worksheet["!autofilter"] = {
      ref:
        `${headerBottomLeft}:` +
        `${headerBottomRight}`,
    };

    /*
     * =========================================
     * 12. TẠO WORKBOOK
     * =========================================
     */
    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Kết quả"
    );

    /*
     * =========================================
     * 13. XUẤT BASE64
     * =========================================
     */
    const excelBase64 =
      XLSX.write(
        workbook,
        {
          type: "base64",
          bookType: "xlsx",
        }
      );

    /*
     * =========================================
     * 14. TÊN FILE
     * =========================================
     */
    const safeTitle =
      sanitizeFileName(
        exam.title
      );

    const fileName =
      `KET_QUA_${safeTitle}.xlsx`;

    const fileUri =
      `${FileSystem.cacheDirectory}${fileName}`;

    /*
     * =========================================
     * 15. GHI FILE
     * =========================================
     */
    await FileSystem.writeAsStringAsync(
      fileUri,
      excelBase64,
      {
        encoding:
          FileSystem.EncodingType
            .Base64,
      }
    );

    /*
     * =========================================
     * 16. CHIA SẺ / LƯU FILE
     * =========================================
     */
    const sharingAvailable =
      await Sharing.isAvailableAsync();

    if (!sharingAvailable) {
      Alert.alert(
        "Đã tạo file Excel",
        `File đã được tạo:\n${fileName}`
      );
      return;
    }

    await Sharing.shareAsync(
      fileUri,
      {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle:
          `Xuất ${fileName}`,
        UTI:
          "org.openxmlformats.spreadsheetml.sheet",
      }
    );
  } catch (error) {
    console.log(
      "EXPORT EXCEL ERROR:",
      error
    );

    Alert.alert(
      "Xuất Excel thất bại",
      String(error)
    );
  } finally {
    setExporting(false);
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
          style={styles.loadingText}
        >
          Đang tải kết quả...
        </Text>
      </SafeAreaView>
    );
  }

  if (!exam) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
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
            Xuất kết quả
          </Text>

          <View
            style={
              styles.headerRight
            }
          />
        </View>

        <View
          style={styles.center}
        >
          <Text
            style={styles.emptyTitle}
          >
            Không tìm thấy bài kiểm tra
          </Text>
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
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
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
          Xuất kết quả
        </Text>

        <View
          style={
            styles.headerRight
          }
        />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text
            style={styles.examTitle}
          >
            {exam.title}
          </Text>

          <Text
            style={styles.subtitle}
          >
            Tiêu đề Excel:
          </Text>

          <Text
            style={
              styles.excelTitle
            }
          >
            KẾT QUẢ {exam.title}
          </Text>

          <View
            style={styles.divider}
          />

          <View
            style={styles.infoRow}
          >
            <Text
              style={styles.infoLabel}
            >
              Số bài đã chấm
            </Text>

            <Text
              style={styles.infoValue}
            >
              {papers.length}
            </Text>
          </View>

          <View
            style={styles.infoRow}
          >
            <Text
              style={styles.infoLabel}
            >
              Số báo danh
            </Text>

            <Text
              style={[
                styles.infoValue,
                exam.scanStudentId
                  ? styles.enabled
                  : styles.disabled,
              ]}
            >
              {exam.scanStudentId
                ? "Có cột SBD"
                : "Không xuất cột SBD"}
            </Text>
          </View>

          <View
            style={styles.divider}
          />

          <Text
            style={
              styles.columnTitle
            }
          >
            Các cột trong Excel
          </Text>

          <Text
            style={
              styles.columnText
            }
          >
            STT • Họ và tên • Lớp
            {exam.scanStudentId
              ? " • Số báo danh"
              : ""}
            {" • "}
            Mã đề • P.I • P.II •
            P.III • Tổng
          </Text>

          {exam.scanStudentId && (
            <Text
              style={
                styles.noteText
              }
            >
              SBD hiện để trống đối
              với các bài đã chấm vì
              module đọc SBD chưa được
              triển khai.
            </Text>
          )}
        </View>

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
              style={styles.emptyText}
            >
              Hãy chấm ít nhất một
              bài trước khi xuất kết
              quả Excel.
            </Text>
          </View>
        ) : (
          <Pressable
            style={[
              styles.exportButton,
              exporting && {
                opacity: 0.6,
              },
            ]}
            disabled={exporting}
            onPress={() => {
              void exportExcel();
            }}
          >
            <Text
              style={
                styles.exportButtonText
              }
            >
              {exporting
                ? "ĐANG TẠO FILE..."
                : "XUẤT FILE EXCEL"}
            </Text>
          </Pressable>
        )}
      </View>
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
      justifyContent: "center",
      paddingHorizontal: 24,
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

    headerRight: {
      width: 64,
    },

    content: {
      flex: 1,
      padding: 16,
    },

    card: {
      padding: 18,
      borderRadius: 16,
      backgroundColor:
        "#ffffff",
      borderWidth: 1,
      borderColor:
        "#e5e7eb",
    },

    examTitle: {
      fontSize: 24,
      fontWeight: "900",
      color: "#111827",
    },

    subtitle: {
      marginTop: 18,
      fontSize: 14,
      fontWeight: "700",
      color: "#6b7280",
    },

    excelTitle: {
      marginTop: 5,
      fontSize: 19,
      fontWeight: "900",
      color: "#111827",
    },

    divider: {
      height: 1,
      marginVertical: 18,
      backgroundColor:
        "#e5e7eb",
    },

    infoRow: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    infoLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: "#4b5563",
    },

    infoValue: {
      fontSize: 15,
      fontWeight: "800",
      color: "#111827",
    },

    enabled: {
      color: "#059669",
    },

    disabled: {
      color: "#6b7280",
    },

    columnTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: "#111827",
    },

    columnText: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 23,
      color: "#374151",
    },

    noteText: {
      marginTop: 14,
      padding: 12,
      borderRadius: 10,
      fontSize: 14,
      lineHeight: 21,
      color: "#92400e",
      backgroundColor:
        "#fffbeb",
    },

    emptyBox: {
      marginTop: 20,
      padding: 22,
      alignItems: "center",
      borderRadius: 14,
      backgroundColor:
        "#ffffff",
      borderWidth: 1,
      borderColor:
        "#e5e7eb",
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#111827",
      textAlign: "center",
    },

    emptyText: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      color: "#6b7280",
    },

    exportButton: {
      marginTop: 22,
      height: 56,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 14,
      backgroundColor:
        "#2563eb",
    },

    exportButtonText: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "900",
    },
  });