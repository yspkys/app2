import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Robust model caller with fallback when a model is experiencing high demand
async function generateContentWithFallback(ai: GoogleGenAI, config: any) {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        ...config,
        model,
      });
      return response;
    } catch (err: any) {
      console.warn(`Model ${model} call error:`, err?.status || err?.message);
      lastError = err;
    }
  }

  throw lastError;
}

function parseJsonSafely(rawText: string) {
  try {
    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse JSON directly:', e, rawText);
    return null;
  }
}

// API: 제목 및 목차 생성
app.post('/api/generate-titles-outline', async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: '보도자료 주제를 입력해주세요.' });
    }

    const cleanTopic = topic.trim();
    const ai = getAiClient();

    const prompt = `보도자료 주제: "${cleanTopic}"

지자체(지방자치단체) 공무원이 작성할 공식 보도자료를 위한 제목 후보 3개와 목차(3~5개 항목)를 생성해주세요.

[원칙]
1. 제목 3개는 서로 다른 관점(안내·이용자 중심형, 정책 발표형, 혜택·성과 강조형 등)으로 공식적이고 신뢰감 있게 작성하세요.
2. 목차는 해당 주제의 성격에 맞게 3~5개 항목으로 논리적으로 구성하세요.
3. 사용자가 입력하지 않은 구체적인 수치, 날짜, 금액, 조건 등을 임의로 단정하거나 지어내지 마세요.
4. "${cleanTopic}"처럼 입력이 짧더라도 오류 없이 지자체 행정 안내에 맞게 제목과 목차를 완성하세요.`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: `당신은 대한민국 지자체 홍보 공보관을 돕는 보도자료 전문 작성 AI입니다.
반드시 지자체 공문서 및 보도자료 표준 양식에 맞추어 제목 후보 3개와 목차 항목 목록을 JSON으로 응답하십시오.
입력되지 않은 날짜, 금액, 특정 대상 수치 등을 절대 지어내지 마십시오.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: {
              type: Type.ARRAY,
              description: '보도자료 제목 후보 3개',
              items: { type: Type.STRING },
            },
            outline: {
              type: Type.ARRAY,
              description: '보도자료 목차 항목 목록 (3~5개)',
              items: { type: Type.STRING },
            },
          },
          required: ['titles', 'outline'],
        },
      },
    });

    const text = response.text || '';
    const parsed = parseJsonSafely(text);

    let titles: string[] = parsed?.titles || [];
    let outline: string[] = parsed?.outline || [];

    if (titles.length === 0) {
      titles = [
        `[안내] ${cleanTopic} 활성화 및 이용 안내`,
        `주민 생활 편의 증진을 위한 '${cleanTopic}' 본격 추진`,
        `${cleanTopic} 이용 방법 및 주요 혜택 안내`,
      ];
    }

    if (outline.length === 0) {
      outline = [
        '추진 배경 및 도입 목적',
        '주요 내용 및 이용 안내',
        '주민 혜택 및 유의사항',
        '향후 계획 및 문의처',
      ];
    }

    return res.json({ titles, outline });
  } catch (error) {
    console.error('Error in /api/generate-titles-outline:', error);
    return res.status(500).json({
      error: '보도자료를 생성하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
});

// API: 보도자료 초안 생성
app.post('/api/generate-draft', async (req, res) => {
  try {
    const { topic, title, outline } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: '제목을 선택하거나 입력해주세요.' });
    }

    const ai = getAiClient();

    const outlineText = Array.isArray(outline)
      ? outline.map((item, idx) => `${idx + 1}. ${item}`).join('\n')
      : String(outline || '');

    const prompt = `[보도자료 주제]: ${topic || '미지정'}
[확정된 제목]: ${title.trim()}
[확정된 목차]:
${outlineText}

위 제목과 목차를 바탕으로 지자체 공식 보도자료 초안을 정식 행정 공문서 보도자료 형식으로 작성해주세요.

