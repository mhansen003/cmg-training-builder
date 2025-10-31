import OpenAI from 'openai';
import type { DocumentType } from '../types';

/**
 * Gets the OpenAI API key from environment variables
 */
function getApiKey(): string {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OpenAI API key not found. Please set VITE_OPENAI_API_KEY environment variable.'
    );
  }
  return apiKey;
}

/**
 * Creates an OpenAI client instance
 */
function createClient(): OpenAI {
  return new OpenAI({
    apiKey: getApiKey(),
    dangerouslyAllowBrowser: true, // Required for client-side usage
  });
}

/**
 * Gets the system prompt for a specific document type
 */
function getSystemPrompt(docType: DocumentType): string {
  const basePrompt = `You are an expert technical writer and training specialist working for CMG Financial.
Your task is to create professional, clear, and comprehensive training documentation.

Guidelines:
- Use clear, professional language
- Structure content with headers and sections
- Include practical examples where relevant
- Format in Markdown
- Be concise but thorough
- Focus on user actions and outcomes`;

  const specificPrompts: Record<DocumentType, string> = {
    'release-notes': `${basePrompt}

For Release Notes, include:
- Overview of what changed
- New features and enhancements
- Bug fixes
- Impact on users
- Action items (if any)
- Format with dates and version numbers`,

    'training-guide': `${basePrompt}

For Training Guides, include:
- Clear learning objectives
- Step-by-step instructions with numbered lists
- Screenshots placeholders where helpful (mark as [Screenshot: description])
- Tips and best practices
- Common issues and solutions
- Summary and next steps`,

    'email': `${basePrompt}

For Email Announcements, include:
- Attention-grabbing subject line
- Brief overview (2-3 sentences)
- Key highlights in bullet points
- Clear call-to-action
- Links to additional resources
- Professional and engaging tone`,

    'quick-ref': `${basePrompt}

For Quick Reference Cards, include:
- Most important information only
- Brief, scannable format
- Key shortcuts or commands
- Common tasks with quick steps
- Keep it to ONE page worth of content
- Use tables or lists for easy scanning`,

    'faq': `${basePrompt}

For FAQ Documents, include:
- 8-12 most common questions
- Clear, direct answers
- Organized by category if applicable
- Links to detailed documentation
- Troubleshooting tips`,

    'manual': `${basePrompt}

For User Manuals, include:
- Table of contents
- Introduction and overview
- Detailed feature descriptions
- Step-by-step procedures
- Troubleshooting section
- Glossary of terms
- Comprehensive and organized`,
  };

  return specificPrompts[docType] || basePrompt;
}

/**
 * Gets the user prompt for generating documentation
 */
function getUserPrompt(docType: DocumentType, sourceContent: string): string {
  const docTypeLabels: Record<DocumentType, string> = {
    'release-notes': 'Release Notes',
    'training-guide': 'Training Guide',
    'email': 'Email Announcement',
    'quick-ref': 'Quick Reference Card',
    'faq': 'FAQ Document',
    'manual': 'User Manual',
  };

  return `Based on the following source material, create professional ${docTypeLabels[docType]} for CMG Financial employees and stakeholders.

SOURCE MATERIAL:
${sourceContent}

Please generate comprehensive ${docTypeLabels[docType]} in Markdown format.`;
}

/**
 * Generates a training document using OpenAI
 */
export async function generateTrainingDocument(
  docType: DocumentType,
  sourceContent: string,
  onProgress?: (message: string) => void
): Promise<string> {
  try {
    onProgress?.(`Generating ${docType}...`);

    const client = createClient();
    const systemPrompt = getSystemPrompt(docType);
    const userPrompt = getUserPrompt(docType, sourceContent);

    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content generated from OpenAI');
    }

    onProgress?.(`✓ ${docType} generated successfully`);
    return content;
  } catch (error: any) {
    console.error(`Error generating ${docType}:`, error);
    if (error.message?.includes('API key')) {
      throw new Error('OpenAI API key is missing or invalid. Please check your environment variables.');
    }
    throw new Error(`Failed to generate ${docType}: ${error.message}`);
  }
}

/**
 * Generates multiple training documents in parallel
 */
export async function generateMultipleDocuments(
  docTypes: DocumentType[],
  sourceContent: string,
  onProgress?: (message: string) => void
): Promise<Array<{ type: DocumentType; content: string; error?: string }>> {
  onProgress?.(`Starting generation of ${docTypes.length} documents...`);

  const results = await Promise.allSettled(
    docTypes.map(async (docType) => {
      const content = await generateTrainingDocument(docType, sourceContent, onProgress);
      return { type: docType, content };
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        type: docTypes[index],
        content: '',
        error: result.reason?.message || 'Unknown error',
      };
    }
  });
}
