import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { getErrorMessage } from "@/lib/error-utils";

function getTimerKey(attemptId: string | null) {
  return attemptId ? `labas_attempt_timer_${attemptId}` : null;
}

function getMarkedKey(attemptId: string | null) {
  return attemptId ? `labas_attempt_marked_${attemptId}` : null;
}

function getSectionKey(attemptId: string | null) {
  return attemptId ? `labas_attempt_section_${attemptId}` : null;
}

function loadElapsedTime(attemptId: string | null): number {
  const key = getTimerKey(attemptId);
  if (!key) return 0;
  const saved = localStorage.getItem(key);
  return saved ? parseInt(saved, 10) || 0 : 0;
}

function saveElapsedTime(attemptId: string | null, seconds: number) {
  const key = getTimerKey(attemptId);
  if (key) localStorage.setItem(key, String(seconds));
}

function clearElapsedTime(attemptId: string | null) {
  const key = getTimerKey(attemptId);
  if (key) localStorage.removeItem(key);
}

function loadMarkedQuestions(attemptId: string | null): Set<string> {
  const key = getMarkedKey(attemptId);
  if (!key) return new Set();
  try {
    const saved = localStorage.getItem(key);
    if (saved) return new Set(JSON.parse(saved));
  } catch {
    // ignore parse errors
  }
  return new Set();
}

function saveMarkedQuestions(attemptId: string | null, marked: Set<string>) {
  const key = getMarkedKey(attemptId);
  if (key) localStorage.setItem(key, JSON.stringify(Array.from(marked)));
}

function clearMarkedQuestions(attemptId: string | null) {
  const key = getMarkedKey(attemptId);
  if (key) localStorage.removeItem(key);
}

function loadSectionIdx(attemptId: string | null): number {
  const key = getSectionKey(attemptId);
  if (!key) return 0;
  const saved = localStorage.getItem(key);
  return saved ? parseInt(saved, 10) || 0 : 0;
}

function saveSectionIdx(attemptId: string | null, idx: number) {
  const key = getSectionKey(attemptId);
  if (key) localStorage.setItem(key, String(idx));
}

function clearSectionIdx(attemptId: string | null) {
  const key = getSectionKey(attemptId);
  if (key) localStorage.removeItem(key);
}

