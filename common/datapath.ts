import path from 'path';
export default (...path_fragments: string[]) => {
	const fp = path.join(...path_fragments)
	switch (process.platform) {
		case 'darwin': return path.join(
			process.env.HOME as string, 'Library', 'Application Support',
			'Aiko Mail', fp
		);
		case 'win32': return path.join(
			process.env.APPDATA as string,
			'Aiko Mail', fp
		);
		case 'linux': return path.join(
			process.env.HOME as string,
			'.Aiko Mail', fp
		);
		default: throw new Error(`Unsupported platform: ${process.platform}`)
	}
}