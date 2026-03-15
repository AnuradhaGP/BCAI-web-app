import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, Box, Activity } from 'lucide-react';

const Navbar = () => {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-3 flex items-center justify-between shadow-lg">

                    {/* Logo / Brand */}
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                            <Activity className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            BCAI-SecPipe
                        </span>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-2">
                        <Link to="/">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${isActive('/')
                                ? 'bg-primary-500/20 text-white border border-primary-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}>
                                <Layers className="w-4 h-4" />
                                <span className="font-medium">AI Dashboard</span>
                            </div>
                        </Link>

                        <Link to="/blockchain">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${isActive('/blockchain')
                                ? 'bg-purple-500/20 text-white border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}>
                                <Box className="w-4 h-4" />
                                <span className="font-medium">Blockchain</span>
                            </div>
                        </Link>
                    </div>

                </div>
            </div>
        </nav>
    );
};

export default Navbar;
