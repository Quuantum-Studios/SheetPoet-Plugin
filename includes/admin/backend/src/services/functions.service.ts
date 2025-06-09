import apiFetch from '@wordpress/api-fetch';

export type FunctionType = 'import_to_sheet' | 'upload_to_website' | 'one_time_trigger';

export interface FunctionItem {
  id: string;
  name: string;
  label: string;
  code: string;
  type: FunctionType;
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

export const validateFunction = async (data: { name: string; code: string; id?: string; type?: FunctionType }): Promise<ValidationResult> => {
  try {
    return await apiFetch({
      path: 'functions/validate',
      method: 'POST',
      data
    }) as ValidationResult;
  } catch (error) {
    console.error('Error validating function:', error);
    throw error;
  }
};
