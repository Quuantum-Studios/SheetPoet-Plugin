import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useToast } from '@/contexts/ToastContext';
import {
  getFunctions,
  getFunctionsFromFilters,
  deleteFunction,
  toggleFunctionEnabled,
  FunctionItem
} from '@/services/functions.service';
import FunctionEditor from './FunctionEditor';

// Function type icons and labels
const functionTypeConfig = {
  import_to_sheet: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    label: 'Import to Sheet',
    bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    iconBg: 'bg-blue-100'
  },
  upload_to_website: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
    label: 'Upload to Website',
    bgColor: 'bg-gradient-to-r from-emerald-50 to-green-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    iconBg: 'bg-emerald-100'
  },
  one_time_trigger: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'One Time Trigger',
    bgColor: 'bg-gradient-to-r from-purple-50 to-pink-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    iconBg: 'bg-purple-100'
  }
};

const Functions = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentFunction, setCurrentFunction] = useState<FunctionItem | null>(null);

  // Fetch functions
  const { data: functions = [], isLoading } = useQuery('functions', getFunctions);

  const { data: functionsFromFilters = [], isLoading: isLoadingFromFilters } = useQuery(
    'functionsFromFilters',
    getFunctionsFromFilters,
    {
      enabled: isEditorOpen, 
      staleTime: Infinity,   
      cacheTime: Infinity
    }
  );

  const allFunctionsFromFiltersNames = () => {
    const all = Object.keys(functionsFromFilters).filter(a => !functions.some(b => b.name === a));
    if (currentFunction?.name) {
      all.push(currentFunction?.name);
    }

    return all;
  };

  // Delete function mutation
  const deleteFunctionMutation = useMutation(deleteFunction, {
    onSuccess: () => {
      queryClient.invalidateQueries('functions');
      showSuccess('Function deleted successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete function';
      showError(errorMessage);
    }
  });

  const toggleFunctionMutation = useMutation(toggleFunctionEnabled, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('functions');
      const status = data.enabled ? 'enabled' : 'disabled';
      showSuccess(`Function ${status} successfully`);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle function';
      showError(errorMessage);
    }
  });

  const handleAddFunction = () => {
    const newFunction: FunctionItem = {
      id: '',
      name: '',
      label: 'My Custom Function',
      type: 'upload_to_website',
      enabled: true
    };

    setCurrentFunction(newFunction);
    setIsEditorOpen(true);
  };

  const handleEditFunction = (func: FunctionItem) => {
    setCurrentFunction(func);
    setIsEditorOpen(true);
  };

  const handleDeleteFunction = (id: string) => {
    if (window.confirm('Are you sure you want to delete this function?')) {
      deleteFunctionMutation.mutate(id);
    }
  };

  const handleToggleFunction = (id: string) => {
    toggleFunctionMutation.mutate(id);
  };

  const renderFunctionItem = (func: FunctionItem) => {
    const typeInfo = functionTypeConfig[func.type] || functionTypeConfig.import_to_sheet;
    const isEnabled = func.enabled !== false;

    return (
      <li key={func.id} className={`group relative bg-white rounded-xl border transition-all duration-300 ${!isEnabled ? 'opacity-75 border-gray-200' : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'}`}>
        <div className={`absolute inset-0 rounded-xl ${typeInfo.bgColor} opacity-5`}></div>
        <div className="relative p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className={`flex-shrink-0 w-12 h-12 ${typeInfo.iconBg} rounded-xl flex items-center justify-center ${!isEnabled ? 'opacity-50' : ''}`}>
                <span className={typeInfo.textColor}>{typeInfo.icon}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-semibold text-lg ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                    {func.label}
                  </h3>
                  {!isEnabled && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                      </svg>
                      Disabled
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <code className="font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded">{func.name}</code>
                  </div>
                  
                  <span className="text-gray-400">•</span>
                  
                  <div className="flex items-center gap-1.5">
                    {typeInfo.icon}
                    <span className={`font-medium ${typeInfo.textColor}`}>{typeInfo.label}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-16 lg:pl-0">
              <div className="flex items-center pr-3 border-r border-gray-200">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isEnabled}
                    onChange={() => handleToggleFunction(func.id)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEditFunction(func)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  title="Edit function"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                
                <button
                  onClick={() => handleDeleteFunction(func.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  title="Delete function"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </li>
    );
  };

  const renderEmptyState = () => (
    <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
      <div className="absolute inset-0 bg-grid-gray-100 opacity-5"></div>
      <div className="relative">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Functions Created Yet</h3>
        <p className="text-gray-600 max-w-md mx-auto mb-8">
          Start by creating your first custom function to process data between Google Sheets and your website.
        </p>
        <button
          onClick={handleAddFunction}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Your First Function
        </button>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center p-16">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
      </div>
      <p className="mt-6 text-gray-600 font-medium">Loading your functions...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Custom Functions</h1>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed max-w-3xl">
                Build powerful data processing functions that seamlessly connect Google Sheets with your WordPress site.
              </p>
            </div>
            
            <button
              onClick={handleAddFunction}
              className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create New Function
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Getting Started</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Define your functions using WordPress hooks, then configure them here to connect your Google Sheets data with your website.
                  <a href="https://www.quuantum.com/products/sheetpoet/documentation/plugin/functions/" className="ml-1 text-blue-600 hover:text-blue-700 font-medium inline-flex items-center">
                    Learn more
                    <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-1M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              renderLoading()
            ) : (
              <div>
                {functions.length === 0 ? (
                  renderEmptyState()
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Active Functions
                        <span className="ml-2 text-sm font-normal text-gray-500">({functions.length} total)</span>
                      </h2>
                    </div>
                    <ul className="space-y-3">
                      {functions.map(item => renderFunctionItem(item))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" 
            onClick={() => {
              setIsEditorOpen(false);
              setCurrentFunction(null);
            }}
          ></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {currentFunction?.id ? 'Edit Function' : 'Create New Function'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsEditorOpen(false);
                    setCurrentFunction(null);
                  }}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <FunctionEditor
                currentFunction={currentFunction}
                isLoadingFromFilters={isLoadingFromFilters}
                allFunctionsFromFiltersNames={allFunctionsFromFiltersNames()}
                onClose={() => {
                  setIsEditorOpen(false);
                  setCurrentFunction(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Functions;