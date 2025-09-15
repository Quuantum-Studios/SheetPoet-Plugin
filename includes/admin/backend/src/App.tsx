import apiFetch from '@wordpress/api-fetch';
import { useState } from 'react';
import './assets/css/index.css';
import MainLayout from './components/MainLayout/MainLayout';
import Settings from './views/Settings/Settings';
import Functions from './views/Functions/Functions';
import Logs from './views/Logs/Logs';

export enum Pages {
	Settings = 'Settings',
	Functions = 'Functions',
	Logs = 'History',
}

apiFetch.use(apiFetch.createRootURLMiddleware(window.spgs?.root));
apiFetch.use(apiFetch.createNonceMiddleware(window.spgs?.apiNonce));

function App() {
	const [page, setPage] = useState(Pages.Functions);

	// add class to the body
	document.body.classList.add('folded');

	return (
		<MainLayout page={page} setPage={setPage}>
			{page === Pages.Settings && <Settings />}
			{page === Pages.Functions && <Functions />}
			{page === Pages.Logs && <Logs />}
		</MainLayout>
	);
}

export default App;
