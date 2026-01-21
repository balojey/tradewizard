/**
 * Event-Based Multi-Market Keyword Extractor
 *
 * This module implements keyword extraction for Polymarket events that prioritizes
 * event-level tags while incorporating keywords from all constituent markets.
 * It provides comprehensive keyword analysis for event-centric intelligence gathering.
 * 
 * Features:
 * - Event-level keyword prioritization from tags, title, and description
 * - Multi-market keyword extraction and consolidation
 * - Cross-market theme identification and analysis
 * - Keyword ranking and relevance scoring for event-level analysis
 * - Political relevance filtering and concept extraction
 */

import type {
  PolymarketEvent,
  PolymarketMarket,
  PolymarketTag,
  EventKeywords,
  ThemeKeywords,
  ConceptKeywords,
  RankedKeyword,
} from '../models/types.js';
import { getLogger } from './logger.js';

const logger = getLogger();

/**
 * Keywords extracted from individual markets
 */
export interface MarketKeywords {
  marketId: string;
  primary: string[];      // From market question
  secondary: string[];    // From market description
  outcomes: string[];     // From outcome labels
}

/**
 * Processed event keywords with source tracking
 */
export interface ProcessedEventKeywords {
  eventTags: string[];
  eventTitle: string[];
  eventDescription: string[];
  marketQuestions: string[];
  marketOutcomes: string[];
  derived: string[];      // Processed variations
  political: string[];    // Politically relevant subset
}

/**
 * Configuration for keyword extraction modes
 */
export type KeywordExtractionMode = 'event_priority' | 'market_priority' | 'balanced';

/**
 * Event-Based Multi-Market Keyword Extractor
 * 
 * Extracts and processes keywords from Polymarket events with multiple markets,
 * prioritizing event-level information while incorporating market-specific terms.
 */
export class EventMultiMarketKeywordExtractor {
  private readonly politicalKeywords = new Set([
    'election', 'vote', 'voting', 'president', 'presidential', 'congress', 'senate', 'house',
    'political', 'politics', 'campaign', 'candidate', 'policy', 'government', 'federal',
    'state', 'governor', 'mayor', 'democrat', 'republican', 'party', 'primary', 'general',
    'ballot', 'referendum', 'proposition', 'amendment', 'legislation', 'bill', 'law',
    'court', 'supreme', 'justice', 'judge', 'ruling', 'decision', 'case', 'legal',
    'impeachment', 'scandal', 'investigation', 'hearing', 'committee', 'testimony',
    'debate', 'poll', 'polling', 'approval', 'rating', 'endorsement', 'nomination',
    'cabinet', 'administration', 'executive', 'legislative', 'judicial', 'constitutional'
  ]);

