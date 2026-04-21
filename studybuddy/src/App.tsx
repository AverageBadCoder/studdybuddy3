import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./lib/AuthContext";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Feed } from "./pages/Feed";
import { PostQuestion } from "./pages/PostQuestion";
import { QuestionDetail } from "./pages/QuestionDetail";

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Feed />} />
            <Route path="ask" element={<PostQuestion />} />
            <Route path="q/:id" element={<QuestionDetail />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
