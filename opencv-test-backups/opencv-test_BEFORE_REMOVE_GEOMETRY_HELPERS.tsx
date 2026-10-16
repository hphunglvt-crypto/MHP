import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { Stack } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
  type Part1Cluster,
  type Part1Row,
  numpyRound,
  mean,
  buildQuestionRows,
  assignCirclesToRows,
  buildPart1BlockModels as buildPart1BlockModelsModule,
  buildPart1MeasureGroups as buildPart1MeasureGroupsModule,
  buildPart1NativeResult as buildPart1NativeResultModule,
} from "../lib/omr/moet-part1";

const TEST_IMAGE =
  require("../assets/omr-test/MOET_PHONE_REAL_01.jpg");

const WARP_WIDTH = 1542;
const WARP_HEIGHT = 2226;

const ROI_X = 20;
const ROI_Y = 735;
const ROI_WIDTH = 1500;
const ROI_HEIGHT = 475;

const PART1_EXPECTED_ROW_X = [
  128.0, 196.0, 264.0, 332.0,
  496.0, 562.0, 626.0, 692.0,
  860.0, 924.0, 988.0, 1052.0,
  1220.0, 1284.0, 1348.0, 1412.0,
];

const PART1_MATCH_TOLERANCE = 20.0;

type Part1RecoveredCircle =
  Part1Circle & {
    recovered: boolean;
  };

type Part1CompletedRow = {
  y: number;
  items: Part1RecoveredCircle[];
};

function completePart1Rows(
  rowItems: Part1Row[]
): Part1CompletedRow[] {
  const completedRows:
    Part1CompletedRow[] = [];

  for (const row of rowItems) {
    const cy = row.y;

    const items = [...row.items].sort(
      (a, b) => a.x - b.x
    );

    const used = new Set<number>();

    const completedItems:
      Part1RecoveredCircle[] = [];

    for (
      const expectedX
      of PART1_EXPECTED_ROW_X
    ) {
      let bestIndex: number | null =
        null;

      let bestDistance: number | null =
        null;

      for (
        let index = 0;
        index < items.length;
        index += 1
      ) {
        if (used.has(index)) {
          continue;
        }

        const distance = Math.abs(
          items[index].x - expectedX
        );

        if (
          bestDistance === null ||
          distance < bestDistance
        ) {
          bestDistance = distance;
          bestIndex = index;
        }
      }

      if (
        bestIndex !== null &&
        bestDistance !== null &&
        bestDistance <=
          PART1_MATCH_TOLERANCE
      ) {
        used.add(bestIndex);

        completedItems.push({
          ...items[bestIndex],
          recovered: false,
        });
      } else {
        completedItems.push({
          x: expectedX,
          y: cy,
          r: 10.0,
          recovered: true,
        });
      }
    }

    completedRows.push({
      y: cy,
      items: completedItems,
    });
  }

  return completedRows;
}
type LinearModel = {
  slope: number;
  intercept: number;
};

type Part1BlockPair = {
  expectedX: number;
  actualX: number;
  actualY: number;
  baseY: number;
};

type Part1BlockModel = {
  xSlope: number;
  xIntercept: number;
  dySlope: number;
  dyIntercept: number;
  pairCount: number;
};

function linearFit(
  xs: number[],
  ys: number[]
): LinearModel | null {
  if (
    xs.length !== ys.length ||
    xs.length < 2
  ) {
    return null;
  }

  const meanX = mean(xs);
  const meanY = mean(ys);

  let numerator = 0;
  let denominator = 0;

  for (
    let i = 0;
    i < xs.length;
    i += 1
  ) {
    const dx = xs[i] - meanX;

    numerator +=
      dx * (ys[i] - meanY);

    denominator +=
      dx * dx;
  }

  if (denominator === 0) {
    return null;
  }

  const slope =
    numerator / denominator;

  const intercept =
    meanY - slope * meanX;

  return {
    slope,
    intercept,
  };
}

