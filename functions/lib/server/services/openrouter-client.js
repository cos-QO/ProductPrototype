import fetch from 'node-fetch';
export class OpenRouterClient {
    static instance;
    apiKey;
    baseUrl;
    httpReferer;
    appTitle;
    stats;
    MODEL = 'openai/gpt-4o-mini';
    // Pricing for GPT-4o-mini (per 1M tokens)
    PRICING = {
        input: 0.150, // $0.150 per 1M input tokens
        output: 0.600 // $0.600 per 1M output tokens
    };
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY || '';
        this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
        this.httpReferer = process.env.OPENROUTER_HTTP_REFERER || 'https://github.com/QueenOne/ProductPrototype';
        this.appTitle = process.env.OPENROUTER_X_TITLE || 'QueenOne ProductPrototype - Bulk Upload';
        this.stats = {
            totalRequests: 0,
            totalTokens: 0,
            totalCost: 0,
            promptTokens: 0,
            completionTokens: 0,
            averageResponseTime: 0
        };
        if (!this.apiKey) {
            console.warn('OpenRouter API key not found. LLM field mapping will be disabled.');
        }
        else {
            console.log('OpenRouter client initialized successfully');
        }
    }
    static getInstance() {
        if (!OpenRouterClient.instance) {
            OpenRouterClient.instance = new OpenRouterClient();
        }
        return OpenRouterClient.instance;
    }
    /**
     * Check if OpenRouter is available for use
     */
    isAvailable() {
        return !!this.apiKey;
    }
    /**
     * Get current token usage statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Reset statistics (useful for testing)
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            totalTokens: 0,
            totalCost: 0,
            promptTokens: 0,
            completionTokens: 0,
            averageResponseTime: 0
        };
    }
    /**
     * Make a completion request to OpenRouter
     */
    async createCompletion(request, options = {}) {
        const { timeout = 30000, retries = 2, costLimit = 0.01 } = options;
        if (!this.isAvailable()) {
            return {
                success: false,
                error: 'OpenRouter API key not configured'
            };
        }
        const startTime = Date.now();
        let lastError = '';
        // Estimate cost before making request
        const estimatedInputTokens = this.estimateTokens(request.messages.map(m => m.content).join(' '));
        const estimatedOutputTokens = request.max_tokens || 500;
        const estimatedCost = this.calculateCost(estimatedInputTokens, estimatedOutputTokens);
        if (estimatedCost > costLimit) {
            return {
                success: false,
                error: `Estimated cost $${estimatedCost.toFixed(4)} exceeds limit $${costLimit.toFixed(4)}`
            };
        }
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(`${this.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': this.httpReferer,
                        'X-Title': this.appTitle
                    },
                    body: JSON.stringify({
                        ...request,
                        model: this.MODEL
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    const errorData = await response.json();
                    lastError = errorData.error?.message || `HTTP ${response.status}`;
                    // Don't retry on client errors (4xx)
                    if (response.status >= 400 && response.status < 500) {
                        break;
                    }
                    continue;
                }
                const data = await response.json();
                const responseTime = Date.now() - startTime;
                // Update statistics
                this.updateStats(data.usage, responseTime);
                return {
                    success: true,
                    data,
                    usage: {
                        tokens: data.usage.total_tokens,
                        cost: this.calculateCost(data.usage.prompt_tokens, data.usage.completion_tokens),
                        responseTime
                    }
                };
            }
            catch (error) {
                lastError = error instanceof Error ? error.message : 'Unknown error';
                if (attempt === retries) {
                    break;
                }
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        return {
            success: false,
            error: `Failed after ${retries + 1} attempts: ${lastError}`
        };
    }
    /**
     * Create a field mapping completion request
     */
    async analyzeFieldMapping(sourceFields, sampleData, targetFields, context) {
        if (!this.isAvailable()) {
            return {
                success: false,
                error: 'OpenRouter not available'
            };
        }
        const systemPrompt = this.buildFieldMappingSystemPrompt();
        const userPrompt = this.buildFieldMappingUserPrompt(sourceFields, sampleData, targetFields, context);
        const result = await this.createCompletion({
            model: this.MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 1000,
            temperature: 0.1, // Low temperature for consistency
            top_p: 0.9
        }, {
            costLimit: 0.005 // $0.005 limit per field mapping request
        });
        if (!result.success) {
            return {
                success: false,
                error: result.error,
                usage: result.usage
            };
        }
        try {
            const content = result.data.choices[0].message.content;
            const mappings = this.parseFieldMappingResponse(content);
            return {
                success: true,
                mappings,
                usage: result.usage
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`,
                usage: result.usage
            };
        }
    }
    /**
     * Build system prompt for field mapping
     */
    buildFieldMappingSystemPrompt() {
        return `You are an expert data analyst specializing in field mapping for e-commerce product data.

Your task is to analyze source data fields and map them to target product schema fields with high accuracy.

Product Schema Fields:
- name: Product name/title (required)
- slug: URL-friendly identifier
- sku: Stock keeping unit
- gtin: Global trade item number (barcode)
- shortDescription: Brief product description
- longDescription: Detailed description
- story: Product/brand story
- price: Selling price (number)
- compareAtPrice: Original/MSRP price (number)
- inventoryQuantity: Stock quantity (number)
- trackInventory: Whether to track inventory (boolean)
- isActive: Product status (boolean)
- tags: Product tags (array)
- metaTitle: SEO title
- metaDescription: SEO description
- weight: Product weight (number)
- weightUnit: Weight unit (string)
- hsCode: Harmonized system code
- countryOfOrigin: Country of origin
- material: Product material
- color: Product color
- size: Product size
- gender: Target gender
- ageGroup: Target age group
- season: Seasonal category
- brand: Brand name
- vendor: Vendor/supplier
- productType: Product category
- collection: Product collection

Mapping Rules:
1. Only map to valid target fields listed above
2. Confidence score 0-100 based on field name similarity and data content
3. Consider data types and sample values
4. Provide clear reasoning for each mapping
5. Return exactly one mapping per source field
6. Use "unmapped" as targetField if no good match exists (confidence < 30)

Response Format (JSON only):
{
  "mappings": [
    {
      "sourceField": "source_field_name",
      "targetField": "target_field_name_or_unmapped",
      "confidence": 85,
      "reasoning": "Brief explanation"
    }
  ]
}`;
    }
    /**
     * Build user prompt for specific field mapping request
     */
    buildFieldMappingUserPrompt(sourceFields, sampleData, targetFields, context) {
        let prompt = `Please analyze and map the following source fields to the product schema:\n\n`;
        prompt += `Source Fields:\n`;
        sourceFields.forEach((field, index) => {
            prompt += `${index + 1}. "${field}"\n`;
        });
        if (sampleData.length > 0) {
            prompt += `\nSample Data (first 3 rows):\n`;
            sampleData.slice(0, 3).forEach((row, rowIndex) => {
                prompt += `Row ${rowIndex + 1}: `;
                sourceFields.forEach((field, fieldIndex) => {
                    const value = row[fieldIndex];
                    prompt += `${field}="${value}" `;
                });
                prompt += `\n`;
            });
        }
        if (context) {
            prompt += `\nAdditional Context: ${context}\n`;
        }
        prompt += `\nReturn field mappings as JSON following the specified format.`;
        return prompt;
    }
    /**
     * Parse LLM response to extract field mappings
     */
    parseFieldMappingResponse(content) {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (!parsed.mappings || !Array.isArray(parsed.mappings)) {
                throw new Error('Invalid response format: missing mappings array');
            }
            return parsed.mappings.map((mapping) => ({
                sourceField: String(mapping.sourceField || ''),
                targetField: String(mapping.targetField || 'unmapped'),
                confidence: Math.max(0, Math.min(100, Number(mapping.confidence || 0))),
                reasoning: String(mapping.reasoning || 'No reasoning provided')
            }));
        }
        catch (error) {
            throw new Error(`JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Estimate token count for text (rough approximation)
     */
    estimateTokens(text) {
        // Rough approximation: 1 token ≈ 4 characters for English text
        return Math.ceil(text.length / 4);
    }
    /**
     * Calculate cost based on token usage
     */
    calculateCost(inputTokens, outputTokens) {
        const inputCost = (inputTokens / 1000000) * this.PRICING.input;
        const outputCost = (outputTokens / 1000000) * this.PRICING.output;
        return inputCost + outputCost;
    }
    /**
     * Update internal statistics
     */
    updateStats(usage, responseTime) {
        const cost = this.calculateCost(usage.prompt_tokens, usage.completion_tokens);
        this.stats.totalRequests++;
        this.stats.totalTokens += usage.total_tokens;
        this.stats.totalCost += cost;
        this.stats.promptTokens += usage.prompt_tokens;
        this.stats.completionTokens += usage.completion_tokens;
        // Update average response time
        this.stats.averageResponseTime =
            (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime) /
                this.stats.totalRequests;
    }
}
export default OpenRouterClient;
//# sourceMappingURL=openrouter-client.js.map