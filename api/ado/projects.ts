import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export interface ADOProject {
  id: string;
  name: string;
  description?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get ADO credentials from environment variables
    const organization = process.env.ADO_ORGANIZATION;
    const pat = process.env.ADO_PAT;

    if (!organization || !pat) {
      return res.status(500).json({
        error: 'ADO configuration missing. Please configure ADO_ORGANIZATION and ADO_PAT environment variables.'
      });
    }

    // Fetch projects from Azure DevOps
    const response = await axios.get(
      `https://dev.azure.com/${organization}/_apis/projects`,
      {
        params: {
          '$top': 100, // Get up to 100 projects
          'api-version': '7.1'
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const projects: ADOProject[] = response.data.value.map((project: any) => ({
      id: project.id,
      name: project.name,
      description: project.description || ''
    }));

    // Sort projects alphabetically by name
    projects.sort((a, b) => a.name.localeCompare(b.name));

    return res.json({
      success: true,
      projects,
      count: projects.length
    });
  } catch (error: any) {
    console.error('ADO projects fetch error:', error.message);
    console.error('Error details:', error.response?.data || error);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to fetch ADO projects',
      details: error.response?.data || undefined
    });
  }
}
