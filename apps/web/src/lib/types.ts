/** Shared frontend types inferred from tRPC outputs.
 *  These are lightweight type aliases for data shapes used across components.
 *  For strict typing, prefer tRPC inferred types: RouterOutputs['router']['procedure'] */

export interface Question {
  id: string;
  examTypeId?: string;
  sectionTypeId?: string;
  format?: string;
  passageText?: string | null;
  questionText?: string;
  options?: unknown;
  correctAnswer?: string | null;
  explanation?: string | null;
  difficulty?: number | null;
  isPublic?: boolean;
  creatorUserId?: string | null;
  examTypeName?: string | null;
  sectionTypeName?: string | null;
  skillTags?: string[] | null;
  usageCount?: number;
  avgRating?: number | null;
  creatorName?: string | null;
  source?: string | null;
  _examType?: string;
  _isRtl?: boolean;
  _useFurigana?: boolean;
}

export interface Package {
  id: string;
  title?: string;
  description?: string | null;
  examTypeId?: string;
  examTypeName?: string | null;
  creatorUserId?: string | null;
  creatorName?: string | null;
  isPublic?: boolean;
  totalQuestions?: number;
  totalSections?: number;
  estimatedDurationMin?: number | null;
  usageCount?: number;
  avgRating?: number | null;
}

export interface PackageSection {
  id: string;
  title?: string;
  questions?: Question[];
  packageId?: string;
  packageTitle?: string | null;
  examTypeName?: string | null;
  sectionTypeName?: string | null;
  sectionTypeId?: string;
  orderIndex?: number;
}

export interface AttemptSection {
  id: string;
  title?: string;
  questions?: Question[];
  answers?: Array<{
    questionId: string;
    userAnswer?: string;
    answer?: string;
    isCorrect?: boolean | null;
    partialScore?: number | null;
    timeSpentSec?: number;
  }>;
}

export interface Attempt {
  id: string;
  packageId?: string;
  status?: string;
  score?: number | null;
  sections?: AttemptSection[];
}

export interface JobItem {
  id: string;
  status: string;
  examTypeId?: string;
  sectionTypeId?: string;
  format?: string;
}
