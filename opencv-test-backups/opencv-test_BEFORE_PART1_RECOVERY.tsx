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

const TEST_IMAGE =
  require("../assets/omr-test/MOET_PHONE_REAL_01.jpg");

const WARP_WIDTH = 1542;
const WARP_HEIGHT = 2226;

const ROI_X = 20;
const ROI_Y = 735;
const ROI_WIDTH = 1500;
const ROI_HEIGHT = 475;
type Part1Circle = {
  x: number;
  y: number;
  r: number;
};

type Part1Cluster = {
  center: number;
  count: number;
  values: number[];
};

type Part1Row = {
  y: number;
  items: Part1Circle[];
};

function numpyRound(value: number): number {
  const floorValue = Math.floor(value);
  const fraction = value - floorValue;

  if (fraction < 0.5) {
    return floorValue;
  }

  if (fraction > 0.5) {
    return floorValue + 1;
  }

  return floorValue % 2 === 0
    ? floorValue
    : floorValue + 1;
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
}

function clusterValues(
  inputValues: number[],
  tolerance = 7
): Part1Cluster[] {
  if (inputValues.length === 0) {
    return [];
  }

  const values = inputValues
    .map((value) => Number(value))
    .sort((a, b) => a - b);

  const groups: number[][] = [
    [values[0]],
  ];

  for (const value of values.slice(1)) {
    const currentGroup =
      groups[groups.length - 1];

    const currentMean =
      mean(currentGroup);

    if (
      Math.abs(
        value - currentMean
      ) <= tolerance
    ) {
      currentGroup.push(value);
    } else {
      groups.push([value]);
    }
  }

  return groups.map((group) => ({
    center: mean(group),
    count: group.length,
    values: group,
  }));
}

function buildQuestionRows(
  detected: Part1Circle[]
): Part1Cluster[] {
  let yClusters = clusterValues(
    detected.map(
      (item) => item.y
    ),
    7
  );

  yClusters = yClusters.filter(
    (item) => item.count >= 8
  );

  yClusters.sort(
    (a, b) =>
      a.center - b.center
  );

  return yClusters;
}

function assignCirclesToRows(
  detected: Part1Circle[],
  rows: Part1Cluster[]
): Part1Row[] {
  const rowItems: Part1Row[] = [];

  for (const row of rows) {
    const cy = row.center;

    const items = detected
      .filter(
        (item) =>
          Math.abs(
            item.y - cy
          ) <= 7
      )
      .sort(
        (a, b) =>
          a.x - b.x
      );

    rowItems.push({
      y: cy,
      items,
    });
  }

  return rowItems;
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