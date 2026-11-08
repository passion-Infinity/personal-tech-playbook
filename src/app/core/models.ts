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
}

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}
