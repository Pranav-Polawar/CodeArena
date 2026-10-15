const axios = require('axios');

// Map frontend language keys to Piston API supported names and runtime versions
const LANGUAGE_MAP = {
  cpp: { language: 'c++', version: '*' },
  'c++': { language: 'c++', version: '*' },
  python: { language: 'python', version: '*' },
  javascript: { language: 'javascript', version: '*' },
  java: { language: 'java', version: '*' }
};

/**
 * Executes source code using the Piston API
 * @param {string} language - Target language (cpp, python, javascript, java)
 * @param {string} code - Source code string
 * @param {string} input - Optional stdin input
 */
async function executeCode(language, code, input = '') {
  const langKey = language.toLowerCase();
  const langConfig = LANGUAGE_MAP[langKey];

  if (!langConfig) {
    return {
      success: false,
      status: 'Unsupported Language',
      output: `Language '${language}' is not supported.`
    };
  }

  try {
    const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
      language: langConfig.language,
      version: langConfig.version,
      files: [
        {
          content: code
        }
      ],
      stdin: input
    });

    const { run, compile } = response.data;

    // Handle compilation errors (e.g., C++ or Java syntax errors)
    if (compile && compile.code !== 0) {
      return {
        success: false,
        status: 'Compilation Error',
        output: compile.stderr || compile.output
      };
    }

    // Handle runtime errors (e.g., divide by zero, array index out of bounds)
    if (run && run.code !== 0) {
      return {
        success: false,
        status: 'Runtime Error',
        output: run.stderr || run.output
      };
    }

    return {
      success: true,
      status: 'Accepted',
      output: run ? run.stdout : ''
    };
  } catch (error) {
    console.error('Piston Execution Error:', error?.response?.data || error.message);
    return {
      success: false,
      status: 'Server Error',
      output: 'Failed to connect to the code execution service.'
    };
  }
}

module.exports = { executeCode };