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
    'release-notes': `You are creating release notes in the exact style used by CMG Financial for their "Clear & Byte Release Notes".

CRITICAL FORMATTING REQUIREMENTS - Follow CMG's exact style:

1. START with friendly greeting:
   "Hi Everyone,"
   "Below you'll find all the items that have just been released."

2. STRUCTURE each feature as:
   **[Feature Name in Bold with Teal Color]**

   [Brief introduction paragraph explaining the update]

   **[Subsection Header in Bold]**
   - Bullet with **bold keyword** followed by regular explanation
   - Use **bold** for: product names, field names, feature names, technical terms
   - Keep explanations clear and concise

   **For [Specific Role]:** (e.g., "For Loan Officers:", "For Branch Managers:")
   - Role-specific bullets

   **Key Benefits:**
   - Benefit 1
   - Benefit 2

3. TONE:
   - Friendly and conversational (like "Hi Everyone")
   - Professional but approachable
   - Clear and direct
   - Focus on user value

4. CONTENT PATTERN for each feature:
   - What changed/what's new
   - How it works (with bold technical terms)
   - Who it affects (role-specific sections)
   - Why it matters (Key Benefits)

5. OUTPUT FORMAT: HTML with these styles:
   - Feature headers: <h3 style="color: #1ab4a8; font-weight: 600;">
   - Subsection headers: <strong>
   - Bold terms: <strong> within text
   - Bullets: <ul><li>
   - Keep paragraphs short and scannable

EXAMPLE STRUCTURE:
Hi Everyone,

Below you'll find all the items that have just been released.

<h3 style="color: #1ab4a8; font-weight: 600;">New in [System]: [Feature Name]</h3>

<p>We've added [description of the update].</p>

<p><strong>Best Pricing Tab</strong></p>
<ul>
<li>A new <strong>Best Pricing tab</strong> is now available.</li>
<li>When selected, the system queries <strong>Optimal Blue</strong> for the <strong>best-priced products</strong> within each <strong>Product Group</strong>.</li>
</ul>

<p><strong>For Loan Officers:</strong></p>
<ul>
<li>All <strong>Loans Pipeline</strong> now shows all loans tied to your <strong>NMLS ID</strong>.</li>
</ul>

<p><strong>Key Benefits:</strong></p>
<ul>
<li>Full loan history access</li>
<li>Improved cross-branch collaboration</li>
</ul>`,

    'training-guide': `${basePrompt}

For Training Guides, include:
- Clear learning objectives
- Step-by-step instructions with numbered lists
- Screenshots placeholders where helpful (mark as [Screenshot: description])
- Tips and best practices
- Common issues and solutions
- Summary and next steps

OUTPUT FORMAT: HTML with these tags:
- <h2> for main sections
- <h3> for subsections
- <p> for paragraphs
- <ol><li> for numbered steps
- <ul><li> for bullet lists
- <strong> for emphasis
- Use CMG colors: headers with style="color: #2b3e50"`,

    'email': `${basePrompt}

For Email Announcements, include:
- Attention-grabbing subject line
- Brief overview (2-3 sentences)
- Key highlights in bullet points
- Clear call-to-action
- Links to additional resources
- Professional and engaging tone

OUTPUT FORMAT: HTML with these tags:
- <h2> for subject line
- <p> for overview paragraphs
- <ul><li> for key highlights
- <strong> for emphasis on important points
- <a href="#"> for call-to-action links
- Use CMG green (#9bc53d) for call-to-action buttons`,

    'quick-ref': `${basePrompt}

For Quick Reference Cards, include:
- Most important information only
- Brief, scannable format
- Key shortcuts or commands
- Common tasks with quick steps
- Keep it to ONE page worth of content
- Use tables or lists for easy scanning

OUTPUT FORMAT: HTML with these tags:
- <h2> for main title
- <h3> for sections
- <table> for organized data (if applicable)
- <ul><li> for quick lists
- <strong> for keyboard shortcuts and commands
- Keep layout compact and scannable`,

    'faq': `${basePrompt}

For FAQ Documents, include:
- 8-12 most common questions
- Clear, direct answers
- Organized by category if applicable
- Links to detailed documentation
- Troubleshooting tips

OUTPUT FORMAT: HTML with these tags:
- <h2> for category headers
- <h3 style="color: #2b3e50;"> for each question
- <p> for answers
- <ul><li> for multi-part answers
- <strong> for key terms
- <a href="#"> for documentation links`,

    'manual': `${basePrompt}

For User Manuals, include:
- Table of contents
- Introduction and overview
- Detailed feature descriptions
- Step-by-step procedures
- Troubleshooting section
- Glossary of terms
- Comprehensive and organized

OUTPUT FORMAT: HTML with these tags:
- <h2> for major sections
- <h3> for subsections
- <p> for descriptions
- <ol><li> for step-by-step procedures
- <ul><li> for feature lists
- <strong> for important terms and concepts
- Use CMG navy (#2b3e50) for headers`,
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

  // All document types now output HTML
  const format = 'HTML';

  return `Based on the following source material, create professional ${docTypeLabels[docType]} for CMG Financial employees and stakeholders.

SOURCE MATERIAL:
${sourceContent}

Please generate comprehensive ${docTypeLabels[docType]} in ${format} format.${docType === 'release-notes' ? ' Follow the CMG Clear & Byte Release Notes style exactly as specified in the system prompt.' : ' Use proper HTML tags for structure, headings, paragraphs, lists, and emphasis. Make it clean and professional.'}`;
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
