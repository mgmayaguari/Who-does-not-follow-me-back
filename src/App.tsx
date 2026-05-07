import React, { useState, useMemo, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileJson, 
  Trash2, 
  ShieldCheck, 
  Users, 
  AlertCircle, 
  Copy, 
  Check, 
  ArrowRight,
  TrendingDown,
  Loader2,
  Instagram
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { categorizeUsernames, CategorizedResults } from './services/geminiService';

interface AccountData {
  following: string[];
  followers: string[];
}

export default function App() {
  const [followingFile, setFollowingFile] = useState<File | null>(null);
  const [followersFile, setFollowersFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<CategorizedResults | null>(null);
  const [stats, setStats] = useState({ totalFollowing: 0, totalFollowers: 0, nonFollowersCount: 0 });
  const [copied, setCopied] = useState(false);

  const onDropFollowing = useCallback((acceptedFiles: File[]) => {
    setFollowingFile(acceptedFiles[0]);
  }, []);

  const onDropFollowers = useCallback((acceptedFiles: File[]) => {
    setFollowersFile(acceptedFiles[0]);
  }, []);

  const { getRootProps: getFollowingProps, getInputProps: getFollowingInput, isDragActive: followDrag } = useDropzone({
    onDrop: onDropFollowing,
    accept: { 'application/json': ['.json'] },
    multiple: false
  });

  const { getRootProps: getFollowersProps, getInputProps: getFollowersInput, isDragActive: followerDrag } = useDropzone({
    onDrop: onDropFollowers,
    accept: { 'application/json': ['.json'] },
    multiple: false
  });

  const processFiles = async () => {
    if (!followingFile || !followersFile) return;

    setIsProcessing(true);
    try {
      const [followingRaw, followersRaw] = await Promise.all([
        followingFile.text(),
        followersFile.text()
      ]);

      const followingJson = JSON.parse(followingRaw);
      const followersJson = JSON.parse(followersRaw);

      // Rule 1: Extract Followers (string_list_data[0].value)
      // Note: Followers export often has a different structure than Following
      let followers: string[] = [];
      if (Array.isArray(followersJson)) {
        followers = followersJson.map((item: any) => 
          item.string_list_data?.[0]?.value
        ).filter(Boolean);
      } else if (followersJson.relationships_followers) {
        // Alternative structure
        followers = followersJson.relationships_followers.map((item: any) => 
          item.string_list_data?.[0]?.value
        ).filter(Boolean);
      }

      // Rule 2: Extract Following (relationships_following -> title)
      const followingList = followingJson.relationships_following || [];
      const following = followingList.map((item: any) => item.title).filter(Boolean);

      // Rule 3: Case-insensitive logic
      const followersSet = new Set(followers.map(f => f.toLowerCase()));

      // Rule 4: Match & Exclusion
      const nonFollowers = following.filter(user => {
        const u = user.toLowerCase();
        // Skip system strings (Rule 5)
        if (['u', '_u', 'instagram'].includes(u)) return false;
        return !followersSet.has(u);
      });

      setStats({
        totalFollowing: following.length,
        totalFollowers: followers.length,
        nonFollowersCount: nonFollowers.length
      });

      // AI Categorization
      const categorized = await categorizeUsernames(nonFollowers);
      setResults(categorized);
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Error processing JSON files. Please ensure they are valid Instagram exports.");
    } finally {
      setIsProcessing(false);
    }
  };

  const allNonFollowersStr = useMemo(() => {
    if (!results) return "";
    return [
      ...results.newsAndBrands,
      ...results.publicFigures,
      ...results.personalAM,
      ...results.personalNZ
    ].join(", ");
  }, [results]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(allNonFollowersStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center max-w-7xl mx-auto">
      {/* Header */}
      <header className="w-full mb-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
            <Instagram className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">InstaAuditor</h1>
            <p className="text-zinc-400 text-sm font-medium">Professional Data Integrity Engine</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-full">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Privacy Guaranteed — Locally Processed</span>
        </div>
      </header>

      {!results && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl grid md:grid-cols-2 gap-8"
        >
          {/* File Upload Sections */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-purple-500" />
              Upload Data Sources
            </h2>
            
            <div className="space-y-4">
              <DropZone 
                label="following.json" 
                file={followingFile} 
                onRemove={() => setFollowingFile(null)} 
                getRootProps={getFollowingProps} 
                getInputProps={getFollowingInput} 
                isDragActive={followDrag} 
              />
              <DropZone 
                label="followers.json" 
                file={followersFile} 
                onRemove={() => setFollowersFile(null)} 
                getRootProps={getFollowersProps} 
                getInputProps={getFollowersInput} 
                isDragActive={followerDrag} 
              />
            </div>

            <button
              onClick={processFiles}
              disabled={!followingFile || !followersFile || isProcessing}
              className={cn(
                "w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl",
                followingFile && followersFile && !isProcessing
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-[1.02] active:scale-[0.98] text-white shadow-purple-500/20"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Data...
                </>
              ) : (
                <>
                  Start Audit
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileJson size={120} />
            </div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-zinc-500" />
              How to get data?
            </h3>
            <ol className="space-y-4 text-zinc-400 text-sm leading-relaxed">
              <li className="flex gap-3 items-center">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-white">1</span>
                <span className="inline-flex items-center flex-wrap gap-2 text-zinc-400">
                  Go to Instagram <span className="text-zinc-600 font-bold px-1">&rarr;</span> Your Activity <span className="text-zinc-600 font-bold px-1">&rarr;</span> Download Your Information.
                </span>
              </li>
              <li className="flex gap-3 items-center">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-white">2</span>
                <span className="inline-flex items-center flex-wrap gap-2 text-zinc-400">
                  Choose "Personalized" and select only "Followers and Following".
                </span>
              </li>
              <li className="flex gap-3 items-center">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-white">3</span>
                <span className="inline-flex items-center flex-wrap gap-2 text-zinc-400">
                  Format: <strong className="text-zinc-100 font-bold bg-zinc-800/50 px-1.5 py-0.5 rounded text-[10px] tracking-wide">JSON</strong>,  Quality: <strong className="text-zinc-100 font-bold bg-zinc-800/50 px-1.5 py-0.5 rounded text-[10px] tracking-wide">LOW</strong> (faster).
                </span>
              </li>
              <li className="flex gap-3 items-center">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-white">4</span>
                <span className="inline-flex items-center flex-wrap gap-2 text-zinc-400">
                  Once ready, extract ZIP and find <span className="text-zinc-300 italic font-medium">JSON</span> files in the <code className="bg-zinc-800/50 px-1.5 py-0.5 rounded text-xs text-zinc-300 font-mono">followers_and_following</code> folder.
                </span>
              </li>
            </ol>
          </div>
        </motion.div>
      )}

      {/* Results View */}
      <AnimatePresence>
        {results && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full space-y-8"
          >
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Following" value={stats.totalFollowing} color="zinc" />
              <StatCard label="Followers" value={stats.totalFollowers} color="zinc" />
              <StatCard label="Non-Followers" value={stats.nonFollowersCount} color="pink" />
              <StatCard label="Mutual Rate" value={`${Math.round((stats.totalFollowers/stats.totalFollowing)*100)}%`} color="purple" />
            </div>

            {/* Main Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-800/50 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  Categorized Non-Followers
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 border-r border-zinc-800">[News & Brands]</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 border-r border-zinc-800">[Public Figures]</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 border-r border-zinc-800">[Personal Accounts A-M]</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">[Personal Accounts N-Z]</th>
                    </tr>
                  </thead>
                  <tbody className="align-top">
                    <tr>
                      <td className="px-6 py-4 border-r border-zinc-800">
                        <UsernameList list={results.newsAndBrands} />
                      </td>
                      <td className="px-6 py-4 border-r border-zinc-800">
                        <UsernameList list={results.publicFigures} />
                      </td>
                      <td className="px-6 py-4 border-r border-zinc-800">
                        <UsernameList list={results.personalAM} />
                      </td>
                      <td className="px-6 py-4">
                        <UsernameList list={results.personalNZ} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Copyable Block */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-500 shrink-0">Comma-Separated Block</h4>
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 text-xs font-bold bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Entire List"}
                </button>
              </div>
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-sm text-zinc-400 break-all max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                {allNonFollowersStr}
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={() => {
                  setResults(null);
                  setFollowingFile(null);
                  setFollowersFile(null);
                }}
                className="text-zinc-500 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Reset & New Audit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropZone({ label, file, onRemove, getRootProps, getInputProps, isDragActive }: any) {
  return (
    <div className="space-y-2">
      <div 
        {...getRootProps()} 
        className={cn(
          "relative group border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-2",
          isDragActive ? "border-purple-500 bg-purple-500/5" : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700",
          file && "border-emerald-500/50 bg-emerald-500/5"
        )}
      >
        <input {...getInputProps()} />
        {file ? (
          <>
            <div className="p-3 bg-emerald-500 rounded-xl mb-2">
              <FileJson className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-tight truncate max-w-full px-4">{file.name}</span>
            <span className="text-emerald-500 text-xs font-bold uppercase tracking-tighter shrink-0">Upload Confirmed</span>
          </>
        ) : (
          <>
            <div className="p-3 bg-zinc-800 rounded-xl mb-2 group-hover:scale-110 transition-transform">
              <FileJson className="w-6 h-6 text-zinc-500" />
            </div>
            <span className="text-zinc-300 font-bold text-sm tracking-tight">{label}</span>
            <span className="text-zinc-500 text-xs font-medium">Drag & drop or click</span>
          </>
        )}
        
        {file && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: 'zinc' | 'pink' | 'purple' }) {
  const styles = {
    zinc: "bg-zinc-900 border-zinc-800 text-zinc-500",
    pink: "bg-pink-900/10 border-pink-500/20 text-pink-500",
    purple: "bg-purple-900/10 border-purple-500/20 text-purple-500"
  };

  return (
    <div className={cn("p-6 rounded-2xl border text-center", styles[color])}>
      <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-80">{label}</p>
      <p className="text-3xl font-black tracking-tight text-white">{value}</p>
    </div>
  );
}

function UsernameList({ list }: { list: string[] }) {
  if (list.length === 0) return <p className="text-zinc-700 italic text-sm">None found</p>;
  return (
    <div className="space-y-1.5">
      {list.map((u, i) => (
        <div key={i} className="group flex items-center gap-2 py-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover:bg-purple-500 transition-colors" />
          <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-100 transition-colors leading-tight">
            {u}
          </span>
        </div>
      ))}
    </div>
  );
}
