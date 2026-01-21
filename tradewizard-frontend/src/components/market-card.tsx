import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, Users } from "lucide-react";

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
        <Link href={`/market/${id}`} className="group block">
            <Card className="h-full overflow-hidden border-border/60 bg-card/50 transition-all hover:bg-card/80 hover:border-border/80 hover:shadow-md hover:shadow-primary/5">
                <div className="relative h-32 w-full overflow-hidden bg-muted">
                    {/* Placeholder for real image or next/image if we had remote allowed domains */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-muted-foreground">
                        {image ? (
                            // In a real app, use Next/Image with configured domains. For now, using a stylized div or generic placeholder if provided.
                            // Assuming image is a URL, but for safety in this demo without external requests, we rely on CSS or passed generated images.
                            <div className="relative h-full w-full">
                                {/* We will use a colorful gradient placeholder instead of broken external images */}
                                <div className={cn("h-full w-full opacity-60", image)} />
                            </div>
                        ) : (
                            <span className="text-4xl">🗳️</span>
                        )}
                    </div>

                    {isNew && (
                        <div className="absolute left-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground backdrop-blur-sm">
                            New
                        </div>
                    )}
                </div>

                <CardHeader className="p-4 pb-2">
                    <h3 className="line-clamp-2 text-lg font-semibold leading-tight tracking-tight group-hover:text-primary transition-colors">
                        {title}
                    </h3>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                    {outcomes.map((outcome, idx) => (
                        <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-sm font-medium">
                                <span className="text-muted-foreground">{outcome.name}</span>
                                <span className={cn(
                                    outcome.color === 'yes' ? "text-outcome-yes" :
                                        outcome.color === 'no' ? "text-outcome-no" : "text-foreground"
                                )}>
                                    {outcome.probability}%
                                </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                                <div
                                    className={cn("h-full rounded-full transition-all",
                                        outcome.color === 'yes' ? "bg-outcome-yes" :
                                            outcome.color === 'no' ? "bg-outcome-no" : "bg-primary"
                                    )}
                                    style={{ width: `${outcome.probability}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-border/40 bg-muted/20 p-3 px-4 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>Vol. {volume}</span>
                    </div>
                    {/* Maybe add comments or other metadata */}
                </CardFooter>
            </Card>
        </Link>
    );
}
