export type Part1Answer =
  | "A"
  | "B"
  | "C"
  | "D"
  | null;

export type Part1Status =
  | "ANSWER"
  | "REVIEW"
  | "BLANK";

export type Part1Circle = {
  x: number;
  y: number;
  r: number;
};

export type Part1Cluster = {
  center: number;
  count: number;
  values: number[];
};

export type Part1Row = {
  y: number;
  items: Part1Circle[];
};

export type LinearModel = {
  slope: number;
  intercept: number;
};

export type Part1BlockPair = {
  expectedX: number;
  actualX: number;
  actualY: number;
  baseY: number;
};

export type Part1BlockModel = {
  xSlope: number;
  xIntercept: number;
  dySlope: number;
  dyIntercept: number;
  pairCount: number;
};

export type Part1MeasurePoint = {
  x: number;
  y: number;
};

export type Part1MeasureGroup = {
  blockIndex: number;
  rowIndex: number;
  points: Part1MeasurePoint[];
};

export type Part1Classification = {
  answer: Part1Answer;
  status: Part1Status;
  bestScore: number;
  secondScore: number;
  margin: number;
  bestIndex: number;
};

export type Part1QuestionResult = {
  questionNumber: number;
  answer: Part1Answer;
  status: Part1Status;
  contrasts: number[];
  bestScore: number;
  secondScore: number;
  margin: number;
  bestIndex: number;
  measurePoints: Part1MeasurePoint[];
};

export type Part1NativeResult = {
  questions: Part1QuestionResult[];
  answers: Part1Answer[];
  statuses: Part1Status[];
  reviewQuestions: number[];
};


/*
 * MOET 2025 Part I phone-production X grid.
 *
 * Đây là row_x production hiện hành.
 * Không dùng bộ EXPECTED_ROW_X cũ của LAB.
 */
export const PART1_ROW_X = [
  128.0,
  196.0,
  264.0,
  332.0,

  496.0,
  562.0,
  626.0,
  692.0,

  860.0,
  924.0,
  988.0,
  1052.0,

  1220.0,
  1284.0,
  1348.0,
  1412.0,
] as const;


/*
 * 4 block, mỗi block 4 đáp án A/B/C/D.
 */
export const PART1_BLOCK_X = [
  [
    128.0,
    196.0,
    264.0,
    332.0,
  ],
  [
    496.0,
    562.0,
    626.0,
    692.0,
  ],
  [
    860.0,
    924.0,
    988.0,
    1052.0,
  ],
  [
    1220.0,
    1284.0,
    1348.0,
    1412.0,
  ],
] as const;


/*
 * Anchor dùng riêng để fit slope Y
 * của từng hàng Part I phone.
 *
 * Production bỏ block đầu và dùng
 * 12 bubble từ block 2..4.
 */
export const PART1_Y_ANCHOR_X = [
  496.0,
  562.0,
  626.0,
  692.0,

  860.0,
  924.0,
  988.0,
  1052.0,

  1220.0,
  1284.0,
  1348.0,
  1412.0,
] as const;


/*
 * Các threshold production đã LOCK.
 */
export const PART1_ROW_CLUSTER_TOLERANCE =
  7.0;

export const PART1_ROW_MIN_COUNT =
  8;

export const PART1_Y_MATCH_TOLERANCE =
  20.0;

export const PART1_BLOCK_PAIR_TOLERANCE =
  25.0;

export const PART1_BEST_CONTRAST_THRESHOLD =
  7.0;

export const PART1_MARGIN_THRESHOLD =
  4.0;

export const PART1_REVIEW_R9_THRESHOLD =
  7.5;

export const PART1_CONFIRM_R9_THRESHOLD =
  30.0;


/*
 * Python / NumPy-style round:
 * ties-to-even.
 *
 * Hough coordinates trong pipeline này
 * đều không âm.
 */
export function numpyRound(
  value: number
): number {
  const floorValue =
    Math.floor(value);

  const fraction =
    value - floorValue;

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


export function mean(
  values: number[]
): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length
  );
}


