-- CreateTable
CREATE TABLE "Mailbox" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Message" (
    "mid" TEXT NOT NULL PRIMARY KEY,
    "tid" TEXT NOT NULL,
    "seen" BOOLEAN NOT NULL,
    "starred" BOOLEAN NOT NULL,
    "subject" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    CONSTRAINT "Message_fromEmail_fkey" FOREIGN KEY ("fromEmail") REFERENCES "Contact" ("email") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL PRIMARY KEY,
    "base" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mailboxEmail" TEXT NOT NULL,
    CONSTRAINT "Folder_mailboxEmail_fkey" FOREIGN KEY ("mailboxEmail") REFERENCES "Mailbox" ("email") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_to" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_to_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact" ("email") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_to_B_fkey" FOREIGN KEY ("B") REFERENCES "Message" ("mid") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_cc" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_cc_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact" ("email") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_cc_B_fkey" FOREIGN KEY ("B") REFERENCES "Message" ("mid") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_bcc" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_bcc_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact" ("email") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_bcc_B_fkey" FOREIGN KEY ("B") REFERENCES "Message" ("mid") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_recipients" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_recipients_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact" ("email") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_recipients_B_fkey" FOREIGN KEY ("B") REFERENCES "Message" ("mid") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_FolderToMessage" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_FolderToMessage_A_fkey" FOREIGN KEY ("A") REFERENCES "Folder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_FolderToMessage_B_fkey" FOREIGN KEY ("B") REFERENCES "Message" ("mid") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Mailbox_email_key" ON "Mailbox"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Message_mid_key" ON "Message"("mid");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_email_key" ON "Contact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_id_key" ON "Folder"("id");

-- CreateIndex
CREATE UNIQUE INDEX "_to_AB_unique" ON "_to"("A", "B");

-- CreateIndex
CREATE INDEX "_to_B_index" ON "_to"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_cc_AB_unique" ON "_cc"("A", "B");

-- CreateIndex
CREATE INDEX "_cc_B_index" ON "_cc"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_bcc_AB_unique" ON "_bcc"("A", "B");

-- CreateIndex
CREATE INDEX "_bcc_B_index" ON "_bcc"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_recipients_AB_unique" ON "_recipients"("A", "B");

-- CreateIndex
CREATE INDEX "_recipients_B_index" ON "_recipients"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_FolderToMessage_AB_unique" ON "_FolderToMessage"("A", "B");

-- CreateIndex
CREATE INDEX "_FolderToMessage_B_index" ON "_FolderToMessage"("B");
