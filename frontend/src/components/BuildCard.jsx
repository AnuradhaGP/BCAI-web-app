import { useState } from "react";
import {
  Shield,
  RefreshCw,
  Clock,
  Hash,
  FileCode,
  Box,
  User,
  ChevronDown,
  ChevronUp,
  Loader,
} from "lucide-react";
import axios from "axios";

const BACKEND_URL = "http://159.223.49.53:3000";

const BuildCard = ({ item, verifyingId, onVerify }) => {
  const record = item.Record || item;
  const buildId = record.buildId || item.Key;

  const [logOpen, setLogOpen] = useState(false);
  const [logContent, setLogContent] = useState(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState(null);

  const handleLogToggle = async () => {
    // දෙවන click → close
    if (logOpen) {
      setLogOpen(false);
      return;
    }

    setLogOpen(true);

    // Already loaded නම් fetch නොකරනවා
    if (logContent) return;

    if (!record.logCid) {
      setLogError("No log CID available.");
      return;
    }

    setLogLoading(true);
    setLogError(null);

    try {
      // Backend decrypt endpoint එකෙන් ගන්නවා
      const response = await axios.get(
        `${BACKEND_URL}/api/v1/log/${record.logCid}`,
      );
      setLogContent(response.data.logContent);
    } catch (err) {
      setLogError("Failed to load log. Please try again.");
    } finally {
      setLogLoading(false);
    }
  };

  return (
    <div className="group bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-purple-500/30 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Main Card Content */}
      <div className="flex flex-col md:flex-row gap-6 p-6">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-300">
            <Box size={24} />
          </div>
        </div>

        {/* Data */}
        <div className="flex-grow space-y-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {buildId}
              <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider font-bold">
                Immutable
              </span>
            </h3>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1 font-mono">
              <Clock size={12} />
              {record.timestamp
                ? new Date(record.timestamp).toLocaleString()
                : "N/A"}
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <User size={12} />
              {record.buildBy || "Unknown"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            {/* Artifact Hash */}
            <div className="bg-black/30 rounded-lg p-3 border border-white/5 group-hover:border-white/10 transition-colors">
              <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1 flex items-center gap-1">
                <Hash size={10} /> Artifact Hash
              </span>
              <p className="text-xs text-gray-300 font-mono break-all select-all">
                {record.artifactHash
                  ? `${record.artifactHash.slice(0, 20)}...`
                  : "N/A"}
              </p>
            </div>

            {/* Log Hash */}
            <div className="bg-black/30 rounded-lg p-3 border border-white/5 group-hover:border-white/10 transition-colors">
              <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1 flex items-center gap-1">
                <Hash size={10} /> Log Hash
              </span>
              <p className="text-xs text-gray-300 font-mono break-all select-all">
                {record.logHash ? `${record.logHash.slice(0, 20)}...` : "N/A"}
              </p>
            </div>

            {/* Log CID - clickable accordion trigger */}
            <div
              onClick={handleLogToggle}
              className="bg-black/30 rounded-lg p-3 border border-white/5 hover:border-purple-500/40 transition-colors cursor-pointer group/log"
            >
              <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <FileCode size={10} /> Log CID
                </span>
                {logLoading ? (
                  <Loader size={10} className="animate-spin text-purple-400" />
                ) : logOpen ? (
                  <ChevronUp size={10} className="text-purple-400" />
                ) : (
                  <ChevronDown
                    size={10}
                    className="text-gray-500 group-hover/log:text-purple-400"
                  />
                )}
              </span>
              {record.logCid ? (
                <p className="text-xs text-purple-400 group-hover/log:text-purple-300 font-mono break-all transition-colors">
                  {record.logCid.slice(0, 20)}...
                </p>
              ) : (
                <p className="text-xs text-gray-500">N/A</p>
              )}
              <p className="text-[10px] text-gray-600 group-hover/log:text-gray-500 mt-1 transition-colors">
                {logOpen ? "Click to collapse" : "Click to view logs"}
              </p>
            </div>
          </div>
        </div>

        {/* Verify Button */}
        <div className="flex-shrink-0 flex flex-col justify-center border-t md:border-t-0 md:border-l border-white/10 md:pl-6 pt-4 md:pt-0">
          <button
            onClick={() =>
              onVerify(buildId, record.artifactHash, record.logHash)
            }
            disabled={verifyingId === buildId}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95 ${
              verifyingId === buildId
                ? "bg-gray-600 text-gray-300 cursor-wait"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white"
            }`}
          >
            {verifyingId === buildId ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Shield size={18} />
            )}
            {verifyingId === buildId ? "Verifying..." : "Verify Integrity"}
          </button>
        </div>
      </div>

      {/* Accordion - Log Viewer */}
      {logOpen && (
        <div className="border-t border-white/10 mx-6 mb-6">
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <FileCode size={12} />
                Build Log
              </span>
              <span className="text-[10px] text-gray-600 font-mono">
                {record.logCid}
              </span>
            </div>

            {/* Log Content */}
            <div className="bg-black/50 rounded-xl border border-white/5 h-72 overflow-y-auto">
              {logLoading ? (
                <div className="flex items-center justify-center h-full gap-2 text-gray-500">
                  <Loader size={16} className="animate-spin" />
                  <span className="text-sm">Fetching encrypted log...</span>
                </div>
              ) : logError ? (
                <div className="flex items-center justify-center h-full text-red-400 text-sm">
                  {logError}
                </div>
              ) : logContent ? (
                <pre className="text-xs text-gray-300 font-mono p-4 whitespace-pre-wrap break-words leading-relaxed select-text pointer-events-auto">
                  {logContent}
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildCard;
