import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type SheetType = "MOET_2025" | "MATH_3_PART";

export default function ExamScannerScreen() {
  const { width: screenWidth, height: screenHeight } =
  useWindowDimensions();
  const params = useLocalSearchParams<{
  examId?: string;
  examTitle?: string;
  sheetType?: SheetType;
  scanStudentId?: string;
}>();

  const sheetType: SheetType =
    params.sheetType === "MATH_3_PART"
      ? "MATH_3_PART"
      : "MOET_2025";

  const [permission, requestPermission] =
    useCameraPermissions();

  const cameraRef = useRef<CameraView>(null);
const cameraContainerRef = useRef<View>(null);
const frameRef = useRef<View>(null);
  const [takingPhoto, setTakingPhoto] =
    useState(false);
const [answerKeyReady, setAnswerKeyReady] =
  useState<boolean | null>(null);
type StoredAnswerKey = {
  examCode: string;
  part1: string[];
  part2: Array<{
    a: boolean;
    b: boolean;
    c: boolean;
    d: boolean;
  }>;
  part3: string[];
};

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

const [answerKeys, setAnswerKeys] =
  useState<StoredAnswerKey[]>([]);

const [gradingExam, setGradingExam] =
  useState<GradingExam | null>(null);

const [sheetDetected, setSheetDetected] =
  useState(false);

const [detectingSheet, setDetectingSheet] =
  useState(false);

const stableDetectionRef = useRef(0);
const autoTriggeredRef = useRef(false);
const detectingRef = useRef(false);
const takingPhotoRef = useRef(false);

const OMR_SERVER =
  "http://192.168.10.138:8000";
useEffect(() => {
  async function loadExamData() {
    try {
      const examId =
        String(params.examId ?? "").trim();

      if (!examId) {
        setAnswerKeyReady(false);
        setGradingExam(null);

        Alert.alert(
          "Không xác định được bài kiểm tra",
          "Không thể bắt đầu chấm bài."
        );

        return;
      }

      // ---------------------------------------
      // 1. ĐỌC BỘ ĐÁP ÁN CỦA BÀI THI
      // ---------------------------------------

      const answerKeysRaw =
        await AsyncStorage.getItem(
          `MHP_ANSWER_KEYS_${examId}`
        );

      const parsedAnswerKeys =
        answerKeysRaw
          ? JSON.parse(answerKeysRaw)
          : [];

      const hasKeys =
        Array.isArray(parsedAnswerKeys) &&
        parsedAnswerKeys.length > 0;

      setAnswerKeys(
        hasKeys
          ? parsedAnswerKeys
          : []
      );

      setAnswerKeyReady(hasKeys);

      // ---------------------------------------
      // 2. ĐỌC CẤU HÌNH CHẤM ĐIỂM
      // ---------------------------------------

      const examsRaw =
        await AsyncStorage.getItem(
          "MHP_GRADING_EXAMS"
        );

      const parsedExams =
        examsRaw
          ? JSON.parse(examsRaw)
          : [];

      const exams: GradingExam[] =
        Array.isArray(parsedExams)
          ? parsedExams
          : [];

      const matchedExam =
        exams.find(
          (item) =>
            String(item?.id ?? "") ===
            examId
        ) ?? null;

      setGradingExam(matchedExam);

      console.log(
        "GRADING EXAM CONFIG:",
        matchedExam
      );

      // ---------------------------------------
      // 3. KIỂM TRA DỮ LIỆU
      // ---------------------------------------

      if (!matchedExam) {
        Alert.alert(
          "Không tìm thấy cấu hình bài kiểm tra",
          "Không thể xác định thang điểm của bài kiểm tra này."
        );

        return;
      }

      if (!hasKeys) {
        Alert.alert(
          "Chưa có đáp án",
          "Bài kiểm tra này chưa có bộ đáp án. Thầy hãy nhập đáp án hoặc quét QR trước khi chấm.",
          [
            {
              text: "Về trang Đáp án",
              onPress: () =>
                router.replace({
                  pathname: "/answer-keys",
                  params: {
                    examId,
                  },
                }),
            },
          ]
        );
      }
    } catch (error) {
      console.error(
        "LOAD EXAM DATA ERROR:",
        error
      );

      setAnswerKeyReady(false);
      setGradingExam(null);

      Alert.alert(
        "Lỗi",
        "Không thể đọc dữ liệu bài kiểm tra."
      );
    }
  }

  void loadExamData();
}, [params.examId]);
  /*
   * Đây CHỈ là tỷ lệ của khung hướng dẫn.
   *
   * MOET_2025:
   *   phiếu dạng dọc, gần tỷ lệ A4.
   *
   * MATH_3_PART:
   *   phiếu ngang, tỷ lệ khoảng 1.84 : 1.
   *
   * Quan trọng:
   * KHÔNG dùng khung này để crop ảnh nữa.
   */
  function findAnswerKeyByExamCode(
  detectedExamCode: string
) {
  const normalizedCode =
    detectedExamCode.trim();

  if (!normalizedCode) {
    return null;
  }

  const found = answerKeys.find(
    (item) =>
      String(item.examCode).trim() ===
      normalizedCode
  );

  return found ?? null;
}
   const frameAspectRatio =
    sheetType === "MOET_2025"
      ? 0.71
      : 1.84;

  const frameWidth =
    sheetType === "MOET_2025"
      ? "88%"
      : "94%";

  async function takePhoto() {
  if (!cameraRef.current || !frameRef.current) {
    return;
  }

  if (takingPhotoRef.current) {
  return;
}

takingPhotoRef.current = true;

try {
  setTakingPhoto(true);

    // 1. Đo vị trí CameraView
    const cameraRect = await new Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}>((resolve, reject) => {
  if (!cameraContainerRef.current) {
    reject(
      new Error(
        "Không xác định được vùng camera."
      )
    );
    return;
  }

  cameraContainerRef.current.measureInWindow(
    (x, y, width, height) => {
      resolve({
        x,
        y,
        width,
        height,
      });
    }
  );
});

    // 2. Đo chính xác vị trí khung trắng
    const frameRect = await new Promise<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>((resolve) => {
      frameRef.current?.measureInWindow(
        (x, y, width, height) => {
          resolve({
            x,
            y,
            width,
            height,
          });
        }
      );
    });

    // 3. Chụp ảnh GỐC
    const photo =
      await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
      });
