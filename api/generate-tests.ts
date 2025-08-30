import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env['GEMINI_API_KEY'] || '');

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute (Gemini free tier limit)

// Simple in-memory rate limiting (will reset on function cold start)
// In production, use Vercel KV or Redis for persistent rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    // New window or expired window
    const resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(clientId, { count: 1, resetTime });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetTime };
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: clientData.resetTime };
  }
  
  // Increment count
  clientData.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - clientData.count, resetTime: clientData.resetTime };
}

// Clean up old entries periodically to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS * 2);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Set CORS headers for all responses - restrict origins in production
  const allowedOrigins = process.env['NODE_ENV'] === 'production' 
    ? [process.env['FRONTEND_URL'] || 'https://your-app.vercel.app'] 
    : ['http://localhost:5173', 'http://localhost:3000'];
  
  const origin = req.headers.origin as string;
  if (origin && (allowedOrigins.includes(origin) || process.env['NODE_ENV'] !== 'production')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).json({});
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  // Rate limiting check
  const clientId = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                   req.socket?.remoteAddress || 
                   'unknown';
  
  const rateLimit = checkRateLimit(clientId);
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
  
  if (!rateLimit.allowed) {
    res.status(429).json({ 
      error: 'Rate limit exceeded', 
      message: `Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per minute. Please try again later.`,
      retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    });
    return;
  }
  
  console.log('Received test generation request:', {
    variables: req.body.variables?.length || 0,
    sectionName: req.body.sectionName,
    hasDocumentContext: !!req.body.documentContext,
    clientId,
    remaining: rateLimit.remaining
  });

  try {
    // Check if API key is configured
    if (!process.env['GEMINI_API_KEY']) {
      console.error('GEMINI_API_KEY not configured');
      res.status(500).json({ 
        error: 'AI service not configured', 
        details: 'GEMINI_API_KEY environment variable is missing' 
      });
      return;
    }
    
    const { 
      dynamicCode, 
      variables, 
      notes, 
      sectionName,
      documentContext,
      allDocumentVariables,
      documentStats,
      targetSectionId,
      testCategory = 'all', // Default to all categories if not specified
      tpnMode = false,
      patientType = 'neonatal',
      variableMetadata = {}
    } = req.body;

    if (!dynamicCode) {
      res.status(400).json({ error: 'Dynamic code is required' });
      return;
    }

    // Create the prompt for Gemini with full document context
    const prompt = createTestGenerationPrompt(
      dynamicCode, 
      variables, 
      notes, 
      sectionName,
      documentContext,
      allDocumentVariables,
      documentStats,
      targetSectionId,
      testCategory,
      tpnMode,
      patientType,
      variableMetadata
    );

    // Use Gemini 1.5 Pro for better reasoning
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    console.log('Calling Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini response received, length:', text.length);
    console.log('First 200 chars:', text.substring(0, 200));

    // Parse the JSON response from Gemini
    let tests: any;
    let jsonText: string | undefined; // Declare jsonText outside try block so it's accessible in catch
    try {
      // Extract JSON from the response (Gemini might add markdown formatting)
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      jsonText = jsonMatch ? jsonMatch[1] : text;
      
      // More aggressive JSON cleanup
      
      // First check if there are problematic patterns
      if (jsonText && (jsonText.includes('alert(') || jsonText.includes('script>'))) {
        // Handle XSS test cases with nested quotes more carefully
        // Replace problematic patterns before general cleanup
        jsonText = jsonText
          .replace(/<script>alert\('([^']+)'\)<\/script>/g, '&lt;script&gt;alert(\\\'$1\\\')&lt;/script&gt;')
          .replace(/<script>alert\("([^"]+)"\)<\/script>/g, '&lt;script&gt;alert(\\\"$1\\\")&lt;/script&gt;')
          .replace(/alert\('([^']+)'\)/g, 'alert(\\\'$1\\\')')
          .replace(/alert\("([^"]+)"\)/g, 'alert(\\\"$1\\\")');
      }
      
      if (jsonText) {
        jsonText = jsonText
          // Remove trailing commas
          .replace(/,(\s*[}\]])/g, '$1')
        // Remove comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        // Fix common quote issues
        .replace(/'/g, '"')
        // Fix unquoted keys (basic case)
        .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
        // Remove any text before first { or after last }
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim();
      }
      
      // If response seems truncated, try to complete it
      if (jsonText && !jsonText.endsWith('}')) {
        console.log('Response appears truncated, attempting to fix...');
        // Count open braces and brackets
        const openBraces = (jsonText.match(/{/g) || []).length;
        const closeBraces = (jsonText.match(/}/g) || []).length;
        const openBrackets = (jsonText.match(/\[/g) || []).length;
        const closeBrackets = (jsonText.match(/\]/g) || []).length;
        
        // Add missing quotes if the last character isn't a quote
        if (!jsonText.endsWith('"') && !jsonText.endsWith('}') && !jsonText.endsWith(']')) {
          jsonText += '"';
        }
        
        // Close any open arrays
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          jsonText += ']';
        }
        
        // Close any open objects
        for (let i = 0; i < openBraces - closeBraces; i++) {
          jsonText += '}';
        }
      }
      
      // First parsing attempt
      tests = JSON.parse(jsonText || '{}');
      
      // Validate the structure based on testCategory
      if (testCategory === 'all') {
        if (!tests.basicFunctionality || !tests.edgeCases || !tests.qaBreaking) {
          throw new Error('Invalid test structure: missing required categories');
        }
      } else {
        // For single category, ensure that category exists
        if (!tests[testCategory]) {
          throw new Error(`Invalid test structure: missing ${testCategory} category`);
        }
        // Ensure other categories are empty arrays if not requested
        if (testCategory !== 'basicFunctionality') tests.basicFunctionality = tests.basicFunctionality || [];
        if (testCategory !== 'edgeCases') tests.edgeCases = tests.edgeCases || [];
        if (testCategory !== 'qaBreaking') tests.qaBreaking = tests.qaBreaking || [];
      }
      
    } catch (parseError: any) {
      console.error('Failed to parse Gemini response:', text);
      console.error('Parse error details:', parseError.message);
      console.error('Attempted to parse:', jsonText?.substring(0, 200) + '...');
      
      // In development, return the full error details for debugging
      if (process.env['NODE_ENV'] !== 'production') {
        res.status(500).json({ 
          error: 'Failed to parse AI response - Debug Mode', 
          details: parseError.message,
          rawResponse: text?.substring(0, 2000), // Include more of the response
          parseAttempt: jsonText?.substring(0, 1000),
          fullError: parseError.toString()
        });
        return;
      }
      
      // Try a fallback minimal response
      try {
        tests = {
          basicFunctionality: [{
            name: "Basic Test",
            description: "AI response parsing failed - using fallback",
            variables: {},
            expectedBehavior: "Code should execute without errors",
            importance: "high"
          }],
          edgeCases: [],
          qaBreaking: []
        };
        
        console.log('Using fallback test structure due to parsing error');
        
      } catch (fallbackError) {
        res.status(500).json({ 
          error: 'Failed to parse AI response', 
          details: parseError.message,
          rawResponse: text?.substring(0, 1000), // Include more for debugging
          parseAttempt: jsonText?.substring(0, 500)
        });
        return;
      }
    }

    // Return the generated tests
    res.status(200).json({
      success: true,
      tests: tests,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'gemini-1.5-pro',
        variableCount: variables.length,
        testCategory: testCategory,
        testCounts: {
          basicFunctionality: tests.basicFunctionality?.length || 0,
          edgeCases: tests.edgeCases?.length || 0,
          qaBreaking: tests.qaBreaking?.length || 0
        }
      }
    });

  } catch (error: any) {
    console.error('Test generation error:', error);
    console.error('Error stack:', error.stack);
    
    // Check if it's an API key error
    if (error.message?.includes('API_KEY') || error.message?.includes('API key')) {
      res.status(500).json({ 
        error: 'AI service configuration error', 
        details: 'Please check that GEMINI_API_KEY is properly configured',
        originalError: error.message
      });
      return;
    }
    
    res.status(500).json({ 
      error: 'Failed to generate tests', 
      details: error.message,
      type: error.constructor.name
    });
  }
  return;
}

