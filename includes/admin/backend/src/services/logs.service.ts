import apiFetch from '@wordpress/api-fetch';

export interface LogsParams {
  page?: number;
  per_page?: number;
  group_by_task_id?: boolean;
  task_id?: string;
}

export interface LogItem {
  id: string;
  timestamp: string;
  task_id: string;
  request_data: string;
  response_data: string;
  status: string;
  function_name: string;
  function_label: string;
  function_type: string;
  meta_data?: string;
}

export interface GroupedLogItem {
  task_id: string;
  count: number;
  latest_timestamp: string;
  function_names: string;
  function_labels: string;
  function_types: string;
  success: boolean;
}

export interface LogsResponse {
  logs: LogItem[] | GroupedLogItem[];
  total: number;
  pages: number;
  grouped: boolean;
}

export const getLogs = async (params: LogsParams = {}) => {
  const { page = 1, per_page = 20, group_by_task_id = false } = params;
  try {
    return await apiFetch({
      path: `logs?page=${page}&per_page=${per_page}&group_by_task_id=${group_by_task_id}`
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    throw error;
  }
};

export const clearLogs = async () => {
  try {
    console.log('Clearing history');
    return await apiFetch({
      path: 'logs/action',
      method: 'POST',
      data: {
        action: 'clear'
      }
    });
  } catch (error) {
    console.error('Error clearing history:', error);
    throw error;
  }
};

export interface TaskLogsResponse {
  logs: LogItem[];
  task_id: string;
}

export const getTaskLogs = async (taskId: string): Promise<TaskLogsResponse> => {
  try {
    return await apiFetch({
      path: `logs?task_id=${taskId}`
    });
  } catch (error) {
    console.error(`Error fetching logs for task ${taskId}:`, error);
    throw error;
  }
};
