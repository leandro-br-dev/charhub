import https from 'node:https';
import { logger } from '../../../config/logger';

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface WebSearchResponse {
  results: WebSearchResult[];
  query: string;
  timestamp: Date;
}

// Simple in-memory cache with TTL
const searchCache = new Map<string, { data: WebSearchResponse; expires: number }>();
const CACHE_TTL = 3600 * 1000; // 1 hour
const MAX_CACHE_SIZE = 100;

// Rate limiting: simple token bucket
let requestTokens = 10;
let lastRefill = Date.now();
const MAX_TOKENS = 10;
const REFILL_RATE = 1; // 1 token per second
const REFILL_INTERVAL = 1000;

function refillTokens() {
  const now = Date.now();
  const timePassed = now - lastRefill;
  const tokensToAdd = Math.floor(timePassed / REFILL_INTERVAL) * REFILL_RATE;

  if (tokensToAdd > 0) {
    requestTokens = Math.min(MAX_TOKENS, requestTokens + tokensToAdd);
    lastRefill = now;
  }
}

function consumeToken(): boolean {
  refillTokens();
  if (requestTokens > 0) {
    requestTokens--;
    return true;
  }
  return false;
}

/**
 * Perform web search using DuckDuckGo Instant Answer API (no API key required)
 * Note: This is a basic implementation. For production, consider using:
 * - Google Custom Search API
 * - Bing Search API
 * - Serper API
 * - SerpAPI
 */
export async function webSearch(query: string): Promise<WebSearchResponse> {
  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  const cached = searchCache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    logger.debug({ query }, 'Web search cache hit');
    return cached.data;
  }

  // Rate limiting check
  if (!consumeToken()) {
    throw new Error('Rate limit exceeded for web search. Please try again in a moment.');
  }

  try {
    // Use DuckDuckGo Instant Answer API (free, no key required)
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;

    const response = await new Promise<WebSearchResponse>((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const results: WebSearchResult[] = [];

            // Parse Abstract
            if (parsed.Abstract) {
              results.push({
                title: parsed.Heading || 'Result',
                url: parsed.AbstractURL || '',
                snippet: parsed.Abstract,
              });
            }

            // Parse RelatedTopics
            if (parsed.RelatedTopics && Array.isArray(parsed.RelatedTopics)) {
              for (const topic of parsed.RelatedTopics.slice(0, 4)) {
                if (topic.Text && topic.FirstURL) {
                  results.push({
                    title: topic.Text.split(' - ')[0] || 'Related',
                    url: topic.FirstURL,
                    snippet: topic.Text,
                  });
                }
              }
            }

            const searchResponse: WebSearchResponse = {
              results: results.slice(0, 5), // Limit to 5 results
              query,
              timestamp: new Date(),
            };

            resolve(searchResponse);
          } catch (_error) {
            reject(new Error('Failed to parse web search results'));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });

    // Cache the result
    if (searchCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = searchCache.keys().next().value;
      if (firstKey) searchCache.delete(firstKey);
    }

    searchCache.set(cacheKey, {
      data: response,
      expires: Date.now() + CACHE_TTL,
    });

    logger.info({ query, resultsCount: response.results.length }, 'Web search completed');
    return response;

  } catch (error) {
    logger.error({ error, query }, 'Web search failed');
    throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Tool definition for LLM providers
 */
export const webSearchTool = {
  name: 'web_search',
  description: 'Search the web for current information about a topic. Use this when you need up-to-date information that may not be in your training data. Returns a list of search results with titles, URLs, and snippets.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to look up on the web',
      },
    },
    required: ['query'],
  },
  execute: async (args: { query: string }): Promise<string> => {
    const results = await webSearch(args.query);

    // Format results for LLM
    if (results.results.length === 0) {
      return `No results found for query: "${args.query}"`;
    }

    let formatted = `Web search results for "${args.query}":\n\n`;

    results.results.forEach((result, index) => {
      formatted += `${index + 1}. ${result.title}\n`;
      formatted += `   URL: ${result.url}\n`;
      formatted += `   ${result.snippet}\n\n`;
    });

    return formatted;
  },
};
