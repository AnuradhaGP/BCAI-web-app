// src/components/PacketForm.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Activity,
  ShieldCheck,
  Zap,
  FileJson,
  LayoutGrid,
} from "lucide-react";

const PacketForm = ({ onPredict, isLoading }) => {
  const featureList = [
    "Dst Port",
    "Flow Byts/s",
    "Bwd Pkt Len Mean",
    "Fwd Pkt Len Max",
    "Bwd Pkt Len Max",
    "Pkt Len Mean",
    "Init Fwd Win Byts",
    "Pkt Len Var",
    "Flow Pkts/s",
    "Flow Duration",
    "Flow IAT Max",
    "Bwd Pkts/s",
    "Tot Fwd Pkts",
    "Flow IAT Mean",
    "Fwd Seg Size Min",
    "Tot Bwd Pkts",
    "Init Bwd Win Byts",
    "Bwd IAT Tot",
    "Bwd IAT Max",
    "Bwd IAT Mean",
  ];

  const [inputMode, setInputMode] = useState("manual"); // 'manual' | 'json'
  const [formData, setFormData] = useState(
    featureList.reduce((acc, feature) => ({ ...acc, [feature]: "" }), {}),
  );
  const [jsonInput, setJsonInput] = useState("");

  const handleModeSwitch = (mode) => {
    if (mode === "json") {
      setJsonInput(JSON.stringify(formData, null, 2));
    } else {
      try {
        if (jsonInput.trim()) {
          const parsed = JSON.parse(jsonInput);
          // Ensure we keep the structure even if JSON is partial
          setFormData((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.error("Invalid JSON, cannot sync to form", e);
      }
    }
    setInputMode(mode);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleJsonChange = (e) => {
    setJsonInput(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMode === "manual") {
      onPredict(formData);
    } else {
      try {
        const data = JSON.parse(jsonInput);
        onPredict(data);
      } catch (err) {
        alert("Invalid JSON format! Please check your syntax.");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-8 w-full max-w-4xl mx-auto"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary-500/20 text-blue-500">
            <Activity size={24} />
          </div>
          <h2 className="text-2xl font-bold ">Network Packet Analysis</h2>
        </div>

        {/* Toggle Switch */}
        <div className="bg-gray-800/50 p-1 rounded-lg flex items-center gap-1 border border-white/5">
          <button
            type="button"
            onClick={() => handleModeSwitch("manual")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
              inputMode === "manual"
                ? "bg-blue-500 text-white shadow-lg shadow-primary-500/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutGrid size={16} />
            Manual
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch("json")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
              inputMode === "json"
                ? "bg-blue-500 text-white shadow-lg shadow-primary-500/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileJson size={16} />
            JSON
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {inputMode === "manual" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {featureList.map((feature) => (
              <div key={feature} className="space-y-2">
                <label
                  className="text-sm text-gray-400 pl-1 uppercase tracking-wider text-[10px] font-semibold truncate"
                  title={feature}
                >
                  {feature}
                </label>
                <input
                  type="number"
                  name={feature}
                  value={formData[feature]}
                  onChange={handleChange}
                  className="input-field w-full"
                  placeholder="0"
                  required
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm text-gray-400 pl-1 uppercase tracking-wider text-[10px] font-semibold">
              Paste JSON Data
            </label>
            <textarea
              value={jsonInput}
              onChange={handleJsonChange}
              className="input-field w-full font-mono text-sm h-[320px]"
              placeholder='{ "Dst Port": 80, "Flow Duration": 1000 ... }'
            />
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Zap className="animate-spin" size={20} />
                Scanning...
              </>
            ) : (
              <>
                <ShieldCheck size={20} />
                Analyze Traffic
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default PacketForm;
