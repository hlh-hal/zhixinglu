import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const jschardet = require('jschardet');
const iconv = require('iconv-lite');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const dateRegex = /((20\d{2})[./\-年]\s*(1[0-2]|0?[1-9])[./\-月]\s*(3[01]|[12][0-9]|0?[1-9])(?:\s*[日号])?)/;
const separatorLineRegex = /^\s*#\s*$/;

const sectionDefinitions = [
  { key: 'happy_things', titles: ['开心的事', '快乐的事', '喜悦的事', '开心', '快乐', '喜悦'] },
  { key: 'meaningful_things', titles: ['充实的事', '有意义的事', '充实', '意义', '成就', '有价值'] },
  { key: 'grateful_people', titles: ['感谢的人', '感恩的人', '感谢', '感恩', '帮助'] },
  { key: 'improvements', titles: ['改进的事', '需要改进', '改进', '不足', '缺点', '提升', '改善'] },
  { key: 'thoughts', titles: ['今日思考', '思考', '感悟', '想法', '反思', '心得'] }
] as const;

type ParsedLog = {
  date: string;
  happy_things: string;
  meaningful_things: string;
  grateful_people: string;
  improvements: string;
  thoughts: string;
  _raw?: string;
};

type DateParts = {
  year: string;
  month: string;
  day: string;
};

function normalizeText(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\uFEFF/g, '')
    // Some exported markdown files accidentally collapse multiple bullet fields onto one line.
    // Insert a newline before inline bullet-title markers so section parsing still works.
    .replace(/([^\n])(\s+-\s*\*\*[^*\n]+\*\*\s*[：:])/g, '$1\n$2')
    .trim();
}

function getDateParts(text: string): DateParts | null {
  const match = text.match(dateRegex);
  if (!match) return null;

  return {
    year: match[2],
    month: match[3].padStart(2, '0'),
    day: match[4].padStart(2, '0')
  };
}

