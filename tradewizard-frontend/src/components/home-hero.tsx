"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuthGuard, LoginModal } from '@/components/auth';
import { useMagic } from '@/lib/magic';
import { TrendingUp, Brain, Shield, Zap } from 'lucide-react';

export function HomeHero() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const { user } = useMagic();

  return (
    <>
      {/* Hero Section for Unauthenticated Users */}
      <AuthGuard requireAuth={false}>
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-border/40">
          <div className="container max-w-screen-2xl mx-auto px-4 py-16 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Content */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
                    AI-Powered{' '}
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Prediction Trading
                    </span>
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-2xl">
                    Transform raw prediction market data into explainable, probability-driven trade recommendations with our multi-agent AI system.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    size="lg" 
                    className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700"
                    onClick={() => setLoginModalOpen(true)}
                  >
                    Get Started Free
                  </Button>
                  <Link href="#features">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="text-lg px-8 py-6 w-full"
                    >
                      Learn More
                    </Button>
                  </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-8 pt-8 border-t border-border/40">
                  <div>
                    <div className="text-2xl font-bold">99.9%</div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">$10M+</div>
                    <div className="text-sm text-muted-foreground">Volume Analyzed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">5ms</div>
                    <div className="text-sm text-muted-foreground">Avg Response</div>
                  </div>
                </div>
              </div>

              {/* Right Column - Visual */}
              <div className="relative">
                <div className="relative bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-8 backdrop-blur-sm border border-border/40">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-background/80 rounded-lg border border-border/40">
                      <Brain className="h-8 w-8 text-blue-600" />
                      <div>
                        <div className="font-semibold">Multi-Agent Analysis</div>
                        <div className="text-sm text-muted-foreground">AI agents debate market outcomes</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-background/80 rounded-lg border border-border/40">
                      <TrendingUp className="h-8 w-8 text-green-600" />
                      <div>
                        <div className="font-semibold">Probability Consensus</div>
                        <div className="text-sm text-muted-foreground">Data-driven recommendations</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-background/80 rounded-lg border border-border/40">
                      <Shield className="h-8 w-8 text-purple-600" />
                      <div>
                        <div className="font-semibold">Risk Assessment</div>
                        <div className="text-sm text-muted-foreground">Full transparency & explainability</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 lg:py-24">
          <div className="container max-w-screen-2xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Why Choose TradeWizard?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Our AI-powered platform gives you the edge in prediction markets with advanced analysis and transparent recommendations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center space-y-4">
                <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto">
                  <Brain className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold">Adversarial AI</h3>
                <p className="text-muted-foreground">
                  Multiple AI agents with different perspectives prevent groupthink and bias.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto">
                  <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold">Real-time Analysis</h3>
                <p className="text-muted-foreground">
                  Continuous market monitoring with instant updates and recommendations.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="h-16 w-16 bg-purple-100 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mx-auto">
                  <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold">Full Transparency</h3>
                <p className="text-muted-foreground">
                  Every recommendation traces back to specific data and reasoning.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="h-16 w-16 bg-orange-100 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mx-auto">
                  <Zap className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-semibold">Lightning Fast</h3>
                <p className="text-muted-foreground">
                  Get insights in milliseconds with our optimized infrastructure.
                </p>
              </div>
            </div>
          </div>
        </section>
      </AuthGuard>

      {/* Welcome Back Section for Authenticated Users */}
      <AuthGuard requireAuth={true}>
        <section className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 border-b border-border/40">
          <div className="container max-w-screen-2xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Welcome back, {user?.email?.split('@')[0]}!
                </h1>
                <p className="text-muted-foreground text-lg">
                  Ready to discover your next winning trade? Check out the latest market intelligence.
                </p>
              </div>
              <div className="flex gap-4">
                <Link href="/dashboard">
                  <Button>View Dashboard</Button>
                </Link>
                <Link href="#markets">
                  <Button variant="outline">Browse Markets</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </AuthGuard>

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        mode="signup"
      />
    </>
  );
}