console.log(
  "CAMERA DEBUG",
  JSON.stringify(
    {
      cameraRect,
      frameRect,
      photoWidth: photo?.width,
      photoHeight: photo?.height,
      photoUri: photo?.uri,
    },
    null,
    2
  )
);
    if (!photo?.uri) {
      throw new Error("Camera không trả về ảnh.");
    }

    /*
     * Ảnh gốc vẫn được giữ nguyên trong photo.uri.
     *
     * Ta chỉ tạo thêm một ảnh PREVIEW đã crop
     * đúng theo khung trắng để hiển thị cho thầy.
     */

    const relativeX =
  frameRect.x - cameraRect.x;

const relativeY =
  frameRect.y - cameraRect.y;

/*
 * Camera preview sử dụng kiểu "cover".
 *
 * Vì tỷ lệ màn hình và tỷ lệ ảnh camera
 * không giống nhau nên ảnh preview có thể
 * bị ẩn một phần ở hai cạnh.
 *
 * Ta phải tính phần ảnh bị ẩn rồi mới
 * chuyển tọa độ khung sang ảnh gốc.
 */
const previewScale = Math.max(
  cameraRect.width / photo.width,
  cameraRect.height / photo.height
);

const displayedPhotoWidth =
  photo.width * previewScale;

const displayedPhotoHeight =
  photo.height * previewScale;

const hiddenX =
  (displayedPhotoWidth -
    cameraRect.width) /
  2;

const hiddenY =
  (displayedPhotoHeight -
    cameraRect.height) /
  2;

const cropX =
  (relativeX + hiddenX) /
  previewScale;

const cropY =
  (relativeY + hiddenY) /
  previewScale;

const cropWidth =
  frameRect.width /
  previewScale;

const cropHeight =
  frameRect.height /
  previewScale;

const safeX = Math.max(
  0,
  Math.min(
    Math.round(cropX),
    photo.width - 1
  )
);

const safeY = Math.max(
  0,
  Math.min(
    Math.round(cropY),
    photo.height - 1
  )
);

const safeWidth = Math.max(
  1,
  Math.min(
    Math.round(cropWidth),
    photo.width - safeX
  )
);