function isDateLine(line: string) {
  const trimmed = line.trim().replace(/^#+\s*/, '').replace(/\s*#\s*$/, '');
  return dateRegex.test(trimmed);
}

function stripTrailingSeparator(line: string) {
  return line.replace(/\s*#\s*$/, '').trimEnd();
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSectionTitleRegex(titles: readonly string[]) {
  const escapedTitles = titles
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);

  return new RegExp(
    `(?:^|\\n)\\s*(?:[-*+]\\s*)?(?:\\*\\*|__)?\\s*(${escapedTitles.join('|')})\\s*(?:\\*\\*|__)?\\s*[：:]?\\s*`,
    'g'
  );
}

function removeLeadingNumericNoise(content: string, dateParts: DateParts | null) {
  const lines = content.split('\n');
  const removableNumbers = new Set<string>();

  if (dateParts) {
    removableNumbers.add(String(parseInt(dateParts.month, 10)));
    removableNumbers.add(dateParts.month);
    removableNumbers.add(String(parseInt(dateParts.day, 10)));
    removableNumbers.add(dateParts.day);
  }

  while (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (!/^\d{1,2}$/.test(firstLine)) break;
    if (removableNumbers.size > 0 && !removableNumbers.has(firstLine)) break;
    lines.shift();
  }

  return lines.join('\n');
}

function cleanFieldContent(content: string, dateParts: DateParts | null) {
  let cleanContent = content.replace(/\r\n?/g, '\n');

  cleanContent = cleanContent.replace(/^\s*[：:\-–—#>\t ]+/, '');
  cleanContent = cleanContent.replace(/\n\s*#\s*$/g, '');
  cleanContent = cleanContent.replace(/\*\*|__|~~|`{1,3}/g, '');
  cleanContent = removeLeadingNumericNoise(cleanContent, dateParts);
  cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n').trim();

  if (/^(无|没有|暂无|none|na|n\/a)$/i.test(cleanContent)) {
    return '';
  }

  return cleanContent;
}

function extractLogData(text: string): ParsedLog {
  const normalizedText = normalizeText(text);
  const dateParts = getDateParts(normalizedText);
  const result: ParsedLog = {
    date: dateParts ? `${dateParts.year}-${dateParts.month}-${dateParts.day}` : new Date().toISOString().split('T')[0],
    happy_things: '',
    meaningful_things: '',
    grateful_people: '',
    improvements: '',
    thoughts: ''
  };

  const foundMarkers: { key: keyof ParsedLog; startIndex: number; titleEndIndex: number }[] = [];

  sectionDefinitions.forEach(section => {
    const titleRegex = buildSectionTitleRegex(section.titles);
    let match: RegExpExecArray | null;

    while ((match = titleRegex.exec(normalizedText)) !== null) {
      const fullMatch = match[0];
      const titleText = match[1];
      const titleStartOffset = fullMatch.lastIndexOf(titleText);

      foundMarkers.push({
        key: section.key,
        startIndex: match.index + titleStartOffset,
        titleEndIndex: match.index + fullMatch.length
      });
    }
  });

  foundMarkers.sort((a, b) => a.startIndex - b.startIndex);

  const uniqueMarkers = foundMarkers.filter((marker, index, list) => {
    if (index === 0) return true;
    const previous = list[index - 1];
    return !(previous.key === marker.key && previous.startIndex === marker.startIndex);
  });

  console.log(`[Import Debug] Found ${uniqueMarkers.length} fields for date ${result.date}`);

  for (let i = 0; i < uniqueMarkers.length; i++) {
    const current = uniqueMarkers[i];
    const next = uniqueMarkers[i + 1];
    const content = normalizedText.slice(current.titleEndIndex, next ? next.startIndex : normalizedText.length);
    const cleanContent = cleanFieldContent(content, dateParts);

    result[current.key] = cleanContent;

    const preview = cleanContent.length > 50 ? `${cleanContent.substring(0, 50)}...` : cleanContent;
    console.log(`[Import Debug] ${current.key}: "${preview}"`);
  }

  return result;
}

function parseTextToLogs(text: string) {
  const normalizedText = normalizeText(text);
  const lines = normalizedText.split('\n');
  const chunks: string[] = [];
  let currentChunk: string[] = [];

  const flushChunk = () => {
    const chunk = currentChunk.join('\n').trim();
    if (chunk) chunks.push(chunk);
    currentChunk = [];
  };

  lines.forEach(line => {
    if (separatorLineRegex.test(line)) {
      flushChunk();
      return;
    }

    if (isDateLine(line)) {
      flushChunk();
      currentChunk.push(stripTrailingSeparator(line));
      if (/\s*#\s*$/.test(line)) {
        flushChunk();
      }
      return;
    }

    const sanitizedLine = stripTrailingSeparator(line);
    if (sanitizedLine || currentChunk.length > 0) {
      currentChunk.push(sanitizedLine);
    }

    if (/\s*#\s*$/.test(line)) {
      flushChunk();
    }
  });

  flushChunk();

  if (chunks.length === 0) {
    const single = extractLogData(normalizedText);
    single._raw = normalizedText;
    return [single];
  }

  const logs = chunks
    .filter(chunk => getDateParts(chunk))
    .map(chunk => {
      const single = extractLogData(chunk);
      single._raw = chunk;
      return single;
    });

  if (logs.length === 0) {
    const single = extractLogData(normalizedText);
    single._raw = normalizedText;
    return [single];
  }

  console.log(`[Import Debug] Parsed ${logs.length} logs from text import`);
  return logs;
}

router.post('/parse', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer } = req.file;
    const lowerName = originalname.toLowerCase();
    let textContent = '';

    if (lowerName.endsWith('.json')) {
      const jsonStr = buffer.toString('utf-8');
      return res.json(JSON.parse(jsonStr));
    }

    const headerStr = buffer.toString('ascii', 0, 5);
    const isPDF = headerStr === '%PDF-' || lowerName.endsWith('.pdf');

    if (isPDF && headerStr === '%PDF-') {
      const data = await pdfParse(buffer);
      textContent = data.text;
    } else if (lowerName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      textContent = result.value;
    } else {
      const detected = jschardet.detect(buffer);
      if (detected.encoding && detected.encoding.toLowerCase().includes('gb')) {
        textContent = iconv.decode(buffer, 'gbk');
      } else {
        textContent = buffer.toString('utf-8');
      }
    }

    const parsedDataList = parseTextToLogs(textContent);

    parsedDataList.forEach(parsedData => {
      if (!parsedData.happy_things && !parsedData.improvements && parsedData._raw?.trim()) {
        parsedData.thoughts = cleanFieldContent(parsedData._raw.trim(), getDateParts(parsedData._raw));
      }
      delete parsedData._raw;
    });

    res.json(parsedDataList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to parse file' });
  }
});

router.post('/export', requireAuth, async (req, res) => {
  try {
    const { format, type, data } = req.body;

    let title = '';
    let contentStrings: string[] = [];

    if (type === 'daily_log') {
      title = `${data.date} 日志`;
      contentStrings.push(`日期: ${data.date}`);
      if (data.happy_things) contentStrings.push(`【开心的事】\n${data.happy_things}`);
      if (data.meaningful_things) contentStrings.push(`【充实的事】\n${data.meaningful_things}`);
      if (data.grateful_people) contentStrings.push(`【感谢的人】\n${data.grateful_people}`);
      if (data.improvements) contentStrings.push(`【改进的事】\n${data.improvements}`);
      if (data.thoughts) contentStrings.push(`【今日思考】\n${data.thoughts}`);
    } else {
      title = data.month ? `${data.month} 复盘` : `${data.year}年复盘`;
      contentStrings.push(`记录：\n${data.content || ''}`);
    }

    if (format === 'md') {
      const mdOutput = `# ${title}\n\n${contentStrings.join('\n\n')}`;
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`${title}.md`)}`);
      return res.send(mdOutput);
    }

    if (format === 'docx') {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
            ...contentStrings.flatMap(text => [
              new Paragraph({ text }),
              new Paragraph({ text: '' })
            ])
          ]
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`${title}.docx`)}`);
      return res.send(buffer);
    }

    return res.status(400).json({ error: 'Unsupported format in backend' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
