export function getGrammarSuggestions(text) {
  if (!text) return [];

  /* -------------------- GRAMMAR RULES -------------------- */
  const grammarRules = [
    // Informal language
    {
      test: /\bpls\b|\bplz\b/i,
      message: 'Use "please" instead of informal abbreviations.',
      fix: (t) => t.replace(/\bpls\b|\bplz\b/gi, "please"),
      type: "grammar"
    },
    {
      test: /\bcan you\b/i,
      message: 'For a professional tone, use "Could you".',
      fix: (t) => t.replace(/\bcan you\b/gi, "Could you"),
      type: "grammar"
    },

    // Word strength
    {
      test: /\bvery\s+(good|bad|nice|important|big|small)\b/i,
      message: 'Avoid using "very". Try a stronger word.',
      fix: (t) =>
        t.replace(/\bvery\s+good\b/gi, "excellent")
          .replace(/\bvery\s+bad\b/gi, "terrible")
          .replace(/\bvery\s+nice\b/gi, "pleasant")
          .replace(/\bvery\s+important\b/gi, "crucial")
          .replace(/\bvery\s+big\b/gi, "huge")
          .replace(/\bvery\s+small\b/gi, "tiny"),
      type: "grammar"
    },

    // Repetition
    {
      test: /\b(\w+)\s+\1\b/i,
      message: "Repeated word detected.",
      fix: (t) => t.replace(/\b(\w+)\s+\1\b/gi, "$1"),
      type: "grammar"
    },

    // Passive / clarity
    {
      test: /\bit was\b|\bthere is\b|\bthere are\b/i,
      message: "Avoid vague phrases like 'it was' or 'there is'. Be more specific.",
      fix: (t) => t,
      type: "grammar"
    },

    // Capitalization (first character only)
    {
      test: /^[a-z]/,
      message: "Sentence should start with a capital letter.",
      fix: (t) => t.charAt(0).toUpperCase() + t.slice(1),
      type: "grammar"
    },

    // ✅ SAFE sentence punctuation (line-by-line)
    {
      test: /[a-zA-Z]\s*$/,
      message: "Sentence should end with punctuation.",
      fix: (t) =>
        t
          .split("\n")
          .map((line) =>
            line.trim() === "" || /[.!?]$/.test(line.trim())
              ? line
              : line + "."
          )
          .join("\n"),
      type: "grammar"
    },

    // Common verb mistakes
    {
      test: /\bi am agree\b/i,
      message: 'Use "I agree" instead of "I am agree".',
      fix: (t) => t.replace(/\bi am agree\b/gi, "I agree"),
      type: "grammar"
    },
    {
      test: /\bdiscuss about\b/i,
      message: 'Use "discuss" instead of "discuss about".',
      fix: (t) => t.replace(/\bdiscuss about\b/gi, "discuss"),
      type: "grammar"
    },

    // Tense consistency
    {
      test: /\byesterday.*\b(is|are)\b/i,
      message: "Use past tense when referring to the past.",
      fix: (t) => t.replace(/\b(is|are)\b/gi, "was"),
      type: "grammar"
    },

    // Articles
    {
      test: /\ba\s+[aeiou]\w+/i,
      message: 'Use "an" before words that start with vowel sounds.',
      fix: (t) => t.replace(/\ba\s+([aeiou]\w+)/gi, "an $1"),
      type: "grammar"
    },

    // Double punctuation
    {
      test: /[!?]{2,}/,
      message: "Avoid using multiple punctuation marks.",
      fix: (t) => t.replace(/[!?]{2,}/g, "!"),
      type: "grammar"
    },

    // ✅ SAFE extra spaces (preserves newlines)
    {
      test: / {2,}/,
      message: "Extra spaces detected.",
      fix: (t) =>
        t
          .split("\n")
          .map((line) => line.replace(/ {2,}/g, " "))
          .join("\n"),
      type: "grammar"
    }
  ];

  /* -------------------- SPELLING RULES -------------------- */
  const spellingRules = [
    { wrong: "alot", correct: "a lot" },
    { wrong: "definately", correct: "definitely" },
    { wrong: "recieve", correct: "receive" },
    { wrong: "teh", correct: "the" },
    { wrong: "seperate", correct: "separate" },
    { wrong: "occured", correct: "occurred" },
    { wrong: "wich", correct: "which" },
    { wrong: "thier", correct: "their" },
    { wrong: "becuase", correct: "because" },
    { wrong: "wierd", correct: "weird" },

    { wrong: "adress", correct: "address" },
    { wrong: "calender", correct: "calendar" },
    { wrong: "enviroment", correct: "environment" },
    { wrong: "experiance", correct: "experience" },
    { wrong: "managment", correct: "management" },
    { wrong: "responsibilty", correct: "responsibility" },
    { wrong: "oppertunity", correct: "opportunity" },
    { wrong: "acheive", correct: "achieve" },

    { wrong: "thnaks", correct: "thanks" },
    { wrong: "plese", correct: "please" },
    { wrong: "helo", correct: "hello" },

    { wrong: "untill", correct: "until" },
    { wrong: "occurence", correct: "occurrence" },
    { wrong: "succesful", correct: "successful" },
    { wrong: "arguement", correct: "argument" },
    { wrong: "completly", correct: "completely" },
    { wrong: "neccessary", correct: "necessary" },

    { wrong: "tomorow", correct: "tomorrow" },
    { wrong: "yesturday", correct: "yesterday" },
    { wrong: "freind", correct: "friend" },
    { wrong: "finaly", correct: "finally" },

    { wrong: "informations", correct: "information" },
    { wrong: "equipments", correct: "equipment" },
    { wrong: "advices", correct: "advice" }
  ];

  const suggestions = [];

  /* -------------------- APPLY GRAMMAR -------------------- */
  grammarRules.forEach((rule) => {
    if (rule.test.test(text)) {
      suggestions.push({
        type: rule.type,
        message: rule.message,
        fixedText: rule.fix(text)
      });
    }
  });

  /* -------------------- APPLY SPELLING -------------------- */
  spellingRules.forEach(({ wrong, correct }) => {
    const regex = new RegExp(`\\b${wrong}\\b`, "gi");
    if (regex.test(text)) {
      suggestions.push({
        type: "spelling",
        incorrect: wrong,
        message: `Spelling mistake: "${wrong}" → "${correct}"`,
        fixedText: text.replace(regex, correct)
      });
    }
  });

  return suggestions;
}