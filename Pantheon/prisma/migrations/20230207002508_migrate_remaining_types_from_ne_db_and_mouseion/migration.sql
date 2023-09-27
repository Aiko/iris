/*
  Warnings:

  - You are about to drop the column `mailboxEmail` on the `Folder` table. All the data in the column will be lost.
  - Added the required column `email` to the `Folder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `summary` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Thread" (
    "tid" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL,
    "cursor" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "folderId" TEXT NOT NULL,
    CONSTRAINT "Thread_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Space" (
    "name" TEXT NOT NULL,
    "id" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "BoardRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isFrom" TEXT,
    "isTo" TEXT,
    "subjectContains" TEXT,
    "bodyContains" TEXT,
    "detectedQuickAction" TEXT,
    "isSubscription" BOOLEAN,
    "attachmentsNameContains" TEXT,
    "attachmentsTypeIs" TEXT
);

-- CreateTable
CREATE TABLE "BoardRuleAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    CONSTRAINT "BoardRuleAction_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "BoardRule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ContactToThread" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ContactToThread_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact" ("email") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ContactToThread_B_fkey" FOREIGN KEY ("B") REFERENCES "Thread" ("tid") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_FolderToSpace" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_FolderToSpace_A_fkey" FOREIGN KEY ("A") REFERENCES "Folder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_FolderToSpace_B_fkey" FOREIGN KEY ("B") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Folder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "special" TEXT,
    "email" TEXT NOT NULL,
    CONSTRAINT "Folder_email_fkey" FOREIGN KEY ("email") REFERENCES "Mailbox" ("email") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Folder" ("id", "name", "path") SELECT "id", "name", "path" FROM "Folder";
DROP TABLE "Folder";
ALTER TABLE "new_Folder" RENAME TO "Folder";
CREATE UNIQUE INDEX "Folder_id_key" ON "Folder"("id");
CREATE TABLE "new_Message" (
    "mid" TEXT NOT NULL PRIMARY KEY,
    "tid" TEXT NOT NULL,
    "seen" BOOLEAN NOT NULL,
    "starred" BOOLEAN NOT NULL,
    "subject" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "fromEmail" TEXT NOT NULL,
    CONSTRAINT "Message_tid_fkey" FOREIGN KEY ("tid") REFERENCES "Thread" ("tid") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_fromEmail_fkey" FOREIGN KEY ("fromEmail") REFERENCES "Contact" ("email") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("fromEmail", "mid", "seen", "starred", "subject", "tid", "timestamp") SELECT "fromEmail", "mid", "seen", "starred", "subject", "tid", "timestamp" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE UNIQUE INDEX "Message_mid_key" ON "Message"("mid");
CREATE TABLE "new_Contact" (
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL PRIMARY KEY,
    "base" TEXT NOT NULL,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "messagesReceived" INTEGER NOT NULL DEFAULT 0,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "rollup" BOOLEAN NOT NULL DEFAULT false,
    "whitelisted" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Contact" ("base", "email", "name") SELECT "base", "email", "name" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE UNIQUE INDEX "Contact_email_key" ON "Contact"("email");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "Thread_tid_key" ON "Thread"("tid");

-- CreateIndex
CREATE UNIQUE INDEX "Space_id_key" ON "Space"("id");

-- CreateIndex
CREATE UNIQUE INDEX "_ContactToThread_AB_unique" ON "_ContactToThread"("A", "B");

-- CreateIndex
CREATE INDEX "_ContactToThread_B_index" ON "_ContactToThread"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_FolderToSpace_AB_unique" ON "_FolderToSpace"("A", "B");

-- CreateIndex
CREATE INDEX "_FolderToSpace_B_index" ON "_FolderToSpace"("B");
