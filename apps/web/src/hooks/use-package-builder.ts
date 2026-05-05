import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

export function usePackageBuilder() {
  const navigate = useNavigate();

  const createPackage = useMutation(trpc.package.create.mutationOptions());
  const addSection = useMutation(trpc.package.addSection.mutationOptions());
  const addQuestion = useMutation(trpc.package.addQuestion.mutationOptions());

  const isPending = createPackage.isPending || addSection.isPending || addQuestion.isPending;

  const handleCreatePackage = async (params: {
    selectedIds: Set<string>;
    questions: Array<{ id: string; examTypeId: string; sectionTypeId: string; sectionTypeName?: string | null; [key: string]: any }>;
    title: string;
    description: string;
    isPublic: boolean;
  }) => {
    if (params.selectedIds.size === 0) return;

    const firstId = Array.from(params.selectedIds)[0];
    const firstQ = params.questions.find((q) => q.id === firstId);
    const examTypeId = firstQ?.examTypeId ?? "";

    try {
      const pkg = await createPackage.mutateAsync({
        title: params.title,
        description: params.description,
        examTypeId,
        isPublic: params.isPublic,
        estimatedDurationMin: params.selectedIds.size * 2,
      });

      const sec = await addSection.mutateAsync({
        packageId: pkg.id,
        sectionTypeId: firstQ?.sectionTypeId ?? "READING",
        title: `${firstQ?.sectionTypeName ?? "Reading"} Section`,
        orderIndex: 0,
      });

      const ids = Array.from(params.selectedIds);
      for (let i = 0; i < ids.length; i++) {
        await addQuestion.mutateAsync({
          sectionId: sec.id,
          questionId: ids[i],
          orderIndex: i,
        });
      }

      navigate({ to: "/package/$id", params: { id: pkg.id } });
    } catch (err: any) {
      toast.error("Gagal membuat paket", { description: err.message });
    }
  };

  const handleAutoBundle = async (params: {
    title: string;
    description: string;
    isPublic: boolean;
    examTypeId: string;
    sectionTypeId: string;
    count: number;
    sortOrder: "random" | "difficulty";
    allQuestions: Array<{ id: string; examTypeId: string; difficulty: number }>;
  }) => {
    const available = params.allQuestions.filter((q) => q.examTypeId === params.examTypeId);

    let picked = available;
    if (params.sortOrder === "random") {
      picked = [...available].sort(() => Math.random() - 0.5);
    } else {
      picked = [...available].sort((a, b) => a.difficulty - b.difficulty);
    }
    picked = picked.slice(0, params.count);

    if (picked.length === 0) {
      toast.error("Tidak ada soal tersedia untuk ujian ini.");
      return;
    }

    try {
      const pkg = await createPackage.mutateAsync({
        title: params.title,
        description: params.description,
        examTypeId: params.examTypeId,
        isPublic: params.isPublic,
        estimatedDurationMin: picked.length * 2,
      });

      const sec = await addSection.mutateAsync({
        packageId: pkg.id,
        sectionTypeId: params.sectionTypeId,
        title: `${params.sectionTypeId} Section`,
        orderIndex: 0,
      });

      for (let i = 0; i < picked.length; i++) {
        await addQuestion.mutateAsync({
          sectionId: sec.id,
          questionId: picked[i].id,
          orderIndex: i,
        });
      }

      navigate({ to: "/package/$id", params: { id: pkg.id } });
    } catch (err: any) {
      toast.error("Gagal membuat paket", { description: err.message });
    }
  };

  return {
    isPending,
    handleCreatePackage,
    handleAutoBundle,
  };
}
