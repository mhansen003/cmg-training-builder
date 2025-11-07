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

export interface SearchADOParams {
  searchText?: string;
  workItemType?: string;  // Legacy single type
  workItemTypes?: string[];  // New multi-select types
  state?: string;  // Legacy single state
  states?: string[];  // New multi-select states
  project?: string;  // Legacy single project
  projects?: string[];  // New multi-select projects
  iterationPath?: string;
  assignedTo?: string;
  createdBy?: string;
  createdDateFrom?: string;
  createdDateTo?: string;
  changedDateFrom?: string;
  changedDateTo?: string;
  maxResults?: number;
}

export interface SearchADOResult {
  success: boolean;
  workItems: ADOWorkItem[];
  count: number;
}

export interface ADOProject {
  id: string;
  name: string;
  description?: string;
}

export interface FetchProjectsResult {
  success: boolean;
  projects: ADOProject[];
  count: number;
}

/**
 * Fetch all available ADO projects from the organization
 */
export const fetchADOProjects = async (): Promise<FetchProjectsResult> => {
  const response = await axios.get('/api/ado/projects');
  return response.data;
};

/**
 * Search for ADO work items using the serverless API
 */
export const searchADOWorkItems = async (params: SearchADOParams): Promise<SearchADOResult> => {
  const response = await axios.post('/api/ado/search', params);
  return response.data;
};
