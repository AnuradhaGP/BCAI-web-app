// src/components/ResultCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';

const ResultCard = ({ result }) => {
    if (!result) return null;

    const isBenign = result.prediction === 0;
    const colorClass = isBenign ? "text-green-400" : "text-red-400";
    const bgClass = isBenign ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20";
    const Icon = isBenign ? CheckCircle : AlertOctagon;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`glass-card p-8 w-full max-w-xl mx-auto mt-6 border ${bgClass}`}
        >
            <div className="flex flex-col items-center text-center space-y-4">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    className={`p-4 rounded-full ${isBenign ? 'bg-green-500/20' : 'bg-red-500/20'} ${isBenign ? 'text-green-400' : 'text-red-400'}`}
                >
                    <Icon size={48} />
                </motion.div>

                <div>
                    <h3 className="text-gray-400 uppercase tracking-widest text-xs font-bold mb-1">Analysis Result</h3>
                    <h2 className={`text-3xl font-bold ${colorClass}`}>
                        {isBenign ? "Traffic is Normal" : `Threat Detected`}
                    </h2>
                </div>

                <p className="text-gray-400 text-sm max-w-sm">
                    {isBenign
                        ? "The network packet analysis indicates normal behavior. No anomalies detected."
                        : "High-risk anomaly detected in the network flow. Immediate action recommended."}
                </p>
            </div>
        </motion.div>
    );
};

export default ResultCard;
