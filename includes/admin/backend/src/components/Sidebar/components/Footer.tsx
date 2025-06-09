export default function Footer() {
	return (
		<div className='my-16 mx-7 flex flex-col items-center'>
			<p className='text-center myt-4 text-sm'>
				Need help?
				<br />
				Please check our docs.
			</p>
			<a href='https://www.quuantum.com/products/sheetpoet/' target='_blank' className='underline hover:text-white hover:no-underline mb-4' rel='noreferrer'>
				Documentation
			</a>

			<p className='text-left myt-4 text-sm'>
				To run the functions with your google sheet, you will need to install <a href='https://www.quuantum.com/products/sheetpoet/' target='_blank' className='underline hover:text-white hover:no-underline mb-4' rel='noreferrer'>our add on in your sheet</a>. Follow the detailed step from our docs.
			</p>
		</div>
	);
}
