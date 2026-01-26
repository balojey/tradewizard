/**
 * Global Loading Page
 * Displayed during page transitions and initial loads
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {/* Loading Spinner */}
        <div className="relative mb-4">
          <div className="w-12 h-12 border-4 border-muted rounded-full animate-spin border-t-primary mx-auto"></div>
        </div>
        
        {/* Loading Text */}
        <h2 className="text-lg font-semibold mb-2">Loading TradeWizard</h2>
        <p className="text-muted-foreground text-sm">
          Fetching the latest market data...
        </p>
      </div>
    </div>
  );
}