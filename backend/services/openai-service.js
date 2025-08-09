// import OpenAI from 'openai';

// // Initialize OpenAI client
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// /**
//  * Generate a response from OpenAI based on the conversation history
//  * @param messages Array of conversation messages with role and content
//  * @returns Generated response text
//  */
// export async function generateChatResponse(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
//   try {
//     // Add system message with context about the alumni platform
//     const systemMessage = {
//       role: 'system' as const,
//       content: `You are an alumni assistant for the Alumni Connect platform. 
//       You help users with networking advice, career questions, and information about alumni events. 
//       Keep responses helpful, concise, and in a friendly tone. 
//       If asked about specific alumni data you don't have access to, explain that you can only provide general guidance.
//       For sensitive information requests, kindly direct users to contact their institution's alumni office.`
//     };
    
//     const allMessages = [
//       systemMessage,
//       ...messages
//     ];
    
//     const response = await openai.chat.completions.create({
//       model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
//       messages: allMessages,
//       temperature: 0.7,
//       max_tokens: 500
//     });
    
//     return response.choices[0].message.content || "I'm sorry, I couldn't generate a response at this time.";
//   } catch (error) {
//     console.error('Error generating chat response:', error);
//     return "I apologize, but I'm experiencing technical difficulties right now. Please try again later.";
//   }
// }

// /**
//  * Generate content recommendations based on user profile
//  * @param userProfile User profile data including skills, interests, etc.
//  * @returns Recommended content topics
//  */
// export async function generateContentRecommendations(userProfile: any): Promise<string[]> {
//   try {
//     const prompt = `Based on this user profile, suggest 5 relevant content topics that would be valuable:
//     Name: ${userProfile.name}
//     Role: ${userProfile.role}
//     University: ${userProfile.university || 'Not specified'}
//     Major: ${userProfile.major || 'Not specified'}
//     Skills: ${userProfile.skills?.map((s: any) => s.name).join(', ') || 'None specified'}
//     Current Position: ${userProfile.currentPosition || 'Not specified'}
//     Company: ${userProfile.company || 'Not specified'}
    
//     Format your response as a JSON array of strings, with each string being a recommended topic.`;
    
//     const response = await openai.chat.completions.create({
//       model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
//       messages: [
//         { role: 'system', content: 'You are a content recommendation specialist for an alumni networking platform.' },
//         { role: 'user', content: prompt }
//       ],
//       response_format: { type: "json_object" },
//       temperature: 0.7
//     });
    
//     const content = response.choices[0].message.content;
//     if (!content) return [];
    
//     try {
//       const parsed = JSON.parse(content);
//       return Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
//     } catch (e) {
//       console.error('Failed to parse JSON response:', e);
//       return [];
//     }
//   } catch (error) {
//     console.error('Error generating content recommendations:', error);
//     return [];
//   }
// }

// /**
//  * Analyze a post or comment for sentiment and key themes
//  * @param text Text content to analyze
//  * @returns Analysis object with sentiment and topics
//  */
// export async function analyzeContent(text: string): Promise<{
//   sentiment: 'positive' | 'neutral' | 'negative';
//   topics: string[];
//   keywords: string[];
// }> {
//   try {
//     const prompt = `Analyze the following text from an alumni networking platform:
    
//     "${text}"
    
//     Provide:
//     1. Overall sentiment (positive, neutral, or negative)
//     2. Main topics being discussed (as an array of strings)
//     3. Key keywords (as an array of strings)
    
//     Format your response as a JSON object with these three fields.`;
    
//     const response = await openai.chat.completions.create({
//       model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
//       messages: [
//         { role: 'system', content: 'You are a content analysis expert for a professional networking platform.' },
//         { role: 'user', content: prompt }
//       ],
//       response_format: { type: "json_object" },
//       temperature: 0.3
//     });
    
//     const content = response.choices[0].message.content;
//     if (!content) {
//       return { sentiment: 'neutral', topics: [], keywords: [] };
//     }
    
//     try {
//       const result = JSON.parse(content);
//       return {
//         sentiment: result.sentiment || 'neutral',
//         topics: Array.isArray(result.topics) ? result.topics : [],
//         keywords: Array.isArray(result.keywords) ? result.keywords : []
//       };
//     } catch (e) {
//       console.error('Failed to parse JSON response:', e);
//       return { sentiment: 'neutral', topics: [], keywords: [] };
//     }
//   } catch (error) {
//     console.error('Error analyzing content:', error);
//     return { sentiment: 'neutral', topics: [], keywords: [] };
//   }
// }