const fs = require("fs");
const path = require("path");

const root = path.join(
  process.cwd(),
  "node_modules",
  "react-native-fast-opencv"
);

const cppFile = path.join(
  root,
  "cpp",
  "FOCV_Function.cpp"
);

if (!fs.existsSync(cppFile)) {
  console.log("[fast-opencv patch] package not found, skip.");
  process.exit(0);
}

let cpp = fs.readFileSync(cppFile, "utf8");

if (
  cpp.includes("auto minRadius = args.asNumber(8);") &&
  cpp.includes("auto maxRadius = args.asNumber(9);")
) {
  console.log("[fast-opencv patch] C++ HoughCircles already patched.");
} else {
  const start =
    '      case hashString("HoughCircles", 12): {';

  const end =
    '      case hashString("HoughLines", 10): {';

  const startIndex = cpp.indexOf(start);
  const endIndex = cpp.indexOf(end);

  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error(
      "[fast-opencv patch] Cannot locate HoughCircles block."
    );
  }

  const replacement = `      case hashString("HoughCircles", 12): {
        auto image = args.asMatPtr(1);
        auto circles = args.asMatPtr(2);
        auto method = args.asNumber(3);
        auto dp = args.asNumber(4);
        auto minDist = args.asNumber(5);

        if (count > 6) {
          auto param1 = args.asNumber(6);

          if (count > 7) {
            auto param2 = args.asNumber(7);

            if (count > 9) {
              auto minRadius = args.asNumber(8);
              auto maxRadius = args.asNumber(9);

              cv::HoughCircles(
                  *image,
                  *circles,
                  method,
                  dp,
                  minDist,
                  param1,
                  param2,
                  minRadius,
                  maxRadius
              );
              break;
            }

            cv::HoughCircles(
                *image,
                *circles,
                method,
                dp,
                minDist,
                param1,
                param2
            );
            break;
          }

          cv::HoughCircles(
              *image,
              *circles,
              method,
              dp,
              minDist,
              param1
          );
          break;
        }

        cv::HoughCircles(
            *image,
            *circles,
            method,
            dp,
            minDist
        );
      } break;
`;

  cpp =
    cpp.substring(0, startIndex) +
    replacement +
    cpp.substring(endIndex);

  fs.writeFileSync(cppFile, cpp, "utf8");

  console.log(
    "[fast-opencv patch] C++ HoughCircles patched with minRadius/maxRadius."
  );
}

const typeFiles = [
  path.join(
    root,
    "src",
    "functions",
    "ImageProcessing",
    "Feature.ts"
  ),
  path.join(
    root,
    "lib",
    "typescript",
    "module",
    "src",
    "functions",
    "ImageProcessing",
    "Feature.d.ts"
  ),
  path.join(
    root,
    "lib",
    "typescript",
    "commonjs",
    "src",
    "functions",
    "ImageProcessing",
    "Feature.d.ts"
  ),
];

for (const file of typeFiles) {
  if (!fs.existsSync(file)) {
    console.log(
      "[fast-opencv patch] type file not found:",
      file
    );
    continue;
  }

  let text = fs.readFileSync(file, "utf8");

  if (
    text.includes("minRadius?: number") &&
    text.includes("maxRadius?: number")
  ) {
    console.log(
      "[fast-opencv patch] typings already patched:",
      file
    );
    continue;
  }

    const regex =
    /(invoke\(\s*name:\s*'HoughCircles'[\s\S]*?param2\?\s*:\s*number)(\s*\)\s*:\s*void;)/;

  if (!regex.test(text)) {
    throw new Error(
      "[fast-opencv patch] Cannot locate HoughCircles typing in: " +
        file
    );
  }

  text = text.replace(
    regex,
    `$1, minRadius?: number, maxRadius?: number$2`
  );

  fs.writeFileSync(file, text, "utf8");

  console.log(
    "[fast-opencv patch] typings patched:",
    file
  );
}

console.log("[fast-opencv patch] DONE");
