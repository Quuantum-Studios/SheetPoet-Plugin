import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getSettings, updateSettings } from '@/services/settings.service';
import type { Settings as SettingsType } from '@/services/settings.service';
import { getApiKeys, generateApiKey, deleteApiKey, ApiKeyItem } from '@/services/api.service';
import { useToast } from '@/contexts/ToastContext';

const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyData, setNewKeyData] = useState<ApiKeyItem | null>(null);

  // Fetch settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery<SettingsType>('settings', getSettings, {
    onError: (error) => {
      console.error('Error fetching settings:', error);
    },
    // Provide default data if the API call fails
    placeholderData: { plugin_enabled: true }
  });

  // Fetch API keys
  const { data: apiKeys, isLoading: isLoadingApiKeys } = useQuery<ApiKeyItem[]>('apiKeys', getApiKeys, {
    onError: (error) => {
      console.error('Error fetching API keys:', error);
    },
    placeholderData: []
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation(updateSettings, {
    onSuccess: () => {
      queryClient.invalidateQueries('settings');
      showSuccess('Settings saved successfully');
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      showError('Failed to save settings. Please try again.');
    }
  });

  // Generate API key mutation
  const generateApiKeyMutation = useMutation(
    (name: string) => generateApiKey(name),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('apiKeys');
        setNewKeyData(data);
        setNewKeyName('');
        showSuccess('API key generated successfully');
      },
      onError: (error) => {
        console.error('Error generating API key:', error);
        showError('Failed to generate API key. Please try again.');
      }
    }
  );

  // Delete API key mutation
  const deleteApiKeyMutation = useMutation(
    (id: string) => deleteApiKey(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('apiKeys');
        showSuccess('API key deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting API key:', error);
        showError('Failed to delete API key. Please try again.');
      }
    }
  );

  const handleTogglePlugin = () => {
    if (settings) {
      updateSettingsMutation.mutate({
        plugin_enabled: !settings.plugin_enabled
      });
    }
  };

  const handleGenerateApiKey = () => {
    setShowNewKeyModal(true);
  };

  const handleSubmitNewKey = () => {
    if (!newKeyName.trim()) {
      showError('API key name is required');
      return;
    }

    generateApiKeyMutation.mutate(newKeyName);
    setShowNewKeyModal(false);
  };

  const handleDeleteApiKey = (id: string) => {
    if (window.confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      deleteApiKeyMutation.mutate(id);
    }
  };

  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key)
      .then(() => {
        showSuccess('API key copied to clipboard');
      })
      .catch(() => {
        showError('Failed to copy API key');
      });
  };

  const closeNewKeyModal = () => {
    setShowNewKeyModal(false);
    setNewKeyName('');
  };

  const closeNewKeyDataModal = () => {
    setNewKeyData(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <p className="mb-4">
        Configure general settings and API settings for SheetPoet.
      </p>

      {isLoadingSettings || isLoadingApiKeys ? (
        <div className="text-center p-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2">Loading settings...</p>
        </div>
      ) : (
          <div className="space-y-6">

          {/* General Settings Section */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">General Settings</h2>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Plugin Status</h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {settings?.plugin_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings?.plugin_enabled}
                      onChange={handleTogglePlugin}
                      disabled={updateSettingsMutation.isLoading}
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  When disabled, the API will not process any requests.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Plugin Deactivation Options</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Configure what data should be deleted when the plugin is deactivated.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      id="delete_logs_on_deactivation"
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={settings?.delete_logs_on_deactivation || false}
                      onChange={() => updateSettingsMutation.mutate({
                        delete_logs_on_deactivation: !settings?.delete_logs_on_deactivation
                      })}
                      disabled={updateSettingsMutation.isLoading}
                    />
                    <label htmlFor="delete_logs_on_deactivation" className="ml-2 text-sm font-medium text-gray-900">
                      Delete logs on deactivation
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="delete_tables_on_deactivation"
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={settings?.delete_tables_on_deactivation || false}
                      onChange={() => updateSettingsMutation.mutate({
                        delete_tables_on_deactivation: !settings?.delete_tables_on_deactivation
                      })}
                      disabled={updateSettingsMutation.isLoading}
                    />
                    <label htmlFor="delete_tables_on_deactivation" className="ml-2 text-sm font-medium text-gray-900">
                      Delete database tables on deactivation
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="delete_functions_on_deactivation"
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={settings?.delete_functions_on_deactivation || false}
                      onChange={() => updateSettingsMutation.mutate({
                        delete_functions_on_deactivation: !settings?.delete_functions_on_deactivation
                      })}
                      disabled={updateSettingsMutation.isLoading}
                    />
                    <label htmlFor="delete_functions_on_deactivation" className="ml-2 text-sm font-medium text-gray-900">
                      Delete functions data on deactivation
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="delete_settings_on_deactivation"
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={settings?.delete_settings_on_deactivation || false}
                      onChange={() => updateSettingsMutation.mutate({
                        delete_settings_on_deactivation: !settings?.delete_settings_on_deactivation
                      })}
                      disabled={updateSettingsMutation.isLoading}
                    />
                    <label htmlFor="delete_settings_on_deactivation" className="ml-2 text-sm font-medium text-gray-900">
                      Delete settings and other critical data on deactivation
                    </label>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mt-3">
                  <strong>Note:</strong> These settings control what happens when you deactivate the plugin.
                  Enabling these options will permanently delete the selected data when the plugin is deactivated.
                </p>
              </div>
            </div>

            {/* API Settings Section */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">API Settings</h2>

              {/* <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">API Endpoint URL</h3>
              <code className="bg-gray-100 p-3 rounded block">
                {window.location.origin}/wp-json/wpgsg/v1/process
              </code>
              <p className="text-sm text-gray-600 mt-1">
                Send POST requests to this endpoint with your data.
              </p>
            </div> */}

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">API Keys</h3>
                <p className="text-sm text-gray-600 mb-4">
                  API keys are used to authenticate requests to the API.
                </p>

                <div className="mb-4 flex justify-end">
                  <button
                    onClick={handleGenerateApiKey}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    disabled={generateApiKeyMutation.isLoading}
                  >
                    {generateApiKeyMutation.isLoading ? 'Generating...' : 'Generate New API Key'}
                  </button>
                </div>

                {apiKeys && apiKeys.length > 0 ? (
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {apiKeys.map((apiKey) => (
                          <tr key={apiKey.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{apiKey.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(apiKey.created).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleDeleteApiKey(apiKey.id)}
                                className="text-red-600 hover:text-red-900 ml-2"
                                disabled={deleteApiKeyMutation.isLoading}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md">
                    No API keys found. Generate a new key to access the API.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Instructions</h2>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">About SheetPoet</h3>
                <p className="text-gray-700 mb-2">
                  SheetPoet provides a convenient way for data processing with custom function management.
                  The plugin allows you to create and manage custom PHP functions that can be called via the API
                  to process data from Google Sheets.
                </p>
                <p className="text-gray-700 mb-2">
                  Key features:
                </p>
                <ul className="list-disc pl-5 text-gray-700 mb-4">
                  <li>Create and manage custom PHP functions through an admin interface</li>
                  <li>Secure function validation to prevent dangerous code execution</li>
                  <li>API key authentication for secure data processing</li>
                  <li>Detailed request logging for monitoring and debugging</li>
                </ul>
              </div>
            </div>
          </div>
      )
      }

      {/* New API Key Modal */}
      {
        showNewKeyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">Generate New API Key</h3>
              <div className="mb-4">
                <label htmlFor="keyName" className="block text-sm font-medium text-gray-700 mb-1">
                  Key Name
                </label>
                <input
                  type="text"
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Production, Development, etc."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={closeNewKeyModal}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitNewKey}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  disabled={!newKeyName.trim()}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* API Key Created Modal */}
      {
        newKeyData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">API Key Generated</h3>
              <p className="mb-2 text-sm text-red-600 font-semibold">
                Important: This key will only be shown once. Please copy it now.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={newKeyData.key}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-l-md font-mono text-sm"
                  />
                  <button
                    onClick={() => handleCopyApiKey(newKeyData.key || '')}
                    className="bg-gray-100 px-3 py-2 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={closeNewKeyDataModal}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Settings;