  private readonly stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'will', 'be', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had',
    'do', 'does', 'did', 'can', 'could', 'should', 'would', 'may', 'might', 'must',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ]);

  constructor(private readonly extractionMode: KeywordExtractionMode = 'event_priority') {
    // Store extraction mode for future use in ranking algorithms
    logger.info(`EventMultiMarketKeywordExtractor initialized with mode: ${this.extractionMode}`);
  }

  /**
   * Extract comprehensive keywords from a Polymarket event
   */
  extractKeywordsFromEvent(event: PolymarketEvent): EventKeywords {
    logger.info(`Extracting keywords from event: ${event.id} (${event.title})`);

    // Extract event-level keywords
    const eventTags = this.extractKeywordsFromEventTags(event.tags);
    const eventTitle = this.extractKeywordsFromText(event.title, 'event_title');
    const eventDescription = this.extractKeywordsFromText(event.description, 'event_description');

    // Extract market-level keywords
    const marketKeywords = this.extractKeywordsFromAllMarkets(event.markets);

    // Process and combine keywords
    const processed = this.processEventMetadata(event);
    const combined = this.combineEventAndMarketKeywords(
      [...eventTags, ...eventTitle, ...eventDescription],
      marketKeywords
    );

    // Log processed metadata for debugging
    logger.debug(`Processed event metadata: ${processed.political.length} political keywords, ${processed.derived.length} derived keywords`);

    // Identify themes and concepts
    const themes = this.identifyCommonThemes(event.markets);
    const concepts = this.extractEventLevelConcepts(event);

    // Rank keywords by relevance
    const ranked = this.rankKeywordsByEventRelevance(combined, event);

    const result: EventKeywords = {
      eventLevel: [...eventTags, ...eventTitle, ...eventDescription],
      marketLevel: marketKeywords.flatMap(mk => [...mk.primary, ...mk.secondary, ...mk.outcomes]),
      combined,
      themes,
      concepts,
      ranked
    };

    logger.info(`Extracted ${result.combined.length} combined keywords, ${result.themes.length} themes, ${result.concepts.length} concepts`);
    return result;
  }

  /**
   * Extract keywords from event tags
   */
  extractKeywordsFromEventTags(tags: PolymarketTag[]): string[] {
    const keywords: string[] = [];

    for (const tag of tags) {
      // Use tag label as primary keyword
      keywords.push(tag.label.toLowerCase());

      // Extract keywords from tag slug
      const slugKeywords = tag.slug
        .split('-')
        .filter(word => word.length > 2 && !this.stopWords.has(word));
      keywords.push(...slugKeywords);
    }

    return this.deduplicateAndFilter(keywords);
  }

  /**
   * Extract keywords from all markets within an event
   */
  extractKeywordsFromAllMarkets(markets: PolymarketMarket[]): MarketKeywords[] {
    return markets.map(market => ({
      marketId: market.id,
      primary: this.extractKeywordsFromText(market.question, 'market_question'),
      secondary: this.extractKeywordsFromText(market.description || '', 'market_description'),
      outcomes: this.extractOutcomeKeywords(market.outcomes)
    }));
  }

  /**
   * Process event metadata into structured keywords
   */
  processEventMetadata(event: PolymarketEvent): ProcessedEventKeywords {
    const eventTags = this.extractKeywordsFromEventTags(event.tags);
    const eventTitle = this.extractKeywordsFromText(event.title, 'event_title');
    const eventDescription = this.extractKeywordsFromText(event.description, 'event_description');
    
    const marketKeywords = this.extractKeywordsFromAllMarkets(event.markets);
    const marketQuestions = marketKeywords.flatMap(mk => mk.primary);
    const marketOutcomes = marketKeywords.flatMap(mk => mk.outcomes);

    // Generate derived keywords (variations, synonyms, etc.)
    const derived = this.generateDerivedKeywords([
      ...eventTags, ...eventTitle, ...eventDescription, ...marketQuestions
    ]);

    // Filter for political relevance
    const allKeywords = [...eventTags, ...eventTitle, ...eventDescription, ...marketQuestions, ...derived];
    const political = this.filterKeywordsByPoliticalRelevance(allKeywords);

    return {
      eventTags,
      eventTitle,
      eventDescription,
      marketQuestions,
      marketOutcomes,
      derived,
      political
    };
  }

  /**
   * Combine event and market keywords with proper prioritization
   */
  combineEventAndMarketKeywords(eventKeywords: string[], marketKeywords: MarketKeywords[]): string[] {
    return this.deduplicateAndRankCombinedKeywords(eventKeywords, marketKeywords);
  }

  /**
   * Implement comprehensive deduplication and ranking of combined event and market keywords
   * Requirement 3.4: Deduplication and ranking of combined event and market keywords
   */
  private deduplicateAndRankCombinedKeywords(eventKeywords: string[], marketKeywords: MarketKeywords[]): string[] {
    const keywordScores = new Map<string, {
      score: number;
      sources: Set<string>;
      marketIds: Set<string>;
      frequency: number;
    }>();

    // Process event keywords with highest priority
    for (const keyword of eventKeywords) {
      const normalized = this.normalizeKeyword(keyword);
      if (!keywordScores.has(normalized)) {
        keywordScores.set(normalized, {
          score: 0,
          sources: new Set(),
          marketIds: new Set(),
          frequency: 0
        });
      }
      
      const entry = keywordScores.get(normalized)!;
      entry.score += 5.0; // High priority for event-level keywords
      entry.sources.add('event');
      entry.frequency += 1;
    }

    // Process market keywords with context-aware scoring
    for (const mk of marketKeywords) {
      // Primary keywords (from questions) get higher weight
      for (const keyword of mk.primary) {
        const normalized = this.normalizeKeyword(keyword);
        if (!keywordScores.has(normalized)) {
          keywordScores.set(normalized, {
            score: 0,
            sources: new Set(),
            marketIds: new Set(),
            frequency: 0
          });
        }
        
        const entry = keywordScores.get(normalized)!;
        entry.score += 3.0; // Medium-high priority for market questions
        entry.sources.add('market_primary');
        entry.marketIds.add(mk.marketId);
        entry.frequency += 1;
      }

      // Secondary keywords (from descriptions) get medium weight
      for (const keyword of mk.secondary) {
        const normalized = this.normalizeKeyword(keyword);
        if (!keywordScores.has(normalized)) {
          keywordScores.set(normalized, {
            score: 0,
            sources: new Set(),
            marketIds: new Set(),
            frequency: 0
          });
        }
        
        const entry = keywordScores.get(normalized)!;
        entry.score += 2.0; // Medium priority for market descriptions
        entry.sources.add('market_secondary');
        entry.marketIds.add(mk.marketId);
        entry.frequency += 1;
      }

      // Outcome keywords get lower weight
      for (const keyword of mk.outcomes) {
        const normalized = this.normalizeKeyword(keyword);
        if (!keywordScores.has(normalized)) {
          keywordScores.set(normalized, {
            score: 0,
            sources: new Set(),
            marketIds: new Set(),
            frequency: 0
          });
        }
        
        const entry = keywordScores.get(normalized)!;
        entry.score += 1.0; // Lower priority for outcomes
        entry.sources.add('market_outcome');
        entry.marketIds.add(mk.marketId);
        entry.frequency += 1;
      }
    }

    // Apply cross-market bonus for keywords appearing in multiple markets
    for (const [keyword, data] of keywordScores) {
      if (data.marketIds.size > 1) {
        data.score += data.marketIds.size * 0.5; // Bonus for cross-market presence
      }
    }

    // Sort by combined score and return deduplicated keywords
    return Array.from(keywordScores.entries())
      .sort((a, b) => {
        // Primary sort by score
        if (b[1].score !== a[1].score) {
          return b[1].score - a[1].score;
        }
        // Secondary sort by frequency
        if (b[1].frequency !== a[1].frequency) {
          return b[1].frequency - a[1].frequency;
        }
        // Tertiary sort by cross-market presence
        return b[1].marketIds.size - a[1].marketIds.size;
      })
      .map(([keyword]) => keyword)
      .slice(0, 50); // Limit to top 50 keywords
  }

  /**
   * Normalize keywords for deduplication (handle variations, case, etc.)
   */
  private normalizeKeyword(keyword: string): string {
    let normalized = keyword.toLowerCase().trim();
    
    // Remove common suffixes for better deduplication
    if (normalized.endsWith('ing')) {
      normalized = normalized.slice(0, -3);
    } else if (normalized.endsWith('ed')) {
      normalized = normalized.slice(0, -2);
    } else if (normalized.endsWith('s') && normalized.length > 4) {
      normalized = normalized.slice(0, -1);
    }
    
    // Handle common political term variations
    const politicalNormalizations: Record<string, string> = {
      'election': 'elect',
      'electoral': 'elect',
      'voting': 'vote',
      'voter': 'vote',
      'political': 'politic',
      'politics': 'politic',
      'presidential': 'president',
      'congressional': 'congress',
      'senatorial': 'senate'
    };
    
    return politicalNormalizations[normalized] || normalized;
  }

  /**
   * Identify common themes across markets within an event
   * Enhanced implementation for Requirement 3.5: Common theme identification
   */
  identifyCommonThemes(markets: PolymarketMarket[]): ThemeKeywords[] {
    const themeAnalysis = new Map<string, {
      keywords: Set<string>;
      marketIds: Set<string>;
      contexts: string[];
      semanticVariations: Set<string>;
    }>();

    // Extract potential themes from market questions and descriptions
    for (const market of markets) {
      const questionKeywords = this.extractKeywordsFromText(market.question, 'market_question');
      const descriptionKeywords = market.description ? 
        this.extractKeywordsFromText(market.description, 'market_description') : [];
      
      const allMarketKeywords = [...questionKeywords, ...descriptionKeywords];
      
      for (const keyword of allMarketKeywords) {
        const normalized = this.normalizeKeyword(keyword);
        
        if (!themeAnalysis.has(normalized)) {
          themeAnalysis.set(normalized, {
            keywords: new Set(),
            marketIds: new Set(),
            contexts: [],
            semanticVariations: new Set()
          });
        }
        
        const theme = themeAnalysis.get(normalized)!;
        theme.keywords.add(keyword);
        theme.marketIds.add(market.id);
        theme.semanticVariations.add(keyword.toLowerCase());
        
        // Store context for better theme understanding
        const context = this.extractKeywordContext(keyword, market.question);
        if (context) {
          theme.contexts.push(context);
        }
      }
    }

    // Identify semantic clusters and related themes
    const enhancedThemes = this.identifySemanticClusters(themeAnalysis, markets);

    // Filter themes that appear in multiple markets and calculate relevance
    const result: ThemeKeywords[] = [];
    for (const [theme, data] of enhancedThemes) {
      if (data.marketIds.size >= 2) { // Theme must appear in at least 2 markets
        const relevanceScore = this.calculateThemeRelevance(data, markets.length);
        
        result.push({
          theme,
          keywords: Array.from(data.keywords),
          marketIds: Array.from(data.marketIds),
          relevanceScore
        });
      }
    }

    // Sort by relevance score and cross-market presence
    return result.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return b.marketIds.length - a.marketIds.length;
    });
  }

  /**
   * Identify semantic clusters of related themes
   */
  private identifySemanticClusters(
    themeAnalysis: Map<string, {
      keywords: Set<string>;
      marketIds: Set<string>;
      contexts: string[];
      semanticVariations: Set<string>;
    }>,
    markets: PolymarketMarket[]
  ): Map<string, {
    keywords: Set<string>;
    marketIds: Set<string>;
    contexts: string[];
    semanticVariations: Set<string>;
  }> {
    const clusters = new Map(themeAnalysis);
    
    // Define semantic relationships for political themes
    const semanticGroups = [
      ['elect', 'election', 'electoral', 'vote', 'voting', 'ballot'],
      ['president', 'presidential', 'executive', 'administration'],
      ['congress', 'congressional', 'senate', 'senatorial', 'house', 'legislative'],
      ['court', 'judicial', 'justice', 'judge', 'ruling', 'legal'],
      ['party', 'democrat', 'democratic', 'republican', 'gop'],
      ['campaign', 'candidate', 'nomination', 'primary', 'general'],
      ['policy', 'legislation', 'bill', 'law', 'amendment'],
      ['poll', 'polling', 'approval', 'rating', 'survey']
    ];

    // Merge semantically related themes
    for (const group of semanticGroups) {
      const groupThemes = group.filter(term => clusters.has(term));
      
      if (groupThemes.length > 1) {
        // Use the most frequent term as the cluster representative
        const representative = groupThemes.reduce((best, current) => {
          const bestData = clusters.get(best)!;
          const currentData = clusters.get(current)!;
          return currentData.marketIds.size > bestData.marketIds.size ? current : best;
        });

        // Merge other themes into the representative
        for (const theme of groupThemes) {
          if (theme !== representative) {
            const themeData = clusters.get(theme)!;
            const repData = clusters.get(representative)!;
            
            // Merge data
            themeData.keywords.forEach(k => repData.keywords.add(k));
            themeData.marketIds.forEach(id => repData.marketIds.add(id));
            repData.contexts.push(...themeData.contexts);
            themeData.semanticVariations.forEach(v => repData.semanticVariations.add(v));
            
            // Remove the merged theme
            clusters.delete(theme);
          }
        }
      }
    }

    return clusters;
  }

  /**
   * Calculate theme relevance score based on multiple factors
   */
  private calculateThemeRelevance(
    themeData: {
      keywords: Set<string>;
      marketIds: Set<string>;
      contexts: string[];
      semanticVariations: Set<string>;
    },
    totalMarkets: number
  ): number {
    // Base score from market coverage
    const marketCoverage = themeData.marketIds.size / totalMarkets;
    
    // Bonus for keyword diversity within theme
    const keywordDiversity = Math.min(themeData.keywords.size / 5, 1.0);
    
    // Bonus for political relevance
    const politicalBonus = Array.from(themeData.keywords).some(keyword => 
      this.isPoliticallyRelevant(keyword.toLowerCase())
    ) ? 0.2 : 0;
    
    // Context richness bonus
    const contextBonus = Math.min(themeData.contexts.length / 10, 0.1);
    
    return Math.min(
      marketCoverage * 0.6 + 
      keywordDiversity * 0.2 + 
      politicalBonus + 
      contextBonus,
      1.0
    );
  }

  /**
   * Extract context around a keyword for better theme understanding
   */
  private extractKeywordContext(keyword: string, text: string): string | null {
    const keywordIndex = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (keywordIndex === -1) return null;
    
    const start = Math.max(0, keywordIndex - 20);
    const end = Math.min(text.length, keywordIndex + keyword.length + 20);
    
    return text.substring(start, end).trim();
  }

  /**
   * Extract event-level concepts from event data
   */
  extractEventLevelConcepts(event: PolymarketEvent): ConceptKeywords[] {
    const concepts: ConceptKeywords[] = [];

    // Extract concepts from event title
    const titleConcepts = this.extractConceptsFromText(event.title, 'event_title');
    concepts.push(...titleConcepts);

    // Extract concepts from event description
    const descriptionConcepts = this.extractConceptsFromText(event.description, 'event_description');
    concepts.push(...descriptionConcepts);

    // Extract concepts from event tags
    for (const tag of event.tags) {
      concepts.push({
        concept: tag.label,
        keywords: [tag.label.toLowerCase(), ...tag.slug.split('-')],
        source: 'event_tags',
        confidence: 0.9
      });
    }

    // Identify market patterns
    const patternConcepts = this.identifyMarketPatterns(event.markets);
    concepts.push(...patternConcepts);

    return concepts;
  }

  /**
   * Rank keywords by relevance to the event
   */
  rankKeywordsByEventRelevance(keywords: string[], event: PolymarketEvent): RankedKeyword[] {
    const ranked: RankedKeyword[] = [];

    for (const keyword of keywords) {
      const relevanceScore = this.calculateKeywordRelevance(keyword, event);
      const source = this.determineKeywordSource(keyword, event);
      const frequency = this.calculateKeywordFrequency(keyword, event);
      const marketIds = this.findKeywordMarkets(keyword, event);

      ranked.push({
        keyword,
        relevanceScore,
        source,
        frequency,
        marketIds: marketIds.length > 0 ? marketIds : undefined,
        tagId: this.findTagId(keyword, event.tags)
      });
    }

    return ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Filter keywords by political relevance
   * Enhanced implementation for Requirement 3.5: Political relevance filtering
   */
  filterKeywordsByPoliticalRelevance(keywords: string[]): string[] {
    const politicalKeywords: string[] = [];
    const politicalScores = new Map<string, number>();

    for (const keyword of keywords) {
      const score = this.calculatePoliticalRelevanceScore(keyword);
      if (score > 0.3) { // Threshold for political relevance
        politicalKeywords.push(keyword);
        politicalScores.set(keyword, score);
      }
    }

    // Sort by political relevance score
    return politicalKeywords.sort((a, b) => {
      const scoreA = politicalScores.get(a) || 0;
      const scoreB = politicalScores.get(b) || 0;
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate comprehensive political relevance score for a keyword
   */
  private calculatePoliticalRelevanceScore(keyword: string): number {
    const lowerKeyword = keyword.toLowerCase();
    let score = 0;

    // Direct match with political keywords
    if (this.politicalKeywords.has(lowerKeyword)) {
      score += 1.0;
    }

    // Partial match with political keywords
    for (const politicalTerm of this.politicalKeywords) {
      if (lowerKeyword.includes(politicalTerm) || politicalTerm.includes(lowerKeyword)) {
        score += 0.7;
        break;
      }
    }

    // Check for political context patterns
    score += this.checkPoliticalContextPatterns(lowerKeyword);

    // Check for government/institutional terms
    score += this.checkGovernmentTerms(lowerKeyword);

    // Check for electoral process terms
    score += this.checkElectoralTerms(lowerKeyword);

    return Math.min(score, 1.0);
  }

  /**
   * Check for political context patterns in keywords
   */
  private checkPoliticalContextPatterns(keyword: string): number {
    const politicalPatterns = [
      /\b(win|lose|lead|trail|ahead|behind)\b.*\b(election|race|campaign)\b/,
      /\b(support|oppose|endorse|back)\b.*\b(candidate|policy|bill)\b/,
      /\b(democrat|republican|liberal|conservative)\b.*\b(party|candidate|voter)\b/,
      /\b(poll|survey|approval|rating)\b.*\b(president|congress|governor)\b/,
      /\b(debate|speech|rally|convention)\b/,
      /\b(primary|general|midterm|presidential)\b.*\b(election|race)\b/
    ];

    for (const pattern of politicalPatterns) {
      if (pattern.test(keyword)) {
        return 0.5;
      }
    }

    return 0;
  }

  /**
   * Check for government and institutional terms
   */
  private checkGovernmentTerms(keyword: string): number {
    const governmentTerms = [
      'federal', 'state', 'local', 'municipal', 'county', 'city',
      'department', 'agency', 'bureau', 'commission', 'committee',
      'administration', 'cabinet', 'staff', 'advisor', 'secretary',
      'minister', 'official', 'representative', 'delegate', 'ambassador'
    ];

    for (const term of governmentTerms) {
      if (keyword.includes(term)) {
        return 0.4;
      }
    }

    return 0;
  }

  /**
   * Check for electoral process terms
   */
  private checkElectoralTerms(keyword: string): number {
    const electoralTerms = [
      'ballot', 'voting', 'voter', 'turnout', 'registration', 'absentee',
      'polling', 'precinct', 'district', 'constituency', 'electorate',
      'campaign', 'fundraising', 'donation', 'pac', 'super pac',
      'primary', 'caucus', 'convention', 'nomination', 'endorsement',
      'debate', 'town hall', 'rally', 'stump', 'canvassing'
    ];

    for (const term of electoralTerms) {
      if (keyword.includes(term)) {
        return 0.6;
      }
    }

    return 0;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private extractKeywordsFromText(text: string, sourceType: string): string[] {
    if (!text || text.trim().length === 0) return [];

    logger.debug(`Extracting keywords from ${sourceType}: ${text.substring(0, 100)}...`);

    const keywords: string[] = [];

    // Extract proper names (capitalized words)
    const properNames = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    keywords.push(...properNames.map(name => name.toLowerCase()));

    // Extract acronyms
    const acronyms = text.match(/\b[A-Z]{2,}\b/g) || [];
    keywords.push(...acronyms.map(acronym => acronym.toLowerCase()));

    // Extract quoted phrases
    const quotedPhrases = text.match(/"([^"]+)"/g) || [];
    keywords.push(...quotedPhrases.map(phrase => phrase.replace(/"/g, '').toLowerCase()));

    // Extract significant words (length > 3, not stop words)
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.stopWords.has(word));
    keywords.push(...words);

    return this.deduplicateAndFilter(keywords);
  }

  private extractOutcomeKeywords(outcomes: string): string[] {
    try {
      const outcomeArray = JSON.parse(outcomes) as string[];
      return outcomeArray.flatMap(outcome => 
        this.extractKeywordsFromText(outcome, 'market_outcome')
      );
    } catch {
      // If outcomes is not valid JSON, treat as plain text
      return this.extractKeywordsFromText(outcomes, 'market_outcome');
    }
  }

  private extractConceptsFromText(text: string, source: ConceptKeywords['source']): ConceptKeywords[] {
    const concepts: ConceptKeywords[] = [];
    
    // Extract noun phrases (simple heuristic)
    const nounPhrases = text.match(/\b[A-Z][a-z]+(?:\s+[a-z]+)*\b/g) || [];
    
    for (const phrase of nounPhrases) {
      if (phrase.length > 5) { // Only consider longer phrases
        concepts.push({
          concept: phrase,
          keywords: phrase.toLowerCase().split(/\s+/),
          source,
          confidence: 0.7
        });
      }
    }

    return concepts;
  }

  private identifyMarketPatterns(markets: PolymarketMarket[]): ConceptKeywords[] {
    const patterns: ConceptKeywords[] = [];
    
    // Look for common question patterns
    const questionPatterns = new Map<string, number>();
    
    for (const market of markets) {
      // Extract question structure patterns
      const questionWords = market.question.toLowerCase().split(/\s+/).slice(0, 3);
      const pattern = questionWords.join(' ');
      questionPatterns.set(pattern, (questionPatterns.get(pattern) || 0) + 1);
    }

    // Add patterns that appear in multiple markets
    for (const [pattern, count] of questionPatterns) {
      if (count >= 2) {
        patterns.push({
          concept: `Question Pattern: ${pattern}`,
          keywords: pattern.split(/\s+/),
          source: 'market_pattern',
          confidence: Math.min(count / markets.length, 1.0)
        });
      }
    }

    return patterns;
  }

  private generateDerivedKeywords(baseKeywords: string[]): string[] {
    const derived: string[] = [];

    for (const keyword of baseKeywords) {
      // Add plural/singular variations
      if (keyword.endsWith('s') && keyword.length > 4) {
        derived.push(keyword.slice(0, -1)); // Remove 's'
      } else if (!keyword.endsWith('s')) {
        derived.push(keyword + 's'); // Add 's'
      }

      // Add common political variations
      if (keyword === 'elect') derived.push('election', 'electoral');
      if (keyword === 'vote') derived.push('voting', 'voter');
      if (keyword === 'politic') derived.push('political', 'politics');
    }

    return this.deduplicateAndFilter(derived);
  }

  private calculateKeywordRelevance(keyword: string, event: PolymarketEvent): number {
    let score = 0;

    // Higher score for event tags
    if (event.tags.some(tag => tag.label.toLowerCase().includes(keyword))) {
      score += 0.4;
    }

    // Medium score for event title
    if (event.title.toLowerCase().includes(keyword)) {
      score += 0.3;
    }

    // Lower score for event description
    if (event.description.toLowerCase().includes(keyword)) {
      score += 0.2;
    }

    // Score for market presence
    const marketCount = event.markets.filter(market => 
      market.question.toLowerCase().includes(keyword)
    ).length;
    score += (marketCount / event.markets.length) * 0.3;

    // Bonus for political relevance
    if (this.isPoliticallyRelevant(keyword)) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private determineKeywordSource(keyword: string, event: PolymarketEvent): RankedKeyword['source'] {
    if (event.tags.some(tag => tag.label.toLowerCase().includes(keyword))) {
      return 'event_tag';
    }
    if (event.title.toLowerCase().includes(keyword)) {
      return 'event_title';
    }
    if (event.description.toLowerCase().includes(keyword)) {
      return 'event_description';
    }
    if (event.markets.some(market => market.question.toLowerCase().includes(keyword))) {
      return 'market_question';
    }
    return 'derived';
  }

  private calculateKeywordFrequency(keyword: string, event: PolymarketEvent): number {
    let frequency = 0;

    // Count in event data
    frequency += (event.title.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
    frequency += (event.description.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;

    // Count in markets
    for (const market of event.markets) {
      frequency += (market.question.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      if (market.description) {
        frequency += (market.description.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      }
    }

    return frequency;
  }

  private findKeywordMarkets(keyword: string, event: PolymarketEvent): string[] {
    return event.markets
      .filter(market => market.question.toLowerCase().includes(keyword))
      .map(market => market.id);
  }

  private findTagId(keyword: string, tags: PolymarketTag[]): number | undefined {
    const tag = tags.find(tag => tag.label.toLowerCase().includes(keyword));
    return tag?.id;
  }

  private isPoliticallyRelevant(keyword: string): boolean {
    // Check if keyword contains political terms
    for (const politicalTerm of this.politicalKeywords) {
      if (keyword.includes(politicalTerm) || politicalTerm.includes(keyword)) {
        return true;
      }
    }
    return false;
  }

  private deduplicateAndFilter(keywords: string[]): string[] {
    return [...new Set(keywords)]
      .filter(keyword => keyword.length > 2 && !this.stopWords.has(keyword))
      .slice(0, 20); // Limit to top 20 per source
  }
}