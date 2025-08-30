import * as Babel from '@babel/standalone';

/**
 * Transpile modern JavaScript to ES5 using Babel
 * @param code - Modern JavaScript code
 * @returns Transpiled ES5 code
 */
export function transpileCode(code: string): string {
  try {
    // Wrap the code in a function to handle return statements
    const wrappedCode = `(function() { ${code} })`;
    
    const result = Babel.transform(wrappedCode, {
      presets: ['env'],
      plugins: []
    });
    
    // Extract the function body (remove the wrapper)
    const transpiledCode = result.code;
    const match = transpiledCode.match(/\(function\s*\(\)\s*{\s*([\s\S]*)\s*}\)/);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return result.code;
  } catch (error) {
    console.error('Transpilation error:', error);
    return code; // Return original if transpilation fails
  }
}