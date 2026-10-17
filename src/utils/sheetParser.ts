import { Question, Continent, Difficulty, QuestionStatus } from '../types';

export function parseCSVToRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuote = false;

  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if ((char === ',' || char === '\t') && !insideQuote) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if (char === '\n' && !insideQuote) {
      currentRow.push(currentVal.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function parseSheetDataToQuestions(
  rawText: string,
  defaultContinent: Continent = 'Africa'
): { questions: Question[]; errors: string[] } {
  const rows = parseCSVToRows(rawText);
  if (rows.length === 0) {
    return { questions: [], errors: ['No data found in pasted content.'] };
  }

  const errors: string[] = [];
  const questions: Question[] = [];

  // Check if first row is header
  const header = rows[0].map((h) => h.toLowerCase().trim().replace(/[\s_-]+/g, ''));
  const hasHeader = header.some((h) =>
    ['id', 'questionid', 'question', 'questiontext', 'continent', 'difficulty', 'correctanswer'].includes(h)
  );

  const startIdx = hasHeader ? 1 : 0;

  // Header index mapping helper
  const getCol = (possibleNames: string[]): number => {
    return header.findIndex((h) => possibleNames.includes(h));
  };

  const idCol = getCol(['id', 'questionid', 'qid', 'code']);
  const contCol = getCol(['continent', 'region']);
  const topicCol = getCol(['topic', 'category', 'subtopic']);
  const diffCol = getCol(['difficulty', 'level']);
  const qTextCol = getCol(['question', 'questiontext', 'prompt', 'mcq']);
  const optACol = getCol(['optiona', 'opt1', 'choicea', 'a']);
  const optBCol = getCol(['optionb', 'opt2', 'choiceb', 'b']);
  const optCCol = getCol(['optionc', 'opt3', 'choicec', 'c']);
  const optDCol = getCol(['optiond', 'opt4', 'choiced', 'd']);
  const ansCol = getCol(['correctanswer', 'answer', 'correct', 'correctoption']);
  const expCol = getCol(['explanation', 'explain', 'notes', 'rationale']);
  const imgCol = getCol(['imageurl', 'image', 'picture', 'photo']);
  const statusCol = getCol(['status', 'publicationstatus', 'state']);

  for (let r = startIdx; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 5) continue; // skip incomplete rows

    let id = idCol !== -1 && row[idCol] ? row[idCol].trim() : '';
    let continentStr = contCol !== -1 && row[contCol] ? row[contCol].trim() : defaultContinent;
    let topic = topicCol !== -1 && row[topicCol] ? row[topicCol].trim() : 'General Geography';
    let difficultyStr = diffCol !== -1 && row[diffCol] ? row[diffCol].trim().toLowerCase() : 'medium';
    let questionText = qTextCol !== -1 && row[qTextCol] ? row[qTextCol].trim() : (hasHeader ? '' : row[0]);

    // Options
    let optA = optACol !== -1 && row[optACol] ? row[optACol].trim() : '';
    let optB = optBCol !== -1 && row[optBCol] ? row[optBCol].trim() : '';
    let optC = optCCol !== -1 && row[optCCol] ? row[optCCol].trim() : '';
    let optD = optDCol !== -1 && row[optDCol] ? row[optDCol].trim() : '';

    // If options weren't matched by header, fallback by column position
    if (!optA && row[2]) optA = row[2];
    if (!optB && row[3]) optB = row[3];
    if (!optC && row[4]) optC = row[4];
    if (!optD && row[5]) optD = row[5];

    let correctAnswer = ansCol !== -1 && row[ansCol] ? row[ansCol].trim() : '';
    if (!correctAnswer && row[6]) correctAnswer = row[6];

    // If answer is letter 'A', 'B', 'C', 'D' map to value
    if (correctAnswer.toUpperCase() === 'A') correctAnswer = optA;
    else if (correctAnswer.toUpperCase() === 'B') correctAnswer = optB;
    else if (correctAnswer.toUpperCase() === 'C') correctAnswer = optC;
    else if (correctAnswer.toUpperCase() === 'D') correctAnswer = optD;

    let explanation = expCol !== -1 && row[expCol] ? row[expCol].trim() : '';
    let imageUrl = imgCol !== -1 && row[imgCol] ? row[imgCol].trim() : null;
    let statusStr = statusCol !== -1 && row[statusCol] ? row[statusCol].trim().toLowerCase() : 'published';

    // Normalize Continent
    const validContinents: Continent[] = [
      'Africa',
      'Asia',
      'Europe',
      'North America',
      'Oceania',
      'South America',
      'Antarctica',
    ];
    const matchContinent = validContinents.find(
      (c) => c.toLowerCase() === continentStr.toLowerCase()
    ) || defaultContinent;

    // Normalize Difficulty
    let difficulty: Difficulty = 'medium';
    if (difficultyStr.includes('easy')) difficulty = 'easy';
    else if (difficultyStr.includes('hard')) difficulty = 'hard';

    // Normalize Status
    let status: QuestionStatus = 'published';
    if (statusStr.includes('draft')) status = 'draft';
    else if (statusStr.includes('archive')) status = 'archived';

    if (!questionText || !optA || !optB || !optC || !optD || !correctAnswer) {
      errors.push(`Row ${r + 1}: Missing question text, options, or answer.`);
      continue;
    }

    // Auto-generate ID if absent
    if (!id) {
      const code = matchContinent.slice(0, 3).toUpperCase();
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      id = `GEO-${code}-${randomPart}-${r}`;
    }

    // Check that correctAnswer matches one of the options
    const options: [string, string, string, string] = [optA, optB, optC, optD];
    if (!options.some((o) => o.toLowerCase() === correctAnswer.toLowerCase())) {
      // If none match, set the first option as the correct answer
      options[0] = correctAnswer;
    } else {
      // Align exact casing
      const matched = options.find((o) => o.toLowerCase() === correctAnswer.toLowerCase());
      if (matched) correctAnswer = matched;
    }

    questions.push({
      id,
      continent: matchContinent,
      topic,
      difficulty,
      questionText,
      options,
      correctAnswer,
      explanation: explanation || `The correct answer is ${correctAnswer}.`,
      imageUrl: imageUrl || null,
      status,
      source: 'sheet_sync',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: status === 'published' ? new Date().toISOString() : null,
    });
  }

  return { questions, errors };
}

export function exportQuestionsToCSV(questions: Question[]): string {
  const headers = [
    'ID',
    'Continent',
    'Topic',
    'Difficulty',
    'Question Text',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Answer',
    'Explanation',
    'Image URL',
    'Status',
  ];

  const escapeCell = (val: string | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = questions.map((q) => [
    escapeCell(q.id),
    escapeCell(q.continent),
    escapeCell(q.topic),
    escapeCell(q.difficulty),
    escapeCell(q.questionText),
    escapeCell(q.options[0]),
    escapeCell(q.options[1]),
    escapeCell(q.options[2]),
    escapeCell(q.options[3]),
    escapeCell(q.correctAnswer),
    escapeCell(q.explanation),
    escapeCell(q.imageUrl || ''),
    escapeCell(q.status),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export const SAMPLE_SHEET_CSV = `ID,Continent,Topic,Difficulty,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Explanation,Image URL,Status
GEO-AFR-010,Africa,Physical Geography,easy,"What is the highest mountain in Africa?","Mount Kilimanjaro","Mount Kenya","Mount Stanley","Ras Dashen","Mount Kilimanjaro","Mount Kilimanjaro stands at 5,895 meters in Tanzania.","",published
GEO-EUR-011,Europe,Rivers & Lakes,medium,"Through how many countries does the Danube River pass?","10","8","6","12","10","The Danube flows through or borders 10 countries.","",published
GEO-ASI-012,Asia,Capitals & Cities,hard,"Which Asian capital city is the world's coldest national capital?","Ulaanbaatar","Astana","Helsinki","Reykjavik","Ulaanbaatar","Ulaanbaatar in Mongolia experiences the lowest mean annual temperature of any national capital.","",published`;
