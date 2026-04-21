import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { db } from "../lib/firebase";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function PostQuestion() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [hoursToDeadline, setHoursToDeadline] = useState("24");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <h2 className="text-2xl font-bold">Please sign in</h2>
        <p className="text-muted-foreground mt-2 text-sm">You must be signed in to ask a question.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course || !subject || !topic || !content || !hoursToDeadline) {
      toast.error("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const qRef = doc(collection(db, "questions"));
      const deadlineNumber = Date.now() + parseInt(hoursToDeadline) * 60 * 60 * 1000;

      const batch = writeBatch(db);
      
      batch.set(qRef, {
        authorId: user.uid,
        course: course.toUpperCase().trim(),
        subject: subject.trim(),
        topic: topic.trim(),
        content: content.trim(),
        deadline: deadlineNumber,
        isAnonymous,
        createdAt: serverTimestamp(),
        status: 'open',
        answerCount: 0
      });

      await batch.commit();
      toast.success("Question posted successfully! 🎉");
      navigate(`/q/${qRef.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to post question: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <Card className="shadow-sm border-slate-200 rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b pb-6 rounded-t-3xl border-slate-100">
            <CardTitle className="text-2xl font-bold">Ask a Question</CardTitle>
            <CardDescription>
              Get quick help from classmates. Markdown and LaTeX constraints are supported in the content field.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course">Course Code *</Label>
                <Input 
                  id="course" 
                  placeholder="e.g. CS101" 
                  maxLength={10}
                  value={course} onChange={e => setCourse(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input 
                  id="subject" 
                  placeholder="e.g. Computer Science" 
                  maxLength={50}
                  value={subject} onChange={e => setSubject(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic / Title *</Label>
              <Input 
                id="topic" 
                placeholder="What exactly are you struggling with?" 
                maxLength={100}
                value={topic} onChange={e => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Details *</Label>
              <Textarea 
                id="content" 
                placeholder="Explain the problem... (Markdown & Math supported - use $$ for blocks, $ for inline)"
                rows={8}
                value={content} onChange={e => setContent(e.target.value)}
                className="font-mono text-sm resize-y"
              />
              <p className="text-xs text-muted-foreground">You can type equations, e.g., $E = mc^2$ or code blocks.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center border-t pt-6">
              <div className="space-y-2">
                <Label htmlFor="deadline">I need an answer by (hours) *</Label>
                <Input 
                  id="deadline" 
                  type="number" 
                  min="1" max="168"
                  value={hoursToDeadline} onChange={e => setHoursToDeadline(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6 pl-4">
                <input 
                  type="checkbox" 
                  id="anon" 
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4"
                  checked={isAnonymous} 
                  onChange={e => setIsAnonymous(e.target.checked)} 
                />
                <Label htmlFor="anon" className="font-normal cursor-pointer text-sm">Post Anonymously</Label>
              </div>
            </div>

          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 py-6 mt-6 justify-end">
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-colors">
              {submitting ? "Posting..." : "Post Question"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
