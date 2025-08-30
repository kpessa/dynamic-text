import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../generate-tests';

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            testCases: [
              {
                name: 'Test 1',
                variables: { x: 5 },
                expectedOutput: '10',
                description: 'Basic test'
              }
            ]
          })
        }
      })
    })
  }))
}));

describe('generate-tests API handler', () => {
  let req: Partial<VercelRequest>;
  let res: Partial<VercelResponse>;
  let statusMock: any;
  let jsonMock: any;
  let setHeaderMock: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock response object
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    setHeaderMock = vi.fn();
    
    res = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock
    };
    
    // Default request
    req = {
      method: 'POST',
      headers: {},
      body: {
        code: 'return x * 2;',
        sectionName: 'Test Section'
      }
    };
    
    // Set environment variable
    process.env['GEMINI_API_KEY'] = 'test-api-key';
  });

  afterEach(() => {
    delete process.env['GEMINI_API_KEY'];
  });

  describe('CORS handling', () => {
    it('should set CORS headers for all requests', async () => {
      await handler(req as VercelRequest, res as VercelResponse);
      
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, OPTIONS');
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    });

    it('should handle OPTIONS preflight requests', async () => {
      req.method = 'OPTIONS';
      
      await handler(req as VercelRequest, res as VercelResponse);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({});
    });
  });

  describe('Request validation', () => {
    it('should reject non-POST requests', async () => {
      req.method = 'GET';
      
      await handler(req as VercelRequest, res as VercelResponse);
      
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });

    it('should reject requests without code', async () => {
      req.body = { sectionName: 'Test' };
      
      await handler(req as VercelRequest, res as VercelResponse);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ 
        error: 'Missing required field: code or dynamicCode',
        details: 'Request must include either code or dynamicCode field'
      });
    });

    it('should accept code parameter', async () => {
      req.body = {
        code: 'return x * 2;',
        sectionName: 'Test Section'
      };
      
      await handler(req as VercelRequest, res as VercelResponse);
      
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should accept dynamicCode parameter for backward compatibility', async () => {
      req.body = {
        dynamicCode: 'return x * 2;',
        sectionName: 'Test Section'
      };
      
      await handler(req as VercelRequest, res as VercelResponse);
      
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('API key configuration', () => {
    it('should return error when API key is not configured', async () => {
      delete process.env['GEMINI_API_KEY'];
      
      await handler(req as VercelRequest, res as VercelResponse);
      
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'AI service not configured',
        details: 'GEMINI_API_KEY environment variable is missing'
      });
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limiting per client', async () => {
      req.headers = { 'x-forwarded-for': 'test-client' };
      
      // Make requests up to the rate limit
      for (let i = 0; i < 60; i++) {
        await handler(req as VercelRequest, res as VercelResponse);
      }
      
      // The 61st request should be rate limited
      await handler(req as VercelRequest, res as VercelResponse);
      
      expect(statusMock).toHaveBeenLastCalledWith(429);
      expect(jsonMock).toHaveBeenLastCalledWith({
        error: 'Rate limit exceeded',
        details: 'Maximum 60 requests per minute. Please try again later.'
      });
    });
  });

  describe('Test generation', () => {
    it('should generate tests successfully', async () => {
      await handler(req as VercelRequest, res as VercelResponse);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          tests: expect.any(Object)
        })
      );
    });

    it('should handle TPN context when provided', async () => {
      req.body = {
        code: 'return me.getValue("DoseWeightKG") * 2;',
        sectionName: 'TPN Test',
        context: {
          populationType: 'pediatric',
          availableVariables: ['DoseWeightKG', 'TotalVolume']
        }
      };
      
      await handler(req as VercelRequest, res as VercelResponse);
      
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle generation errors gracefully', async () => {
      // Mock an error from Gemini
      const GoogleGenerativeAI = await import('@google/generative-ai');
      vi.mocked(GoogleGenerativeAI.GoogleGenerativeAI).mockImplementationOnce(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue(new Error('AI service error'))
        })
      }) as any);
      
      await handler(req as VercelRequest, res as VercelResponse);
      
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Failed to generate tests')
        })
      );
    });
  });

  describe('Response parsing', () => {
    it('should parse and categorize test cases', async () => {
      await handler(req as VercelRequest, res as VercelResponse);
      
      const response = jsonMock.mock.calls[0][0];
      expect(response.tests).toBeDefined();
      expect(response.metadata).toBeDefined();
      expect(response.metadata.totalGenerated).toBeGreaterThan(0);
    });

    it('should handle malformed AI responses', async () => {
      const GoogleGenerativeAI = await import('@google/generative-ai');
      vi.mocked(GoogleGenerativeAI.GoogleGenerativeAI).mockImplementationOnce(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () => 'Invalid JSON response'
            }
          })
        })
      }) as any);
      
      await handler(req as VercelRequest, res as VercelResponse);
      
      // Should still return a successful response with empty tests
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          tests: expect.any(Object)
        })
      );
    });
  });
});