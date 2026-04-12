import { AlertTriangle, Box } from "lucide-react";

export const LoadingState = () => (
    <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 animate-pulse">Syncing with Ledger...</p>
    </div>
);

export const ErrorState = ({ message, onRetry }) => (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
        <p className="text-red-300">{message}</p>
        <button
            onClick={onRetry}
            className="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
            Retry Connection
        </button>
    </div>
);

export const EmptyState = ({ searchId }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
        <Box className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-300 mb-2">
            {searchId ? "No matching builds found" : "No Records Found"}
        </h3>
        <p className="text-gray-500">
            {searchId
                ? `No builds matching "${searchId}"`
                : "The blockchain ledger is currently empty."
            }
        </p>
    </div>
);