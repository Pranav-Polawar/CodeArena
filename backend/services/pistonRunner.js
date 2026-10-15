const axios = require('axios');

// Judge0 Language IDs
const LANGUAGE_MAP = {
  cpp: 54,        // C++ (GCC 9.2.0)
  'c++': 54,
  c_cpp: 54,
  python: 71,     // Python (3.8.1)
  python3: 71,
  py: 71,
  javascript: 63, // JavaScript (Node.js 12.14.0)
  js: 63,
  java: 62        // Java (OpenJDK 13.0.1)
};

/**
 * Executes code via Judge0 CE public endpoint
 */
async function executeCode(language, code, input = '') {
  const langKey = String(language || '').toLowerCase().trim();
  const languageId = LANGUAGE_MAP[langKey];

  if (!languageId) {
    return {
      success: false,
      status: 'Unsupported Language',
      output: `Language '${language}' is not supported.`
    };
  }

  try {
    const response = await axios.post(
      'https://judge0-ce.p.rapidapi.com/submissions?wait=true',
      {
        source_code: code,
        language_id: languageId,
        stdin: String(input || '')
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const { status, stdout, stderr, compile_output } = response.data;

    // Compilation error
    if (status.id === 6) {
      return {
        success: false,
        status: 'Compilation Error',
        output: compile_output || stderr || 'Compilation failed.'
      };
    }

    // Runtime errors / Time limit exceeded / Wrong answer
    if (status.id !== 3) {
      return {
        success: false,
        status: status.description || 'Runtime Error',
        output: stderr || stdout || 'Execution error.'
      };
    }

    return {
      success: true,
      status: 'Accepted',
      output: stdout || ''
    };
  } catch (error) {
    console.error('Code Execution Error:', error?.response?.data || error.message);
    
    // Fallback: Try alternative public execution instance
    try {
      const fallbackRes = await axios.post('https://ce.judge0.com/submissions?wait=true', {
        source_code: code,
        language_id: languageId,
        stdin: String(input || '')
      });
      return {
        success: fallbackRes.data.status.id === 3,
        status: fallbackRes.data.status.description,
        output: fallbackRes.data.stdout || fallbackRes.data.stderr || fallbackRes.data.compile_output
      };
    } catch (fallbackErr) {
      return {
        success: false,
        status: 'Server Error',
        output: 'Code execution service unreachable.'
      };
    }
  }
}

module.exports = { executeCode };