const safeHeight = Math.max(
  1,
  Math.min(
    Math.round(cropHeight),
    photo.height - safeY
  )
);

    const cropped =
      await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          {
            crop: {
              originX: Math.round(safeX),
              originY: Math.round(safeY),
              width: Math.round(safeWidth),
              height: Math.round(safeHeight),
            },
          },
        ],
        {
          compress: 0.95,
          format:
            ImageManipulator.SaveFormat.JPEG,
        }
      );

    router.push({
      pathname: "/omr-analysis",
      params: {
        // Ảnh hiển thị cho thầy
        photoUri: cropped.uri,

        // Ảnh GỐC dành cho OpenCV
        rawPhotoUri: photo.uri,

        examId: params.examId ?? "",
        examTitle: params.examTitle ?? "",
        sheetType,
      },
    });
  } catch (error) {
    console.error("Lỗi chụp ảnh:", error);

    Alert.alert(
      "Không chụp được ảnh",
      error instanceof Error
        ? error.message
        : "Đã xảy ra lỗi khi chụp ảnh."
    );
  } finally {
  setTakingPhoto(false);

  /*
   * Không mở khóa lại auto-trigger ở màn hình này.
   * Một phiếu chỉ được tự chụp đúng 1 lần.
   */
}
}

  async function gradeCurrentSheet() {
      try {
        if (!cameraRef.current) {
          return;
        }

        const testCameraRect = await new Promise<{
          x: number;
          y: number;
          width: number;
          height: number;
        }>((resolve) => {
          cameraContainerRef.current?.measureInWindow(
            (x, y, width, height) => {
              resolve({
                x,
                y,
                width,
                height,
              });
            }
          );
        });

        const testFrameRect = await new Promise<{
          x: number;
          y: number;
          width: number;
          height: number;
        }>((resolve) => {
          frameRef.current?.measureInWindow(
            (x, y, width, height) => {
              resolve({
                x,
                y,
                width,
                height,
              });
            }
          );
        });

        const photo =
          await cameraRef.current.takePictureAsync({
            quality: 0.9,
          });

        if (!photo?.uri) {
          return;
        }

        console.log(
          "TEST PHOTO DEBUG",
          JSON.stringify(
            {
              cameraRect: testCameraRect,
              frameRect: testFrameRect,
              photoWidth: photo?.width,
              photoHeight: photo?.height,
              uri: photo?.uri,
            },
            null,
            2
          )
        );

        if (!photo?.uri) {
          return;
        }

        const formData = new FormData();

        formData.append(
          "file",
          {
            uri: photo.uri,
            name: "test.jpg",
            type: "image/jpeg",
          } as any
        );

        formData.append(
          "sheet_type",
          "MATH_3_PART"
        );

        const response = await fetch(
          `${OMR_SERVER}/analyze`,
          {
            method: "POST",
            body: formData,
          }
        );

const result =
  await response.json();

let gradedImage:
  string | null = null;

let annotateError:
  string | null = null;

try {
  const examCode =
    String(
      result?.exam_code ?? ""
    ).trim();

  const positions =
    result?.exam_code_bubble_positions;

  const warpedImage =
    result?.warped_image;

  if (
    examCode.length === 3 &&
    Array.isArray(positions) &&
    positions.length === 3 &&
    warpedImage
  ) {
    const marks = [];

    for (
      let column = 0;
      column < 3;
      column += 1
    ) {
      const digit =
        Number(
          examCode[column]
        );

      const columnPositions =
        positions[column];

      if (
        !Number.isInteger(digit) ||
        !Array.isArray(
          columnPositions
        )
      ) {
        throw new Error(
          `Dữ liệu cột mã đề ${
            column + 1
          } không hợp lệ`
        );
      }

      const position =
        columnPositions.find(
          (item: any) =>
            Number(
              item?.digit
            ) === digit
        );

      if (!position) {
        throw new Error(
          `Không tìm thấy bubble số ${digit} ở cột ${
            column + 1
          }`
        );
      }

      marks.push({
        x: position.x,
        y: position.y,
        radius:
          position.radius,
        status: "correct",
      });
    }

    // =========================================
    // OVERLAY CHẤM THẬT - PART I
    //
    // Đáp án đúng:
    //   -> GREEN
    //
    // Học sinh chọn sai:
    //   -> RED
    //
    // Không thay đổi OMR.
    // Không thay đổi cách tính điểm.
    // Mobile vẫn là nơi so sánh đáp án.
    // =========================================

    const overlayAnswerKey =
      findAnswerKeyByExamCode(
        examCode
      );

    const part1Positions =
      result?.part1_bubble_positions;

    const part1Answers =
      result?.part1_answers;

    const part1Statuses =
      result?.part1_statuses;

    const optionLabels = [
      "A",
      "B",
      "C",
      "D",
    ];

    if (
      overlayAnswerKey &&
      Array.isArray(
        overlayAnswerKey.part1
      ) &&
      Array.isArray(
        part1Positions
      )
    ) {
      const questionCount =
        Math.min(
          overlayAnswerKey
            .part1.length,
          part1Positions.length
        );

      for (
        let questionIndex = 0;
        questionIndex <
        questionCount;
        questionIndex += 1
      ) {
        const questionPositions =
          part1Positions[
            questionIndex
          ];

        if (
          !Array.isArray(
            questionPositions
          ) ||
          questionPositions.length < 4
        ) {
          continue;
        }

        // -------------------------------------
        // Đáp án chuẩn của câu
        // -------------------------------------

        const correctAnswer =
          String(
            overlayAnswerKey
              .part1[
                questionIndex
              ] ?? ""
          )
            .trim()
            .toUpperCase();

        const correctIndex =
          optionLabels.indexOf(
            correctAnswer
          );

        // -------------------------------------
        // Luôn vẽ đáp án đúng màu xanh
        // -------------------------------------

        if (correctIndex >= 0) {
          const correctPosition =
            questionPositions[
              correctIndex
            ];

          if (
            correctPosition?.x !=
              null &&
            correctPosition?.y !=
              null
          ) {
            marks.push({
              x:
                correctPosition.x,

              y:
                correctPosition.y,

              radius:
                correctPosition
                  .radius,

              status:
                "correct",
            });
          }
        }

        // -------------------------------------
        // Đáp án học sinh mà OMR đọc được
        // -------------------------------------

        const studentAnswer =
          String(
            part1Answers?.[
              questionIndex
            ] ?? ""
          )
            .trim()
            .toUpperCase();

        const studentStatus =
          String(
            part1Statuses?.[
              questionIndex
            ] ?? ""
          )
            .trim()
            .toUpperCase();

        // -------------------------------------
        // Nếu OMR chắc chắn (OK)
        // và học sinh chọn sai:
        // vẽ lựa chọn học sinh màu đỏ.
        // -------------------------------------

        if (
          studentStatus === "OK" &&
          studentAnswer &&
          studentAnswer !==
            correctAnswer
        ) {
          const studentIndex =
            optionLabels.indexOf(
              studentAnswer
            );

          if (studentIndex >= 0) {
            const wrongPosition =
              questionPositions[
                studentIndex
              ];

            if (
              wrongPosition?.x !=
                null &&
              wrongPosition?.y !=
                null
            ) {
              marks.push({
                x:
                  wrongPosition.x,

                y:
                  wrongPosition.y,

                radius:
                  wrongPosition
                    .radius,

                status:
                  "wrong",
              });
            }
          }
        }
      }
    }

    // =========================================
    // OVERLAY CHẤM THẬT - PART II
    //
    // Quy ước:
    //
    // Đáp án chuẩn:
    //   -> GREEN
    //
    // Học sinh chọn sai:
    //   -> RED
    //
    // OMR không chắc chắn:
    //   -> YELLOW
    //
    // Chỉ xử lý số câu có trong đáp án QR.
    // Không phụ thuộc số câu vật lý trên phiếu.
    //
    // KHÔNG thay đổi OMR.
    // KHÔNG thay đổi cách tính điểm.
    // =========================================

    const part2Positions =
      result?.part2_measurements;

    const part2Answers =
      result?.part2_answers;

    const part2Statuses =
      result?.part2_statuses;

    if (
      overlayAnswerKey &&
      Array.isArray(
        overlayAnswerKey.part2
      ) &&
      Array.isArray(
        part2Positions
      )
    ) {
      const questionCount =
        Math.min(
          overlayAnswerKey
            .part2.length,
          part2Positions.length
        );

      for (
        let questionIndex = 0;
        questionIndex <
        questionCount;
        questionIndex += 1
      ) {
        const correctQuestion =
          overlayAnswerKey.part2[
            questionIndex
          ];

        const studentQuestion =
          part2Answers?.[
            questionIndex
          ];

        const statusQuestion =
          part2Statuses?.[
            questionIndex
          ];

        const measurementQuestion =
          part2Positions[
            questionIndex
          ];

        if (
          !correctQuestion ||
          !measurementQuestion
        ) {
          continue;
        }

        for (const label of [
          "a",
          "b",
          "c",
          "d",
        ] as const) {
          const measurement =
            measurementQuestion?.[
              label
            ];

          const bubblePositions =
            measurement
              ?.bubble_positions;

          if (!bubblePositions) {
            continue;
          }

          // -------------------------------------
          // Đáp án chuẩn của mệnh đề
          //
          // true  -> Đ
          // false -> S
          // -------------------------------------

          const correctValue =
            correctQuestion[label];

          const correctPosition =
            correctValue === true
              ? bubblePositions.true
              : correctValue === false
                ? bubblePositions.false
                : null;

          // -------------------------------------
          // Luôn khoanh đáp án đúng màu xanh
          // -------------------------------------

          if (
            correctPosition?.x !=
              null &&
            correctPosition?.y !=
              null
          ) {
            marks.push({
              x:
                correctPosition.x,

              y:
                correctPosition.y,

              radius:
                correctPosition.radius,

              status:
                "correct",
            });
          }

          // -------------------------------------
          // Kết quả OMR của học sinh
          // -------------------------------------

          const studentValue =
            studentQuestion?.[
              label
            ];

          const studentStatus =
            String(
              statusQuestion?.[
                label
              ] ?? ""
            )
              .trim()
              .toUpperCase();

          // -------------------------------------
          // OMR chắc chắn và học sinh chọn sai:
          // khoanh lựa chọn của học sinh màu đỏ.
          // -------------------------------------

          if (
            studentStatus === "OK" &&
            typeof studentValue ===
              "boolean" &&
            studentValue !==
              correctValue
          ) {
            const wrongPosition =
              studentValue === true
                ? bubblePositions.true
                : bubblePositions.false;

            if (
              wrongPosition?.x !=
                null &&
              wrongPosition?.y !=
                null
            ) {
              marks.push({
                x:
                  wrongPosition.x,

                y:
                  wrongPosition.y,

                radius:
                  wrongPosition.radius,

                status:
                  "wrong",
              });
            }
          }

          // -------------------------------------
          // OMR không chắc chắn:
          // khoanh vàng cả cặp Đ/S.
          //
          // BLANK không khoanh vàng.
          // -------------------------------------

          if (
            studentStatus ===
              "UNCERTAIN"
          ) {
            const truePosition =
              bubblePositions.true;

            const falsePosition =
              bubblePositions.false;

            if (
              truePosition?.x !=
                null &&
              truePosition?.y !=
                null
            ) {
              marks.push({
                x:
                  truePosition.x,

                y:
                  truePosition.y,

                radius:
                  truePosition.radius,

                status:
                  "uncertain",
              });
            }

            if (
              falsePosition?.x !=
                null &&
              falsePosition?.y !=
                null
            ) {
              marks.push({
                x:
                  falsePosition.x,

                y:
                  falsePosition.y,

                radius:
                  falsePosition.radius,

                status:
                  "uncertain",
              });
            }
          }
        }
      }
    }

    // =========================================
    // OVERLAY CHẤM THẬT - PART III
    //
    // Quy tắc phiếu:
    //
    // Kết quả được viết/tô từ trái sang phải
    // trong 4 vị trí vật lý.
    //
    // Ví dụ:
    // 6     -> [6][ ][ ][ ]
    // 11    -> [1][1][ ][ ]
    // 20    -> [2][0][ ][ ]
    // 1,5   -> [1][,][5][ ]
    // 12,3  -> [1][2][,][3]
    // -1,5  -> [-][1][,][5]
    //
    // GREEN:
    //   vị trí thuộc đáp án chuẩn.
    //
    // RED:
    //   học sinh tô sai khi OMR đọc OK.
    //
    // YELLOW:
    //   vị trí OMR xác định có xung đột
    //   MULTIPLE / INVALID.
    //
    // Chỉ xử lý số câu có trong QR.
    //
    // KHÔNG thay đổi OMR.
    // KHÔNG thay đổi cách tính điểm.
    // =========================================

    const part3Details =
      result?.part3_details;

    if (
      overlayAnswerKey &&
      Array.isArray(
        overlayAnswerKey.part3
      ) &&
      Array.isArray(
        part3Details
      )
    ) {
      const questionCount =
        Math.min(
          overlayAnswerKey
            .part3.length,
          part3Details.length
        );

      const PART3_FILLED_THRESHOLD =
        0.50;

      // ---------------------------------------
      // Tìm bubble của một digit
      // tại một cột vật lý.
      // ---------------------------------------

      const findPart3DigitPosition = (
        numericPositions: any,
        columnIndex: number,
        digit: string
      ) => {
        if (
          !Array.isArray(
            numericPositions
          )
        ) {
          return null;
        }

        const column =
          numericPositions[
            columnIndex
          ];

        if (!Array.isArray(column)) {
          return null;
        }

        const digitNumber =
          Number(digit);

        if (
          !Number.isInteger(
            digitNumber
          )
        ) {
          return null;
        }

        return (
          column.find(
            (position: any) =>
              position?.digit ===
              digitNumber
          ) ?? null
        );
      };

      // ---------------------------------------
      // Đổi ký tự thành bubble vật lý.
      // ---------------------------------------

      const getPart3CharacterPosition = (
        bubblePositions: any,
        positionIndex: number,
        character: string
      ) => {
        if (!bubblePositions) {
          return null;
        }

        // Digit 0..9
        if (
          /^[0-9]$/.test(
            character
          )
        ) {
          return (
            findPart3DigitPosition(
              bubblePositions.numeric,
              positionIndex,
              character
            )
          );
        }

        // Dấu âm chỉ hợp lệ ở position 1.
        if (
          character === "-" &&
          positionIndex === 0
        ) {
          return (
            bubblePositions.minus ??
            null
          );
        }

        // Dấu phẩy thứ nhất:
        // position 2.
        if (
          character === "," &&
          positionIndex === 1
        ) {
          return (
            bubblePositions.comma1 ??
            null
          );
        }

        // Dấu phẩy thứ hai:
        // position 3.
        if (
          character === "," &&
          positionIndex === 2
        ) {
          return (
            bubblePositions.comma2 ??
            null
          );
        }

        return null;
      };

      // ---------------------------------------
      // Thêm mark nếu có tọa độ hợp lệ.
      // ---------------------------------------

      const pushPart3Mark = (
        position: any,
        status:
          | "correct"
          | "wrong"
          | "uncertain"
      ) => {
        if (
          position?.x == null ||
          position?.y == null
        ) {
          return;
        }

        marks.push({
          x: position.x,
          y: position.y,
          radius:
            position.radius,
          status,
        });
      };

      for (
        let questionIndex = 0;
        questionIndex <
        questionCount;
        questionIndex += 1
      ) {
        const correctRaw =
          String(
            overlayAnswerKey.part3[
              questionIndex
            ] ?? ""
          )
            .trim()
            .replace(/\./g, ",");

        const question =
          part3Details[
            questionIndex
          ];

        const bubblePositions =
          question?.bubble_positions;

        if (
          !correctRaw ||
          !bubblePositions
        ) {
          continue;
        }

        const correctCharacters =
          Array.from(correctRaw);

        // =====================================
        // 1. ĐÁP ÁN CHUẨN -> GREEN
        // =====================================

        for (
          let positionIndex = 0;
          positionIndex <
          correctCharacters.length &&
          positionIndex < 4;
          positionIndex += 1
        ) {
          const character =
            correctCharacters[
              positionIndex
            ];

          const correctPosition =
            getPart3CharacterPosition(
              bubblePositions,
              positionIndex,
              character
            );

          pushPart3Mark(
            correctPosition,
            "correct"
          );
        }

        const studentStatus =
          String(
            question?.status ?? ""
          )
            .trim()
            .toUpperCase();

        const studentPositions =
          question?.positions;

        // =====================================
        // 2. OMR OK
        //
        // Ký tự học sinh sai -> RED.
        // =====================================

        if (
          studentStatus === "OK" &&
          Array.isArray(
            studentPositions
          )
        ) {
          for (
            let positionIndex = 0;
            positionIndex < 4;
            positionIndex += 1
          ) {
            const studentCharacter =
              studentPositions[
                positionIndex
              ];

            if (
              studentCharacter ==
              null
            ) {
              continue;
            }

            const studentText =
              String(
                studentCharacter
              );

            const correctCharacter =
              correctCharacters[
                positionIndex
              ] ?? null;

            if (
              studentText ===
              correctCharacter
            ) {
              continue;
            }

            const wrongPosition =
              getPart3CharacterPosition(
                bubblePositions,
                positionIndex,
                studentText
              );

            pushPart3Mark(
              wrongPosition,
              "wrong"
            );
          }

          continue;
        }

        // =====================================
        // 3. BLANK
        //
        // Không có bubble học sinh để đánh dấu.
        // Đáp án chuẩn xanh đã được vẽ.
        // =====================================

        if (
          studentStatus === "BLANK"
        ) {
          continue;
        }

        // =====================================
        // 4. MULTIPLE / INVALID
        //
        // Khoanh YELLOW đúng các bubble/ký hiệu
        // thực sự được OMR coi là đã tô.
        //
        // Numeric:
        //   ratio >= 0.50
        //
        // Symbol:
        //   minus/comma1/comma2 cũng có ratio.
        // =====================================

        if (
          studentStatus ===
            "MULTIPLE" ||
          studentStatus ===
            "INVALID"
        ) {
          const numericPositions =
            bubblePositions.numeric;

          if (
            Array.isArray(
              numericPositions
            )
          ) {
            for (
              let columnIndex = 0;
              columnIndex <
              numericPositions.length;
              columnIndex += 1
            ) {
              const column =
                numericPositions[
                  columnIndex
                ];

              if (
                !Array.isArray(
                  column
                )
              ) {
                continue;
              }

              for (
                const position
                of column
              ) {
                const ratio =
                  Number(
                    position?.ratio ??
                    0
                  );

                if (
                  Number.isFinite(
                    ratio
                  ) &&
                  ratio >=
                    PART3_FILLED_THRESHOLD
                ) {
                  pushPart3Mark(
                    position,
                    "uncertain"
                  );
                }
              }
            }
          }

          // -----------------------------------
          // Dấu âm / dấu phẩy.
          // -----------------------------------

          for (
            const symbolName of [
              "minus",
              "comma1",
              "comma2",
            ] as const
          ) {
            const symbolPosition =
              bubblePositions[
                symbolName
              ];

            const ratio =
              Number(
                symbolPosition
                  ?.ratio ?? 0
              );

            if (
              Number.isFinite(
                ratio
              ) &&
              ratio >=
                PART3_FILLED_THRESHOLD
            ) {
              pushPart3Mark(
                symbolPosition,
                "uncertain"
              );
            }
          }
        }
      }
    }

    const annotateResponse =
      await fetch(

        `${OMR_SERVER}/annotate`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            warped_image:
              warpedImage,
            marks,
          }),
        }
      );

    const annotateResult =
      await annotateResponse.json();

    if (
      annotateResponse.ok &&
      annotateResult?.ok
    ) {
      gradedImage =
        annotateResult
          ?.graded_image ??
        null;
    } else {
      annotateError =
        String(
          annotateResult?.error ??
            "Annotate failed"
        );
    }
  } else {
    annotateError =
      "Thiếu dữ liệu metadata mã đề";
  }
} catch (error) {
  annotateError =
    error instanceof Error
      ? error.message
      : String(error);
}

