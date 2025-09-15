import { Dispatch, SetStateAction } from 'react';
import Footer from './components/Footer';
import Logo from './components/Logo';
import MenuItem from './components/MenuItem';

import DashboardSVG from '@/components/Icons/DashboardSVG';
import SettingsSVG from '@/components/Icons/SettingsSVG';

import { Pages } from '@/App';

type SidebarProps = {
	sidebarVisible: boolean;
	page: Pages;
	setPage: Dispatch<SetStateAction<any>>;
};

export default function Sidebar({ sidebarVisible, setPage, page }: SidebarProps) {
	return (
		<div className={`${sidebarVisible ? 'block absolute z-10' : 'hidden'} lg:block w-72 min-h-screen bg-[#344054] text-white border-r-white border-r`}>
			<div className='mt-6 h-full overflow-y-auto w-72'>
				<Logo />
				<ul className='px-5 mb-4'>
					<MenuItem page={page} setPage={setPage} isActive={page === Pages.Functions} title={Pages.Functions} Image={DashboardSVG} />
					<MenuItem page={page} setPage={setPage} isActive={page === Pages.Settings} title={Pages.Settings} Image={SettingsSVG} />
					<MenuItem page={page} setPage={setPage} isActive={page === Pages.Logs} title={Pages.Logs} Image={DashboardSVG} />
				</ul>
				<Footer />
			</div>
		</div>
	);
}
