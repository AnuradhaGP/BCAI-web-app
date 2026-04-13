import { useEffect, useState } from "react";
import axios from "axios";
import io from "socket.io-client";
import { Box } from "lucide-react";

import AlertToast   from "./AlertToast";
import SearchBar    from "./SearchBar";
import BuildCard    from "./BuildCard";
import { LoadingState, ErrorState, EmptyState } from "./EmptyState";

const BACKEND_URL = "http://159.223.49.53:3000";
const socket      = io(BACKEND_URL);

const BlockchainDashboard = () => {
    const [builds,      setBuilds]      = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState(null);
    const [verifyingId, setVerifyingId] = useState(null);
    const [alerts,      setAlerts]      = useState([]);
    const [searchId,    setSearchId]    = useState("");
    const [filtered,    setFiltered]    = useState([]);

    const fetchBuilds = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BACKEND_URL}/api/v1/all`);
            const data = response.data.filter(item => {
                const record = item.Record || item;
                return record.buildId !== 'BUILD-INIT-001'
                    && record.docType === 'build';
            });
            setBuilds(data);
            setFiltered(data);
            setError(null);
        } catch (err) {
            setError("Failed to connect to Blockchain Network.");
        } finally {
            setLoading(false);
        }
    };

    const addAlert = (alert) => {
        setAlerts(prev => [alert, ...prev].slice(0, 5));
        setTimeout(() => setAlerts(prev => prev.filter(a => a !== alert)), 5000);
    };

    useEffect(() => {
        fetchBuilds();

        socket.on("verification_success", (data) => {
            addAlert({ type: "success", message: `Build ${data.buildId} verified!` });
            fetchBuilds();
        });

        socket.on("tamper_alert", (data) => {
            addAlert({ type: "error", message: `ALERT: Tampering in ${data.buildId}!`, details: data.error });
        });

        return () => {
            socket.off("verification_success");
            socket.off("tamper_alert");
        };
    }, []);

    useEffect(() => {
        if (!searchId.trim()) {
            setFiltered(builds);
        } else {
            setFiltered(builds.filter(item => {
                const record = item.Record || item;
                return (record.buildId || item.Key || "")
                    .toLowerCase()
                    .includes(searchId.toLowerCase());
            }));
        }
    }, [searchId, builds]);

    const handleVerify = async (buildId, artifactHash, logHash) => {
        setVerifyingId(buildId);
        try {
            await axios.post(`${BACKEND_URL}/api/v1/verify`, {
                buildId,
                currentArtifactHash : artifactHash,
                currentLogHash      : logHash,
            });
        } catch (err) {
            addAlert({ type: "error", message: `Verification failed for ${buildId}` });
        } finally {
            setVerifyingId(null);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 pb-20">
            <AlertToast alerts={alerts} />

            {/* Header */}
            <header className="mb-10 text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400 mb-4">
                    <Box size={12} />
                    <span>Immutable Ledger v1.0</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-gray-500">
                    Blockchain Integrity Records
                </h1>
                <p className="text-gray-400 max-w-lg mx-auto">
                    Verify the integrity of your CI/CD artifacts. All records are immutable and cryptographically secured.
                </p>
            </header>

            <SearchBar
                totalCount={builds.length}
                searchId={searchId}
                onSearch={setSearchId}
                onRefresh={fetchBuilds}
                loading={loading}
            />

            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState message={error} onRetry={fetchBuilds} />
            ) : filtered.length === 0 ? (
                <EmptyState searchId={searchId} />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filtered.map((item, index) => (
                        <BuildCard
                            key={index}
                            item={item}
                            verifyingId={verifyingId}
                            onVerify={handleVerify}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default BlockchainDashboard;