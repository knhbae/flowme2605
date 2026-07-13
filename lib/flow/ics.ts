const utf8Encoder = new TextEncoder();

function utf8ByteLength(value: string): number {
  return utf8Encoder.encode(value).length;
}

export function foldIcsContentLine(line: string): string {
  const firstLineLimit = 75;
  const continuationContentLimit = 74;
  if (utf8ByteLength(line) <= firstLineLimit) return line;

  const segments: string[] = [];
  let segment = '';
  let segmentBytes = 0;

  for (const character of line) {
    const characterBytes = utf8ByteLength(character);
    const limit = segments.length === 0 ? firstLineLimit : continuationContentLimit;
    if (segment && segmentBytes + characterBytes > limit) {
      const trailingWhitespace = segment.match(/[ \t]+$/)?.[0] ?? '';
      const emittedSegment = trailingWhitespace
        ? segment.slice(0, -trailingWhitespace.length)
        : segment;
      segments.push(segments.length === 0 ? emittedSegment : ` ${emittedSegment}`);
      segment = `${trailingWhitespace}${character}`;
      segmentBytes = utf8ByteLength(segment);
      continue;
    }
    segment += character;
    segmentBytes += characterBytes;
  }

  if (segment) segments.push(segments.length === 0 ? segment : ` ${segment}`);
  return segments.join('\r\n');
}