Alert.alert(
  "TEST OVERLAY MÃ ĐỀ",
  JSON.stringify(
    {
      httpStatus:
        response.status,

      examCode:
        result?.exam_code ??
        null,

      gradedImage,

      annotateError,
    },
    null,
    2
  )
);

console.log(
  "OMR TEST RESULT:",
  result
);

// -----------------------------------------
// KIỂM TRA MÃ ĐỀ
// -----------------------------------------

const detectedExamCode =
  String(result?.exam_code ?? "").trim();

const matchedAnswerKey =
  findAnswerKeyByExamCode(
    detectedExamCode
  );

if (!matchedAnswerKey) {
  Alert.alert(
    "Mã đề không hợp lệ",
    detectedExamCode
      ? `Không tìm thấy đáp án cho mã đề ${detectedExamCode}.`
      : "Không đọc được mã đề trên phiếu."
  );

  return;
}

console.log(
  "MATCHED ANSWER KEY:",
  matchedAnswerKey
);

// -----------------------------------------
// KIỂM TRA KẾT QUẢ PHẦN I TỪ OMR SERVER
// -----------------------------------------

const detectedPart1: string[] =
  Array.isArray(result?.part1_answers)
    ? result.part1_answers.map(
        (value: unknown) =>
          String(value ?? "")
            .trim()
            .toUpperCase()
      )
    : [];

