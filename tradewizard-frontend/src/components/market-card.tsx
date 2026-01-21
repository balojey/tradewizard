"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface Outcome {
    name: string;
    probability: number;
    color: "yes" | "no" | "neutral";
}

interface MarketCardProps {
    id: string;
    title: string;
    image: string;
    volume: string;
    outcomes: Outcome[];
    isNew?: boolean;
}

export function MarketCard({ id, title, image, volume, outcomes, isNew }: MarketCardProps) {
    return (
        <Link href={`/market/${id}`} className="group block h-full">
            <Card className="h-full flex flex-col overflow-hidden border-border/40 bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5">
                <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-muted">
                    {image ? (
                        <div className="relative h-full w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={image}
                                alt={title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                            {/* Fallback gradient if image fails to load */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-slate-900 hidden" />
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900 to-slate-900 text-4xl">
                            🗳️
                        </div>
                    )}

                    {isNew && (
                        <div className="absolute left-2 top-2 rounded-full bg-blue-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm">
                            New
                        </div>
                    )}

                    <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {volume}
                    </div>
                </div>

                <CardContent className="flex-1 p-4 space-y-4">
                    <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {title}
                    </h3>

                    <div className="space-y-2.5">
                        {outcomes.map((outcome, idx) => (
                            <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-muted-foreground">{outcome.name}</span>
                                    <span className={cn(
                                        "font-bold font-mono",
                                        outcome.color === 'yes' ? "text-emerald-500 dark:text-emerald-400" :
                                            outcome.color === 'no' ? "text-red-500 dark:text-red-400" : "text-foreground"
                                    )}>
                                        {outcome.probability}%
                                    </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-500 ease-out",
                                            outcome.color === 'yes' ? "bg-emerald-500 dark:bg-emerald-500" :
                                                outcome.color === 'no' ? "bg-red-500 dark:bg-red-500" : "bg-primary"
                                        )}
                                        style={{ width: `${outcome.probability}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
