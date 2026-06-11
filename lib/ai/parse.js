// Parsing: small local models occasionally emit slightly malformed JSON or wrap
// it in prose. We strip, repair, and finally fall back to field-by-field extraction.

function repairJson(str) {
  let fixed = str;
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');                 // trailing commas
  fixed = fixed.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, '\\n'); // raw newlines in strings
  return fixed;
}

export function robustJsonParse(content) {
  let jsonStr = content;
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    try {
      return JSON.parse(repairJson(jsonStr));
    } catch (e2) {
      try {
        const extract = (field) => {
          const strMatch = jsonStr.match(new RegExp(`"${field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 's'));
          if (strMatch) return strMatch[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
          const numMatch = jsonStr.match(new RegExp(`"${field}"\\s*:\\s*(\\d+)`));
          if (numMatch) return parseInt(numMatch[1], 10);
          const boolMatch = jsonStr.match(new RegExp(`"${field}"\\s*:\\s*(true|false)`));
          if (boolMatch) return boolMatch[1] === 'true';
          return null;
        };
        return {
          intent_guess: extract('intent_guess') || 'unclear',
          risk_level: extract('risk_level') || 'medium',
          confidence: extract('confidence') || 50,
          information_sufficient: extract('information_sufficient') !== false,
          engagement_level: extract('engagement_level') || 'wait',
          recommended_response: extract('recommended_response') || '',
          reason: extract('reason') || 'Analysis produced an unclear result.',
          coaching_insight: extract('coaching_insight') || '',
          coaching_tag: extract('coaching_tag') || '',
        };
      } catch (e3) {
        throw new Error(`Failed to parse AI response: ${e.message}\nRaw output: ${jsonStr.slice(0, 300)}`);
      }
    }
  }
}
