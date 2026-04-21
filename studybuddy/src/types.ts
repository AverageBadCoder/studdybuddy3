export type UserDoc = {
  email: string;
  reputation: number;
  createdAt: any;
};

export type QuestionDoc = {
  id?: string;
  authorId: string;
  course: string;
  subject: string;
  topic: string;
  content: string;
  deadline: number;
  isAnonymous: boolean;
  createdAt: any;
  status: 'open' | 'resolved';
  answerCount: number;
};

export type AnswerDoc = {
  id?: string;
  authorId: string;
  content: string;
  isCorrect: boolean;
  upvotes: number;
  createdAt: any;
};
