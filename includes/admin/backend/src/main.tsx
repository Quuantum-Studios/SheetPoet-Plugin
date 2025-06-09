/* eslint-disable no-var */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastProvider } from './contexts/ToastContext';
import App from './App.tsx';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5000,
			refetchOnWindowFocus: false,
			retry: 2,
		},
	},
});

interface SPGSGlobals {
	root: string;
	apiNonce: string;
	baseUrl: string;
}

declare global {
	var spgs: SPGSGlobals;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<ToastProvider>
				<App />
			</ToastProvider>
		</QueryClientProvider>
	</React.StrictMode>
);
