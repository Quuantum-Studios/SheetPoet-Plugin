import React, { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import {
  saveFunction,
  FunctionItem,
  FunctionType
} from '@/services/functions.service';
import { useMutation, useQueryClient } from 'react-query';

interface FunctionEditorProps {
  currentFunction: FunctionItem | null;
  onClose: () => void;
  allFunctionsFromFiltersNames: string[];
  isLoadingFromFilters: boolean;
}

const FunctionEditor: React.FC<FunctionEditorProps> = ({ currentFunction, onClose, allFunctionsFromFiltersNames, isLoadingFromFilters }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const [functionName, setFunctionName] = useState<string>(currentFunction?.name || '');
  const [functionLabel, setFunctionLabel] = useState<string>(currentFunction?.label || '');
  const [functionType, setFunctionType] = useState<FunctionType>(currentFunction?.type || 'upload_to_website');


  useEffect(() => {
    if (currentFunction) {
      setFunctionName(currentFunction.name);
      setFunctionLabel(currentFunction.label);
      setFunctionType(currentFunction.type || 'upload_to_website');
    }
  }, [currentFunction]);

  // Save function mutation
  const saveFunctionMutation = useMutation(saveFunction, {
    onSuccess: () => {
      queryClient.invalidateQueries('functions');
      onClose();
      showSuccess('Function saved successfully');
    },
    onError: (error: any) => {
      const message = error?.error || 'Failed to save function';
      showError(message);
    }
  });

  const handleSaveFunction = async () => {
    if (!currentFunction) return;
    const updatedFunction = {
      ...currentFunction,
      name: functionName,
      label: functionLabel,
      type: functionType,
      enabled: currentFunction.enabled !== undefined ? currentFunction.enabled : true
    };

    saveFunctionMutation.mutate(updatedFunction);
  };

  return (
    <div className="p-4">

      <div className="space-y-8">
        <div>
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label htmlFor="functionLabel" className="block text-sm font-medium text-gray-800 mb-1">
                Display Label
              </label>
              <input
                type="text"
                id="functionLabel"
                value={functionLabel}
                onChange={(e) => {
                  const newLabel = e.target.value;
                  if (newLabel !== functionLabel) {
                    setFunctionLabel(newLabel);
                  }
                }}
                className="w-full h-11 px-4 border border-gray-200 rounded-xl bg-white shadow-sm placeholder-gray-400 transition-all duration-200 ease-out hover:border-gray-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="My Custom Function"
              />
              <p id="functionLabelHelp" className="text-xs text-gray-500 mt-1">
                A user-friendly name for this function.
              </p>
            </div>
            <div>
              <label htmlFor="functionType" className="block text-sm font-medium text-gray-800 mb-1">
                Function Type
              </label>
              <select
                id="functionType"
                value={functionType}
                onChange={(e) => {
                  const newType = e.target.value as FunctionType;
                  if (newType !== functionType) {
                    setFunctionType(newType);
                  }
                }}
                className="w-full h-11 px-4 border border-gray-200 rounded-xl bg-white shadow-sm transition-all duration-200 ease-out hover:border-gray-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="upload_to_website">Upload to Website</option>
                <option value="import_to_sheet">Import to Sheet</option>
                <option value="one_time_trigger">One Time Trigger</option>
              </select>
              <p id="functionTypeHelp" className="text-xs text-gray-500 mt-1">
                Select the type of function you want to create.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="functionName" className="block text-sm font-medium text-gray-800 mb-1">
            Function Name
          </label>
        
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 mt-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  First you will need to define the function using hooks. Then you can select the function from the list below. The function must accept a <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800 font-mono">$record</code> parameter. This will contain the data from Google Sheets. Your function logic will then process this data and return an array with at least an identifier and status field.
                  <br/><br/>
                  To know more about how to define the function using hooks, please check the <a href="https://www.quuantum.com/products/sheetpoet/documentation/plugin/functions/" className="text-blue-700">documentation</a>.
                </p>
              </div>
            </div>
          </div>

          <select
            id="functionName"
            value={functionName}
            onChange={(e) => setFunctionName(e.target.value)}
            className="w-full h-11 px-4 border border-gray-200 rounded-xl bg-white shadow-sm transition-all duration-200 ease-out hover:border-gray-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="" disabled>{isLoadingFromFilters ? 'Loading functions...' : 'Select a function'}</option>
            {allFunctionsFromFiltersNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t">
        <button
          onClick={handleSaveFunction}
          disabled={saveFunctionMutation.isLoading || !functionName}
          className="w-full py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed font-semibold uppercase tracking-wide shadow-md hover:shadow-lg transition-colors duration-200"
        >
          {saveFunctionMutation.isLoading ? 'Saving...' : 'Save Function'}
        </button>
      </div>
    </div>
  );
};

export default FunctionEditor;