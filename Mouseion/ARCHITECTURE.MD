# Architecture

## Lifecycle

Mouseion is a singleton.

- Can add mailboxes
- Mouseion in its lifecycle asks all mailboxes to sync
- Sync Folders -> Identify Folders & upsert
- Sync Messages, clean in-memory
- Identify Contacts & upsert
- Identify Threads & upsert
- Identify Attachments & upsert
- Identify Messages & upsert
- Run Board Rules
- 
