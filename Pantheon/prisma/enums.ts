//? Constraints because SQLite doesn't support enums

export enum MailboxProvider {
	MICROSOFT="microsoft",
	GOOGLE="google"
}

export enum FolderSpecialty {
	INBOX="inbox",
	SENT="sent",
	STARRED="starred",
	SPAM="spam",
	DRAFTS="drafts",
	ARCHIVE="archive",
	TRASH="trash",
	BOARD="board"
}

export enum BoardRuleActionType {
	Star="star",
	Forward="forward",
	Move="move",
	Delete="delete",
	Archive="archive"
}
