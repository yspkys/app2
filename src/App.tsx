import React, { useState, useRef } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Edit3,
  Plus,
  Trash2,
  Building2,
  HelpCircle,
  ArrowRight,
  Send,
  CheckSquare,
  Wand2,
  SearchCheck,
  RefreshCw,
  X,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface CheckItem {
  text: string;
  reason: string;
}

interface CheckResultData {
  needsConfirmation: CheckItem[];
  needsCaution: CheckItem[];
  expressionCheck: CheckItem[];
  goodPoints: CheckItem[];
  counts: {
    confirmation: number;
    caution: number;
    good: number;
  };
}

export default function App() {
  // 1단계: 주제 입력
  const [topic, setTopic] = useState('');
  const [topicError, setTopicError] = useState<string | null>(null);

  // 2단계: 제목 및 목차 상태
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number>(0);
  const [customTitle, setCustomTitle] = useState('');
  const [outline, setOutline] = useState<string[]>([]);

  // 3단계: 최종 결과 상태
  const [draft, setDraft] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // 추가 기능 상태
  // ① 문체 다듬기
  const [isRefiningStyle, setIsRefiningStyle] = useState(false);
  const [refinedDraft, setRefinedDraft] = useState<string | null>(null);

  // ② 내용 점검
  const [isCheckingContent, setIsCheckingContent] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResultData | null>(null);
  const [activeCheckTab, setActiveCheckTab] = useState<'confirmation' | 'caution' | 'expression' | 'good'>('confirmation');

  // ③ 제목/본문 재생성
  const [isRegeneratingTitles, setIsRegeneratingTitles] = useState(false);
  const [isRegeneratingDraft, setIsRegeneratingDraft] = useState(false);

  // 로딩 및 글로벌 알림/오류 상태
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);

  // 현재 진행 단계 (1: 주제 입력, 2: 제목·목차 수정, 3: 보도자료 초안)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // 결과 화면 참조
  const resultRef = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);

  // 빠른 테스트 데이터
  const quickTestCases = [
    { label: '테스트 1', text: '제천페이 사용방법' },
    { label: '테스트 2', text: '무료페이 받는 방법' },
    { label: '테스트 3', text: '제천페이' },
  ];

  const showAlert = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setActionAlert({ type, message });
    setTimeout(() => {
      setActionAlert((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // ① 제목·목차 생성 요청
  const handleGenerateTitlesAndOutline = async (topicToUse?: string) => {
    const targetTopic = (typeof topicToUse === 'string' ? topicToUse : topic).trim();

    // 입력 검증 (테스트 4: 입력하지 않고 실행)
    if (!targetTopic) {
      setTopicError('보도자료 주제를 입력해주세요.');
      return;
    }

    setTopicError(null);
    setServerError(null);
    setIsGeneratingTitles(true);

    try {
      const res = await fetch('/api/generate-titles-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: targetTopic }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '보도자료를 생성하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }

      const generatedTitles: string[] = data.titles || [];
      const generatedOutline: string[] = data.outline || [];

      setTitles(generatedTitles);
      setSelectedTitleIndex(0);
      setCustomTitle(generatedTitles[0] || targetTopic);
      setOutline(generatedOutline.length > 0 ? generatedOutline : ['추진 배경 및 목적', '주요 내용 및 혜택', '이용 방법 및 안내', '향후 계획']);

      setCurrentStep(2);
      setTimeout(() => {
        step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: unknown) {
      console.error(err);
      setServerError(
        err instanceof Error
          ? err.message
          : '보도자료를 생성하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
      );
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // 추가 기능 3: 제목 다시 생성
  const handleRegenerateTitles = async () => {
    if (!topic.trim() || titles.length === 0) {
      showAlert('먼저 보도자료 주제를 입력하고 제목을 생성해주세요.', 'error');
      return;
    }

    setServerError(null);
    setIsRegeneratingTitles(true);

    try {
      const res = await fetch('/api/regenerate-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          outline,
          existingTitles: titles,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }

      const newTitles: string[] = data.titles || [];
      if (newTitles.length > 0) {
        setTitles(newTitles);
        setSelectedTitleIndex(0);
        setCustomTitle(newTitles[0]);
        showAlert('새로운 제목 후보 3개가 생성되었습니다.', 'success');
      }
    } catch (err: unknown) {
      console.error(err);
      setServerError(
        err instanceof Error
          ? err.message
          : '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
      );
    } finally {
      setIsRegeneratingTitles(false);
    }
  };

  // 제목 후보 선택 시
  const handleSelectTitle = (idx: number) => {
    setSelectedTitleIndex(idx);
    setCustomTitle(titles[idx]);
  };

  // 목차 항목 수정
  const handleOutlineChange = (index: number, value: string) => {
    const updated = [...outline];
    updated[index] = value;
    setOutline(updated);
  };

  // 목차 항목 추가
  const handleAddOutlineItem = () => {
    setOutline([...outline, '새로운 목차 항목']);
  };

  // 목차 항목 삭제
  const handleRemoveOutlineItem = (index: number) => {
    if (outline.length <= 1) {
      showAlert('목차는 최소 1개 이상 필요합니다.', 'error');
      return;
    }
    setOutline(outline.filter((_, idx) => idx !== index));
  };

  // ④ 보도자료 초안 작성 요청
  const handleGenerateDraft = async () => {
    if (!customTitle.trim()) {
      showAlert('보도자료 제목을 입력해주세요.', 'error');
      return;
    }

    setServerError(null);
    setIsGeneratingDraft(true);

    try {
      const res = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          title: customTitle.trim(),
          outline: outline.filter((item) => item.trim().length > 0),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '보도자료를 생성하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }

      setDraft(data.draft || '');
      setRefinedDraft(null);
      setCheckResult(null);
      setCurrentStep(3);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: unknown) {
      console.error(err);
      setServerError(
        err instanceof Error
          ? err.message
          : '보도자료를 생성하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
      );
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // 추가 기능 1: 문체 다듬기 요청
  const handleRefineStyle = async () => {
    if (!draft.trim()) {
      showAlert('먼저 보도자료 초안을 작성해주세요.', 'error');
      return;
    }

    setServerError(null);
    setIsRefiningStyle(true);

    try {
      const res = await fetch('/api/refine-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }

      setRefinedDraft(data.refinedDraft || draft);
      showAlert('문체 다듬기가 완료되었습니다. 아래 비교 영역에서 확인 후 적용하세요.', 'info');
    } catch (err: unknown) {
      console.error(err);
      setServerError(
        err instanceof Error
          ? err.message
          : '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
      );
    } finally {
      setIsRefiningStyle(false);
    }
  };

  // 문체 다듬기 결과 적용
  const handleApplyRefinedStyle = () => {
    if (refinedDraft) {
      setDraft(refinedDraft);
      setRefinedDraft(null);
      showAlert('다듬어진 문체가 최종 본문에 적용되었습니다.', 'success');
    }
  };

  // 추가 기능 2: 내용 점검 요청
  const handleCheckContent = async () => {
    if (!draft.trim()) {
      showAlert('먼저 보도자료 초안을 작성해주세요.', 'error');
      return;
    }

    setServerError(null);
    setIsCheckingContent(true);

    try {
      const res = await fetch('/api/check-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, topic }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }

      setCheckResult(data);
      // 가장 주의가 필요한 탭을 기본 선택
      if ((data.needsConfirmation?.length || 0) > 0) {
        setActiveCheckTab('confirmation');
      } else if ((data.needsCaution?.length || 0) > 0) {
        setActiveCheckTab('caution');
      } else {
        setActiveCheckTab('good');
      }
      showAlert('내용 점검이 완료되었습니다. 점검 결과를 확인하세요.', 'info');
    } catch (err: unknown) {
      console.error(err);
      setServerError(
        err instanceof Error
          ? err.message
          : '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
      );
    } finally {
      setIsCheckingContent(false);
    }
  };

  // 추가 기능 3: 본문 다시 작성 (재생성)
  const handleRegenerateDraft = async () => {
    if (!draft.trim()) {
      showAlert('먼저 보도자료 초안을 작성해주세요.', 'error');
      return;
    }

    setServerError(null);
    setIsRegeneratingDraft(true);

    try {
      const res = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          title: customTitle.trim(),
          outline: outline.filter((item) => item.trim().length > 0),
          currentDraft: draft,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }

      setDraft(data.draft || '');
      setRefinedDraft(null);
      setCheckResult(null);
      showAlert('새로운 표현으로 보도자료 본문이 다시 작성되었습니다.', 'success');
    } catch (err: unknown) {
      console.error(err);
      setServerError(
        err instanceof Error
          ? err.message
          : '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
      );
    } finally {
      setIsRegeneratingDraft(false);
    }
  };

  // 클립보드 복사
  const handleCopyDraft = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = draft;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // 전체 초기화
  const handleReset = () => {
    setTopic('');
    setTopicError(null);
    setServerError(null);
    setActionAlert(null);
    setTitles([]);
    setSelectedTitleIndex(0);
    setCustomTitle('');
    setOutline([]);
    setDraft('');
    setRefinedDraft(null);
    setCheckResult(null);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // [확인 필요] 개수 산출
  const unverifiedCount = (draft.match(/\[확인 필요[^\]]*\]/g) || []).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      {/* 정부·지자체 포털 스타일 상단 헤더 */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-xs shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  지역 보도자료 초안 생성기
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  공무원 교육용
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                보도자료 주제를 입력하면 AI가 제목과 목차를 제안하고 초안을 작성합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="처음부터 다시 작성"
              >
                <RotateCcw className="w-4 h-4" />
                새로 작성
              </button>
            )}
          </div>
        </div>

        {/* 단계 표시 막대 (1 -> 2 -> 3) */}
        <div className="bg-slate-100 border-t border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-slate-600">
              <div
                className={`flex items-center gap-2 ${
                  currentStep === 1
                    ? 'text-blue-700 font-bold'
                    : currentStep > 1
                    ? 'text-emerald-700'
                    : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    currentStep === 1
                      ? 'bg-blue-700 text-white'
                      : currentStep > 1
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {currentStep > 1 ? '✓' : '1'}
                </span>
                <span>1. 주제 입력</span>
              </div>
              <ChevronArrow />
              <div
                className={`flex items-center gap-2 ${
                  currentStep === 2
                    ? 'text-blue-700 font-bold'
                    : currentStep > 2
                    ? 'text-emerald-700'
                    : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    currentStep === 2
                      ? 'bg-blue-700 text-white'
                      : currentStep > 2
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {currentStep > 2 ? '✓' : '2'}
                </span>
                <span>2. 제목·목차 수정</span>
              </div>
              <ChevronArrow />
              <div
                className={`flex items-center gap-2 ${
                  currentStep === 3
                    ? 'text-blue-700 font-bold'
                    : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    currentStep === 3
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  3
                </span>
                <span>3. 결과 및 직접 수정</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 안내 알림 배너 (공공 사실성 원칙 안내) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5">
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs sm:text-sm text-amber-900">
          <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold text-amber-950">공직자 보도자료 작성 원칙: </strong>
            AI는 입력되지 않은 구체적 사실(날짜·금액·연락처·담당자 등)을 임의로 지어내지 않으며, 확인이 필요한 정보는{' '}
            <span className="font-bold underline decoration-amber-500 underline-offset-2">
              [확인 필요]
            </span>
            로 표시합니다. 본문 확인 후 실제 행정 데이터로 보완하여 배포하십시오.
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 컨테이너 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* 토스트 / 액션 안내 배너 */}
        {actionAlert && (
          <div
            className={`p-4 rounded-xl flex items-start gap-3 shadow-xs border transition-all ${
              actionAlert.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-900'
                : actionAlert.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            {actionAlert.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            ) : actionAlert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-semibold text-sm">{actionAlert.message}</div>
            <button
              type="button"
              onClick={() => setActionAlert(null)}
              className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
            >
              닫기
            </button>
          </div>
        )}

        {/* 글로벌 서버 오류 알림 */}
        {serverError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">{serverError}</p>
            </div>
            <button
              type="button"
              onClick={() => setServerError(null)}
              className="text-xs text-red-600 hover:text-red-800 font-medium ml-2 cursor-pointer"
            >
              닫기
            </button>
          </div>
        )}

        {/* ① 주제 입력 영역 */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <label
              htmlFor="topic-input"
              className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              보도자료 주제
            </label>
            <span className="text-xs text-slate-500">
              복잡한 정보 없이 핵심 키워드나 주제만 입력하세요
            </span>
          </div>

          <div className="space-y-3">
            <textarea
              id="topic-input"
              rows={3}
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                if (topicError && e.target.value.trim()) {
                  setTopicError(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerateTitlesAndOutline();
                }
              }}
              placeholder="예: 제천페이 사용방법, 무료페이 받는 방법"
              className={`w-full px-4 py-3.5 text-base sm:text-lg rounded-xl border transition-all focus:outline-hidden focus:ring-2 ${
                topicError
                  ? 'border-red-400 ring-2 ring-red-100 bg-red-50/20'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100 bg-white'
              } text-slate-900 placeholder:text-slate-400`}
            />

            {/* 입력 오류 메시지 안내 */}
            {topicError && (
              <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{topicError}</span>
              </div>
            )}

            {/* 가상 테스트 데이터 버튼 (사용자 편의) */}
            <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">빠른 테스트 예시:</span>
              {quickTestCases.map((tc) => (
                <button
                  key={tc.label}
                  type="button"
                  onClick={() => {
                    setTopic(tc.text);
                    setTopicError(null);
                    handleGenerateTitlesAndOutline(tc.text);
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition-colors font-medium cursor-pointer"
                >
                  <span className="text-slate-400 mr-1">[{tc.label}]</span>
                  {tc.text}
                </button>
              ))}
            </div>

            {/* 버튼: 제목·목차 생성 */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleGenerateTitlesAndOutline()}
                disabled={isGeneratingTitles}
                className="w-full sm:w-auto px-6 py-3.5 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-base rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isGeneratingTitles ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>주제 분석 및 제목·목차 생성 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>제목·목차 생성</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ② 제목·목차 영역 (생성된 경우 노출) */}
        {titles.length > 0 && (
          <section
            ref={step2Ref}
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6"
          >
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-blue-700 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  <span>2단계</span>
                  <span className="w-1 h-1 rounded-full bg-blue-700" />
                  <span>검토 및 직접 수정</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                  제목 후보 선택 및 목차 편집
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  AI가 제안한 제목 중 하나를 선택하거나 직접 수정하고, 목차 항목을 업무 상황에 맞게 편집하세요.
                </p>
              </div>

              {/* 추가 기능 3: 제목 다시 생성 버튼 */}
              <div>
                <button
                  type="button"
                  onClick={handleRegenerateTitles}
                  disabled={isRegeneratingTitles}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingTitles ? 'animate-spin' : ''}`} />
                  <span>{isRegeneratingTitles ? '새 제목 생성 중...' : '제목 다시 생성'}</span>
                </button>
              </div>
            </div>

            {/* 제목 후보 3개 선택 */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                제목 후보 (3개 중 선택 또는 직접 수정)
              </label>

              <div className="space-y-2.5">
                {titles.map((t, idx) => {
                  const isSelected = selectedTitleIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectTitle(idx)}
                      className={`p-3.5 rounded-xl border text-sm sm:text-base cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 text-blue-950 ring-1 ring-blue-500 font-medium'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="mt-0.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-slate-400 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 leading-snug">
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 mr-2">
                          후보 {idx + 1}
                        </span>
                        {t}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 선택된 제목 직접 수정 입력창 */}
              <div className="pt-2">
                <label
                  htmlFor="custom-title-input"
                  className="block text-xs font-semibold text-slate-600 mb-1.5"
                >
                  선택한 제목 직접 수정:
                </label>
                <div className="relative">
                  <input
                    id="custom-title-input"
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="보도자료에 사용할 제목을 직접 입력하세요"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-base font-semibold transition-colors"
                  />
                  <Edit3 className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 목차 직접 수정 */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  보도자료 목차 (직접 수정 가능)
                </label>
                <button
                  type="button"
                  onClick={handleAddOutlineItem}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  목차 항목 추가
                </button>
              </div>

              <div className="space-y-2">
                {outline.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs font-bold text-slate-400 shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleOutlineChange(idx, e.target.value)}
                      placeholder={`목차 항목 ${idx + 1}`}
                      className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 text-sm text-slate-800 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOutlineItem(idx)}
                      title="항목 삭제"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 버튼: 보도자료 작성 */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                수정된 제목과 목차를 바탕으로 공문서 양식 보도자료 초안을 작성합니다.
              </span>
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={isGeneratingDraft}
                className="w-full sm:w-auto px-7 py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white font-semibold text-base rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isGeneratingDraft ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>보도자료 초안 작성 중...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>보도자료 작성</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* ③ 최종 결과 영역 (제목, 목차, 보도자료 본문 및 추가 기능 버튼들) */}
        {draft && (
          <section
            ref={resultRef}
            className="bg-white border-2 border-blue-600/30 rounded-2xl p-5 sm:p-8 shadow-sm space-y-6"
          >
            {/* 상단 헤더 및 통계/동작 바 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 text-emerald-700 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>3단계: 최종 결과</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                  생성된 보도자료 초안
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* [확인 필요] 배지 */}
                {unverifiedCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    확인 필요 항목: {unverifiedCount}개
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    확인 필요 항목 없음
                  </span>
                )}

                {/* 본문 복사 버튼 */}
                <button
                  type="button"
                  onClick={handleCopyDraft}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>본문 복사</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 1) 제목 표시 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                확정 제목
              </span>
              <p className="text-base sm:text-lg font-bold text-slate-900">
                {customTitle}
              </p>
            </div>

            {/* 2) 목차 표시 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                확정 목차
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-700">
                {outline.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-800">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 추가 기능 버튼 바: 문체 다듬기 | 내용 점검 | 본문 다시 작성 */}
            <div className="bg-slate-100/90 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>AI 보조 도구:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* 문체 다듬기 버튼 */}
                <button
                  type="button"
                  onClick={handleRefineStyle}
                  disabled={isRefiningStyle}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-white hover:bg-blue-50 text-blue-800 border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wand2 className={`w-4 h-4 text-blue-600 ${isRefiningStyle ? 'animate-spin' : ''}`} />
                  <span>{isRefiningStyle ? '문체 다듬는 중...' : '문체 다듬기'}</span>
                </button>

                {/* 내용 점검 버튼 */}
                <button
                  type="button"
                  onClick={handleCheckContent}
                  disabled={isCheckingContent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-white hover:bg-amber-50 text-amber-900 border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SearchCheck className={`w-4 h-4 text-amber-600 ${isCheckingContent ? 'animate-spin' : ''}`} />
                  <span>{isCheckingContent ? '점검 분석 중...' : '내용 점검'}</span>
                </button>

                {/* 본문 다시 작성 버튼 */}
                <button
                  type="button"
                  onClick={handleRegenerateDraft}
                  disabled={isRegeneratingDraft}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-600 ${isRegeneratingDraft ? 'animate-spin' : ''}`} />
                  <span>{isRegeneratingDraft ? '초안 다시 작성 중...' : '본문 다시 작성'}</span>
                </button>
              </div>
            </div>

            {/* 문체 다듬기 결과 비교 영역 (별도 영역에 표시) */}
            {refinedDraft !== null && (
              <div className="bg-blue-50/70 border-2 border-blue-200 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-blue-200/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        문체 다듬기 결과 비교
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      공문서 표준 문체로 다듬어진 문장을 기존 문장과 비교해보세요. 수정 결과를 본문에 반영할 수 있습니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRefinedDraft(null)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
                    title="닫기"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-1.5">
                    <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-600">
                      기존 본문
                    </span>
                    <div className="max-h-60 overflow-y-auto whitespace-pre-wrap font-mono text-slate-600 text-xs sm:text-sm leading-relaxed p-1">
                      {draft}
                    </div>
                  </div>

                  <div className="bg-white border border-blue-300 ring-2 ring-blue-100 rounded-lg p-3.5 space-y-1.5">
                    <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-800">
                      AI 다듬은 문체 제안
                    </span>
                    <div className="max-h-60 overflow-y-auto whitespace-pre-wrap font-mono text-blue-950 text-xs sm:text-sm leading-relaxed p-1">
                      {refinedDraft}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRefinedDraft(null)}
                    className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyRefinedStyle}
                    className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>수정 결과 적용</span>
                  </button>
                </div>
              </div>
            )}

            {/* 내용 점검 결과 영역 */}
            {checkResult !== null && (
              <div className="bg-white border-2 border-amber-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-600" />
                      <h3 className="font-bold text-slate-900 text-base">
                        내용 점검 결과
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      작성된 문서를 내부적으로 점검한 결과입니다. (※ 외부 인터넷 사실 여부를 직접 확인한 것이 아닙니다.)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckResult(null)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
                    title="닫기"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 점검 요약 건수 카드 (클릭 시 해당 탭으로 전환) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveCheckTab('confirmation')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      activeCheckTab === 'confirmation'
                        ? 'border-amber-400 bg-amber-50/80 ring-2 ring-amber-100'
                        : 'border-slate-200 hover:border-amber-200 bg-white'
                    }`}
                  >
                    <span className="block text-xs font-semibold text-amber-800">
                      ① 확인 필요
                    </span>
                    <span className="text-lg font-bold text-amber-900 mt-0.5 block">
                      {checkResult.counts.confirmation}건
                    </span>
                    <span className="text-2xs text-slate-400">[확인 필요] 표기 항목</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCheckTab('caution')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      activeCheckTab === 'caution'
                        ? 'border-rose-400 bg-rose-50/80 ring-2 ring-rose-100'
                        : 'border-slate-200 hover:border-rose-200 bg-white'
                    }`}
                  >
                    <span className="block text-xs font-semibold text-rose-800">
                      ② 주의 필요
                    </span>
                    <span className="text-lg font-bold text-rose-900 mt-0.5 block">
                      {checkResult.counts.caution}건
                    </span>
                    <span className="text-2xs text-slate-400">날짜·금액 등 팩트 검증</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCheckTab('expression')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      activeCheckTab === 'expression'
                        ? 'border-indigo-400 bg-indigo-50/80 ring-2 ring-indigo-100'
                        : 'border-slate-200 hover:border-indigo-200 bg-white'
                    }`}
                  >
                    <span className="block text-xs font-semibold text-indigo-800">
                      ③ 표현 점검
                    </span>
                    <span className="text-lg font-bold text-indigo-900 mt-0.5 block">
                      {checkResult.expressionCheck.length}건
                    </span>
                    <span className="text-2xs text-slate-400">과장·단정적 표현</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCheckTab('good')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      activeCheckTab === 'good'
                        ? 'border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-100'
                        : 'border-slate-200 hover:border-emerald-200 bg-white'
                    }`}
                  >
                    <span className="block text-xs font-semibold text-emerald-800">
                      ④ 특별한 문제 없음
                    </span>
                    <span className="text-lg font-bold text-emerald-900 mt-0.5 block">
                      {checkResult.counts.good}건
                    </span>
                    <span className="text-2xs text-slate-400">공문서 양식 충족</span>
                  </button>
                </div>

                {/* 탭별 세부 점검 내용 목록 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  {activeCheckTab === 'confirmation' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 pb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>확인이 필요한 항목 ([확인 필요] 표시 부분)</span>
                      </div>
                      {checkResult.needsConfirmation.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">본문에 [확인 필요]로 표시된 미기재 항목이 없습니다.</p>
                      ) : (
                        <div className="space-y-2">
                          {checkResult.needsConfirmation.map((item, idx) => (
                            <div key={idx} className="bg-white border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                              <span className="font-semibold text-amber-950 bg-amber-100/70 px-1.5 py-0.5 rounded">
                                {item.text}
                              </span>
                              <p className="text-slate-600 pl-1">{item.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeCheckTab === 'caution' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 pb-1">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>주의가 필요한 구체적인 정보 (날짜, 금액, 인원, 통계 등 사실 확인 필요)</span>
                      </div>
                      {checkResult.needsCaution.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">주의가 요구되는 미검증 구체적 사실 표기가 발견되지 않았습니다.</p>
                      ) : (
                        <div className="space-y-2">
                          {checkResult.needsCaution.map((item, idx) => (
                            <div key={idx} className="bg-white border border-rose-200 rounded-lg p-3 text-xs space-y-1">
                              <span className="font-semibold text-rose-950 bg-rose-100/70 px-1.5 py-0.5 rounded">
                                {item.text}
                              </span>
                              <p className="text-slate-600 pl-1">{item.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeCheckTab === 'expression' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 pb-1">
                        <Edit3 className="w-4 h-4 text-indigo-600" />
                        <span>표현 및 주제 연관성 점검 (과장/단정적 표현 등)</span>
                      </div>
                      {checkResult.expressionCheck.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">과장되거나 부적절한 표현 없이 객관적인 문체로 작성되었습니다.</p>
                      ) : (
                        <div className="space-y-2">
                          {checkResult.expressionCheck.map((item, idx) => (
                            <div key={idx} className="bg-white border border-indigo-200 rounded-lg p-3 text-xs space-y-1">
                              <span className="font-semibold text-indigo-950 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                                {item.text}
                              </span>
                              <p className="text-slate-600 pl-1">{item.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeCheckTab === 'good' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 pb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>특별한 문제 없음 (우수 사항 및 표준 양식 부합)</span>
                      </div>
                      {checkResult.goodPoints.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">기본적인 보도자료 규격이 적용되어 있습니다.</p>
                      ) : (
                        <div className="space-y-2">
                          {checkResult.goodPoints.map((item, idx) => (
                            <div key={idx} className="bg-white border border-emerald-200 rounded-lg p-3 text-xs space-y-1">
                              <span className="font-semibold text-emerald-950 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                {item.text}
                              </span>
                              <p className="text-slate-600 pl-1">{item.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3) 보도자료 본문 (화면에서 직접 수정 가능한 편집 영역) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="draft-textarea"
                  className="text-sm font-bold text-slate-900 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  보도자료 본문 (화면에서 직접 수정 가능)
                </label>
                <span className="text-xs text-slate-400">
                  {draft.length.toLocaleString()} 자
                </span>
              </div>

              <textarea
                id="draft-textarea"
                rows={18}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full px-4 py-3.5 text-sm sm:text-base leading-relaxed font-mono rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 bg-white shadow-inner transition-colors"
                placeholder="보도자료 본문 내용입니다..."
              />
            </div>

            {/* 안내 풋터 */}
            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                본문 내 <span className="font-bold text-amber-900 bg-amber-100 px-1 py-0.5 rounded">[확인 필요]</span> 표시된 항목은 지자체 실무 데이터(실제 시행일자, 예산 및 지원액, 문의처 전화번호 등)로 직접 수정한 후 최종 보도자료로 배포하시기 바랍니다.
              </div>
            </div>
          </section>
        )}
      </main>

      {/* 하단 푸터 */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4">
          <p className="font-medium text-slate-600">지역 보도자료 초안 생성기 • 지자체 행정 교육용 프로토타입</p>
          <p className="mt-1 text-slate-400">
            실제 개인정보나 주민등록번호 등 민감정보를 처리하지 않으며, 공공 보도자료 표준 작성 가이드라인을 준수합니다.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ChevronArrow() {
  return (
    <div className="hidden sm:flex text-slate-300">
      <ArrowRight className="w-4 h-4" />
    </div>
  );
}