const detectedPart1Statuses: string[] =
  Array.isArray(result?.part1_statuses)
    ? result.part1_statuses.map(
        (value: unknown) =>
          String(value ?? "")
            .trim()
            .toUpperCase()
      )
    : [];

const expectedPart1 =
  Array.isArray(matchedAnswerKey.part1)
    ? matchedAnswerKey.part1.map(
        (value) =>
          String(value ?? "")
            .trim()
            .toUpperCase()
      )
    : [];

console.log(
  "DETECTED PART I:",
  detectedPart1
);

console.log(
  "EXPECTED PART I:",
  expectedPart1
);

console.log(
  "PART I STATUSES:",
  detectedPart1Statuses
);

// -----------------------------------------
// SERVER CÓ TRẢ LỖI PART I KHÔNG?
// -----------------------------------------

if (result?.part1_error) {
  Alert.alert(
    "Không đọc được Phần I",
    String(result.part1_error)
  );

  return;
}

// -----------------------------------------
// KIỂM TRA CÓ ĐÁP ÁN PHẦN I KHÔNG
// -----------------------------------------

if (detectedPart1.length === 0) {
  Alert.alert(
    "Không đọc được Phần I",
    "Máy chưa nhận được đáp án Phần I trên phiếu."
  );

  return;
}