export function clusterValues(
  inputValues: number[],
  tolerance =
    PART1_ROW_CLUSTER_TOLERANCE
): Part1Cluster[] {
  if (
    inputValues.length === 0
  ) {
    return [];
  }

  const values =
    inputValues
      .map(
        (value) =>
          Number(value)
      )
      .sort(
        (a, b) =>
          a - b
      );

  const groups: number[][] = [
    [values[0]],
  ];

  for (
    const value
    of values.slice(1)
  ) {
    const currentGroup =
      groups[
        groups.length - 1
      ];

    const currentMean =
      mean(
        currentGroup
      );

    if (
      Math.abs(
        value -
          currentMean
      ) <= tolerance
    ) {
      currentGroup.push(
        value
      );
    } else {
      groups.push(
        [value]
      );
    }
  }

  return groups.map(
    (group) => ({
      center:
        mean(group),

      count:
        group.length,

      values:
        group,
    })
  );
}


/*
 * STEP07-compatible row clustering.
 */
export function buildQuestionRows(
  detected: Part1Circle[]
): Part1Cluster[] {
  let yClusters =
    clusterValues(
      detected.map(
        (item) =>
          item.y
      ),
      PART1_ROW_CLUSTER_TOLERANCE
    );

  yClusters =
    yClusters.filter(
      (item) =>
        item.count >=
        PART1_ROW_MIN_COUNT
    );

  yClusters.sort(
    (a, b) =>
      a.center -
      b.center
  );

  return yClusters;
}


export function assignCirclesToRows(
  detected: Part1Circle[],
  rows: Part1Cluster[]
): Part1Row[] {
  const rowItems:
    Part1Row[] = [];

  for (
    const row
    of rows
  ) {
    const cy =
      row.center;

    const items =
      detected
        .filter(
          (item) =>
            Math.abs(
              item.y -
                cy
            ) <=
            PART1_ROW_CLUSTER_TOLERANCE
        )
        .sort(
          (a, b) =>
            a.x -
            b.x
        );

    rowItems.push({
      y: cy,
      items,
    });
  }

  return rowItems;
}


export function linearFit(
  xs: number[],
  ys: number[]
): LinearModel | null {
  if (
    xs.length !==
      ys.length ||
    xs.length < 2
  ) {
    return null;
  }

  const meanX =
    mean(xs);

  const meanY =
    mean(ys);

  let numerator = 0;

  let denominator = 0;

  for (
    let i = 0;
    i < xs.length;
    i += 1
  ) {
    const dx =
      xs[i] -
      meanX;

    numerator +=
      dx *
      (
        ys[i] -
        meanY
      );

    denominator +=
      dx *
      dx;
  }

  if (
    denominator === 0
  ) {
    return null;
  }

  const slope =
    numerator /
    denominator;

  const intercept =
    meanY -
    slope *
      meanX;

  return {
    slope,
    intercept,
  };
}


/*
 * Production:
 *
 * - dùng 12 anchor X từ block 2..4;
 * - mỗi anchor chọn bubble chưa dùng gần nhất;
 * - chỉ nhận nếu distance <= 20;
 * - nếu có dưới 4 điểm thì fallback row.y;
 * - nếu đủ thì fit y = slope*x + intercept.
 */
export function predictPart1PhoneY(
  row: Part1Row,
  targetX: number
): number {
  const xs:
    number[] = [];

  const ys:
    number[] = [];

  const used =
    new Set<number>();

  for (
    const expectedX
    of PART1_Y_ANCHOR_X
  ) {
    let bestIndex:
      number | null =
        null;

    let bestDistance:
      number | null =
        null;

    for (
      let i = 0;
      i <
      row.items.length;
      i += 1
    ) {
      if (
        used.has(i)
      ) {
        continue;
      }

      const distance =
        Math.abs(
          row.items[i].x -
            expectedX
        );

      if (
        bestDistance ===
          null ||
        distance <
          bestDistance
      ) {
        bestDistance =
          distance;

        bestIndex =
          i;
      }
    }

    if (
      bestIndex !== null &&
      bestDistance !== null &&
      bestDistance <=
        PART1_Y_MATCH_TOLERANCE
    ) {
      used.add(
        bestIndex
      );

      xs.push(
        row.items[
          bestIndex
        ].x
      );

      ys.push(
        row.items[
          bestIndex
        ].y
      );
    }
  }

  if (
    xs.length < 4
  ) {
    return row.y;
  }

  const model =
    linearFit(
      xs,
      ys
    );

  if (
    model === null
  ) {
    return row.y;
  }

  return (
    model.slope *
      targetX +
    model.intercept
  );
}


