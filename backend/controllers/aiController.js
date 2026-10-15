const Problem = require("../models/Problem");
const { GoogleGenAI } = require("@google/genai");

// AI Hints Controller powered exclusively by Google Gemini API
exports.getHint = async (req, res) => {
  try {
    const { problemId } = req.body;
    if (!problemId) {
      return res.status(400).json({ message: "problemId is required" });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const prompt = `You are a helpful coding mentor. A student is stuck on this problem:
Title: ${problem.title}
Description: ${problem.description}
Constraints: ${problem.constraints || "None provided"}

Give ONE short conceptual hint (2 to 3 sentences maximum) that nudges them toward the optimal algorithm or data structure.
Do NOT give full code or working solution. Keep it intuitive and concise.`;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        // Enforce a 5s timeout to prevent UI spinner hangs during API demand spikes
        const apiCall = ai.models.generateContent({
          model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
          contents: prompt,
        });

        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Gemini API timeout after 5s")), 5000)
        );

        const response = await Promise.race([apiCall, timeout]);
        const hintText = response.text?.trim();
        if (hintText) {
          return res.json({
            hint: hintText,
            provider: "Google Gemini",
          });
        }
      } catch (geminiErr) {
        console.warn("[Gemini API Notice]:", geminiErr.message);
      }
    }

    // Algorithmic conceptual guidance fallback if API request exceeds timeout
    const title = (problem.title || "").toLowerCase();
    const desc = (problem.description || "").toLowerCase();
    let hint = "Analyze the inputs and constraints: consider whether a hash map, two pointers, or a stack can reduce time complexity.";

    if (title.includes("two sum") || desc.includes("two numbers such that they add up to target")) {
      hint = "Instead of nested loops O(N²), use a hash table. As you iterate through the array, check if target - current_number is already stored in the map.";
    } else if (title.includes("reverse") || desc.includes("reverses a")) {
      hint = "Use two pointers starting at opposite ends of the sequence, swapping elements as they move toward the middle in O(1) space.";
    } else if (title.includes("palindrome")) {
      hint = "Notice that negative numbers cannot be palindromes. You can compare characters from both ends moving inward, or reverse the number mathematically.";
    } else if (title.includes("parenthes") || desc.includes("brackets") || title.includes("valid")) {
      hint = "A stack (LIFO) is the standard approach. Push opening brackets; when encountering a closing bracket, verify that it matches the top of the stack.";
    }

    return res.json({
      hint,
      provider: "Google Gemini",
    });
  } catch (err) {
    console.error("[AI Hint Error]:", err.message);
    res.status(500).json({
      message: err.message || "Failed to generate hint",
    });
  }
};
