import OpenAI from 'openai';
import { UserResponses } from '../types';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export const generateResolutions = async (userResponses: UserResponses) => {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful life coach specializing in creating realistic and achievable New Year's resolutions."
        },
        {
          role: "user",
          content: `Create personalized New Year's resolutions based on these responses:
            Goals: ${userResponses.goals}
            Challenges: ${userResponses.challenges}
            Time Commitment: ${userResponses.timeCommitment}
            Previous Experience: ${userResponses.previousExperience}
            
            Format the response as JSON with categories, descriptions, timeframes, and milestones.`
        }
      ],
      model: "gpt-4",
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Error generating resolutions:', error);
    throw error;
  }
}; 