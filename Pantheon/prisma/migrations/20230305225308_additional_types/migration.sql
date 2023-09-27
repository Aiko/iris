-- CreateTable
CREATE TABLE "Attachment" (
    "path" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "cid" TEXT,
    "embedded" BOOLEAN NOT NULL DEFAULT false,
    "mid" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    CONSTRAINT "Attachment_mid_fkey" FOREIGN KEY ("mid") REFERENCES "Message" ("mid") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attachment_authorEmail_fkey" FOREIGN KEY ("authorEmail") REFERENCES "Contact" ("email") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ContactToMailbox" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ContactToMailbox_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact" ("email") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ContactToMailbox_B_fkey" FOREIGN KEY ("B") REFERENCES "Mailbox" ("email") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_path_key" ON "Attachment"("path");

-- CreateIndex
CREATE UNIQUE INDEX "_ContactToMailbox_AB_unique" ON "_ContactToMailbox"("A", "B");

-- CreateIndex
CREATE INDEX "_ContactToMailbox_B_index" ON "_ContactToMailbox"("B");
