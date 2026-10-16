export type MobileAnswerKey = {
  examCode: string;
  part1: string[];
  part2: {
    a: boolean;
    b: boolean;
    c: boolean;
    d: boolean;
  }[];
  part3: string[];
};

export function decodeAnswerQr(
  text: string
): MobileAnswerKey[] {
  const value = String(text ?? "").trim();

  if (!value.startsWith("MHP1|")) {
    throw new Error(
      "QR không phải mã đáp án MATH-HUY PHUNG phiên bản MHP1."
    );
  }

  const blocks = value.split("|").slice(1);

  if (!blocks.length) {
    throw new Error("QR không chứa bộ đáp án.");
  }

  const keys: MobileAnswerKey[] = blocks.map((block) => {
    const parts = block.split(":");

    if (parts.length !== 4) {
      throw new Error(
        "Cấu trúc dữ liệu QR không hợp lệ."
      );
    }

    const [
      examCode,
      part1Text,
      part2Text,
      part3Text,
    ] = parts;

    if (!examCode) {
      throw new Error("QR có mã đề rỗng.");
    }

    const part1 = part1Text.split("");

    const part2 = part2Text
      .split(",")
      .filter(Boolean)
      .map((value) => {
        if (
          value.length !== 4 ||
          !/^[01]{4}$/.test(value)
        ) {
          throw new Error(
            `Mã đề ${examCode}: dữ liệu Phần II không hợp lệ.`
          );
        }

        return {
          a: value[0] === "1",
          b: value[1] === "1",
          c: value[2] === "1",
          d: value[3] === "1",
        };
      });

    const part3 = part3Text
  ? part3Text.split(",").map((value) => value.trim())
  : [];

    return {
      examCode,
      part1,
      part2,
      part3,
    };
  });

  return keys;
}