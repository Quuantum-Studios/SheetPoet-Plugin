import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getLogs, clearLogs, getTaskLogs } from '@/services/logs.service';
import { useToast } from '@/contexts/ToastContext';

// Define local interfaces that match the service types
interface LogItemUI {
  id: number;
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

interface GroupedLogItemUI {
  task_id: string;
  count: number;
  latest_timestamp: string;
  function_names: string;
  function_labels: string;
  function_types: string;
  success: boolean;
}

interface LogsResponseUI {
  logs: LogItemUI[] | GroupedLogItemUI[];
  total: number;
  pages: number;
  grouped: boolean;
}

const Logs: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<LogItemUI | null>(null);
  const [viewMode, setViewMode] = useState<'request' | 'response' | 'meta'>('request');
  const [groupByTaskId, setGroupByTaskId] = useState(true);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const [taskLogs, setTaskLogs] = useState<Record<string, LogItemUI[]>>({});
  const [loadingTaskIds, setLoadingTaskIds] = useState<Record<string, boolean>>({});

  // Fetch logs
  const { data, isLoading, isError } = useQuery<LogsResponseUI>(
    ['logs', currentPage, groupByTaskId],
    () => getLogs({ page: currentPage, per_page: 20, group_by_task_id: groupByTaskId }) as Promise<LogsResponseUI>,
    {
      onError: (error) => {
        console.error('Error fetching logs:', error);
        showError('Failed to load history. Please try again.');
      }
    }
  );

  // Clear logs mutation
  const clearLogsMutation = useMutation(clearLogs, {
    onSuccess: () => {
      queryClient.invalidateQueries('logs');
      setSelectedLog(null);
      showSuccess('History cleared successfully');
    },
    onError: (error) => {
      console.error('Error clearing history:', error);
      showError('Failed to clear history. Please try again.');
    }
  });

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
      clearLogsMutation.mutate();
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewLog = (log: LogItemUI) => {
    setSelectedLog(log);
  };