★ 매우 중요한 사실성 및 환각 방지 원칙 (필수 준수):
1. 사용자가 직접 제공하지 않은 구체적인 사실(날짜, 시간, 지원 금액, 예산 규모, 참여 인원, 구체적인 자격 요건, 기관명, 담당 부서명, 담당자 이름, 전화번호 등)을 AI가 절대로 임의로 지어내지 마십시오.
2. 확인되지 않은 사실이나 공무원이 실제 행정 데이터로 기입해야 하는 모든 부분은 반드시 **[확인 필요]** (예: [확인 필요: 0월 0일], [확인 필요: 00만 원], [확인 필요: 담당 부서명], [확인 필요: 연락처] 등) 형태로 명시하십시오.
3. 지자체 보도자료 표준 양식 구성:
   - 상단 배포 안내: 배포일시: [확인 필요], 담당부서: [확인 필요], 담당자: [확인 필요] (문의: [확인 필요])
   - 보도 제목: "${title.trim()}"
   - 부제목(소제목): 본문의 핵심 내용을 요약하는 간결한 부제 1~2줄
   - 본문:
     • 도입부(리드문): 육하원칙에 맞춘 사업/시책 개요
     • 본문 전개: 위 목차의 항목들을 반영하여 단락별로 전개 (구체적 수치나 사실은 [확인 필요] 처리)
     • 관계자 코멘트: "지자체 관계자는 '[확인 필요: 기대 효과 및 소감]'이라고 밝혔다." 형식
     • 시민 참여 및 문의 안내: 신청/이용 방법 안내 및 [확인 필요] 문의처

본문 전체를 지자체 공무원이 바로 실무에서 검토 및 수정할 수 있는 완성도 높은 초안으로 작성해주세요.`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: `당신은 대한민국 지자체(시·군·구청)의 홍보전산실 수석 보도자료 작성관입니다.
공식적이고 품격 있는 행정 보도자료 문체(~했다, ~밝혔다, ~설명했다)를 사용하십시오.
사용자가 입력하지 않은 세부 사실(금액, 날짜, 연락처, 세부 조건 등)은 절대로 지어내지 말고 반드시 [확인 필요]라고 적어주십시오.`,
      },
    });

    const draft = response.text || '';
    return res.json({ draft });
  } catch (error) {
    console.error('Error in /api/generate-draft:', error);
    return res.status(500).json({
      error: '보도자료를 생성하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
});

// API: 제목 다시 생성 (새로운 관점의 제목 후보 3개)
app.post('/api/regenerate-titles', async (req, res) => {
  try {
    const { topic, outline, existingTitles } = req.body;
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: '먼저 보도자료 주제를 입력하고 제목을 생성해주세요.' });
    }

    const cleanTopic = topic.trim();
    const ai = getAiClient();

    const outlineText = Array.isArray(outline) ? outline.join(', ') : '';
    const existingText = Array.isArray(existingTitles) ? existingTitles.join(' / ') : '';

    const prompt = `보도자료 주제: "${cleanTopic}"
목차: ${outlineText || '미지정'}
기존 제목 후보: ${existingText || '없음'}

