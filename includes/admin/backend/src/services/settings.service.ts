import apiFetch from '@wordpress/api-fetch';

export interface Settings {
  plugin_enabled: boolean;
  delete_logs_on_deactivation?: boolean;
  delete_tables_on_deactivation?: boolean;
  delete_functions_on_deactivation?: boolean;
  delete_settings_on_deactivation?: boolean;
}

// Settings API
export const getSettings = async (): Promise<Settings> => {
  try {
    return await apiFetch({ path: 'settings' }) as Settings;
  } catch (error) {
    console.error('Error fetching settings:', error);
    throw error;
  }
};

export const updateSettings = async (data: Partial<Settings>): Promise<Settings> => {
  try {
    return await apiFetch({
      path: 'settings',
      method: 'POST',
      data
    }) as Settings;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};
