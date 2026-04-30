import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";

function getTimerKey(attemptId: string | null) {
  return attemptId ? `labas_attempt_timer_${attemptId}` : null;
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

export function useTestSession(packageId: string) {
  const navigate = useNavigate();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [submittingQId, setSubmittingQId] = useState<string | null>(null);
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());
  const [startError, setStartError] = useState<string | null>(null);

  // Track when each question was first viewed (for timeSpentSec)
  const questionStartTimes = useRef<Record<string, number>>({});

  const startMutation = useMutation(trpc.attempt.start.mutationOptions());
  const submitMutation = useMutation(trpc.attempt.submitAnswer.mutationOptions());
  const finishMutation = useMutation(trpc.attempt.finish.mutationOptions());
  const abandonMutation = useMutation(trpc.attempt.abandon.mutationOptions());

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
    } catch (err: any) {
      console.error("[useTestSession] Start attempt failed:", err);
      setStartError(err.message ?? "Gagal memulai latihan. Coba lagi.");
    }
  }, [packageId, startMutation]);

  const handleAnswerChange = useCallback(
    async (questionId: string, sectionResultId: string, value: string) => {
      if (!attemptId || isFinished) return;
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
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
    navigate({ to: "/attempt/$id", params: { id: attemptId } });
  }, [attemptId, finishMutation, navigate]);

  const handleAbandon = useCallback(async () => {
    if (!attemptId) return;
    await abandonMutation.mutateAsync({ attemptId });
    clearElapsedTime(attemptId);
    navigate({ to: "/packages" });
  }, [attemptId, abandonMutation, navigate]);

  const toggleMarkQuestion = useCallback((questionId: string) => {
    setMarkedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, []);

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