위 보도자료의 새로운 제목 후보 3개를 작성해주세요.
[원칙]
1. 기존 제목 후보들과 의미나 표현이 지나치게 겹치지 않도록 새로운 각도(시민 체감 혜택형, 신속한 행정 서비스 안내형, 지역 상생 강조형 등)에서 작성하세요.
2. 지자체 공문서 및 보도자료에 적합한 공식적이고 신뢰감 있는 문체를 사용하세요.
3. 입력되지 않은 사실이나 구체적 수치를 제목에 임의로 추가하지 마세요.`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: `지자체 홍보 보도자료 전문 AI입니다. 기존과 중복되지 않는 새로운 공식 제목 후보 3개를 JSON으로 반환하세요.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: {
              type: Type.ARRAY,
              description: '새로운 보도자료 제목 후보 3개',
              items: { type: Type.STRING },
            },
          },
          required: ['titles'],
        },
      },
    });

    const text = response.text || '';
    const parsed = parseJsonSafely(text);
    const titles: string[] = parsed?.titles || [
      `[보도] ${cleanTopic} 추진 현황 및 이용 안내`,
      `주민 체감도 높이는 '${cleanTopic}', 쉽고 편리하게 이용하세요`,
      `${cleanTopic} 확대 시행으로 시민 편익 증진 도모`,
    ];

    return res.json({ titles });
  } catch (error) {
    console.error('Error in /api/regenerate-titles:', error);
    return res.status(500).json({
      error: '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
});

// API: 문체 다듬기
app.post('/api/refine-style', async (req, res) => {
  try {
    const { draft } = req.body;
    if (!draft || typeof draft !== 'string' || !draft.trim()) {
      return res.status(400).json({ error: '먼저 보도자료 초안을 작성해주세요.' });
    }

    const ai = getAiClient();

    const prompt = `아래의 지자체 보도자료 본문을 정밀하게 다듬어주세요.

[원본 본문]
${draft.trim()}

[문체 다듬기 원칙 - 필수 준수]
1. 지자체 공공기관 보도자료에 적합한 공식적이고 정제된 행정 문체(~했다, ~밝혔다, ~설명했다 등)를 사용하세요.
2. 문장이 지나치게 길거나 만연체인 경우 자연스럽게 단문/복문으로 정리하세요.
3. 어색한 표현을 수정하고 중복된 표현을 최소화하세요.
4. 지나치게 구어적인 표현을 품격 있는 공공 문서 표현으로 수정하세요.
5. 핵심 사실과 의미는 임의로 변경하지 마세요.
6. 입력된 사실을 임의로 추가하지 말고, 날짜·금액·인원·통계 등의 구체적인 사실을 새로 만들어내지 마세요.
7. 원문의 [확인 필요] 표시는 절대로 누락하지 말고 그대로 유지하세요.

다듬어진 완성본 텍스트만 깔끔하게 출력해주세요.`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: `당신은 지자체 공보실의 수석 교열관입니다. 사실 왜곡이나 임의의 수치 생성 없이, 공문서 보도자료 표준 문체로 깔끔하게 다듬어 응답하십시오.`,
      },
    });

    const refinedDraft = response.text || draft;
    return res.json({ refinedDraft });
  } catch (error) {
    console.error('Error in /api/refine-style:', error);
    return res.status(500).json({
      error: '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
});

// API: 내용 점검
app.post('/api/check-content', async (req, res) => {
  try {
    const { draft, topic } = req.body;
    if (!draft || typeof draft !== 'string' || !draft.trim()) {
      return res.status(400).json({ error: '먼저 보도자료 초안을 작성해주세요.' });
    }

    const ai = getAiClient();

    const prompt = `보도자료 주제: "${topic || '미지정'}"
보도자료 본문:
${draft.trim()}

위 작성된 보도자료 본문을 내부적으로 정밀 점검하여 JSON으로 분석 결과를 제공해주세요.
(※ 외부 인터넷 검색이나 실제 사실 여부 조회가 아니며, 작성된 문서 텍스트 내부를 행정 기준에 따라 점검하는 것입니다.)

점검 항목:
1. 확인 필요 (needsConfirmation): 본문에 '[확인 필요]' 표시가 되어 있어 담당자가 실제 데이터를 채워야 하는 항목들
2. 주의 필요 (needsCaution): 날짜, 금액, 인원, 통계, 기관명 등 구체적인 수치나 고유 정보가 표기되어 있어 실제 배포 전 팩트 체크가 필요한 항목들
3. 표현 및 주제 점검 (expressionCheck): 지나치게 과장되거나 단정적인 표현, 또는 원래 주제와 다소 벗어난 내용이 있는지 점검
4. 특별한 문제 없음 (goodPoints): 공공 보도자료 형식(육하원칙, 배포 안내 양식 등)에 부합하거나 양호한 부분`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: `당신은 지자체 보도자료 사전 감사관입니다. 문서를 객관적으로 분석하여 지정된 JSON 스키마로 응답하십시오.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            needsConfirmation: {
              type: Type.ARRAY,
              description: '[확인 필요]가 표시된 항목 목록',
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: '해당 문장 또는 어구' },
                  reason: { type: Type.STRING, description: '확인이 필요한 이유' },
                },
                required: ['text', 'reason'],
              },
            },
            needsCaution: {
              type: Type.ARRAY,
              description: '날짜, 금액, 통계 등 사실 확인 주의가 필요한 항목 목록',
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: '해당 문장 또는 어구' },
                  reason: { type: Type.STRING, description: '주의가 필요한 이유' },
                },
                required: ['text', 'reason'],
              },
            },
            expressionCheck: {
              type: Type.ARRAY,
              description: '과장·단정적 표현 또는 주제 연관성 점검 항목',
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: '해당 표현' },
                  reason: { type: Type.STRING, description: '점검 의견' },
                },
                required: ['text', 'reason'],
              },
            },
            goodPoints: {
              type: Type.ARRAY,
              description: '특별한 문제 없이 양호한 항목 목록',
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: '양호한 항목' },
                  reason: { type: Type.STRING, description: '양호한 이유' },
                },
                required: ['text', 'reason'],
              },
            },
          },
          required: ['needsConfirmation', 'needsCaution', 'expressionCheck', 'goodPoints'],
        },
      },
    });

    const parsed = parseJsonSafely(response.text || '');

    const needsConfirmation = parsed?.needsConfirmation || [];
    const needsCaution = parsed?.needsCaution || [];
    const expressionCheck = parsed?.expressionCheck || [];
    const goodPoints = parsed?.goodPoints || [];

    return res.json({
      needsConfirmation,
      needsCaution,
      expressionCheck,
      goodPoints,
      counts: {
        confirmation: needsConfirmation.length,
        caution: needsCaution.length,
        good: goodPoints.length,
      },
    });
  } catch (error) {
    console.error('Error in /api/check-content:', error);
    return res.status(500).json({
      error: '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
});

// Vite middleware or static serving
const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;

if (!isProduction) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
});
