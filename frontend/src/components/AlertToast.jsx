import { CheckCircle, AlertTriangle } from "lucide-react";

const AlertToast = ({ alerts }) => (
    <div className="fixed top-24 right-6 z-50 flex flex-col gap-2 w-80 pointer-events-none">
        {alerts.map((alert, idx) => (
            <div
                key={idx}
                className={`pointer-events-auto p-4 rounded-xl shadow-2xl border backdrop-blur-md ${
                    alert.type === "error"
                        ? "bg-red-500/90 border-red-400 text-white"
                        : "bg-green-500/90 border-green-400 text-white"
                }`}
            >
                <div className="flex items-start gap-3">
                    {alert.type === "error"
                        ? <AlertTriangle size={20} />
                        : <CheckCircle size={20} />
                    }
                    <div>
                        <h4 className="font-bold text-sm">
                            {alert.type === "error" ? "Critical Alert" : "Success"}
                        </h4>
                        <p className="text-xs opacity-90">{alert.message}</p>
                        {alert.details && (
                            <p className="text-[10px] mt-1 font-mono bg-black/20 p-1 rounded">
                                {alert.details}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export default AlertToast;