import path from "path"
import { app } from 'electron';
import datapath from "@Iris/common/datapath";


const fp = (p: string) => path.join(
	app ? app.getAppPath().replace('app.asar', '') : __dirname,
	p
)
const executables: Record<string, {migrationEngine: string, queryEngine: string}> = {
	win32: {
			migrationEngine: fp('node_modules/@prisma/engines/migration-engine-windows.exe'),
			queryEngine: fp('node_modules/@prisma/engines/query_engine-windows.dll.node')
	},
	linux: {
			migrationEngine: fp('node_modules/@prisma/engines/migration-engine-debian-openssl-1.1.x'),
			queryEngine: fp('node_modules/@prisma/engines/libquery_engine-debian-openssl-1.1.x.so.node')
	},
	darwin: {
			migrationEngine: fp('node_modules/@prisma/engines/migration-engine-darwin'),
			queryEngine: fp('node_modules/@prisma/engines/libquery_engine-darwin.dylib.node')
	},
	darwinArm64: {
			migrationEngine: fp('node_modules/@prisma/engines/migration-engine-darwin-arm64'),
			queryEngine: fp('node_modules/@prisma/engines/libquery_engine-darwin-arm64.dylib.node')
	}
}

export const { migrationEngine, queryEngine } = (process.platform == 'darwin' && process.arch == 'arm64') ?
	executables.darwinArm64
	: executables[process.platform]
;
export const DB = datapath("pantheon.db")
