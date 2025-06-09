import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
// import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
// import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
// import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
// import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { useToast } from '@/contexts/ToastContext';
import {
  saveFunction,
  validateFunction,
  FunctionItem,
  FunctionType
} from '@/services/functions.service';
import { useMutation, useQueryClient } from 'react-query';
import { extractFunctionName } from '@/utils/phpUtils';

// Configure Monaco Environment for offline use
// self.MonacoEnvironment = {
//   getWorker(_, label) {
//     // if (label === 'json') {
//     //   return new jsonWorker();
//     // }
//     // if (label === 'css' || label === 'scss' || label === 'less') {
//     //   return new cssWorker();
//     // }
//     if (label === 'html' || label === 'handlebars' || label === 'razor') {
//       return new htmlWorker();
//     }
//     // if (label === 'typescript' || label === 'javascript') {
//     //   return new tsWorker();
//     // }
//     return new editorWorker();
//   },
// };

// Configure loader to use local monaco
loader.config({ monaco });

interface FunctionEditorProps {
  currentFunction: FunctionItem | null;
  onClose: () => void;
}

const FunctionEditor: React.FC<FunctionEditorProps> = ({ currentFunction, onClose }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const [editorContent, setEditorContent] = useState<string>(currentFunction?.code || '');
  const [functionName, setFunctionName] = useState<string>(currentFunction?.name || '');
  const [functionLabel, setFunctionLabel] = useState<string>(currentFunction?.label || '');
  const [functionType, setFunctionType] = useState<FunctionType>(currentFunction?.type || 'upload_to_website');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<'error' | 'success' | null>(null);
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [isMonacoReady, setIsMonacoReady] = useState<boolean>(false);

  // Initialize Monaco Editor
  useEffect(() => {
    loader.init().then(() => {
      setIsMonacoReady(true);
    }).catch((error) => {
      console.error('Failed to initialize Monaco Editor:', error);
      showError('Failed to initialize code editor');
    });
  }, [showError]);

  useEffect(() => {
    if (currentFunction) {
      setEditorContent(currentFunction.code);
      setFunctionName(currentFunction.name);
      setFunctionLabel(currentFunction.label);
      setFunctionType(currentFunction.type || 'upload_to_website');
    }
  }, [currentFunction]);

  // Extract function name from code when editor content changes
  useEffect(() => {
    const extractedName = extractFunctionName(editorContent);
    if (extractedName) {
      setFunctionName(extractedName);
    }
  }, [editorContent]);

  // Save function mutation
  const saveFunctionMutation = useMutation(saveFunction, {
    onSuccess: () => {
      queryClient.invalidateQueries('functions');
      onClose();
      showSuccess('Function saved successfully');
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to save function');
    }
  });

  // Validate function mutation
  const validateFunctionMutation = useMutation(validateFunction, {
    onSuccess: (data: { valid: boolean; message: string }) => {
      if (data.valid) {
        setValidationMessage(data.message || 'Function is valid.');
        setValidationStatus('success');
        setIsValidated(true);
        showSuccess(data.message || 'Function is valid');
      } else {
        setValidationMessage(data.message || 'Validation failed.');
        setValidationStatus('error');
        setIsValidated(false);
        showError(data.message || 'Validation failed');
      }
    },
    onError: (error: any) => {
      setValidationMessage(error.message || 'Validation failed.');
      setValidationStatus('error');
      setIsValidated(false);
      showError(error.message || 'Validation failed');
    }
  });

  const handleValidateFunction = async () => {
    try {
      setValidationMessage('Validating...');
      setValidationStatus(null);

      const result = await validateFunctionMutation.mutateAsync({
        name: functionName,
        code: editorContent,
        id: currentFunction?.id,
        type: functionType
      });

      // Return based on the actual result from the API
      return result.valid;
    } catch (error) {
      // Error is handled in the onError callback
      return false;
    }
  };

  const handleSaveFunction = async () => {
    if (!currentFunction) return;

    // If already validated and successful, save directly
    if (isValidated && validationStatus === 'success') {
      const updatedFunction = {
        ...currentFunction,
        name: functionName,
        label: functionLabel,
        code: editorContent,
        type: functionType
      };

      saveFunctionMutation.mutate(updatedFunction);
      return;
    }

    // Otherwise, validate first
    const isValid = await handleValidateFunction();
    if (!isValid) return;

    // If validation was successful, save the function
    if (validationStatus === 'success' || isValidated) {
      const updatedFunction = {
        ...currentFunction,
        name: functionName,
        label: functionLabel,
        code: editorContent,
        type: functionType
      };

      saveFunctionMutation.mutate(updatedFunction);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="mb-4 border-b pb-2 flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {currentFunction?.id ? 'Edit Function' : 'Add New Function'}
        </h2>
        <button
          onClick={onClose}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Functions
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="functionType" className="block text-sm font-medium text-gray-700 mb-1">
              Function Type
            </label>
            <select
              id="functionType"
              value={functionType}
              onChange={(e) => {
                const newType = e.target.value as FunctionType;
                if (newType !== functionType) {
                  setFunctionType(newType);
                  setIsValidated(false);
                  setValidationStatus(null);
                  setValidationMessage(null);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="upload_to_website">Upload to Website</option>
              <option value="import_to_sheet">Import to Sheet</option>
              <option value="one_time_trigger">One Time Trigger</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select the type of function you want to create.
            </p>
          </div>
          <div>
            <label htmlFor="functionLabel" className="block text-sm font-medium text-gray-700 mb-1">
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
                  setIsValidated(false);
                  setValidationStatus(null);
                  setValidationMessage(null);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="My Custom Function"
            />
            <p className="text-xs text-gray-500 mt-1">
              A user-friendly name for this function.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="functionName" className="block text-sm font-medium text-gray-700 mb-1">
            Function Name
          </label>
          <input
            type="text"
            id="functionName"
            value={functionName}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
          />
          <p className="text-xs text-gray-500 mt-1">
            Function name is automatically extracted from your PHP code.
          </p>
        </div>

        <div>
          <label htmlFor="functionCode" className="block text-sm font-medium text-gray-700 mb-1">
            Function Code
          </label>
          <div className="border border-gray-300 rounded-md h-80">
            {!isMonacoReady ? (
              <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="text-gray-500">Loading code editor...</div>
              </div>
            ) : (
                <Editor
                  height="100%"
                  defaultLanguage="php"
                  language='php'
                  value={editorContent}
                  onChange={(value) => {
                    const newContent = value || '';
                    if (newContent !== editorContent) {
                      setEditorContent(newContent);
                      setIsValidated(false);
                      setValidationStatus(null);
                      setValidationMessage(null);
                    }
                  }}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    tabSize: 4,
                    automaticLayout: true
                  }}
                />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Write your PHP function. It must accept a $record parameter and return an array.
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t flex justify-between">
        <div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {validationMessage && (
            <div className={`p-3 rounded-md ${validationStatus === 'success' ? 'bg-green-50 text-green-800' :
              validationStatus === 'error' ? 'bg-red-50 text-red-800' :
                'bg-gray-50 text-gray-800'
              }`}>
              {validationMessage}
            </div>
          )}

          {validateFunctionMutation.isLoading ? (
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded-md"
              disabled
            >
              Validating...
            </button>
          ) : saveFunctionMutation.isLoading ? (
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded-md"
              disabled
            >
              Saving...
            </button>
          ) : isValidated && validationStatus === 'success' ? (
                <button
                  onClick={handleSaveFunction}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Save Function
                </button>
          ) : (
            <button
              onClick={handleValidateFunction}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Validate Function
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FunctionEditor;