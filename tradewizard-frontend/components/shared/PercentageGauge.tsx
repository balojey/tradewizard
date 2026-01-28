
import { cn } from "@/utils/classNames";

interface PercentageGaugeProps {
    value: number; // 0 to 100
    size?: number;
    label?: string;
    className?: string;
}

export default function PercentageGauge({
    value,
    size = 60,
    label = "chance",
    className,
}: PercentageGaugeProps) {
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    // We want a partial circle (e.g. 240 degrees like a speedometer) or full circle?
    // The image shows a semi-circle or 3/4 circle open at the bottom.
    // Let's go with a simple full circle or 3/4 for now.
    // Actually, the image shows an arc that starts from bottom-left and goes to bottom-right.
    // Let's implement a standard SVG circle with offset.

    // Clamped value
    const percentage = Math.min(Math.max(value, 0), 100);
    const offset = circumference - (percentage / 100) * circumference;

    // Let's make it look like the image: A simple gray track and a colored progress stroke.
    // It looks like a standard circular progress bar.

    return (
        <div className={cn("relative flex flex-col items-center justify-center", className)} style={{ width: size, height: size }}>
            <svg
                className="transform -rotate-90 w-full h-full"
                viewBox="0 0 60 60"
            >
                {/* Background Track */}
                <circle
                    className="text-gray-200"
                    strokeWidth="6"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="30"
                    cy="30"
                />
                {/* Progress Circle */}
                <circle
                    className="text-gray-800 transition-all duration-500 ease-out"
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="30"
                    cy="30"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                <span className="text-sm font-bold leading-none">{Math.round(percentage)}%</span>
                {label && <span className="text-[10px] text-gray-500 leading-none mt-0.5">{label}</span>}
            </div>
        </div>
    );
}
