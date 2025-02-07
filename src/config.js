export const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY

if (!PERPLEXITY_API_KEY) {
  console.error('Perplexity API key not found in environment variables')
}
