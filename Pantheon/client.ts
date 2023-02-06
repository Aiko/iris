import path from 'path';
import replace from "replace-in-file"
replace.sync({
	files: path.join(__dirname, "src", "generated", "client", "index.js"),
	from: "findSync(process.cwd()",
	to: `findSync(require('electron').app.getAppPath()`,
})
import { PrismaClient } from "@prisma/client"
import { queryEngine } from '@Pantheon/shim';

export default new PrismaClient({
	__internal: {
		engine: {
				binaryPath: queryEngine
		}
	}
})
