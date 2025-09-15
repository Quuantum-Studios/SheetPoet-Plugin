import apiFetch from '@wordpress/api-fetch';

export type FunctionType = 'import_to_sheet' | 'upload_to_website' | 'one_time_trigger';

export interface FunctionItem {
  id: string;
  name: string;
  label: string;
  type: FunctionType;
  enabled?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
}

export const getFunctions = async (): Promise<FunctionItem[]> => {
  try {
    return await apiFetch({ path: 'functions' }) as FunctionItem[];
  } catch (error) {
    console.error('Error fetching functions:', error);
    throw error;
  }
};

export const getFunctionsFromFilters = async (): Promise<FunctionItem[]> => {
  try {
    return await apiFetch({ path: 'filters-functions' }) as FunctionItem[];
  } catch (error) {
    console.error('Error fetching functions from filters:', error);
    throw error;
  }
};

export const saveFunction = async (functionData: FunctionItem): Promise<FunctionItem> => {
  try {
    return await apiFetch({
      path: 'functions',
      method: 'POST',
      data: functionData
    }) as FunctionItem;
  } catch (error) {
    console.error('Error saving function:', error);
    throw error;
  }
};

export const deleteFunction = async (id: string): Promise<{ message: string }> => {
  try {
    console.log('Deleting function with ID:', id);
    return await apiFetch({
      path: 'functions/action',
      method: 'POST',
      data: {
        action: 'delete',
        id: id
      }
    }) as { message: string };
  } catch (error) {
    console.error('Error deleting function:', error);
    throw error;
  }
};

export const toggleFunctionEnabled = async (id: string): Promise<{ message: string; enabled: boolean }> => {
  try {
    return await apiFetch({
      path: 'functions/action',
      method: 'POST',
      data: {
        action: 'toggle_enabled',
        id: id
      }
    }) as { message: string; enabled: boolean };
  } catch (error) {
    console.error('Error toggling function enabled state:', error);
    throw error;
  }
};
