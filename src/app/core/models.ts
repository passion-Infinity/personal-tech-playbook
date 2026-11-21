export interface Topic {
  id: string;
  name: string;
  description: string;
}

export interface Keyword {
  id: string;
  /** Exact English technical term. */
  term: string;
  /** Short Vietnamese meaning. */
  meaning: string;
  /** Concise definition (Vietnamese, English terms preserved). */
  definition: string;
  topicId: string;
}

export interface Playbook {
  id: string;
  title: string;
  summary: string;
  topicId: string;
  keywordIds: string[];
  /** Relative to the app base href, e.g. assets/knowledge/playbooks/<topic>/<id>.md */
  filePath: string;
  /** YYYY-MM-DD */
  updatedAt: string;
  /** Playbook ids worth reading first. Independent playbooks share a level on the roadmap. */
  prerequisites?: string[];
}

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export type QuestionType = 'mcq' | 'bug' | 'explain';

export interface Question {
  id: string;
  playbookId: string;
  type: QuestionType;
  /** 1 = recall, 2 = apply, 3 = trade-off / design judgement */
  difficulty: 1 | 2 | 3;
  question: string;
  /** `bug` questions: AI-style code containing a subtle defect. */
  code?: { language: string; text: string };
  options?: string[];
  /** Indices of correct options (more than one = "select all that apply"). */
  answer?: number[];
  explanation?: string;
  /** `explain` questions: reference answer and the points a good answer covers. */
  modelAnswer?: string;
  keyPoints?: string[];
}

export interface RubricItem {
  item: string;
  points: number;
}

export interface Challenge {
  id: string;
  title: string;
  topicId: string;
  difficulty: 1 | 2 | 3;
  /** Playbooks to have read before attempting. */
  prerequisites: string[];
  scenario: string;
  requirements: string[];
  hints: string[];
  rubric: RubricItem[];
  /** Markdown reference solution. */
  solution: string;
  pitfalls: string[];
}
