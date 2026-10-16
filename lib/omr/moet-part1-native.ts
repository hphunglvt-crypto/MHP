import * as FileSystem from "expo-file-system/legacy";

import {
  BorderTypes,
  ColorConversionCodes,
  DataTypes,
  DecompTypes,
  HoughModes,
  InterpolationFlags,
  ObjectType,
  OpenCV,
} from "react-native-fast-opencv";

import {
  type Part1Circle,
  type Part1NativeResult,
  numpyRound,
  buildQuestionRows,
  assignCirclesToRows,
  buildPart1BlockModels,
  buildPart1MeasureGroups,
  buildPart1NativeResult,
} from "./moet-part1";

const WARP_WIDTH = 1542;
const WARP_HEIGHT = 2226;

const ROI_X = 20;
const ROI_Y = 735;
const ROI_WIDTH = 1500;
const ROI_HEIGHT = 475;

export type MoetMarkerPoint = [
  number,
  number
];

export type MoetMarkerPoints = [
  MoetMarkerPoint,
  MoetMarkerPoint,
  MoetMarkerPoint,
  MoetMarkerPoint
];

export type MoetPart1NativeDiagnostics = {
  houghCount: number;
  rowCount: number;
  blockModelCount: number;
  measureGroupCount: number;
  measurePointCount: number;
};

export type MoetPart1NativeOutput = {
  result: Part1NativeResult;
  diagnostics: MoetPart1NativeDiagnostics;
};

function normalizeMarkerPoints(
  markerPoints: unknown
): MoetMarkerPoints {
  if (
    !Array.isArray(markerPoints) ||
    markerPoints.length !== 4
  ) {
    throw new Error(
      "MOET Part I native: markerPoints phải có đúng 4 điểm [TL, TR, BR, BL]."
    );
  }

  const normalized =
    markerPoints.map((point) => {
      if (
        !Array.isArray(point) ||
        point.length < 2
      ) {
        throw new Error(
          "MOET Part I native: marker point không hợp lệ."
        );
      }

      const x = Number(point[0]);
      const y = Number(point[1]);

      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        throw new Error(
          "MOET Part I native: tọa độ marker không hợp lệ."
        );
      }

      return [x, y] as MoetMarkerPoint;
    });

  return normalized as MoetMarkerPoints;
}

