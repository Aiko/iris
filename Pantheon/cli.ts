import path from "path";
import { fork } from 'child_process';
import { DB, migrationEngine, queryEngine } from '@Pantheon/shim';

/** Node-specific for developmental scripting */
export const prismaNodeCLI = async (...command: string[]): Promise<number> => new Promise(s => {
	const child = fork(
		path.resolve(__dirname, "..", "node_modules/prisma/build/index.js"),
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

	child.on("error", err => { throw err })

	child.on("close", (code, signal) => {
		s(code ?? 0);
	})
})

/** Shimmed for use with Electron */
export default async (...command: string[]): Promise<number> => new Promise(s => {
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

	child.on("error", err => { throw err })

	child.on("close", (code, signal) => {
		s(code ?? 0);
	})
})