import replace from "replace-in-file"
replace.sync({
	files: path.join(__dirname, "src", "generated", "client", "index.js"),
	from: "findSync(process.cwd()",
	to: `findSync(require('electron').app.getAppPath()`,
})
import { app } from 'electron/main';
import path from 'path';
import { PrismaClient } from "@prisma/client"
import { fork } from 'child_process';
import datapath from "@Iris/common/datapath";


const fp = (p: string) => path.join(app.getAppPath().replace('app.asar', ''), p)
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

const { migrationEngine, queryEngine } = (process.platform == 'darwin' && process.arch == 'arm64') ?
	executables.darwinArm64
	: executables[process.platform]
;

export const prisma = new PrismaClient({
	__internal: {
		engine: {
				binaryPath: queryEngine
		}
	}
})

const DB = datapath("pantheon.db")

export const prismaCLI = async (...command: string[]): Promise<number> => new Promise(s => {
	const child = fork(
		path.resolve(__dirname, "..", "..", "node_modules/prisma/build/index.js"),
		command,
		{
			env: {
				...process.env,
				PRISMA_MIGRATION_ENGINE_BINARY: migrationEngine,
				PRISMA_QUERY_ENGINE_LIBRARY: queryEngine,
				DATABASE_URL: "file:" + DB
			},
			stdio: "inherit"
		}
	);

	child.on("error", err => {throw err})

	child.on("close", (code, signal) => {
		s(code ?? 0);
	})
})