if (expectedPart1.length === 0) {
  Alert.alert(
    "Thiếu đáp án",
    `Mã đề ${detectedExamCode} chưa có đáp án Phần I.`
  );

  return;
}

// -----------------------------------------
// CHỈ SO SÁNH SỐ CÂU THỰC SỰ CÓ
// TRONG BỘ ĐÁP ÁN
// -----------------------------------------

const questionCount = Math.min(
  detectedPart1.length,
  expectedPart1.length
);

let correctCount = 0;
let wrongCount = 0;
let uncertainCount = 0;

const comparison: Array<{
  question: number;
  detected: string;
  expected: string;
  status: string;
  correct: boolean;
}> = [];

for (
  let index = 0;
  index < questionCount;
  index++
) {
  const detected =
    detectedPart1[index] ?? "";

  const expected =
    expectedPart1[index] ?? "";

  const status =
    detectedPart1Statuses[index] ??
    "UNKNOWN";

  const readable =
    status === "OK";

  const correct =
    readable &&
    detected === expected;

  if (!readable) {
    uncertainCount += 1;
  } else if (correct) {
    correctCount += 1;
  } else {
    wrongCount += 1;
  }

  comparison.push({
    question: index + 1,
    detected,
    expected,
    status,
    correct,
  });
}

console.log(
  "PART I COMPARISON:",
  comparison
);

console.log(
  "PART I SUMMARY:",
  {
    examCode: detectedExamCode,
    questionCount,
    correctCount,
    wrongCount,
    uncertainCount,
  }
);

// -----------------------------------------
// PHẦN II - CHUẨN HÓA KẾT QUẢ OMR
// -----------------------------------------

type Part2Choice = {
  a: boolean | null;
  b: boolean | null;
  c: boolean | null;
  d: boolean | null;
};

const normalizePart2Choice = (
  value: unknown
): Part2Choice => {
  const item =
    value &&
    typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const normalizeBoolean = (
    input: unknown
  ): boolean | null => {
    if (input === true) return true;
    if (input === false) return false;

    return null;
  };

  return {
    a: normalizeBoolean(item.a),
    b: normalizeBoolean(item.b),
    c: normalizeBoolean(item.c),
    d: normalizeBoolean(item.d),
  };
};

const detectedPart2: Part2Choice[] =
  Array.isArray(result?.part2_answers)
    ? result.part2_answers.map(
        (value: unknown) =>
          normalizePart2Choice(value)
      )
    : [];

const expectedPart2: Part2Choice[] =
  Array.isArray(matchedAnswerKey.part2)
    ? matchedAnswerKey.part2.map(
        (value) =>
          normalizePart2Choice(value)
      )
    : [];

const part2QuestionCount = Math.min(
  detectedPart2.length,
  expectedPart2.length
);

const part2Comparison: Array<{
  question: number;
  detected: Part2Choice;
  expected: Part2Choice;
  correctStatements: number;
  uncertainStatements: number;
}> = [];

for (
  let index = 0;
  index < part2QuestionCount;
  index++
) {
  const detected =
    detectedPart2[index];

  const expected =
    expectedPart2[index];

  let correctStatements = 0;
  let uncertainStatements = 0;

  const keys: Array<
    keyof Part2Choice
  > = ["a", "b", "c", "d"];

  for (const key of keys) {
    const detectedValue =
      detected[key];

    const expectedValue =
      expected[key];

    if (detectedValue === null) {
      uncertainStatements += 1;
      continue;
    }

    if (
      detectedValue ===
      expectedValue
    ) {
      correctStatements += 1;
    }
  }

  part2Comparison.push({
    question: index + 1,
    detected,
    expected,
    correctStatements,
    uncertainStatements,
  });
}

console.log(
  "PART II COMPARISON:",
  part2Comparison
);

// -----------------------------------------
// PHẦN III - CHUẨN HÓA SỐ
// -----------------------------------------

const normalizeNumericAnswer = (
  value: unknown
): string => {
  const raw = String(
    value ?? ""
  )
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");

  if (!raw) {
    return "";
  }

  const numericValue =
    Number(raw);

  if (
    Number.isFinite(
      numericValue
    )
  ) {
    return String(
      numericValue
    );
  }

  return raw;
};

