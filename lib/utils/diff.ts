export type DiffLineType = "context" | "add" | "remove";

export interface DiffLine {
  type: DiffLineType;
  value: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

function splitLines(text: string): string[] {
  if (!text) {
    return [];
  }
  return text.replace(/\r\n/g, "\n").split("\n");
}

function buildLcsMatrix(source: string[], target: string[]): number[][] {
  const rows = source.length + 1;
  const cols = target.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let row = source.length - 1; row >= 0; row -= 1) {
    for (let col = target.length - 1; col >= 0; col -= 1) {
      if (source[row] === target[col]) {
        matrix[row][col] = matrix[row + 1][col + 1] + 1;
      } else {
        matrix[row][col] = Math.max(matrix[row + 1][col], matrix[row][col + 1]);
      }
    }
  }

  return matrix;
}

export function buildLineDiff(sourceText: string, targetText: string): DiffLine[] {
  const source = splitLines(sourceText);
  const target = splitLines(targetText);
  const lcs = buildLcsMatrix(source, target);

  const lines: DiffLine[] = [];
  let sourceIndex = 0;
  let targetIndex = 0;
  let sourceLine = 1;
  let targetLine = 1;

  while (sourceIndex < source.length && targetIndex < target.length) {
    if (source[sourceIndex] === target[targetIndex]) {
      lines.push({
        type: "context",
        value: source[sourceIndex],
        oldLineNumber: sourceLine,
        newLineNumber: targetLine,
      });
      sourceIndex += 1;
      targetIndex += 1;
      sourceLine += 1;
      targetLine += 1;
      continue;
    }

    if (lcs[sourceIndex + 1][targetIndex] >= lcs[sourceIndex][targetIndex + 1]) {
      lines.push({
        type: "remove",
        value: source[sourceIndex],
        oldLineNumber: sourceLine,
      });
      sourceIndex += 1;
      sourceLine += 1;
    } else {
      lines.push({
        type: "add",
        value: target[targetIndex],
        newLineNumber: targetLine,
      });
      targetIndex += 1;
      targetLine += 1;
    }
  }

  while (sourceIndex < source.length) {
    lines.push({
      type: "remove",
      value: source[sourceIndex],
      oldLineNumber: sourceLine,
    });
    sourceIndex += 1;
    sourceLine += 1;
  }

  while (targetIndex < target.length) {
    lines.push({
      type: "add",
      value: target[targetIndex],
      newLineNumber: targetLine,
    });
    targetIndex += 1;
    targetLine += 1;
  }

  return lines;
}
