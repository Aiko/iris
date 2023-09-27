import { prismaNodeCLI } from "@Pantheon/cli";

prismaNodeCLI('migrate', 'dev', '--schema=./Pantheon/prisma/schema.prisma');
