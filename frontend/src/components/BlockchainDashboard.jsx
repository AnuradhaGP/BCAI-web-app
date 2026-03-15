import React, { useEffect, useState } from "react";
import axios from "axios";
import io from "socket.io-client";
import { Shield, CheckCircle, AlertTriangle, Clock, Hash, FileCode, RefreshCw, Box, Bell } from "lucide-react";

// Initialize Socket.io connection to Blockchain App
const socket = io("http://localhost:3000");

const BlockchainDashboard = () => {
    const [builds, setBuilds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [verifyingId, setVerifyingId] = useState(null);
    const [alerts, setAlerts] = useState([]);

    const fetchBuilds = async () => {
        setLoading(true);
        try {
            const response = await axios.get("http://localhost:3000/all");
            setBuilds(response.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching blockchain data:", err);
            setError("Failed to connect to Blockchain Network. Ensure the service is running on port 3000.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBuilds();

        // Listen for real-time alerts
        socket.on("verification_success", (data) => {
            addAlert({ type: "success", message: `Build ${data.buildId} Verified Successfully!`, time: new Date() });
        });

        socket.on("tamper_alert", (data) => {
            addAlert({ type: "error", message: `SECURITY ALERT: Tampering Detected in Build ${data.buildId}!`, details: data.error, time: new Date() });
        });

        return () => {
            socket.off("verification_success");
            socket.off("tamper_alert");
        };
    }, []);

    const addAlert = (alert) => {
        setAlerts((prev) => [alert, ...prev].slice(0, 5)); // Keep last 5 alerts
        // Auto remove after 5 seconds
        setTimeout(() => {
            setAlerts((prev) => prev.filter(a => a !== alert));
        }, 5000);
    };

    const handleVerify = async (buildId, currentHash) => {
        setVerifyingId(buildId);
        try {
            // We don't await the response here entirely because the real confirmation comes via socket
            await axios.post("http://localhost:3000/verify", {
                buildId,
                currentHash
            });
        } catch (err) {
            // Error handling is managed by socket events for failed verifications usually, but here catch network errors
            console.error(err);
        } finally {
            setVerifyingId(null);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in-up pb-20">

            {/* Notifications Overlay */}
            <div className="fixed top-24 right-6 z-50 flex flex-col gap-2 w-80 pointer-events-none">
                {alerts.map((alert, idx) => (
                    <div key={idx} className={`pointer-events-auto p-4 rounded-xl shadow-2xl border backdrop-blur-md animate-fade-in-up ${alert.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' : 'bg-green-500/90 border-green-400 text-white'
                        }`}>
                        <div className="flex items-start gap-3">
                            {alert.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                            <div>
                                <h4 className="font-bold text-sm">{alert.type === 'error' ? 'Critical Alert' : 'Success'}</h4>
                                <p className="text-xs opacity-90">{alert.message}</p>
                                {alert.details && <p className="text-[10px] mt-1 font-mono bg-black/20 p-1 rounded">{alert.details}</p>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Header Section */}
            <header className="mb-10 text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-medium text-purple-400 mb-4">
                    <Box size={12} />
                    <span>Immutable Ledger v1.0</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-gray-500">
                    Blockchain Integrity Records
                </h1>
                <p className="text-gray-400 max-w-lg mx-auto">
                    Verify the integrity of your CI/CD artifacts. All build records are immutable and cryptographically secured.
                </p>
            </header>

            {/* Stats / Controls */}
            <div className="flex justify-between items-center bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-2xl">
                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">
                        <span className="text-gray-500 mr-2">Total Records:</span>
                        <span className="font-bold text-white">{builds.length}</span>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        Blockchain Active
                    </div>
                </div>
                <button
                    onClick={fetchBuilds}
                    className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    title="Refresh Data"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 animate-pulse">Syncing with Ledger...</p>
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
                    <p className="text-red-300">{error}</p>
                    <button
                        onClick={fetchBuilds}
                        className="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                        Retry Connection
                    </button>
                </div>
            ) : builds.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                    <Box className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-300 mb-2">No Records Found</h3>
                    <p className="text-gray-500">The blockchain ledger is currently empty.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {builds.map((item, index) => {
                        // Check if item is structured as {Key, Record} or just flat
                        const record = item.Record ? item.Record : item;
                        const buildId = record.buildId || item.Key || `Build-${index}`;

                        return (
                            <div
                                key={index}
                                className="group bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-purple-500/30 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col md:flex-row gap-6 relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                {/* Icon Column */}
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-300 shadow-inner shadow-purple-500/10">
                                        <Box size={24} />
                                    </div>
                                </div>

                                {/* Data Column */}
                                <div className="flex-grow space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                Build #{buildId}
                                                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider font-bold">Immutable</span>
                                            </h3>
                                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1 font-mono">
                                                <Clock size={12} />
                                                {new Date().toLocaleString()} {/* Placeholder timestamp */}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                        <div className="bg-black/30 rounded-lg p-3 border border-white/5 group-hover:border-white/10 transition-colors">
                                            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1 block flex items-center gap-1">
                                                <Hash size={10} /> Artifact Hash
                                            </span>
                                            <div className="flex items-center gap-2 text-xs text-gray-300 font-mono break-all select-all">
                                                {record.artifactHash || "N/A"}
                                            </div>
                                        </div>
                                        <div className="bg-black/30 rounded-lg p-3 border border-white/5 group-hover:border-white/10 transition-colors">
                                            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1 block flex items-center gap-1">
                                                <FileCode size={10} /> Log IPFS Hash
                                            </span>
                                            <div className="flex items-center gap-2 text-xs text-gray-300 font-mono break-all select-all">
                                                {record.logIpfsHash || "N/A"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Column */}
                                <div className="flex-shrink-0 flex flex-col justify-center border-t md:border-t-0 md:border-l border-white/10 md:pl-6 pt-4 md:pt-0 mt-2 md:mt-0">
                                    <button
                                        onClick={() => handleVerify(buildId, record.artifactHash)}
                                        disabled={verifyingId === buildId}
                                        className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all shadow-lg transform active:scale-95 ${verifyingId === buildId
                                                ? 'bg-gray-600 text-gray-300 cursor-wait'
                                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/20 hover:shadow-purple-500/40'
                                            }`}
                                    >
                                        {verifyingId === buildId ? (
                                            <RefreshCw size={18} className="animate-spin" />
                                        ) : (
                                            <Shield size={18} />
                                        )}
                                        {verifyingId === buildId ? 'Verifying...' : 'Verify Integrity'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BlockchainDashboard;