const detectedPart3 =
  Array.isArray(
    result?.part3_answers
  )
    ? result.part3_answers.map(
        (value: unknown) =>
          normalizeNumericAnswer(
            value
          )
      )
    : [];

const expectedPart3 =
  Array.isArray(
    matchedAnswerKey.part3
  )
    ? matchedAnswerKey.part3.map(
        (value) =>
          normalizeNumericAnswer(
            value
          )
      )
    : [];

const part3QuestionCount =
  Math.min(
    detectedPart3.length,
    expectedPart3.length
  );

let part3CorrectCount = 0;
let part3WrongCount = 0;
let part3UncertainCount = 0;

const part3Comparison: Array<{
  question: number;
  detected: string;
  expected: string;
  correct: boolean;
  uncertain: boolean;
}> = [];

for (
  let index = 0;
  index < part3QuestionCount;
  index++
) {
  const detected =
    detectedPart3[index] ?? "";

  const expected =
    expectedPart3[index] ?? "";

  const uncertain =
    detected === "";

  const correct =
    !uncertain &&
    detected === expected;

  if (uncertain) {
    part3UncertainCount += 1;
  } else if (correct) {
    part3CorrectCount += 1;
  } else {
    part3WrongCount += 1;
  }

  part3Comparison.push({
    question: index + 1,
    detected,
    expected,
    correct,
    uncertain,
  });
}

console.log(
  "PART III COMPARISON:",
  part3Comparison
);

// -----------------------------------------
// TÍNH ĐIỂM
// -----------------------------------------

if (!gradingExam) {
  Alert.alert(
    "Thiếu cấu hình chấm điểm",
    "Không tìm thấy cấu hình điểm của bài kiểm tra."
  );

  return;
}

// Sau kiểm tra trên, cố định cấu hình chấm điểm
// để TypeScript biết chắc chắn giá trị không còn null.
const activeGradingExam = gradingExam;

// -----------------------------------------
// PHẦN I
// -----------------------------------------

const part1Score =
  correctCount *
  activeGradingExam.part1Point;

// -----------------------------------------
// PHẦN II
// -----------------------------------------

function getPart2QuestionScore(
  correctStatements: number
): number {
  switch (correctStatements) {
    case 1:
      return activeGradingExam.part2Point1;

    case 2:
      return activeGradingExam.part2Point2;

    case 3:
      return activeGradingExam.part2Point3;

    case 4:
      return activeGradingExam.part2Point4;

    default:
      return 0;
  }
}

let part2Score = 0;

const part2Scores =
  part2Comparison.map((item) => {
    // Nếu OMR còn ô không chắc chắn,
    // chưa tự cho điểm câu đó.
    const score =
      item.uncertainStatements > 0
        ? 0
        : getPart2QuestionScore(
            item.correctStatements
          );

    part2Score += score;

    return {
      question: item.question,
      correctStatements:
        item.correctStatements,
      uncertainStatements:
        item.uncertainStatements,
      score,
    };
  });

// -----------------------------------------
// PHẦN III
// -----------------------------------------

const part3Score =
  part3CorrectCount *
  gradingExam.part3Point;

// -----------------------------------------
// TỔNG ĐIỂM
// -----------------------------------------

const totalScore =
  part1Score +
  part2Score +
  part3Score;

// Làm tròn để tránh lỗi số thực kiểu
// 1.7499999999999998
const roundedPart1Score =
  Math.round(part1Score * 1000) /
  1000;

const roundedPart2Score =
  Math.round(part2Score * 1000) /
  1000;

const roundedPart3Score =
  Math.round(part3Score * 1000) /
  1000;

const roundedTotalScore =
  Math.round(totalScore * 1000) /
  1000;

// -----------------------------------------
// DEBUG
// -----------------------------------------

console.log(
  "PART I SCORE:",
  roundedPart1Score
);

console.log(
  "PART II SCORES:",
  part2Scores
);

console.log(
  "PART II SCORE:",
  roundedPart2Score
);

console.log(
  "PART III SCORE:",
  roundedPart3Score
);

console.log(
  "TOTAL SCORE:",
  roundedTotalScore
);

// -----------------------------------------
// HIỂN THỊ KẾT QUẢ CHẤM THỬ
// -----------------------------------------

Alert.alert(
  "Kết quả chấm bài",
  [
    `Mã đề: ${detectedExamCode}`,
    "",
    `Phần I: ${roundedPart1Score.toFixed(2)} điểm`,
    `Đúng ${correctCount}/${questionCount} câu`,
    "",
    `Phần II: ${roundedPart2Score.toFixed(2)} điểm`,
    ...part2Scores.map(
      (item) =>
        `C${item.question}: ${item.correctStatements}/4 ý đúng → ${item.score.toFixed(2)} điểm`
    ),
    "",
    `Phần III: ${roundedPart3Score.toFixed(2)} điểm`,
    `Đúng ${part3CorrectCount}/${part3QuestionCount} câu`,
    "",
    `TỔNG ĐIỂM: ${roundedTotalScore.toFixed(2)}`,
  ].join("\n")
);

return;

        
      } catch (error) {
        console.log(
          "OMR TEST ERROR:",
          error
        );

        Alert.alert(
          "Lỗi",
          String(error)
        );
      }
  }

if (answerKeyReady === null) {
  return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator size="large" />
      <Text style={styles.loadingText}>
        Đang kiểm tra bộ đáp án...
      </Text>
    </SafeAreaView>
  );
}

if (answerKeyReady === false) {
  return (
    <SafeAreaView style={styles.center}>
      <Text style={styles.loadingText}>
        Chưa có bộ đáp án.
      </Text>
    </SafeAreaView>
  );
}
  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Đang kiểm tra quyền camera...
        </Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <Text style={styles.permissionTitle}>
          Cần quyền sử dụng camera
        </Text>

        <Text style={styles.permissionText}>
          MATH-HUY PHUNG cần sử dụng camera
          để chụp phiếu trả lời trắc nghiệm.
        </Text>

        <Pressable
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text
            style={
              styles.permissionButtonText
            }
          >
            CHO PHÉP CAMERA
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
  <View
    ref={cameraContainerRef}
    style={styles.container}
  >
