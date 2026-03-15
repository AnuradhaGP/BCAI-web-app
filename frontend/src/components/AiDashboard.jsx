import React, { useState, useEffect } from "react";
import axios from "axios";
import PacketForm from "./PacketForm";
import ResultCard from "./ResultCard";
import { Layers, Activity, ActivitySquare, Play, Square } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const AiDashboard = () => {
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Live Monitoring capabilities
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [liveData, setLiveData] = useState([]);

    useEffect(() => {
        // Fetch initial status
        axios.get("http://localhost:5000/api/monitoring/status")
             .then(res => setIsMonitoring(res.data.monitoring_active))
             .catch(err => console.error("Could not fetch status", err));
    }, []);

    useEffect(() => {
        let interval;
        if (isMonitoring) {
            interval = setInterval(() => {
                axios.get("http://localhost:5000/api/monitoring/data")
                     .then(res => {
                         setLiveData(res.data.data);
                     })
                     .catch(err => console.error("Error fetching live data", err));
            }, 2000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isMonitoring]);

    const handlePredict = async (data) => {
        setIsLoading(true);
        setResult(null);
        console.log(data);
        try {
            const response = await axios.post("http://localhost:5000/predict", data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            setTimeout(() => {
                setResult(response.data);
                setIsLoading(false);
            }, 800);
        } catch (error) {
            console.error("Error predicting:", error);
            setIsLoading(false);
            alert("Failed to connect to backend. Make sure it's running!");
        }
    };

    const toggleMonitoring = async () => {
        try {
            const newState = !isMonitoring;
            await axios.post("http://localhost:5000/api/monitoring/toggle", { active: newState });
            setIsMonitoring(newState);
            if (newState) {
                setLiveData([]);
            }
        } catch (error) {
            console.error("Error toggling monitoring", error);
            alert("Failed to toggle monitoring.");
        }
    };

    // Custom Tooltip for Chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const riskLevel = payload[0].payload.risk_level;
            return (
                <div className="bg-[#1a1b26] border border-white/10 p-3 rounded-md shadow-xl text-xs">
                    <p className="text-gray-300 font-bold mb-1">{`Time: ${label}`}</p>
                    <p className="text-[#3b82f6]">{`Risk: ${riskLevel}`}</p>
                    <p className="text-gray-400">{`Port: ${payload[0].payload.dst_port}`}</p>
                    <p className="text-gray-400">{`Packets: ${payload[0].payload.fwd_pkts}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in-up">
            <header className="mb-10 text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary-400 mb-4">
                    <Layers size={12} />
                    <span>AI Anomaly Detector v1.0</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-gray-500">
                    Network Traffic Analysis
                </h1>
                <p className="text-gray-400 max-w-lg mx-auto">
                    Monitor your CI/CD pipeline traffic in real-time. Detect anomalies and potential security threats instantly.
                </p>
            </header>

            {/* LIVE MONITORING SECTION */}
            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50"></div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity className="text-blue-400" size={20} />
                            Live Jenkins Pipeline Monitoring
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">Real-time packet inspection and continuous prediction.</p>
                    </div>
                    <button 
                        onClick={toggleMonitoring}
                        className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                            isMonitoring 
                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                                : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                        }`}
                    >
                        {isMonitoring ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        {isMonitoring ? "Stop Monitoring" : "Start Live Monitoring"}
                    </button>
                </div>

                <div className="h-[250px] w-full bg-[#111218]/50 rounded-xl border border-white/5 p-4 flex items-center justify-center relative shadow-inner">
                    {!isMonitoring && liveData.length === 0 ? (
                        <div className="flex flex-col items-center text-gray-500 gap-3">
                            <ActivitySquare size={40} className="opacity-30" />
                            <p className="text-sm">Live monitoring is currently turned off.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={liveData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="time" stroke="#ffffff40" fontSize={10} tickMargin={10} />
                                <YAxis 
                                    stroke="#ffffff40" 
                                    fontSize={10} 
                                    domain={[0, 1]} 
                                    ticks={[0, 1]} 
                                    tickFormatter={(v) => v === 0 ? "Benign" : "Attack"}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line 
                                    type="stepAfter" 
                                    dataKey="prediction" 
                                    stroke={liveData[liveData.length - 1]?.prediction === 1 ? "#ef4444" : "#3b82f6"} 
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: "#1a1b26", strokeWidth: 2 }}
                                    activeDot={{ r: 5, fill: "#3b82f6" }}
                                    animationDuration={300}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="w-full">
                    <h3 className="text-lg font-medium text-white mb-4 px-1">Manual Packet Test</h3>
                    <PacketForm onPredict={handlePredict} isLoading={isLoading} />
                </div>
                <div className="w-full lg:sticky top-6">
                    <ResultCard result={result} />
                </div>
            </div>
        </div>
    );
};

export default AiDashboard;
