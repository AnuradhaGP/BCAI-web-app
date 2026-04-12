import { Search, RefreshCw } from "lucide-react";

const SearchBar = ({ totalCount, searchId, onSearch, onRefresh, loading }) => (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-2xl">
        <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">
                <span className="text-gray-500 mr-2">Total Records:</span>
                <span className="font-bold text-white">{totalCount}</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Blockchain Active
            </div>
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-full md:w-64">
            <Search size={16} className="text-gray-500" />
            <input
                type="text"
                placeholder="Search by Build ID..."
                value={searchId}
                onChange={(e) => onSearch(e.target.value)}
                className="bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none w-full"
            />
        </div>

        <button
            onClick={onRefresh}
            className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
        >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
    </div>
);

export default SearchBar;