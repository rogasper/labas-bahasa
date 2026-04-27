import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";

export function useTestSession(packageId: string) {
  const navigate = useNavigate();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [submittingQId, setSubmittingQId] = useState<string | null>(null);

  const startMutation = useMutation(trpc.attempt.start.mutationOptions());
  const submitMutation = useMutation(trpc.attempt.submitAnswer.mutationOptions());
  const finishMutation = useMutation(trpc.attempt.finish.mutationOptions());

  // Timer
  useEffect(() => {
    if (!isStarted || isFinished) return;
    const interval = setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isStarted, isFinished]);

  const handleStart = useCallback(async () => {
    const res = await startMutation.mutateAsync({ packageId });
    setAttemptId(res.attemptId);
    setIsStarted(true);
  }, [packageId, startMutation]);

  const handleAnswerChange = useCallback(
    async (questionId: string, sectionResultId: string, value: string) => {
      if (!attemptId || isFinished) return;
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      setSubmittingQId(questionId);
      try {
        await submitMutation.mutateAsync({
          attemptId,
          sectionResultId,
          questionId,
          userAnswer: value,
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
    navigate({ to: "/attempt/$id", params: { id: attemptId } });
  }, [attemptId, finishMutation, navigate]);

  return {
    attemptId,
    currentSectionIdx,
    setCurrentSectionIdx,
    answers,
    timeElapsed,
    isStarted,
    isFinished,
    submittingQId,
    startPending: startMutation.isPending,
    handleStart,
    handleAnswerChange,
    handleFinish,
  };
}
