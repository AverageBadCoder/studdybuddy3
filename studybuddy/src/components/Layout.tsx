import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { signIn, logOut } from "../lib/firebase";
import { BookOpen, LogOut, PlusCircle, User as UserIcon, LayoutDashboard, HelpCircle } from "lucide-react";

export function Layout() {
  const { user, userDoc, loading } = useAuth();
  const location = useLocation();

  const isFeed = location.pathname === "/";
  const isAsk = location.pathname === "/ask";

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-6 font-sans text-slate-900">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-[calc(100vh-3rem)]">
        
        {/* Sidebar / Navigation */}
        <div className="col-span-1 lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <Link to="/" className="text-2xl font-bold tracking-tight text-indigo-950">StudyBuddy</Link>
          </div>
          
          <nav className="space-y-2 flex-1">
            <Link to="/" className={`px-4 py-3 rounded-xl font-semibold flex items-center gap-3 transition-colors ${isFeed ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-500 font-medium"}`}>
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              Dashboard
            </Link>
            <Link to="/ask" className={`px-4 py-3 rounded-xl font-semibold flex items-center gap-3 transition-colors ${isAsk ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-500 font-medium"}`}>
              <HelpCircle className="w-5 h-5 shrink-0" />
              Ask Expert
            </Link>
            {!loading && !user && (
              <button onClick={signIn} className="w-full text-left hover:bg-slate-50 text-slate-500 px-4 py-3 rounded-xl font-medium transition-colors flex items-center gap-3">
                <UserIcon className="w-5 h-5 shrink-0" />
                Sign In
              </button>
            )}
            {!loading && user && (
              <button onClick={logOut} className="w-full text-left hover:bg-slate-50 text-slate-500 px-4 py-3 rounded-xl font-medium transition-colors flex items-center gap-3 mt-auto">
                <LogOut className="w-5 h-5 shrink-0" />
                Sign Out
              </button>
            )}
          </nav>

          {!loading && user && userDoc && (
          <div className="mt-8">
            <div className="p-4 bg-slate-900 rounded-2xl text-white">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">Reputation</p>
              <p className="text-2xl font-bold mb-3">{userDoc.reputation || 0} <span className="text-sm font-normal text-indigo-300">pts</span></p>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                <div className="bg-indigo-500 h-full transition-all" style={{ width: `${Math.min(100, Math.max(10, (userDoc.reputation / 100) * 100))}%`}}></div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                 {userDoc.reputation >= 15 && <span className="px-2 py-1 rounded bg-indigo-500/30 text-[10px] font-bold text-indigo-200">⭐ Helpful</span>}
                 {userDoc.reputation >= 50 && <span className="px-2 py-1 rounded bg-purple-500/30 text-[10px] font-bold text-purple-200">🎓 Scholar</span>}
                 {userDoc.reputation >= 100 && <span className="px-2 py-1 rounded bg-rose-500/30 text-[10px] font-bold text-rose-200">💎 Guru</span>}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Main Search / Greeting & Feed Section */}
        <div className="col-span-1 lg:col-span-9 flex flex-col gap-4">
          <Outlet />
        </div>

      </div>
    </div>
  );
}