export function useTestSession(packageId: string, existingAttemptId?: string) {
  const navigate = useNavigate();
  const restoredRef = useRef(false);

  const [attemptId, setAttemptId] = useState<string | null>(existingAttemptId ?? null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(loadSectionIdx(existingAttemptId ?? null));
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isStarted, setIsStarted] = useState(!!existingAttemptId);
  const [isFinished, setIsFinished] = useState(false);
  const [submittingQId, setSubmittingQId] = useState<string | null>(null);
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(
    () => loadMarkedQuestions(existingAttemptId ?? null),
  );
  const [startError, setStartError] = useState<string | null>(null);

  // Track when each question was first viewed (for timeSpentSec)
  const questionStartTimes = useRef<Record<string, number>>({});

  const startMutation = useMutation(trpc.attempt.start.mutationOptions());
  const submitMutation = useMutation(trpc.attempt.submitAnswer.mutationOptions());
  const finishMutation = useMutation(trpc.attempt.finish.mutationOptions());
  const abandonMutation = useMutation(trpc.attempt.abandon.mutationOptions());

  // Restore attempt data when continuing an existing attempt
  const attemptQuery = useQuery(
    trpc.attempt.getById.queryOptions(
      { id: existingAttemptId! },
      { enabled: !!existingAttemptId && !restoredRef.current },
    ),
  );

  useEffect(() => {
    if (!existingAttemptId || restoredRef.current) return;
    const data = attemptQuery.data;
    if (!data) return;

    restoredRef.current = true;

    // Restore answers from server
    const restoredAnswers: Record<string, string> = {};
    for (const sec of data.sections ?? []) {
      for (const ans of sec.answers ?? []) {
        if (ans.questionId && ans.userAnswer != null) {
          restoredAnswers[ans.questionId] = ans.userAnswer;
        }
      }
    }
    setAnswers(restoredAnswers);

    // Calculate elapsed time from startedAt, but prefer localStorage if larger
    let elapsed = 0;
    if (data.startedAt) {
      elapsed = Math.round((Date.now() - new Date(data.startedAt).getTime()) / 1000);
    }
    const savedTimer = loadElapsedTime(existingAttemptId);
    const finalElapsed = Math.max(elapsed, savedTimer);
    setTimeElapsed(finalElapsed);
    if (finalElapsed > 0) saveElapsedTime(existingAttemptId, finalElapsed);

    // Restore section index from localStorage
    const savedSection = loadSectionIdx(existingAttemptId);
    setCurrentSectionIdx(savedSection);
  }, [existingAttemptId, attemptQuery.data]);

  // Persist currentSectionIdx to localStorage
  useEffect(() => {
    if (attemptId) saveSectionIdx(attemptId, currentSectionIdx);
  }, [attemptId, currentSectionIdx]);

  // Timer with localStorage persistence
  useEffect(() => {
    if (!isStarted || isFinished || !attemptId) return;
    const interval = setInterval(() => {
      setTimeElapsed((t) => {
        const next = t + 1;
        saveElapsedTime(attemptId, next);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isStarted, isFinished, attemptId]);

  const handleStart = useCallback(async () => {
    setStartError(null);
    console.log("[useTestSession] handleStart called, packageId:", packageId);
    try {
      const res = await startMutation.mutateAsync({ packageId });
      console.log("[useTestSession] start mutation result:", res);
      if (!res?.attemptId) {
        throw new Error("Server tidak mengembalikan attempt ID.");
      }
      setAttemptId(res.attemptId);
      setIsStarted(true);
      // Load any saved timer (in case of refresh during attempt)
      const saved = loadElapsedTime(res.attemptId);
      if (saved > 0) setTimeElapsed(saved);
    } catch (err: unknown) {
      console.error("[useTestSession] Start attempt failed:", err);
      setStartError(getErrorMessage(err));
    }
  }, [packageId, startMutation]);

  const handleAnswerChange = useCallback(
    async (questionId: string, sectionResultId: string | undefined, value: string) => {
      if (!attemptId || isFinished) return;
      // Always update UI immediately — sectionResultId may load a tick after attempt starts
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      if (!sectionResultId) return;

      setSubmittingQId(questionId);

      // Start timer if first interaction
      if (!questionStartTimes.current[questionId]) {
        questionStartTimes.current[questionId] = Date.now();
      }

      // Calculate time spent on this question
      const startTime = questionStartTimes.current[questionId];
      const timeSpentSec = startTime ? Math.round((Date.now() - startTime) / 1000) : undefined;

      try {
        await submitMutation.mutateAsync({
          attemptId,
          sectionResultId,
          questionId,
          userAnswer: value,
          timeSpentSec,
        });
      } finally {
        setSubmittingQId(null);
      }
    },
    [attemptId, isFinished, submitMutation],
  );

  const handleFinish = useCallback(async () => {
    if (!attemptId) return;
    setIsFinished(true);
    await finishMutation.mutateAsync({ attemptId });
    clearElapsedTime(attemptId);
    clearMarkedQuestions(attemptId);
    clearSectionIdx(attemptId);
    navigate({ to: "/attempt/$id", params: { id: attemptId } });
  }, [attemptId, finishMutation, navigate]);

  const handleAbandon = useCallback(async () => {
    if (!attemptId) return;
    await abandonMutation.mutateAsync({ attemptId });
    clearElapsedTime(attemptId);
    clearMarkedQuestions(attemptId);
    clearSectionIdx(attemptId);
    navigate({ to: "/packages" });
  }, [attemptId, abandonMutation, navigate]);

  const toggleMarkQuestion = useCallback(
    (questionId: string) => {
      setMarkedQuestions((prev) => {
        const next = new Set(prev);
        if (next.has(questionId)) next.delete(questionId);
        else next.add(questionId);
        if (attemptId) saveMarkedQuestions(attemptId, next);
        return next;
      });
    },
    [attemptId],
  );

  // Track question start time when user navigates to a question
  const startQuestionTimer = useCallback((questionId: string) => {
    if (!questionStartTimes.current[questionId]) {
      questionStartTimes.current[questionId] = Date.now();
    }
  }, []);

  return {
    attemptId,
    currentSectionIdx,
    setCurrentSectionIdx,
    answers,
    timeElapsed,
    isStarted,
    isFinished,
    submittingQId,
    markedQuestions,
    startPending: startMutation.isPending,
    startError,
    handleStart,
    handleAnswerChange,
    handleFinish,
    handleAbandon,
    toggleMarkQuestion,
    startQuestionTimer,
  };
}
