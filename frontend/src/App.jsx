import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import AiDashboard from "./components/AiDashboard";
import BlockchainDashboard from "./components/BlockchainDashboard";

function App() {
  return (
   
    <Router>
      <div className="min-h-screen relative overflow-x-hidden flex flex-col items-center p-4 pt-24 bg-[#0f1016]">
        {/* Background Ambience */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] opacity-30 animate-pulse-slow"></div>
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] opacity-30 animate-pulse-slow"
            style={{ animationDelay: "1.5s" }}
          ></div>
        </div>

        <Navbar />

        <div className="w-full z-10 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<AiDashboard />} />
            <Route path="/blockchain" element={<BlockchainDashboard />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
