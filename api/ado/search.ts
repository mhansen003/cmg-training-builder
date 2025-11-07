import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export interface ADOWorkItem {
  id: number;
  url: string;
  fields: {
    'System.Id': number;
    'System.Title': string;
    'System.Description'?: string;
    'System.State': string;
    'System.WorkItemType': string;
    'System.TeamProject'?: string;
    'System.CreatedDate'?: string;
    'System.ChangedDate'?: string;
    'System.Tags'?: string;
    'System.AreaPath'?: string;
    'System.IterationPath'?: string;
    [key: string]: any;
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      searchText,
      workItemType,
      workItemTypes,
      state,
      states,
      project,
      projects,
      iterationPath,
      assignedTo,
      createdBy,
      createdDateFrom,
      createdDateTo,
      changedDateFrom,
      changedDateTo,
      maxResults = 100
    } = req.body;

    // Get ADO credentials from environment variables
    const organization = process.env.ADO_ORGANIZATION;
    const pat = process.env.ADO_PAT;

    if (!organization || !pat) {
      return res.status(500).json({
        error: 'ADO configuration missing. Please configure ADO_ORGANIZATION and ADO_PAT environment variables.'
      });
    }

    // Build WIQL query
    const conditions: string[] = [];

    // Add work item type filter (support both single and multi-select)
    const typesArray = workItemTypes && workItemTypes.length > 0 ? workItemTypes : (workItemType ? [workItemType] : []);
    if (typesArray.length > 0) {
      if (typesArray.length === 1) {
        conditions.push(`[System.WorkItemType] = '${typesArray[0]}'`);
      } else {
        const typeConditions = typesArray.map(t => `[System.WorkItemType] = '${t}'`).join(' OR ');
        conditions.push(`(${typeConditions})`);
      }
    }

    // Add project filter (support both single and multi-select)
    const projectsArray = projects && projects.length > 0 ? projects : (project && project !== 'All Projects' ? [project] : []);
    if (projectsArray.length > 0) {
      if (projectsArray.length === 1) {
        conditions.push(`[System.TeamProject] = '${projectsArray[0].replace(/'/g, "''")}'`);
      } else {
        const projectConditions = projectsArray.map(p => `[System.TeamProject] = '${p.replace(/'/g, "''")}'`).join(' OR ');
        conditions.push(`(${projectConditions})`);
      }
    }

    if (searchText && searchText.trim().length > 0) {
      conditions.push(`[System.Title] CONTAINS '${searchText.replace(/'/g, "''")}'`);
    }

    // Add state filter (support both single and multi-select)
    const statesArray = states && states.length > 0 ? states : (state ? [state] : []);
    if (statesArray.length > 0) {
      if (statesArray.length === 1) {
        conditions.push(`[System.State] = '${statesArray[0]}'`);
      } else {
        const stateConditions = statesArray.map(s => `[System.State] = '${s}'`).join(' OR ');
        conditions.push(`(${stateConditions})`);
      }
    }

    // Sprint/Iteration filter
    if (iterationPath) {
      conditions.push(`[System.IterationPath] CONTAINS '${iterationPath.replace(/'/g, "''")}'`);
    }

    // Assigned To filter
    if (assignedTo) {
      conditions.push(`[System.AssignedTo] CONTAINS '${assignedTo.replace(/'/g, "''")}'`);
    }

    // Created By filter
    if (createdBy) {
      conditions.push(`[System.CreatedBy] CONTAINS '${createdBy.replace(/'/g, "''")}'`);
    }

    // Date range filters
    if (createdDateFrom) {
      conditions.push(`[System.CreatedDate] >= '${createdDateFrom}'`);
    }

    if (createdDateTo) {
      conditions.push(`[System.CreatedDate] <= '${createdDateTo}'`);
    }

    if (changedDateFrom) {
      conditions.push(`[System.ChangedDate] >= '${changedDateFrom}'`);
    }

    if (changedDateTo) {
      conditions.push(`[System.ChangedDate] <= '${changedDateTo}'`);
    }

    // If no specific filters, add a date filter to prevent querying entire organization
    // This helps with performance and avoids ADO API restrictions
    // Default to work items changed in the last 12 months
    if (conditions.length === 0) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const dateStr = oneYearAgo.toISOString().split('T')[0];
      conditions.push(`[System.ChangedDate] >= '${dateStr}'`);
    }

    // Build WHERE clause - always have at least one condition
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const wiql = `
      SELECT [System.Id]
      FROM WorkItems
      ${whereClause}
      ORDER BY [System.ChangedDate] DESC
    `;

    // Log the query for debugging
    console.log('ADO WIQL Query:', wiql);

    // Use organization-level endpoint for cross-project queries
    const queryUrl = project && project !== 'All Projects'
      ? `https://dev.azure.com/${organization}/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=7.1`
      : `https://dev.azure.com/${organization}/_apis/wit/wiql?api-version=7.1`;

    // Execute WIQL query
    const queryResponse = await axios.post(
      queryUrl,
      { query: wiql },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
        }
      }
    );

    const workItemRefs = queryResponse.data.workItems || [];

    if (workItemRefs.length === 0) {
      return res.json({
        success: true,
        workItems: [],
        count: 0
      });
    }

    // Limit results
    const limitedRefs = workItemRefs.slice(0, maxResults);
    const workItemIds = limitedRefs.map((ref: any) => ref.id);

    // Fetch full work item details
    const idsParam = workItemIds.join(',');
    const fieldsParam = [
      'System.Id',
      'System.Title',
      'System.Description',
      'System.State',
      'System.WorkItemType',
      'System.TeamProject',
      'System.CreatedDate',
      'System.ChangedDate',
      'System.Tags',
      'System.AreaPath',
      'System.IterationPath'
    ].join(',');

    const baseUrl = `https://dev.azure.com/${organization}`;
    const workItemsResponse = await axios.get(
      `${baseUrl}/_apis/wit/workitems?ids=${idsParam}&fields=${fieldsParam}&api-version=7.1`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
        }
      }
    );

    const workItems: ADOWorkItem[] = workItemsResponse.data.value || [];

    return res.json({
      success: true,
      workItems,
      count: workItems.length
    });
  } catch (error: any) {
    console.error('ADO search error:', error.message);
    console.error('Error details:', error.response?.data || error);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to search ADO work items',
      details: error.response?.data || undefined
    });
  }
}
