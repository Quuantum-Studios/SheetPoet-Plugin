import apiFetch from '@wordpress/api-fetch';

export interface ApiKeyItem {
  id: string;
  name: string;
  key?: string;
  created: string;
}

// API Key Management
export const getApiKeys = async (): Promise<ApiKeyItem[]> => {
  try {
    return await apiFetch({
      path: 'api-keys'
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    throw error;
  }
};

export const generateApiKey = async (name: string): Promise<ApiKeyItem> => {
  try {
    return await apiFetch({
      path: 'api-keys',
      method: 'POST',
      data: { name }
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    throw error;
  }
};

export const deleteApiKey = async (id: string): Promise<{ message: string }> => {
  try {
    console.log('Deleting API key with ID:', id);
    return await apiFetch({
      path: 'api-keys/action',
      method: 'POST',
      data: {
        action: 'delete',
        id: id
      }
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    throw error;
  }
};
