import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, where, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { QuestionDoc } from "../types";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Target, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "../lib/AuthContext";

export function Feed() {
  const [questions, setQuestions] = useState<QuestionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const { user } = useAuth();

  useEffect(() => {
    let q = query(
      collection(db, "questions"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    if (filterCourse) {
      q = query(
        collection(db, "questions"),
        where("course", "==", filterCourse),
        orderBy("createdAt", "desc"),
        limit(100)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const qList: QuestionDoc[] = [];
      snapshot.forEach((doc) => {
        qList.push({ id: doc.id, ...doc.data() } as QuestionDoc);
      });

      if (sortBy === "deadline") {
        qList.sort((a, b) => a.deadline - b.deadline);
      } else if (sortBy === "unanswered") {
        qList.sort((a, b) => {
          if (a.answerCount === 0 && b.answerCount > 0) return -1;
          if (a.answerCount > 0 && b.answerCount === 0) return 1;
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        });
      }

      setQuestions(qList);
      setLoading(false);
    });

    return unsubscribe;
  }, [filterCourse, sortBy]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Main Search / Greeting */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:px-8 md:py-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="w-full md:w-auto text-center md:text-left">
          <h2 className="text-xl font-bold">
            Welcome back{user ? <>, <span className="text-indigo-600">{user.displayName?.split(' ')[0] || "Student"}</span></> : ''}!
          </h2>
          <p className="text-slate-500 text-sm mt-1">Ready to tackle some problems today?</p>
        </div>
        <div className="relative w-full md:w-1/2 flex gap-2">
          <div className="relative w-full">
            <input 
              type="text" 
              placeholder="Search course codes (e.g. CS101)..." 
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value.toUpperCase())}
              className="w-full bg-slate-100 border-none rounded-2xl pl-5 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <div className="absolute right-4 top-3 text-slate-400">
              <Search className="w-5 h-5 pointer-events-none" />
            </div>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] border-none bg-slate-100 rounded-2xl h-[44px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="deadline">Nearest Deadline</SelectItem>
              <SelectItem value="unanswered">Unanswered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Feed Section (Bento Primary) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col flex-1 overflow-hidden min-h-[500px]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg md:text-xl text-slate-800">Recent Questions</h3>
          <Link to="/ask" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition duration-200">
            Post Question
          </Link>
        </div>
        
        <div className="space-y-4 flex-1">
          {loading && <p className="text-center text-slate-400 p-8 font-medium">Loading questions...</p>}
          {!loading && questions.length === 0 && (
            <div className="text-center p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-muted-foreground">
              <Target className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700">No questions found</h3>
              <p className="text-sm mt-1">Try adjusting your course filter or be the first to ask!</p>
            </div>
          )}
          
          {questions.map(q => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ question }: { question: QuestionDoc }) {
  const isPast = new Date(question.deadline).getTime() < Date.now();
  const deadlineFormat = isPast 
    ? "Deadline passed"
    : `Due ${formatDistanceToNow(question.deadline, { addSuffix: true })}`;

  const isUrgent = !isPast && question.deadline - Date.now() < 3 * 60 * 60 * 1000; // < 3 hours

  // Styling based on urgency/status
  let borderColor = "border-slate-100";
  let hoverColor = "hover:border-indigo-200 hover:bg-indigo-50/30";
  let deadlineBadgeBg = "bg-slate-100";
  let deadlineBadgeText = "text-slate-600";
  
  if (question.status === 'resolved') {
    borderColor = "border-emerald-100";
    hoverColor = "hover:border-emerald-200 hover:bg-emerald-50/40";
    deadlineBadgeBg = "bg-emerald-100";
    deadlineBadgeText = "text-emerald-700";
  } else if (isUrgent) {
    borderColor = "border-red-100 bg-red-50/10";
    hoverColor = "hover:border-red-200 hover:bg-red-50/30";
    deadlineBadgeBg = "bg-red-100";
    deadlineBadgeText = "text-red-700 text-bold";
  } else if (!isPast) {
    deadlineBadgeBg = "bg-amber-100";
    deadlineBadgeText = "text-amber-700";
  }

  return (
    <Link to={`/q/${question.id}`} className={`block border ${borderColor} rounded-2xl p-4 md:p-5 ${hoverColor} transition-all`}>
      <div className="flex justify-between items-start mb-2 md:mb-3">
        <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${deadlineBadgeBg} ${deadlineBadgeText}`}>
          {question.status === 'resolved' ? 'RESOLVED' : (isUrgent ? 'URGENT: ' : '') + deadlineFormat}
        </span>
        <span className="text-slate-400 text-xs font-medium">{question.course} • {question.subject}</span>
      </div>
      <h4 className="font-bold text-slate-800 text-base md:text-lg leading-snug mb-2" style={{wordBreak: "break-word"}}>
        {question.topic}
      </h4>
      <p className="text-xs md:text-sm text-slate-500 line-clamp-2 md:line-clamp-1 mb-3">
        {question.content.replace(/[#*`$]/g, '')}
      </p>
      <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold uppercase tracking-wide">
        <span className="flex items-center gap-1.5">
           <MessageSquare className="w-3.5 h-3.5" /> 
           <span className={question.answerCount > 0 ? "text-indigo-600 font-bold" : ""}>{question.answerCount} {question.answerCount === 1 ? 'answer' : 'answers'}</span>
        </span>
        <span className="flex items-center gap-1.5 ml-auto md:ml-0 text-slate-400 capitalize">
           Asked by <span className="italic font-medium">{question.isAnonymous ? "Anonymous User" : "Classmate"}</span>
        </span>
      </div>
    </Link>
  );
}
