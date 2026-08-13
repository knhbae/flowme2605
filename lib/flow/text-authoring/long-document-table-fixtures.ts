export const LONG_DOCUMENT_MIXED_CRLF_FIXTURE = [
  "# 기록",
  "",
  "일반 설명입니다.",
  "> 인용문입니다.",
  "<!-- 작성자 주석 -->",
  "<section>",
  "HTML 원문",
  "</section>",
  "```txt",
  "쉼표, 탭\t파이프 | 모두 원문입니다.",
  "빈 줄도",
  "```",
  "",
  "이름,설명,링크,가격,빈칸",
  '첫째,"두 줄의',
  '설명",https://example.com/a,"₩12,000",',
].join("\r\n");

export const LONG_DOCUMENT_TSV_MULTILINE_FIXTURE = [
  "이름\t설명\t링크",
  '첫째\t"두 줄의',
  '설명"\thttps://example.com/a',
].join("\r\n");

export const LONG_DOCUMENT_MARKDOWN_ESCAPED_PIPE_FIXTURE = [
  "| 이름 | 설명 | 링크 | 빈칸 |",
  "| --- | --- | --- | --- |",
  "| 첫째 | A \\| B | https://example.com/a | |",
].join("\n");
