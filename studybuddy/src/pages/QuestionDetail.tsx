import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, orderBy, onSnapshot, writeBatch, serverTimestamp, runTransaction } from "firebase/firestore";
import { QuestionDoc, AnswerDoc } from "../types";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChevronUp, Clock, AlertCircle } from "lucide-react";

export function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [question, setQuestion] = useState<QuestionDoc | null>(null);
  const [answers, setAnswers] = useState<AnswerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newAnswer, setNewAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Listen to Question
    const qUnsub = onSnapshot(doc(db, "questions", id), (docSnap) => {
      if (docSnap.exists()) {
        setQuestion({ id: docSnap.id, ...docSnap.data() } as QuestionDoc);
      } else {
        setQuestion(null);
      }
      setLoading(false);
    });

    // Listen to Answers
    const aQ = query(collection(db, "questions", id, "answers"), orderBy("createdAt", "asc"));
    const aUnsub = onSnapshot(aQ, (snap) => {
      const aList: AnswerDoc[] = [];
      snap.forEach(d => {
        aList.push({ id: d.id, ...d.data() } as AnswerDoc);
      });
      // Sort so 'isCorrect' is always at the top, followed by upvotes
      aList.sort((a, b) => {
        if (a.isCorrect && !b.isCorrect) return -1;
        if (!a.isCorrect && b.isCorrect) return 1;
        return b.upvotes - a.upvotes;
      });
      setAnswers(aList);
    });

    return () => {
      qUnsub();
      aUnsub();
    };
  }, [id]);

  const handleSubmitAnswer = async () => {
    if (!user) {
      toast.error("You must be signed in to answer.");
      return;
    }
    if (!newAnswer.trim()) {
      toast.error("Answer cannot be empty.");
      return;
    }

    setSubmitting(true);
    try {
      const answerRef = doc(collection(db, "questions", id!, "answers"));
      const qRef = doc(db, "questions", id!);

      const batch = writeBatch(db);
      
      batch.set(answerRef, {
        authorId: user.uid,
        content: newAnswer.trim(),
        isCorrect: false,
        upvotes: 0,
        createdAt: serverTimestamp()
      });

      // Increment answer count locally to bypass security rules sync check (rules currently allow this specific logic)
      batch.update(qRef, { answerCount: (question?.answerCount || 0) + 1 });

      await batch.commit();
      setNewAnswer("");
      toast.success("Answer posted!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to post answer: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (answerId: string, currentUpvotes: number) => {
    if (!user) {
      toast.error("Sign in to upvote.");
      return;
    }
    const upvoteRef = doc(db, "questions", id!, "answers", answerId, "upvotes", user.uid);
    const ansRef = doc(db, "questions", id!, "answers", answerId);

    try {
      const voteSnap = await getDoc(upvoteRef);
      if (voteSnap.exists()) {
        toast.info("You already upvoted this answer.");
        // Could implement remove upvote via delete from upvotes table & decrement, but keeping it simple for mvp
        return;
      }

      const batch = writeBatch(db);
      batch.set(upvoteRef, { userId: user.uid, createdAt: serverTimestamp() });
      batch.update(ansRef, { upvotes: currentUpvotes + 1 });
      await batch.commit();
      toast.success("Upvoted!");
    } catch (err: any) {
      console.error(err);
      toast.error("Could not upvote.");
    }
  };

  const handleMarkCorrect = async (answerId: string, answerAuthorId: string) => {
    if (!user || user.uid !== question?.authorId) {
      toast.error("Only the author can mark an answer as correct.");
      return;
    }
    
    try {
      const batch = writeBatch(db);
      
      // Mark answer as correct
      const ansRef = doc(db, "questions", id!, "answers", answerId);
      batch.update(ansRef, { isCorrect: true });
      
      // Mark question as resolved
      const qRef = doc(db, "questions", id!);
      batch.update(qRef, { status: 'resolved' });

      // Reward the user (in a real app, this MUST be a transaction or secure cloud function, but MVP pattern given allows some client writes)
      // Wait, our rules say "incoming().diff(existing()).affectedKeys().hasOnly(['isCorrect'])" -- yes it works.
      // But the reputation update needs a separate transaction
      
      await batch.commit();
      
      // Update reputation in a separate step:
      if (answerAuthorId !== user.uid) { // don't reward self-answering
        try {
           await runTransaction(db, async (t) => {
              const uRef = doc(db, "users", answerAuthorId);
              const uSnap = await t.get(uRef);
              if (uSnap.exists()) {
                t.update(uRef, { reputation: uSnap.data().reputation + 15 });
              }
           });
        } catch(repErr) {
           console.error("Couldnt update rep", repErr);
        }
      }

      toast.success("Marked as correct! The helper has been rewarded.");
    } catch (err: any) {
      console.error(err);
      toast.error("Could not mark correct.");
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!question) return <div className="text-center py-12">Question not found.</div>;

  const isAuthor = user?.uid === question.authorId;
  const isPastDeadline = question.deadline < Date.now();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Question Card */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
        <div className="bg-indigo-50/50 px-6 py-5 border-b border-indigo-100 flex flex-col md:flex-row gap-4 justify-between items-start">
          <div>
             <h1 className="text-2xl font-bold text-slate-900 mb-2">{question.topic}</h1>
             <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <Badge variant="outline" className="bg-white">{question.course}</Badge>
                <span className="font-medium">{question.subject}</span>
                <span>•</span>
                <span>{question.isAnonymous ? "Anonymous User" : "Classmate"}</span>
                <span>•</span>
                <span>{formatDistanceToNow(question.createdAt?.toMillis() || Date.now(), { addSuffix: true })}</span>
             </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {question.status === "resolved" 
              ? <Badge className="bg-emerald-500 hover:bg-emerald-600 text-sm px-3 py-1"><CheckCircle2 className="w-4 h-4 mr-1"/> Resolved</Badge>
              : (
                <div className={`flex items-center gap-1.5 text-sm font-medium ${isPastDeadline ? 'text-red-500' : 'text-amber-600'}`}>
                  <Clock className="w-4 h-4" />
                  {isPastDeadline ? "Deadline Passed" : `Due in ${formatDistanceToNow(question.deadline)}`}
                </div>
              )
            }
          </div>
        </div>
        <div className="p-6 md:p-8">
          <MarkdownRenderer content={question.content} />
        </div>
      </div>

      {/* Answers Section */}
      <div>
        <h3 className="text-xl font-bold mb-4">{answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}</h3>
        
        <div className="space-y-4">
          {answers.map(ans => (
            <div key={ans.id} className={`border ${ans.isCorrect ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 bg-white'} rounded-3xl overflow-hidden shadow-sm flex flex-col sm:flex-row transition-all`}>
              {/* Voting Column */}
              <div className={`${ans.isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'} w-full sm:w-20 shrink-0 flex flex-row sm:flex-col items-center justify-center sm:py-6 border-b sm:border-b-0 sm:border-r gap-4 sm:gap-2 p-3 sm:p-0`}>
                  <button 
                    onClick={() => handleUpvote(ans.id!, ans.upvotes)}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                  >
                    <ChevronUp className="w-8 h-8" />
                  </button>
                  <span className="text-lg font-bold text-slate-700">{ans.upvotes}</span>
                  {ans.isCorrect && (
                     <div className="mt-4 text-emerald-500" title="Accepted Answer">
                       <CheckCircle2 className="w-6 h-6" />
                     </div>
                  )}
                </div>
                
              {/* Content Column */}
              <div className="flex-1 p-5 sm:p-6 min-w-0 flex flex-col">
                <div className="mb-4">
                  <MarkdownRenderer content={ans.content} />
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-dashed border-slate-200">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                       <span>{formatDistanceToNow(ans.createdAt?.toMillis() || Date.now())} ago</span>
                    </div>

                    {/* Author Controls */}
                    {isAuthor && !ans.isCorrect && question.status === 'open' && (
                       <Button 
                         variant="outline" 
                         size="sm"
                         onClick={() => handleMarkCorrect(ans.id!, ans.authorId)}
                         className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                       >
                         <CheckCircle2 className="w-4 h-4 mr-2" />
                         Mark as Correct
                       </Button>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Answer Form */}
        {question.status === 'open' ? (
          <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h4 className="font-bold text-lg mb-4 text-slate-800">Your Answer</h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-none bg-slate-50 focus-within:ring-2 ring-indigo-500/20 focus-within:border-indigo-500 transition-all flex flex-col">
              <Textarea
                placeholder="Write your answer... (Markdown & Math formatting supported)"
                value={newAnswer}
                onChange={e => setNewAnswer(e.target.value)}
                className="min-h-[150px] bg-transparent border-0 focus-visible:ring-0 rounded-none resize-y p-5 text-sm font-sans"
              />
              <div className="bg-white border-t p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                  Helpful, accurate answers earn reputation points.
                </span>
                <Button 
                  onClick={handleSubmitAnswer} 
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-8 py-2.5 shadow-md shadow-indigo-100 font-bold w-full md:w-auto"
                >
                  {submitting ? "Posting..." : "Post Answer"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 p-6 bg-slate-100 rounded-xl text-center text-slate-500 font-medium">
            This question has been resolved and is no longer accepting new answers.
          </div>
        )}
      </div>
    </div>
  );
}