<CameraView
  ref={cameraRef}
  style={StyleSheet.absoluteFill}
  facing="back"
  zoom={0}
/>
      {/* Lớp phủ tối */}
      <View style={styles.overlay}>
        {/* Thanh trên */}
        <SafeAreaView style={styles.topArea}>
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>
                ‹
              </Text>
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.title}>
                QUÉT BÀI THI
              </Text>

              {!!params.examTitle && (
                <Text
                  style={
                    styles.examTitle
                  }
                  numberOfLines={1}
                >
                  {params.examTitle}
                </Text>
              )}
            </View>

            <View
              style={
                styles.headerSpacer
              }
            />
          </View>
        </SafeAreaView>

        {/* Vùng căn phiếu */}
        <View style={styles.frameArea}>
          <View
  ref={frameRef}
  style={[
    styles.sheetFrame,
              {
                width: frameWidth,
                aspectRatio:
                  frameAspectRatio,
              },
            ]}
          >
            <View
              style={[
                styles.corner,
                styles.cornerTopLeft,
		sheetDetected &&
  		styles.cornerDetected,
              ]}
            />

            <View
              style={[
                styles.corner,
                styles.cornerTopRight,
		sheetDetected &&
  		styles.cornerDetected,
              ]}
            />

            <View
              style={[
                styles.corner,
                styles.cornerBottomLeft,
		sheetDetected &&
  		styles.cornerDetected,
              ]}
            />

            <View
              style={[
                styles.corner,
                styles.cornerBottomRight,
		sheetDetected &&
  		styles.cornerDetected,
              ]}
            />
          </View>

          <Text style={styles.sheetTypeText}>
            {sheetType === "MOET_2025"
              ? "Phiếu Bộ GD&ĐT 2025"
              : "Phiếu Toán 3 phần"}
          </Text>

          <Text style={styles.instruction}>
  {sheetDetected
    ? "Đã nhận phiếu — giữ máy ổn định..."
    : detectingSheet
      ? "Đang tìm 4 ô vuông đen..."
      : "Đưa 4 ô vuông đen vào 4 góc khung."}
</Text>

          <Text
            style={
              styles.subInstruction
            }
          >
            Các mốc đen cần nhìn thấy rõ.
            Ứng dụng sẽ tự căn chỉnh phiếu
            sau khi chụp.
          </Text>
        </View>

        <SafeAreaView style={styles.bottomArea}>
  <Text style={styles.autoScanTitle}>
    CHẤM TỰ ĐỘNG
  </Text>

  <Text style={styles.autoScanText}>
    Đưa toàn bộ phiếu trả lời vào trong khung.
  </Text>

  <Pressable
    style={{
      marginTop: 12,
      backgroundColor: "#ffffff",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    }}
    onPress={gradeCurrentSheet}
  >
    <Text
      style={{
        fontWeight: "800",
        color: "#111827",
      }}
    >
      TEST 1 ẢNH
    </Text>
  </Pressable>
</SafeAreaView>
      </View>
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
    backgroundColor: "#111827",
  },

  loadingText: {
    color: "#ffffff",
    marginTop: 14,
    fontSize: 15,
  },

  permissionScreen: {
    flex: 1,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },

  permissionTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 14,
    textAlign: "center",
  },

  permissionText: {
    color: "#d1d5db",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
    marginBottom: 28,
  },

  permissionButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 12,
  },

  permissionButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },

  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },

  topArea: {
  backgroundColor: "transparent",
},

  header: {
  height: 76,
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  backgroundColor: "transparent",
},

  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    color: "#ffffff",
    fontSize: 42,
    lineHeight: 42,
    fontWeight: "300",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  title: {
  color: "#ffffff",
  fontSize: 18,
  fontWeight: "800",
  letterSpacing: 0.5,

  textShadowColor: "rgba(0,0,0,0.95)",
  textShadowOffset: {
    width: 0,
    height: 2,
  },
  textShadowRadius: 4,
},

  examTitle: {
    color: "#d1d5db",
    fontSize: 12,
    marginTop: 3,
    maxWidth: 230,
  },

  headerSpacer: {
    width: 44,
  },

  frameArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },

  sheetFrame: {
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.45)",
    position: "relative",
  },

  corner: {
  position: "absolute",
  width: 42,
  height: 42,
  borderWidth: 4,
  borderColor: "#ffffff",
  backgroundColor: "transparent",
},

cornerTopLeft: {
  left: -1,
  top: -1,
},

cornerTopRight: {
  right: -1,
  top: -1,
},

cornerBottomLeft: {
  left: -1,
  bottom: -1,
},

cornerBottomRight: {
  right: -1,
  bottom: -1,
},

cornerDetected: {
  borderColor: "#00ff66",
},

  sheetTypeText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 18,
    backgroundColor:
      "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  instruction: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 12,
    paddingHorizontal: 22,
    textShadowColor:
      "rgba(0,0,0,0.9)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 3,
  },

  subInstruction: {
    color: "#e5e7eb",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
    paddingHorizontal: 28,
    textShadowColor:
      "rgba(0,0,0,0.9)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 3,
  },

  bottomArea: {
    minHeight: 145,
    backgroundColor:
      "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 14,
    paddingBottom: 12,
  },

  captureOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  captureDisabled: {
    opacity: 0.65,
  },

  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#ffffff",
  },

  captureText: {
    color: "#ffffff",
    fontSize: 13,
    marginTop: 8,
  },
autoScanTitle: {
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "800",
  letterSpacing: 0.6,
},

autoScanText: {
  color: "#e5e7eb",
  fontSize: 13,
  lineHeight: 19,
  textAlign: "center",
  marginTop: 7,
  paddingHorizontal: 30,
},
});