/*
 * Production block-pair collection:
 *
 * - xét từng expected X;
 * - candidate phải cách expected X <= 25 px;
 * - baseY lấy từ predictPart1PhoneY();
 * - nếu nhiều candidate thì lấy X gần nhất.
 */
export function getPart1PhoneBlockPairs(
  row: Part1Row,
  expectedXValues:
    readonly number[]
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
      const actualX =
        item.x;

      const distance =
        Math.abs(
          actualX -
            expectedX
        );

      if (
        distance <=
        PART1_BLOCK_PAIR_TOLERANCE
      ) {
        const baseY =
          predictPart1PhoneY(
            row,
            expectedX
          );

        candidates.push({
          distance,
          expectedX,
          actualX,
          actualY:
            item.y,
          baseY,
        });
      }
    }

    if (
      candidates.length >
      0
    ) {
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


/*
 * Production global geometry
 * cho một block 4 bubble.
 *
 * Thu các pair của cả 10 hàng:
 *
 * expectedX -> actualX
 * rowIndex  -> actualY - baseY
 *
 * Cần tối thiểu 8 pair.
 */
export function buildPart1PhoneBlockGlobalModel(
  rowItems: Part1Row[],
  expectedXValues:
    readonly number[]
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
    rowIndex <
      rowItems.length;
    rowIndex += 1
  ) {
    const row =
      rowItems[
        rowIndex
      ];

    const pairs =
      getPart1PhoneBlockPairs(
        row,
        expectedXValues
      );

    for (
      const pair
      of pairs
    ) {
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
    expectedXAll.length <
    8
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


/*
 * Dự đoán tọa độ đo thực tế
 * của một bubble trong block.
 */
export function predictPart1PhoneBlockPoint(
  row: Part1Row,
  rowIndex: number,
  expectedX: number,
  model: Part1BlockModel
): Part1MeasurePoint {
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
    baseY +
    dy;

  return {
    x: actualX,
    y: actualY,
  };
}


/*
 * Tạo 4 block model production.
 */
export function buildPart1BlockModels(
  rowItems: Part1Row[]
): (
  Part1BlockModel | null
)[] {
  return PART1_BLOCK_X.map(
    (blockX) =>
      buildPart1PhoneBlockGlobalModel(
        rowItems,
        blockX
      )
  );
}


/*
 * Sinh measure points theo đúng thứ tự
 * production:
 *
 * block 1 -> Q01..Q10
 * block 2 -> Q11..Q20
 * block 3 -> Q21..Q30
 * block 4 -> Q31..Q40
 *
 * Nếu một block model = null thì dùng
 * legacy geometry:
 *
 * X = expected X
 * Y = predictPart1PhoneY(...)
 */
export function buildPart1MeasureGroups(
  rowItems: Part1Row[],
  blockModels:
    (
      Part1BlockModel |
      null
    )[]
): Part1MeasureGroup[] {
  const groups:
    Part1MeasureGroup[] = [];

  for (
    let blockIndex = 0;
    blockIndex <
      PART1_BLOCK_X.length;
    blockIndex += 1
  ) {
    const blockX =
      PART1_BLOCK_X[
        blockIndex
      ];

    const blockModel =
      blockModels[
        blockIndex
      ] ?? null;

    for (
      let rowIndex = 0;
      rowIndex <
        rowItems.length;
      rowIndex += 1
    ) {
      const row =
        rowItems[
          rowIndex
        ];

      const points =
        blockX.map(
          (expectedX) => {
            if (
              blockModel !==
              null
            ) {
              return (
                predictPart1PhoneBlockPoint(
                  row,
                  rowIndex,
                  expectedX,
                  blockModel
                )
              );
            }

            return {
              x:
                Number(
                  expectedX
                ),

              y:
                predictPart1PhoneY(
                  row,
                  expectedX
                ),
            };
          }
        );

      groups.push({
        blockIndex,
        rowIndex,
        points,
      });
    }
  }

  return groups;
}


/*
 * Production dùng Python round().
 *
 * Với tọa độ bubble dương,
 * numpyRound() ở đây khớp
 * ties-to-even cần thiết.
 */
export function roundPython(
  value: number
): number {
  return numpyRound(
    value
  );
}


/*
 * Production Part I contrast:
 *
 * core:
 *     r <= 7
 *
 * background ring:
 *     15 <= r <= 21
 *
 * contrast:
 *     mean(background)
 *       -
 *     mean(core)
 */
export function measurePart1PhoneContrastFromGrayBuffer(
  grayBuffer:
    Uint8Array |
    number[],
  width: number,
  height: number,
  cxInput: number,
  cyInput: number
): number {
  const cx =
    roundPython(
      cxInput
    );

  const cy =
    roundPython(
      cyInput
    );

  const outerR =
    21;

  const y1 =
    Math.max(
      0,
      cy -
        outerR
    );

  const y2 =
    Math.min(
      height,
      cy +
        outerR +
        1
    );

  const x1 =
    Math.max(
      0,
      cx -
        outerR
    );

  const x2 =
    Math.min(
      width,
      cx +
        outerR +
        1
    );

  let coreSum =
    0;

  let coreCount =
    0;

  let bgSum =
    0;

  let bgCount =
    0;

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
          y *
            width +
          x
        ];

      if (
        dist2 <=
        7 * 7
      ) {
        coreSum +=
          value;

        coreCount +=
          1;
      }

      if (
        dist2 >=
          15 * 15 &&
        dist2 <=
          21 * 21
      ) {
        bgSum +=
          value;

        bgCount +=
          1;
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
    coreSum /
    coreCount;

  const bgMean =
    bgSum /
    bgCount;

  return (
    bgMean -
    coreMean
  );
}


/*
 * Review-aware Part I classifier.
 *
 * >= 30:
 *     ANSWER
 *
 * 7.5 <= score < 30:
 *     REVIEW
 *     nhưng chỉ khi base detector:
 *       score >= 7
 *       margin >= 4
 *
 * còn lại:
 *     BLANK
 *
 * REVIEW giữ candidate A/B/C/D,
 * nhưng caller tuyệt đối không được
 * auto-grade trạng thái REVIEW.
 */
export function classifyPart1Contrasts(
  contrasts: number[]
): Part1Classification {
  const answerLetters = [
    "A",
    "B",
    "C",
    "D",
  ] as const;

  const order = [
    0,
    1,
    2,
    3,
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
    contrasts[
      bestIndex
    ];

  const secondScore =
    contrasts[
      secondIndex
    ];

  const margin =
    bestScore -
    secondScore;

  const candidateAnswer =
    answerLetters[
      bestIndex
    ];

  if (
    bestScore >=
    PART1_CONFIRM_R9_THRESHOLD
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
      PART1_REVIEW_R9_THRESHOLD &&
    bestScore >=
      PART1_BEST_CONTRAST_THRESHOLD &&
    margin >=
      PART1_MARGIN_THRESHOLD
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

    status:
      "BLANK",

    bestScore,

    secondScore,

    margin,

    bestIndex,
  };
}


/*
 * Gom kết quả 40 câu Part I.
 *
 * measureGroups phải theo đúng thứ tự:
 *
 * B1R1..B1R10
 * B2R1..B2R10
 * B3R1..B3R10
 * B4R1..B4R10
 */
export function buildPart1NativeResult(
  measureGroups:
    Part1MeasureGroup[],
  grayBuffer:
    Uint8Array |
    number[],
  width: number,
  height: number
): Part1NativeResult {
  const questions:
    Part1QuestionResult[] =
      [];

  const answers:
    Part1Answer[] =
      [];

  const statuses:
    Part1Status[] =
      [];

  const reviewQuestions:
    number[] =
      [];

  for (
    let groupIndex = 0;
    groupIndex <
      measureGroups.length;
    groupIndex += 1
  ) {
    const group =
      measureGroups[
        groupIndex
      ];

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
            x:
              point.x,

            y:
              point.y,
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