function predictPart1PhoneY(
  row: Part1Row,
  targetX: number
): number {
  const anchorX = [
    496.0, 562.0, 626.0, 692.0,
    860.0, 924.0, 988.0, 1052.0,
    1220.0, 1284.0, 1348.0, 1412.0,
  ];

  const xs: number[] = [];
  const ys: number[] = [];

  const used = new Set<number>();

  for (const expectedX of anchorX) {
    let bestIndex: number | null =
      null;

    let bestDistance: number | null =
      null;

    for (
      let i = 0;
      i < row.items.length;
      i += 1
    ) {
      if (used.has(i)) {
        continue;
      }

      const distance = Math.abs(
        row.items[i].x -
          expectedX
      );

      if (
        bestDistance === null ||
        distance < bestDistance
      ) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    if (
      bestIndex !== null &&
      bestDistance !== null &&
      bestDistance <= 20.0
    ) {
      used.add(bestIndex);

      xs.push(
        row.items[bestIndex].x
      );

      ys.push(
        row.items[bestIndex].y
      );
    }
  }

  if (xs.length < 4) {
    return row.y;
  }

  const model =
    linearFit(xs, ys);

  if (model === null) {
    return row.y;
  }

  return (
    model.slope *
      targetX +
    model.intercept
  );
}

function getPart1PhoneBlockPairs(
  row: Part1Row,
  expectedXValues: number[]
): Part1BlockPair[] {
  const pairs:
    Part1BlockPair[] = [];

  for (
    const expectedX
    of expectedXValues
  ) {
    const candidates: {
      distance: number;
      expectedX: number;
      actualX: number;
      actualY: number;
      baseY: number;
    }[] = [];

    for (
      const item
      of row.items
    ) {
      const actualX = item.x;

      const distance = Math.abs(
        actualX - expectedX
      );

      if (distance <= 25.0) {
        const baseY =
          predictPart1PhoneY(
            row,
            expectedX
          );

        candidates.push({
          distance,
          expectedX,
          actualX,
          actualY: item.y,
          baseY,
        });
      }
    }

    if (candidates.length > 0) {
      candidates.sort(
        (a, b) =>
          a.distance -
          b.distance
      );

      const best =
        candidates[0];

      pairs.push({
        expectedX:
          best.expectedX,
        actualX:
          best.actualX,
        actualY:
          best.actualY,
        baseY:
          best.baseY,
      });
    }
  }

  return pairs;
}

function buildPart1PhoneBlockGlobalModel(
  rowItems: Part1Row[],
  expectedXValues: number[]
): Part1BlockModel | null {
  const expectedXAll:
    number[] = [];

  const actualXAll:
    number[] = [];

  const rowIndexAll:
    number[] = [];

  const dyAll:
    number[] = [];

  for (
    let rowIndex = 0;
    rowIndex < rowItems.length;
    rowIndex += 1
  ) {
    const row =
      rowItems[rowIndex];

    const pairs =
      getPart1PhoneBlockPairs(
        row,
        expectedXValues
      );

    for (const pair of pairs) {
      expectedXAll.push(
        pair.expectedX
      );

      actualXAll.push(
        pair.actualX
      );

      rowIndexAll.push(
        rowIndex
      );

      dyAll.push(
        pair.actualY -
          pair.baseY
      );
    }
  }

  if (
    expectedXAll.length < 8
  ) {
    return null;
  }

  const xModel =
    linearFit(
      expectedXAll,
      actualXAll
    );

  const dyModel =
    linearFit(
      rowIndexAll,
      dyAll
    );

  if (
    xModel === null ||
    dyModel === null
  ) {
    return null;
  }

  return {
    xSlope:
      xModel.slope,

    xIntercept:
      xModel.intercept,

    dySlope:
      dyModel.slope,

    dyIntercept:
      dyModel.intercept,

    pairCount:
      expectedXAll.length,
  };
}
function predictPart1PhoneBlockPoint(
  row: Part1Row,
  rowIndex: number,
  expectedX: number,
  model: Part1BlockModel
): {
  x: number;
  y: number;
} {
  const actualX =
    model.xSlope *
      expectedX +
    model.xIntercept;

  const baseY =
    predictPart1PhoneY(
      row,
      expectedX
    );

  const dy =
    model.dySlope *
      rowIndex +
    model.dyIntercept;

  const actualY =
    baseY + dy;

  return {
    x: actualX,
    y: actualY,
  };
}
function roundPython(value: number): number {
  return numpyRound(value);
}

function measurePart1PhoneContrastFromGrayBuffer(
  grayBuffer: Uint8Array | number[],
  width: number,
  height: number,
  cxInput: number,
  cyInput: number
): number {
  const cx =
    roundPython(cxInput);

  const cy =
    roundPython(cyInput);

  const outerR = 21;

  const y1 =
    Math.max(
      0,
      cy - outerR
    );

  const y2 =
    Math.min(
      height,
      cy + outerR + 1
    );

  const x1 =
    Math.max(
      0,
      cx - outerR
    );

  const x2 =
    Math.min(
      width,
      cx + outerR + 1
    );

  let coreSum = 0;
  let coreCount = 0;

  let bgSum = 0;
  let bgCount = 0;

  for (
    let y = y1;
    y < y2;
    y += 1
  ) {
    for (
      let x = x1;
      x < x2;
      x += 1
    ) {
      const dx =
        x - cx;

      const dy =
        y - cy;

      const dist2 =
        dx * dx +
        dy * dy;

      const value =
        grayBuffer[
          y * width + x
        ];

      if (
        dist2 <= 7 * 7
      ) {
        coreSum += value;
        coreCount += 1;
      }

      if (
        dist2 >= 15 * 15 &&
        dist2 <= 21 * 21
      ) {
        bgSum += value;
        bgCount += 1;
      }
    }
  }

  if (
    coreCount === 0 ||
    bgCount === 0
  ) {
    return -999.0;
  }

  const coreMean =
    coreSum / coreCount;

  const bgMean =
    bgSum / bgCount;

  return (
    bgMean -
    coreMean
  );
}
type Part1Classification = {
  answer: "A" | "B" | "C" | "D" | null;
  status:
    | "ANSWER"
    | "REVIEW"
    | "BLANK";
  bestScore: number;
  secondScore: number;
  margin: number;
  bestIndex: number;
};

function classifyPart1Contrasts(
  contrasts: number[]
): Part1Classification {
  const bestContrastThreshold = 7.0;
  const marginThreshold = 4.0;

  const reviewR9Threshold = 7.5;
  const confirmR9Threshold = 30.0;

  const answerLetters = [
    "A",
    "B",
    "C",
    "D",
  ] as const;

  const order = [
    0, 1, 2, 3,
  ].sort(
    (a, b) =>
      contrasts[b] -
      contrasts[a]
  );

  const bestIndex =
    order[0];

  const secondIndex =
    order[1];

  const bestScore =
    contrasts[bestIndex];

  const secondScore =
    contrasts[secondIndex];

  const margin =
    bestScore -
    secondScore;

  const candidateAnswer =
    answerLetters[bestIndex];

  if (
    bestScore >=
      confirmR9Threshold
  ) {
    return {
      answer:
        candidateAnswer,
      status:
        "ANSWER",
      bestScore,
      secondScore,
      margin,
      bestIndex,
    };
  }

  if (
    bestScore >=
      reviewR9Threshold &&
    bestScore >=
      bestContrastThreshold &&
    margin >=
      marginThreshold
  ) {
    return {
      answer:
        candidateAnswer,
      status:
        "REVIEW",
      bestScore,
      secondScore,
      margin,
      bestIndex,
    };
  }

  return {
    answer: null,
    status: "BLANK",
    bestScore,
    secondScore,
    margin,
    bestIndex,
  };
}
type Part1QuestionResult = {
  questionNumber: number;
  answer: "A" | "B" | "C" | "D" | null;
  status:
    | "ANSWER"
    | "REVIEW"
    | "BLANK";
  contrasts: number[];
  bestScore: number;
  secondScore: number;
  margin: number;
  bestIndex: number;
  measurePoints: {
    x: number;
    y: number;
  }[];
};

type Part1NativeResult = {
  questions: Part1QuestionResult[];
  answers: (
    | "A"
    | "B"
    | "C"
    | "D"
    | null
  )[];
  statuses: (
    | "ANSWER"
    | "REVIEW"
    | "BLANK"
  )[];
  reviewQuestions: number[];
};
function buildPart1NativeResult(
  measureGroups: {
    blockIndex: number;
    rowIndex: number;
    points: {
      x: number;
      y: number;
    }[];
  }[],
  grayBuffer: Uint8Array | number[],
  width: number,
  height: number
): Part1NativeResult {
  const questions:
    Part1QuestionResult[] = [];

  const answers: (
    | "A"
    | "B"
    | "C"
    | "D"
    | null
  )[] = [];

  const statuses: (
    | "ANSWER"
    | "REVIEW"
    | "BLANK"
  )[] = [];

  const reviewQuestions:
    number[] = [];

  for (
    let groupIndex = 0;
    groupIndex < measureGroups.length;
    groupIndex += 1
  ) {
    const group =
      measureGroups[groupIndex];

    const questionNumber =
      groupIndex + 1;

    const contrasts =
      group.points.map(
        (point) =>
          measurePart1PhoneContrastFromGrayBuffer(
            grayBuffer,
            width,
            height,
            point.x,
            point.y
          )
      );

    const classification =
      classifyPart1Contrasts(
        contrasts
      );

    questions.push({
      questionNumber,
      answer:
        classification.answer,
      status:
        classification.status,
      contrasts,
      bestScore:
        classification.bestScore,
      secondScore:
        classification.secondScore,
      margin:
        classification.margin,
      bestIndex:
        classification.bestIndex,
      measurePoints:
        group.points.map(
          (point) => ({
            x: point.x,
            y: point.y,
          })
        ),
    });

    answers.push(
      classification.answer
    );

    statuses.push(
      classification.status
    );

    if (
      classification.status ===
      "REVIEW"
    ) {
      reviewQuestions.push(
        questionNumber
      );
    }
  }

  return {
    questions,
    answers,
    statuses,
    reviewQuestions,
  };
}
export default function OpenCVTestScreen() {
  const [result, setResult] =
    useState("Chưa kiểm tra");

  const [warpedUri, setWarpedUri] =
    useState<string | null>(null);

  async function testPart1Hough() {
    try {
      setResult(
        "Đang warp và chạy HoughCircles Part I..."
      );

      setWarpedUri(null);

      const asset =
        Asset.fromModule(TEST_IMAGE);

      await asset.downloadAsync();

      const sourceUri =
        asset.localUri ?? asset.uri;

      if (!sourceUri) {
        throw new Error(
          "Không lấy được URI ảnh test."
        );
      }

      const base64 =
        await FileSystem.readAsStringAsync(
          sourceUri,
          {
            encoding:
              FileSystem.EncodingType.Base64,
          }
        );

      const src =
        OpenCV.base64ToMat(base64);

      const srcInfo =
        OpenCV.toJSValue(src);

      // ==========================================
      // 1. WARP MOET 1542 x 2226
      // ==========================================

      const srcTL =
        OpenCV.createObject(
          ObjectType.Point2f,
          106,
          275.5
        );

      const srcTR =
        OpenCV.createObject(
          ObjectType.Point2f,
          771.5,
          292
        );

      const srcBR =
        OpenCV.createObject(
          ObjectType.Point2f,
          785.5,
          1251
        );

      const srcBL =
        OpenCV.createObject(
          ObjectType.Point2f,
          109.5,
          1260
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

      // ==========================================
      // 2. GRAYSCALE
      // Python:
      // cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
      // ==========================================

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
const grayBufferInfo =
  OpenCV.matToBuffer(
    gray,
    "uint8"
  );

const grayBuffer =
  grayBufferInfo.buffer;

console.log(
  "GRAY_BUFFER:",
  grayBufferInfo.rows,
  grayBufferInfo.cols,
  grayBufferInfo.channels,
  grayBuffer.length
);
      // ==========================================
      // 3. CLAHE
      // Python production:
      // clahe = cv2.createCLAHE(
      //   clipLimit=2.0,
      //   tileGridSize=(8, 8)
      // )
      // enhanced = clahe.apply(gray)
      // ==========================================

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
      // ==========================================
      // 3. ROI PART I
      // Python:
      // x = 20..1520
      // y = 735..1210
      //
      // CLAHE production chưa có trong wrapper 0.4.8.
      // Test này cố ý chưa dùng CLAHE.
      // ==========================================

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

      // ==========================================
      // 4. GAUSSIAN BLUR
      // Python:
      // GaussianBlur(roi, (5,5), 1.2)
      // ==========================================

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

      // ==========================================
      // 5. HOUGH CIRCLES
      //
      // Python production:
      // dp=1
      // minDist=17
      // param1=100
      // param2=18
      // minRadius=7
      // maxRadius=14
      //
      // Wrapper 0.4.8 không expose min/max radius.
      // ==========================================

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

      const circlesInfo =
        OpenCV.toJSValue(circles);

      const detectedCount =
        circlesInfo.rows *
        circlesInfo.cols;

      // ==========================================
      // 6. SAVE WARP IMAGE FOR VISUAL CHECK
      // ==========================================
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
const detectedPart1: Part1Circle[] =
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

const part1Rows =
  buildQuestionRows(
    detectedPart1
  );

const part1RowItems =
  assignCirclesToRows(
    detectedPart1,
    part1Rows
  );
const part1BlockX = [
  [128.0, 196.0, 264.0, 332.0],
  [496.0, 562.0, 626.0, 692.0],
  [860.0, 924.0, 988.0, 1052.0],
  [1220.0, 1284.0, 1348.0, 1412.0],
];

const part1BlockModels =
  part1BlockX.map(
    (blockX) =>
      buildPart1PhoneBlockGlobalModel(
        part1RowItems,
        blockX
      )
  );

for (
  let blockIndex = 0;
  blockIndex < part1BlockModels.length;
  blockIndex += 1
) {
  console.log(
    `PART1_BLOCK_MODEL_${blockIndex + 1}:`,
    JSON.stringify(
      part1BlockModels[blockIndex]
    )
  );
}
const part1MeasurePoints: {
  blockIndex: number;
  rowIndex: number;
  points: {
    x: number;
    y: number;
  }[];
}[] = [];

for (
  let blockIndex = 0;
  blockIndex < part1BlockX.length;
  blockIndex += 1
) {
  const blockModel =
    part1BlockModels[blockIndex];

  if (blockModel === null) {
    continue;
  }

  const blockX =
    part1BlockX[blockIndex];

  for (
    let rowIndex = 0;
    rowIndex < part1RowItems.length;
    rowIndex += 1
  ) {
    const row =
      part1RowItems[rowIndex];

    const points =
      blockX.map((expectedX) =>
        predictPart1PhoneBlockPoint(
          row,
          rowIndex,
          expectedX,
          blockModel
        )
      );

    part1MeasurePoints.push({
      blockIndex,
      rowIndex,
      points,
    });

    console.log(
      `PART1_MEASURE_B${blockIndex + 1}_R${rowIndex + 1}:`,
      JSON.stringify(points)
    );
  }
}

console.log(
  "PART1_MEASURE_GROUP_COUNT:",
  part1MeasurePoints.length
);

console.log(
  "PART1_MEASURE_POINT_COUNT:",
  part1MeasurePoints.reduce(
    (total, group) =>
      total + group.points.length,
    0
  )
);
let part1ContrastCount = 0;

for (
  const group of part1MeasurePoints
) {
  const contrasts =
    group.points.map(
      (point) =>
        measurePart1PhoneContrastFromGrayBuffer(
          grayBuffer,
          WARP_WIDTH,
          WARP_HEIGHT,
          point.x,
          point.y
        )
    );

  part1ContrastCount +=
    contrasts.length;

  console.log(
    `PART1_CONTRAST_B${group.blockIndex + 1}_R${group.rowIndex + 1}:`,
    JSON.stringify(contrasts)
  );
}

console.log(
  "PART1_CONTRAST_COUNT:",
  part1ContrastCount
);
const part1NativeResult =
  buildPart1NativeResult(
    part1MeasurePoints,
    grayBuffer,
    WARP_WIDTH,
    WARP_HEIGHT
  );
const part1ModuleBlockModels =
  buildPart1BlockModelsModule(
    part1RowItems
  );

const part1ModuleMeasurePoints =
  buildPart1MeasureGroupsModule(
    part1RowItems,
    part1ModuleBlockModels
  );

const part1ModuleResult =
  buildPart1NativeResultModule(
    part1ModuleMeasurePoints,
    grayBuffer,
    WARP_WIDTH,
    WARP_HEIGHT
  );

console.log(
  "PART1_MODULE_QUESTION_COUNT:",
  part1ModuleResult.questions.length
);

console.log(
  "PART1_MODULE_REVIEW_QUESTIONS:",
  JSON.stringify(
    part1ModuleResult.reviewQuestions
  )
);

console.log(
  "PART1_MODULE_ANSWERS:",
  JSON.stringify(
    part1ModuleResult.answers
  )
);

console.log(
  "PART1_MODULE_STATUSES:",
  JSON.stringify(
    part1ModuleResult.statuses
  )
);

console.log(
  "PART1_MODULE_MATCH_OLD:",
  JSON.stringify(
    part1ModuleResult.answers
  ) ===
    JSON.stringify(
      part1NativeResult.answers
    ) &&
  JSON.stringify(
    part1ModuleResult.statuses
  ) ===
    JSON.stringify(
      part1NativeResult.statuses
    ) &&
  JSON.stringify(
    part1ModuleResult.reviewQuestions
  ) ===
    JSON.stringify(
      part1NativeResult.reviewQuestions
    )
);
console.log(
  "PART1_NATIVE_QUESTION_COUNT:",
  part1NativeResult.questions.length
);

console.log(
  "PART1_NATIVE_ANSWER_COUNT:",
  part1NativeResult.answers.length
);

console.log(
  "PART1_NATIVE_STATUS_COUNT:",
  part1NativeResult.statuses.length
);

console.log(
  "PART1_NATIVE_REVIEW_QUESTIONS:",
  JSON.stringify(
    part1NativeResult.reviewQuestions
  )
);

console.log(
  "PART1_NATIVE_Q07:",
  JSON.stringify(
    part1NativeResult.questions[6]
  )
);
let part1QuestionNumber = 1;

for (
  const group of part1MeasurePoints
) {
  const contrasts =
    group.points.map(
      (point) =>
        measurePart1PhoneContrastFromGrayBuffer(
          grayBuffer,
          WARP_WIDTH,
          WARP_HEIGHT,
          point.x,
          point.y
        )
    );

  const classification =
    classifyPart1Contrasts(
      contrasts
    );

  console.log(
    `PART1_CLASSIFY_Q${String(
      part1QuestionNumber
    ).padStart(2, "0")}:`,
    JSON.stringify({
      answer:
        classification.answer,
      status:
        classification.status,
      bestScore:
        classification.bestScore,
      secondScore:
        classification.secondScore,
      margin:
        classification.margin,
      bestIndex:
        classification.bestIndex,
    })
  );

  part1QuestionNumber += 1;
}
const completedPart1Rows =
  completePart1Rows(
    part1RowItems
  );

const recoveredPart1Count =
  completedPart1Rows.reduce(
    (total, row) =>
      total +
      row.items.filter(
        (item) => item.recovered
      ).length,
    0
  );

console.log(
  "PART1_COMPLETED_ROW_COUNT:",
  completedPart1Rows.length
);

console.log(
  "PART1_COMPLETED_TOTAL_ITEMS:",
  completedPart1Rows.reduce(
    (total, row) =>
      total + row.items.length,
    0
  )
);

console.log(
  "PART1_RECOVERED_COUNT:",
  recoveredPart1Count
);

for (
  let rowIndex = 0;
  rowIndex < completedPart1Rows.length;
  rowIndex += 1
) {
  const row =
    completedPart1Rows[rowIndex];

  console.log(
    `PART1_COMPLETED_ROW_${rowIndex + 1}:`,
    "count=",
    row.items.length,
    "recovered=",
    row.items.filter(
      (item) => item.recovered
    ).length
  );
}
console.log(
  "PART1_ROW_COUNT:",
  part1Rows.length
);

for (
  let rowIndex = 0;
  rowIndex < part1RowItems.length;
  rowIndex += 1
) {
  console.log(
    `PART1_ROW_${rowIndex + 1}:`,
    "y=",
    part1RowItems[rowIndex].y,
    "count=",
    part1RowItems[rowIndex].items.length
  );
}
for (const rowNumber of [3, 8, 9]) {
  const row =
    part1RowItems[rowNumber - 1];

  console.log(
    `ANDROID_ROW_${rowNumber}_ITEMS:`,
    JSON.stringify(
      row.items.map((item) => ({
        x: item.x,
        y: item.y,
      }))
    )
  );
}
console.log(
  "CIRCLES_BUFFER:",
  circlesBuffer.rows,
  circlesBuffer.cols,
  circlesBuffer.channels,
  circleData.length
);

const circleLogChunkSize = 10;

for (
  let start = 0;
  start < circleList.length;
  start += circleLogChunkSize
) {
  const chunkIndex =
    Math.floor(start / circleLogChunkSize);

  console.log(
    `CIRCLES_XYR_CHUNK_${chunkIndex}:`,
    JSON.stringify(
      circleList.slice(
        start,
        start + circleLogChunkSize
      )
    )
  );
}
      const warpedInfo =
        OpenCV.toJSValue(
          warped,
          "jpeg"
        );

      if (!FileSystem.cacheDirectory) {
        throw new Error(
          "Không xác định được cacheDirectory."
        );
      }

      const outputUri =
        `${FileSystem.cacheDirectory}` +
        `moet_part1_hough_${Date.now()}.jpg`;

      await FileSystem.writeAsStringAsync(
        outputUri,
        warpedInfo.base64,
        {
          encoding:
            FileSystem.EncodingType.Base64,
        }
      );

      setWarpedUri(outputUri);

      setResult(
        [
          "PART I HOUGH LOCAL ĐÃ CHẠY",
          "",
          `Ảnh gốc: ${srcInfo.cols} x ${srcInfo.rows}`,
          `Warp: ${WARP_WIDTH} x ${WARP_HEIGHT}`,
          `ROI: ${ROI_WIDTH} x ${ROI_HEIGHT}`,
          "",
          `Hough rows: ${circlesInfo.rows}`,
          `Hough cols: ${circlesInfo.cols}`,
          `Circle count tạm tính: ${detectedCount}`,
          `Hough type: ${circlesInfo.type}`,
          "",
          "LƯU Ý:",
          "- Đã có CLAHE 2.0, tile 8x8.",
          "- Đã giới hạn radius 7..14.",
          "- Chưa dùng kết quả này để chấm bài.",
        ].join("\n")
      );

      OpenCV.clearBuffers();
    } catch (error) {
      console.log(
        "PART1 HOUGH LOCAL ERROR:",
        error
      );

      try {
        OpenCV.clearBuffers();
      } catch {}

      setResult(
        `Part I Hough lỗi: ${String(error)}`
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "OpenCV Test",
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          MOET Part I Local
        </Text>

        <Text style={styles.result}>
          {result}
        </Text>

        <Pressable
          style={styles.button}
          onPress={testPart1Hough}
        >
          <Text style={styles.buttonText}>
            Test Hough Part I
          </Text>
        </Pressable>

        {warpedUri ? (
          <View style={styles.imageSection}>
            <Text style={styles.imageTitle}>
              Warp dùng để test
            </Text>

            <Image
              source={{
                uri: warpedUri,
              }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },

  content: {
    padding: 20,
    paddingBottom: 80,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    color: "#111827",
  },

  result: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
    color: "#374151",
  },

  button: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  imageSection: {
    marginTop: 24,
  },

  imageTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111827",
  },

  image: {
    width: "100%",
    aspectRatio:
      WARP_WIDTH / WARP_HEIGHT,
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
  },
});