/**
 * Extracts the function name from PHP code
 * 
 * @param code PHP code containing a function definition
 * @returns The function name or null if not found
 */
export const extractFunctionName = (code: string): string | null => {
  // Regular expression to match function declaration
  const functionRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/;
  const match = code.match(functionRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return null;
};