function createTestGenerationPrompt(
  dynamicCode: string, 
  variables: string[], 
  notes: string, 
  sectionName: string,
  documentContext: any,
  allDocumentVariables: string[],
  documentStats: any,
  targetSectionId: string,
  testCategory = 'all',
  tpnMode = false,
  patientType = 'neonatal',
  variableMetadata: Record<string, any> = {}
) {
  const isTPN = tpnMode || variables.some(v => isTPNVariable(v));
  const hasDocumentContext = documentContext && documentContext.length > 0;
  
  let contextSection = '';
  let medicalContextSection = '';
  if (hasDocumentContext) {
    contextSection = `
FULL DOCUMENT CONTEXT:
This section is part of a larger document with ${documentStats.totalSections} sections (${documentStats.staticSections} static, ${documentStats.dynamicSections} dynamic).
Total document variables: ${allDocumentVariables?.length || 0}
Total test cases across document: ${documentStats.totalTestCases || 0}

DOCUMENT STRUCTURE:
${documentContext.map((section: any) => `
Section ${section.id} (${section.type.toUpperCase()}):
${section.content}
${section.testCases && section.testCases.length > 0 ? `
Existing Test Cases: ${section.testCases.map((tc: any) => `${tc.name} (${Object.keys(tc.variables || {}).length} vars)`).join(', ')}
` : ''}
`).join('\n---\n')}

TARGET SECTION FOR TESTING: Section ${targetSectionId}
`;
  }
  
  // Build medical context if in TPN mode
  if (isTPN && Object.keys(variableMetadata).length > 0) {
    const patientTypeDescriptions: Record<string, string> = {
      'neonatal': 'Neonatal (newborn infants, typically 0.5-4 kg)',
      'child': 'Child (children 1-12 years)',
      'adolescent': 'Adolescent (13-18 years)',
      'adult': 'Adult (18+ years)'
    };
    
    medicalContextSection = `
MEDICAL CONTEXT:
- Patient Type: ${patientTypeDescriptions[patientType] || patientType}
- Healthcare System: Total Parenteral Nutrition (TPN) Advisor
- Purpose: Calculating nutritional requirements for IV feeding

VARIABLE UNITS AND TYPICAL RANGES:
${Object.entries(variableMetadata)
  .filter(([, meta]) => meta.isTPN)
  .map(([key, meta]) => {
    // Add typical ranges based on variable type and patient type
    let typicalRange = '';
    if (patientType === 'neonatal') {
      // Neonatal-specific ranges
      if (key === 'DoseWeightKG') typicalRange = ' (Typical: 0.5-4 kg)';
      else if (key === 'Protein') typicalRange = ' (Normal: 2-4, Critical High: 5)';
      else if (key === 'Sodium') typicalRange = ' (Normal: 2-5, Critical High: 8)';
      else if (key === 'VolumePerKG') typicalRange = ' (Normal: 120-160, Critical High: 200)';
      else if (key === 'Potassium') typicalRange = ' (Normal: 2-4, Critical High: 6)';
      else if (key === 'Calcium') typicalRange = ' (Normal: 0.5-2, Critical High: 3)';
      else if (key === 'Phosphate') typicalRange = ' (Normal: 1-2, Critical High: 3)';
    }
    return `- ${key}: ${meta.unit}${typicalRange}`;
  })
  .join('\n')}

IMPORTANT TEST VALUE GUIDELINES:
- Use medically realistic values appropriate for ${patientType} patients
- Respect the units of measure (e.g., mg/kg/day, not just mg)
- For neonatal patients, use appropriately small values
- Include values within normal range, at boundaries, and beyond critical thresholds
- Remember that these are medical calculations - unrealistic values could be dangerous
`;
  }
  
  return `You are an expert QA engineer specializing in dynamic text generation and healthcare applications.

Generate comprehensive test cases for the following dynamic JavaScript code that generates HTML content.

CONTEXT:
- Section Name: ${sectionName || 'Dynamic Section'}
- This code runs in a TPN (Total Parenteral Nutrition) advisor system
- Section Variables: ${JSON.stringify(variables)}
${hasDocumentContext ? `- All Document Variables: ${JSON.stringify(allDocumentVariables)}` : ''}
- Additional notes: ${notes || 'None provided'}
${isTPN ? '- This is TPN-related code dealing with medical calculations and recommendations' : ''}

${medicalContextSection}

${contextSection}

TARGET SECTION CODE TO TEST:
\`\`\`javascript
${dynamicCode}
\`\`\`

${hasDocumentContext ? `
IMPORTANT: Consider the full document context when generating tests. The AI should:
1. Generate tests that work well with the existing document flow
2. Use variables that are consistent with other sections
3. Consider edge cases that might affect other sections
4. Test interactions between this section and others in the document
5. Ensure test values are realistic given the overall document purpose
` : ''}

Generate test cases${testCategory === 'all' ? ' in THREE categories' : ' for the specified category'}:

${testCategory === 'all' || testCategory === 'basicFunctionality' ? `
1. **Basic Functionality Tests**: Cover typical use cases and expected behavior
   - Test normal expected values
   - Test common scenarios users would encounter
   - Verify correct HTML output and formatting
   ${isTPN ? '- Test standard TPN dosing scenarios' : ''}
` : ''}
${testCategory === 'all' || testCategory === 'edgeCases' ? `
2. **Edge Case Tests**: Test boundary conditions and unusual inputs
   - Empty/null/undefined values
   - Zero and negative numbers
   - Very large numbers
   - Decimal precision edge cases
   - Missing required variables
   ${isTPN ? '- Extreme weight values (premature infants to morbidly obese)' : ''}
   ${isTPN ? '- Maximum safe dosing limits' : ''}
` : ''}
${testCategory === 'all' || testCategory === 'qaBreaking' ? `
3. **QA/Breaking Tests**: Try to break the code or expose vulnerabilities
   - XSS attempts (script injection in variable values)
   - SQL injection patterns (even though not applicable, test resilience)
   - Unicode and special characters
   - Very long strings
   - Type confusion (strings where numbers expected)
   - Circular references or recursive patterns
   ${isTPN ? '- Potentially dangerous medical values that should trigger warnings' : ''}
` : ''}

Return a JSON object with this EXACT structure (replace example values with appropriate test data):
\`\`\`json
{${testCategory === 'all' || testCategory === 'basicFunctionality' ? `
  "basicFunctionality": [
    {
      "name": "Standard Input Test",
      "description": "What this test verifies",
      "variables": { "exampleVar": "testValue", "exampleNum": 123 },
      "expectedBehavior": "What should happen",
      "importance": "high"
    }${testCategory === 'basicFunctionality' ? ',\n    // Generate 4-6 more tests in this category' : ''}
  ]${testCategory === 'all' ? ',' : ''}` : ''}${testCategory === 'all' || testCategory === 'edgeCases' ? `
  "edgeCases": [
    {
      "name": "Empty Input Test",
      "description": "What edge case this tests",
      "variables": { "exampleVar": "", "exampleNum": 0 },
      "expectedBehavior": "How the code should handle this",
      "importance": "medium"
    }${testCategory === 'edgeCases' ? ',\n    // Generate 4-6 more tests in this category' : ''}
  ]${testCategory === 'all' ? ',' : ''}` : ''}${testCategory === 'all' || testCategory === 'qaBreaking' ? `
  "qaBreaking": [
    {
      "name": "XSS Injection Test",
      "description": "What vulnerability or issue this tests",
      "variables": { "exampleVar": "<script>alert('xss')</script>", "exampleNum": -999999 },
      "expectedBehavior": "How the code should defend against this",
      "importance": "high"
    }${testCategory === 'qaBreaking' ? ',\n    // Generate 4-6 more tests in this category' : ''}
  ]` : ''}
}
\`\`\`

IMPORTANT: 
- All property values must be valid JSON (strings in quotes, numbers without quotes, booleans as true/false)
- For "importance", use ONLY one of these exact strings: "high", "medium", or "low"
- Variable values should be appropriate JSON types based on the variable usage in the code

IMPORTANT GUIDELINES:
- Generate ${testCategory === 'all' ? '2-3 tests per category' : '5-7 comprehensive tests for the selected category'}
- Make test names descriptive and specific
- Include realistic values based on the variable names
- For number variables, test both integers and decimals
- For string variables, test empty strings, special characters, and long strings
- Consider the HTML output and how it might be rendered
- Test variable combinations that might interact in unexpected ways
${isTPN ? '- For TPN tests, use medically realistic values and scenarios' : ''}
${isTPN ? '- Include tests for dosing safety limits and warnings' : ''}

CRITICAL JSON FORMATTING REQUIREMENTS:
- Return ONLY valid JSON - no comments, explanations, or additional text
- Do not include trailing commas in JSON objects or arrays
- Use double quotes for all strings and property names
- Ensure all brackets and braces are properly closed
- KEEP RESPONSES CONCISE - limit descriptions to 50 characters and expectedBehavior to 100 characters
- ${testCategory === 'all' ? 'Generate exactly 2-3 tests per category to keep response size manageable' : 'Focus on variety and coverage within the selected category'}
- Test your JSON syntax before responding

Only return the JSON object, no additional text.`;
}

function isTPNVariable(varName: string) {
  const tpnKeywords = [
    'DoseWeight', 'Volume', 'Protein', 'Carbohydrates', 'Fat',
    'Potassium', 'Sodium', 'Calcium', 'Magnesium', 'Phosphate',
    'MultiVitamin', 'TraceElements', 'Insulin', 'Lipid',
    'Osmo', 'IVAdminSite', 'InfuseOver', 'TPN', 'Peripheral'
  ];
  
  return tpnKeywords.some(keyword => 
    varName.toLowerCase().includes(keyword.toLowerCase())
  );
}