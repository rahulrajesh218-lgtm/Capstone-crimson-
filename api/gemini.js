import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const {
      message,
      tasks,
      uploadedStudyFile,
      chatMode,
      quizQuestionCount,
    } = req.body ?? {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const rawUserMessage =
      typeof message === "string"
        ? message.split("User says:").pop()?.trim() || message
        : "";

    const lowerMessage = rawUserMessage.toLowerCase().trim();

    if (
      [
        "hi",
        "hello",
        "hey",
        "yo",
        "hellooo",
        "hii",
        "what's up",
        "wassup",
        "bro",
        "are u working",
        "are u fixed",
      ].includes(lowerMessage)
    ) {
      return res.status(200).json({
        reply: "Hey! How can I help you today?",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const taskListText =
      Array.isArray(tasks) && tasks.length
        ? tasks
            .map(
              (task, index) =>
                `${index + 1}. ${task.title} (${task.subject}) | due ${task.dueDate} ${task.dueTime} | priority ${task.priority} | progress ${task.progress}% | status ${task.status}${task.details ? ` | details: ${task.details}` : ""}`
            )
            .join("\n")
        : "No active tasks provided.";

    const prompt = `
You are Zentaskra, a friendly AI study assistant for a high school student.

Your style:
- be natural, friendly, and supportive
- if the user sends a casual message like "hi", "hello", or "what's up", respond casually first
- do not jump into task advice unless the user asks for help with school, productivity, or assignments
- when the user asks about studying or workload, use their real task list
- be clear, practical, and concise
- do not make up fake assignments
- when relevant, suggest what to do first, second, and third

${
  chatMode === "quiz"
    ? `The user is in quiz mode.
Generate ${quizQuestionCount || 5} quiz question(s) based on the uploaded file.
Ask one question at a time if possible.`
    : ""
}

${
  uploadedStudyFile?.content
    ? `Uploaded study file: ${uploadedStudyFile.name}
File content:
${uploadedStudyFile.content}`
    : "No uploaded study file provided."
}

User message:
${rawUserMessage}

Current tasks:
${taskListText}
`.trim();

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    return res.status(200).json({
      reply: reply || "No response returned.",
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    return res.status(500).json({
      error: error?.message || "Failed to generate response.",
      details: String(error),
    });
  }
}