export async function analyzeMoetPart1Native(
  photoUri: string,
  markerPointsInput: unknown
): Promise<MoetPart1NativeOutput> {
  if (!photoUri) {
    throw new Error(
      "MOET Part I native: thiếu photoUri."
    );
  }

  const markerPoints =
    normalizeMarkerPoints(
      markerPointsInput
    );

  try {
    /*
     * ==========================================
     * 1. LOAD ẢNH GỐC
     * ==========================================
     */

    const base64 =
      await FileSystem.readAsStringAsync(
        photoUri,
        {
          encoding:
            FileSystem.EncodingType.Base64,
        }
      );

    const src =
      OpenCV.base64ToMat(base64);

    const srcInfo =
      OpenCV.toJSValue(src);

    /*
     * markerPoints:
     * [TL, TR, BR, BL]
     */
    const [
      markerTL,
      markerTR,
      markerBR,
      markerBL,
    ] = markerPoints;

    /*
     * ==========================================
     * 2. WARP MOET 1542 x 2226
     * ==========================================
     */

    const srcTL =
      OpenCV.createObject(
        ObjectType.Point2f,
        markerTL[0],
        markerTL[1]
      );

    const srcTR =
      OpenCV.createObject(
        ObjectType.Point2f,
        markerTR[0],
        markerTR[1]
      );

    const srcBR =
      OpenCV.createObject(
        ObjectType.Point2f,
        markerBR[0],
        markerBR[1]
      );

    const srcBL =
      OpenCV.createObject(
        ObjectType.Point2f,
        markerBL[0],
        markerBL[1]
      );

    const srcPoints =
      OpenCV.createObject(
        ObjectType.Point2fVector,
        [
          srcTL,
          srcTR,
          srcBR,
          srcBL,
        ]
      );

    const dstTL =
      OpenCV.createObject(
        ObjectType.Point2f,
        0,
        0
      );

    const dstTR =
      OpenCV.createObject(
        ObjectType.Point2f,
        WARP_WIDTH - 1,
        0
      );

    const dstBR =
      OpenCV.createObject(
        ObjectType.Point2f,
        WARP_WIDTH - 1,
        WARP_HEIGHT - 1
      );

    const dstBL =
      OpenCV.createObject(
        ObjectType.Point2f,
        0,
        WARP_HEIGHT - 1
      );

    const dstPoints =
      OpenCV.createObject(
        ObjectType.Point2fVector,
        [
          dstTL,
          dstTR,
          dstBR,
          dstBL,
        ]
      );

    const transform =
      OpenCV.invoke(
        "getPerspectiveTransform",
        srcPoints,
        dstPoints,
        DecompTypes.DECOMP_LU
      );

    const warped =
      OpenCV.createObject(
        ObjectType.Mat,
        WARP_HEIGHT,
        WARP_WIDTH,
        srcInfo.type as DataTypes
      );

    const warpSize =
      OpenCV.createObject(
        ObjectType.Size,
        WARP_WIDTH,
        WARP_HEIGHT
      );

    const borderValue =
      OpenCV.createObject(
        ObjectType.Scalar,
        0,
        0,
        0,
        0
      );

    OpenCV.invoke(
      "warpPerspective",
      src,
      warped,
      transform,
      warpSize,
      InterpolationFlags.INTER_LINEAR,
      BorderTypes.BORDER_CONSTANT,
      borderValue
    );

    /*
     * ==========================================
     * 3. GRAYSCALE
     * ==========================================
     */

    const gray =
      OpenCV.createObject(
        ObjectType.Mat,
        WARP_HEIGHT,
        WARP_WIDTH,
        DataTypes.CV_8UC1
      );

    OpenCV.invoke(
      "cvtColor",
      warped,
      gray,
      ColorConversionCodes.COLOR_BGR2GRAY
    );

    /*
     * Contrast production dùng full gray
     * KHÔNG dùng CLAHE.
     */
    const grayBufferInfo =
      OpenCV.matToBuffer(
        gray,
        "uint8"
      );

    const grayBuffer =
      grayBufferInfo.buffer;

    /*
     * ==========================================
     * 4. CLAHE
     *
     * LOCK:
     * clipLimit = 2.0
     * tileGrid = 8 x 8
     * ==========================================
     */

    const enhanced =
      OpenCV.createObject(
        ObjectType.Mat,
        WARP_HEIGHT,
        WARP_WIDTH,
        DataTypes.CV_8UC1
      );

    OpenCV.invoke(
      "CLAHE",
      gray,
      enhanced,
      2.0,
      8,
      8
    );

    /*
     * ==========================================
     * 5. ROI PART I
     *
     * x = 20..1520
     * y = 735..1210
     * ==========================================
     */

    const roiRect =
      OpenCV.createObject(
        ObjectType.Rect,
        ROI_X,
        ROI_Y,
        ROI_WIDTH,
        ROI_HEIGHT
      );

    const roi =
      OpenCV.createObject(
        ObjectType.Mat,
        ROI_HEIGHT,
        ROI_WIDTH,
        DataTypes.CV_8UC1
      );

    OpenCV.invoke(
      "crop",
      enhanced,
      roi,
      roiRect
    );

    /*
     * ==========================================
     * 6. GAUSSIAN BLUR
     *
     * LOCK:
     * kernel 5 x 5
     * sigma = 1.2
     * ==========================================
     */

    const blurred =
      OpenCV.createObject(
        ObjectType.Mat,
        ROI_HEIGHT,
        ROI_WIDTH,
        DataTypes.CV_8UC1
      );

    const blurSize =
      OpenCV.createObject(
        ObjectType.Size,
        5,
        5
      );

    OpenCV.invoke(
      "GaussianBlur",
      roi,
      blurred,
      blurSize,
      1.2
    );

    /*
     * ==========================================
     * 7. HOUGH CIRCLES
     *
     * LOCK:
     * dp = 1
     * minDist = 17
     * param1 = 100
     * param2 = 18
     * minRadius = 7
     * maxRadius = 14
     * ==========================================
     */

    const circles =
      OpenCV.createObject(
        ObjectType.Mat,
        1,
        1,
        DataTypes.CV_32FC3
      );

    OpenCV.invoke(
      "HoughCircles",
      blurred,
      circles,
      HoughModes.HOUGH_GRADIENT,
      1,
      17,
      100,
      18,
      7,
      14
    );

    /*
     * Không dùng toJSValue(circles)
     * để lấy float Hough vì wrapper 0.4.8
     * convert sang CV_8U.
     *
     * matToBuffer float32 giữ nguyên CV_32FC3.
     */

    const circlesBuffer =
      OpenCV.matToBuffer(
        circles,
        "float32"
      );

    const circleData =
      circlesBuffer.buffer;

    const circleList: {
      x: number;
      y: number;
      r: number;
    }[] = [];

    for (
      let i = 0;
      i + 2 < circleData.length;
      i += 3
    ) {
      circleList.push({
        x: circleData[i],
        y: circleData[i + 1],
        r: circleData[i + 2],
      });
    }

    /*
     * ==========================================
     * 8. ĐỔI Hough ROI -> WARP COORDINATES
     * ==========================================
     */

    const detectedPart1:
      Part1Circle[] =
      circleList.map((circle) => ({
        x:
          numpyRound(circle.x) +
          ROI_X,

        y:
          numpyRound(circle.y) +
          ROI_Y,

        r:
          numpyRound(circle.r),
      }));

    /*
     * ==========================================
     * 9. ROW CLUSTERING
     *
     * Logic nằm trong moet-part1.ts
     * đã PASS / LOCK.
     * ==========================================
     */

    const part1Rows =
      buildQuestionRows(
        detectedPart1
      );

    const part1RowItems =
      assignCirclesToRows(
        detectedPart1,
        part1Rows
      );

    /*
     * ==========================================
     * 10. PHONE ADAPTIVE BLOCK MODELS
     * ==========================================
     */

    const part1BlockModels =
      buildPart1BlockModels(
        part1RowItems
      );

    /*
     * ==========================================
     * 11. 40 GROUPS / 160 MEASURE POINTS
     * ==========================================
     */

    const part1MeasurePoints =
      buildPart1MeasureGroups(
        part1RowItems,
        part1BlockModels
      );

    /*
     * ==========================================
     * 12. CONTRAST + CLASSIFIER + RESULT
     *
     * REVIEW candidate được giữ trong answers.
     * REVIEW tuyệt đối không đồng nghĩa ANSWER.
     * ==========================================
     */

    const part1NativeResult =
      buildPart1NativeResult(
        part1MeasurePoints,
        grayBuffer,
        WARP_WIDTH,
        WARP_HEIGHT
      );

    const measurePointCount =
      part1MeasurePoints.reduce(
        (total, group) =>
          total +
          group.points.length,
        0
      );

    const blockModelCount =
      part1BlockModels.filter(
        (model) =>
          model !== null
      ).length;

    return {
      result:
        part1NativeResult,

      diagnostics: {
        houghCount:
          detectedPart1.length,

        rowCount:
          part1Rows.length,

        blockModelCount,

        measureGroupCount:
          part1MeasurePoints.length,

        measurePointCount,
      },
    };
  } finally {
    /*
     * react-native-fast-opencv giữ native buffers.
     * Luôn giải phóng sau mỗi lần phân tích.
     */
    OpenCV.clearBuffers();
  }
}