  const toggleTaskExpansion = async (taskId: string) => {
    const isCurrentlyExpanded = expandedTaskIds[taskId] || false;

    // If we're expanding and don't have the logs yet, fetch them
    if (!isCurrentlyExpanded && !taskLogs[taskId]) {
      try {
        setLoadingTaskIds(prev => ({
          ...prev,
          [taskId]: true
        }));

        const response = await getTaskLogs(taskId);

        setTaskLogs(prev => ({
          ...prev,
          [taskId]: response.logs as unknown as LogItemUI[]
        }));
      } catch (error) {
        showError('Failed to load task logs. Please try again.');
        console.error('Error fetching task logs:', error);
      } finally {
        setLoadingTaskIds(prev => ({
          ...prev,
          [taskId]: false
        }));
      }
    }

  // Toggle expansion state
    setExpandedTaskIds(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatData = (dataString: string) => {
    try {
      const data = JSON.parse(dataString);
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return dataString;
    }
  };

  // Helper function to check if logs are grouped
  const isGroupedView = (): boolean => {
    return data?.grouped || false;
  };

  const renderPagination = () => {
    if (!data || data.pages <= 1) return null;

    const pageButtons: JSX.Element[] = [];
    for (let i = 1; i <= data.pages; i++) {
      pageButtons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 mx-1 rounded ${
            currentPage === i
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex justify-center mt-4">
        <button
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 mx-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
        >
          &laquo; Prev
        </button>
        {pageButtons}
        <button
          onClick={() => handlePageChange(Math.min(data.pages, currentPage + 1))}
          disabled={currentPage === data.pages}
          className="px-3 py-1 mx-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
        >
          Next &raquo;
        </button>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Execution History</h1>
          <p className="text-gray-600">
            View recent function executions and their results.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={groupByTaskId}
                onChange={() => setGroupByTaskId(!groupByTaskId)}
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="ml-2 text-sm font-medium text-gray-700">Group by Task ID</span>
          </div>
          <button
            onClick={handleClearLogs}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            disabled={clearLogsMutation.isLoading || isLoading || (data?.logs.length || 0) === 0}
          >
            {clearLogsMutation.isLoading ? 'Clearing...' : 'Clear History'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2">Loading history...</p>
        </div>
      ) : isError ? (
        <div className="bg-red-50 text-red-800 p-4 rounded-md">
            Error loading history. Please try again.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                    </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Task ID
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Runs
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Label
                    </th>
                        <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                        <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                      {!data || (Array.isArray(data.logs) && data.logs.length === 0) ? (
                    <tr>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500" colSpan={6}>
                            No history available yet.
                      </td>
                    </tr>
                      ) : !isGroupedView() ? (
                        // Regular non-grouped view
                        (data.logs as LogItemUI[]).map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {formatTime(log.timestamp)}
                        </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              <span className="truncate max-w-[100px] inline-block" title={log.task_id || '-'}>
                                {log.task_id || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                              1
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              <span className="truncate max-w-[150px] inline-block" title={log.function_label || '-'}>
                                {log.function_label || '-'}
                              </span>
                        </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">
                              {log.status === 'success' ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              )}
                        </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleViewLog(log)}
                                className="text-blue-600 hover:text-blue-800 inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-blue-100"
                                title="View Details"
                          >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                        ) : (
                          // Grouped by task_id view from server
                          (data.logs as GroupedLogItemUI[]).map((group) => {
                            const isExpanded = expandedTaskIds[group.task_id] || false;

                      return (
                        <React.Fragment key={group.task_id}>
                          {/* Group header row */}
                          <tr
                            className="bg-gray-50 hover:bg-gray-100 cursor-pointer"
                            onClick={() => toggleTaskExpansion(group.task_id)}
                          >
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {formatTime(group.latest_timestamp)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              <div className="flex items-center">
                                <svg
                                  className={`w-4 h-4 mr-1 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="truncate max-w-[100px] inline-block" title={group.task_id}>
                                  {group.task_id}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 font-semibold text-center">
                              {group.count}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              <span className="truncate max-w-[150px] inline-block" title={group.function_labels || '-'}>
                                {group.function_labels || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">
                              {group.success ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">
                              <span className="text-blue-600 inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-blue-100">
                                {isExpanded ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </span>
                            </td>
                          </tr>

                          {/* Expanded group content */}
                          {isExpanded && (
                            <>
                              {loadingTaskIds[group.task_id] ? (
                                <tr>
                                  <td colSpan={6} className="px-3 py-2 text-center">
                                    <div className="flex justify-center items-center">
                                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mr-2"></div>
                                      <span>Loading logs...</span>
                                    </div>
                                  </td>
                                </tr>
                              ) : taskLogs[group.task_id]?.length ? (
                                taskLogs[group.task_id].map(log => (
                                  <tr key={log.id} className="hover:bg-gray-50 bg-white">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 pl-8">
                                      {formatTime(log.timestamp)}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 pl-8">
                                      <span className="truncate max-w-[100px] inline-block" title={log.task_id || '-'}>
                                        {log.task_id || '-'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                                      1
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                      <span className="truncate max-w-[150px] inline-block" title={log.function_label || '-'}>
                                        {log.function_label || '-'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-center">
                                      {log.status === 'success' ? (
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                          </svg>
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-center">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewLog(log);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-blue-100"
                                        title="View Details"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                      <td colSpan={6} className="px-3 py-2 text-center text-gray-500">
                                    No logs found for this task.
                                  </td>
                                </tr>
                              )}
                            </>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </div>

          {selectedLog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg w-full max-w-4xl">
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    Log Details - {formatDate(selectedLog.timestamp)}
                  </h2>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    &times;
                  </button>
                </div>
                <div className="p-4">
                      {/* Metadata section */}
                      <div className="mb-4 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">General Information</h3>
                          <div className="grid grid-cols-1 gap-2">
                            <div>
                              <span className="text-xs text-gray-500">Status:</span>
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${selectedLog.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}>
                                {selectedLog.status}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Task ID:</span>
                              <span className="ml-2 text-sm">{selectedLog.task_id || '-'}</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Timestamp:</span>
                              <span className="ml-2 text-sm">{formatDate(selectedLog.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">Function Information</h3>
                          <div className="grid grid-cols-1 gap-2">
                            <div>
                              <span className="text-xs text-gray-500">Function Name:</span>
                              <span className="ml-2 text-sm">{selectedLog.function_name || '-'}</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Function Label:</span>
                              <span className="ml-2 text-sm">{selectedLog.function_label || '-'}</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Function Type:</span>
                              <span className="ml-2 text-sm">{selectedLog.function_type || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Data tabs */}
                  <div className="flex border-b mb-4">
                    <button
                      onClick={() => setViewMode('request')}
                      className={`px-4 py-2 ${
                        viewMode === 'request'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      Request Data
                    </button>
                    <button
                      onClick={() => setViewMode('response')}
                      className={`px-4 py-2 ${
                        viewMode === 'response'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      Response Data
                    </button>
                        {selectedLog.meta_data && (
                          <button
                            onClick={() => setViewMode('meta')}
                            className={`px-4 py-2 ${viewMode === 'meta'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-500'
                              }`}
                          >
                            User Info
                          </button>
                        )}
                      </div>

                      {viewMode === 'meta' && selectedLog.meta_data ? (
                        <div className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm h-80 overflow-y-auto">
                          {(() => {
                            try {
                              const metaData = JSON.parse(selectedLog.meta_data);
                              if (metaData.user) {
                                return (
                                  <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-center p-4 bg-white rounded-lg shadow">
                                      {metaData.user.picture && (
                                        <img
                                          src={metaData.user.picture}
                                          alt={metaData.user.name || 'User'}
                                          className="w-12 h-12 rounded-full mr-4"
                                        />
                                      )}
                                      <div>
                                        <h3 className="text-lg font-semibold">{metaData.user.name || 'Unknown User'}</h3>
                                        <p className="text-gray-600">{metaData.user.email || ''}</p>
                                        <p className="text-gray-500 text-sm">ID: {metaData.user.id || 'Unknown'}</p>
                                      </div>
                                </div>
                                  </div>
                                );
                              } else {
                                return <p>No user information available</p>;
                              }
                            } catch (e) {
                              return <p>Error parsing meta data: {String(e)}</p>;
                            }
                          })()}
                        </div>
                      ) : (
                          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm h-80 overflow-y-auto">
                            {viewMode === 'request'
                              ? formatData(selectedLog.request_data)
                              : formatData(selectedLog.response_data)}
                          </pre>
                      )}
                </div>
                <div className="p-4 border-t flex justify-end">
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Logs;
