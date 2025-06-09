import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useToast } from '@/contexts/ToastContext';
import {
  getFunctions,
  deleteFunction,
  FunctionItem
} from '@/services/functions.service';
import FunctionEditor from './FunctionEditor';
import { extractFunctionName } from '@/utils/phpUtils';

// Function type icons and labels
const functionTypeConfig = {
  import_to_sheet: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    label: 'Import to Sheet',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700'
  },
  upload_to_website: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    label: 'Upload to Website',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700'
  },
  one_time_trigger: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'One Time Trigger',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700'
  }
};

const Functions = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentFunction, setCurrentFunction] = useState<FunctionItem | null>(null);

  // Fetch functions
  const { data: functions = [], isLoading } = useQuery('functions', getFunctions);

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

  const handleAddFunction = () => {
    const defaultCode =
      `function my_custom_function($record) {
    // Process the record data
    $identifier = $record['identifier'] ?? '';
    $status = 'success';

    // Your processing logic here

    return [
        'identifier' => $identifier,
        'status' => $status,
        // Add any other data you want to return
    ];
}`;

    const extractedName = extractFunctionName(defaultCode) || 'my_custom_function';

    const newFunction: FunctionItem = {
      id: '',
      name: extractedName,
      label: 'My Custom Function',
      code: defaultCode,
      type: 'upload_to_website'
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

  const renderFunctionItem = (func: FunctionItem) => {
    const typeInfo = functionTypeConfig[func.type] || functionTypeConfig.import_to_sheet;

    return (
      <li key={func.id} className="bg-white rounded-lg shadow-sm border border-gray-100 mb-3 overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-start flex-col md:flex-row md:items-center">
            <div className="flex flex-col mb-3 md:mb-0 md:mr-4">
              <span className="font-semibold text-gray-800 text-lg">{func.label}</span>
              <code className="text-sm text-gray-500 font-mono mt-1">{func.name}</code>
            </div>

            <span className={`${typeInfo.bgColor} ${typeInfo.textColor} flex items-center px-3 py-1 rounded-full text-xs font-medium mt-2 md:mt-0`}>
              <span className="mr-1">{typeInfo.icon}</span>
              {typeInfo.label}
            </span>
          </div>

          <div className="flex mt-3 md:mt-0">
            <button
              onClick={() => handleEditFunction(func)}
              className="flex items-center justify-center text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => handleDeleteFunction(func.id)}
              className="flex items-center justify-center text-red-600 hover:text-red-800 px-3 py-1 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </li>
    );
  };

  const renderEmptyState = () => (
    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-gray-700">No functions yet</h3>
      <p className="mt-2 text-gray-500 max-w-md mx-auto">
        Create your first custom function to enhance your data processing capabilities.
      </p>
      <button
        onClick={handleAddFunction}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Create First Function
      </button>
    </div>
  );

  const renderLoading = () => (
    <div className="text-center p-12">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
      <p className="mt-4 text-gray-700 font-medium">Loading custom functions...</p>
    </div>
  );

  if (isEditorOpen) {
    return (
      <FunctionEditor
        currentFunction={currentFunction}
        onClose={() => {
          setIsEditorOpen(false);
          setCurrentFunction(null);
        }}
      />
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Custom Functions</h1>
            <p className="mt-2 text-gray-600 max-w-2xl">
              Create reusable functions that can process data from Google Sheets and integrate with your websites or other systems.
            </p>
          </div>
          <button
            onClick={handleAddFunction}
            className="mt-4 md:mt-0 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Function
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Each function must accept a <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800 font-mono">$record</code> parameter containing data from Google Sheets and return an array with at least an identifier and status field.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          renderLoading()
        ) : (
            <div>
              {functions.length === 0 ? (
                renderEmptyState()
              ) : (
                <ul className="space-y-2">
                    {functions.map(item => renderFunctionItem({ ...item, id: item.name }))}
                </ul>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Functions;
