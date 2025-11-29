import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

interface GeneratePSParams {
  studentName: string;
  course: string;
  university: string;
  workExperience: string;
  notes: string;
  country: string;
  templateFiles: { mimeType: string; data: string }[]; // Base64 data of PDF templates
}

export const generatePersonalStatement = async (params: GeneratePSParams): Promise<string> => {
  const { studentName, course, university, workExperience, notes, country, templateFiles } = params;

  // Construct the prompt with multimodal input
  const systemInstruction = `You are a world-class Ivy League Admissions Consultant. 
  Your task is to write a highly personalized, compelling, and structurally perfect Personal Statement for a student.
  
  CRITICAL INSTRUCTIONS:
  1. Analyze the provided PDF "Style Guides" to understand the winning structure, tone, sentence variation, and narrative flow.
  2. DO NOT copy content from the style guides. Use them ONLY for structural and stylistic inspiration.
  3. The Personal Statement must be unique to the student's details provided.
  4. Tone: Academic, ambitious, reflective, and professional.
  5. Format: Standard Personal Statement format (Intro -> Academic Background -> Experience -> Why Course -> Why Uni -> Goals).
  `;

  const textPrompt = `
  STUDENT PROFILE:
  - Name: ${studentName}
  - Target Course: ${course}
  - Target University: ${university}
  - Target Country: ${country}
  - Work/Academic Experience: ${workExperience}
  - Additional Achievements/Notes: ${notes}

  TASK:
  Write a complete 800-1000 word Personal Statement for this student. Return the response in clean Markdown format.
  `;

  // Prepare parts: Text Prompt + PDF Templates (Inline Data)
  const parts: any[] = [
    { text: textPrompt }
  ];

  // Add templates to the prompt context
  templateFiles.forEach((file) => {
    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    });
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    });

    return response.text || "Failed to generate content.";
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("AI Generation failed. Please check API Key or quotas.");
  }
};