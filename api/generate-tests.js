import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dynamicCode, variables, notes, sectionName } = req.body;

    if (!dynamicCode) {
      return res.status(400).json({ error: 'Dynamic code is required' });
    }

    // Create the prompt for Gemini
    const prompt = createTestGenerationPrompt(dynamicCode, variables, notes, sectionName);

    // Use Gemini 1.5 Pro for better reasoning
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response from Gemini
    let tests;
    try {
      // Extract JSON from the response (Gemini might add markdown formatting)
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      tests = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      return res.status(500).json({ 
        error: 'Failed to parse AI response', 
        details: parseError.message 
      });
    }

    // Return the generated tests
    res.status(200).json({
      success: true,
      tests: tests,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'gemini-1.5-pro',
        variableCount: variables.length
      }
    });

  } catch (error) {
    console.error('Test generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate tests', 
      details: error.message 
    });
  }
}

function createTestGenerationPrompt(dynamicCode, variables, notes, sectionName) {
  const isTPN = variables.some(v => isTPNVariable(v));
  
  return `You are an expert QA engineer specializing in dynamic text generation and healthcare applications.

Generate comprehensive test cases for the following dynamic JavaScript code that generates HTML content.

CONTEXT:
- Section Name: ${sectionName || 'Dynamic Section'}
- This code runs in a TPN (Total Parenteral Nutrition) advisor system
- Variables available: ${JSON.stringify(variables)}
- Additional notes: ${notes || 'None provided'}
${isTPN ? '- This is TPN-related code dealing with medical calculations and recommendations' : ''}

DYNAMIC CODE TO TEST:
\`\`\`javascript
${dynamicCode}
\`\`\`

Generate test cases in THREE categories:

1. **Basic Functionality Tests**: Cover typical use cases and expected behavior
   - Test normal expected values
   - Test common scenarios users would encounter
   - Verify correct HTML output and formatting
   ${isTPN ? '- Test standard TPN dosing scenarios' : ''}

2. **Edge Case Tests**: Test boundary conditions and unusual inputs
   - Empty/null/undefined values
   - Zero and negative numbers
   - Very large numbers
   - Decimal precision edge cases
   - Missing required variables
   ${isTPN ? '- Extreme weight values (premature infants to morbidly obese)' : ''}
   ${isTPN ? '- Maximum safe dosing limits' : ''}

3. **QA/Breaking Tests**: Try to break the code or expose vulnerabilities
   - XSS attempts (script injection in variable values)
   - SQL injection patterns (even though not applicable, test resilience)
   - Unicode and special characters
   - Very long strings
   - Type confusion (strings where numbers expected)
   - Circular references or recursive patterns
   ${isTPN ? '- Potentially dangerous medical values that should trigger warnings' : ''}

Return a JSON object with this exact structure:
\`\`\`json
{
  "basicFunctionality": [
    {
      "name": "Test case name",
      "description": "What this test verifies",
      "variables": { "var1": value1, "var2": value2 },
      "expectedBehavior": "What should happen",
      "importance": "high|medium|low"
    }
  ],
  "edgeCases": [
    {
      "name": "Test case name",
      "description": "What edge case this tests",
      "variables": { "var1": value1, "var2": value2 },
      "expectedBehavior": "How the code should handle this",
      "importance": "high|medium|low"
    }
  ],
  "qaBreaking": [
    {
      "name": "Test case name",
      "description": "What vulnerability or issue this tests",
      "variables": { "var1": value1, "var2": value2 },
      "expectedBehavior": "How the code should defend against this",
      "importance": "high|medium|low"
    }
  ]
}
\`\`\`

IMPORTANT GUIDELINES:
- Generate at least 3-5 tests per category
- Make test names descriptive and specific
- Include realistic values based on the variable names
- For number variables, test both integers and decimals
- For string variables, test empty strings, special characters, and long strings
- Consider the HTML output and how it might be rendered
- Test variable combinations that might interact in unexpected ways
${isTPN ? '- For TPN tests, use medically realistic values and scenarios' : ''}
${isTPN ? '- Include tests for dosing safety limits and warnings' : ''}

Only return the JSON object, no additional text.`;
}

function isTPNVariable(varName) {
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