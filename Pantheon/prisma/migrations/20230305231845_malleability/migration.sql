/*
  Warnings:

  - You are about to drop the `_FolderToSpace` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `detectedQuickAction` on the `BoardRule` table. All the data in the column will be lost.
  - You are about to drop the column `special` on the `Folder` table. All the data in the column will be lost.
  - You are about to drop the column `target` on the `BoardRuleAction` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Attachment_path_key";

-- DropIndex
DROP INDEX "Contact_email_key";

-- DropIndex
DROP INDEX "Mailbox_email_key";

-- DropIndex
DROP INDEX "Message_mid_key";

-- DropIndex
DROP INDEX "Space_id_key";

-- DropIndex
DROP INDEX "Thread_tid_key";

-- DropIndex
DROP INDEX "_FolderToSpace_B_index";

-- DropIndex
DROP INDEX "_FolderToSpace_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_FolderToSpace";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "_boards" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_boards_A_fkey" FOREIGN KEY ("A") REFERENCES "Folder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_boards_B_fkey" FOREIGN KEY ("B") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BoardRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isFrom" TEXT,
    "isTo" TEXT,
    "subjectContains" TEXT,
    "bodyContains" TEXT,
    "intent" TEXT,
    "isSubscription" BOOLEAN,
    "attachmentsNameContains" TEXT,
    "attachmentsTypeIs" TEXT
);
INSERT INTO "new_BoardRule" ("attachmentsNameContains", "attachmentsTypeIs", "bodyContains", "id", "isFrom", "isSubscription", "isTo", "subjectContains") SELECT "attachmentsNameContains", "attachmentsTypeIs", "bodyContains", "id", "isFrom", "isSubscription", "isTo", "subjectContains" FROM "BoardRule";
DROP TABLE "BoardRule";
ALTER TABLE "new_BoardRule" RENAME TO "BoardRule";
CREATE TABLE "new_Folder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'folder',
    "email" TEXT NOT NULL,
    CONSTRAINT "Folder_email_fkey" FOREIGN KEY ("email") REFERENCES "Mailbox" ("email") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Folder" ("email", "id", "name", "path") SELECT "email", "id", "name", "path" FROM "Folder";
DROP TABLE "Folder";
ALTER TABLE "new_Folder" RENAME TO "Folder";
CREATE TABLE "new_BoardRuleAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "argument" TEXT,
    "targetId" TEXT,
    "ruleId" TEXT NOT NULL,
    CONSTRAINT "BoardRuleAction_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BoardRuleAction_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "BoardRule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BoardRuleAction" ("id", "ruleId", "type") SELECT "id", "ruleId", "type" FROM "BoardRuleAction";
DROP TABLE "BoardRuleAction";
ALTER TABLE "new_BoardRuleAction" RENAME TO "BoardRuleAction";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "_boards_AB_unique" ON "_boards"("A", "B");

-- CreateIndex
CREATE INDEX "_boards_B_index" ON "_boards"("B");
