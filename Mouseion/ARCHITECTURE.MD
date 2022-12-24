# Architecture

## Flow

Mouseion is a singleton now. Pantheon is also a singleton now.

1. User signs in with a new mailbox
2. Mouseion verifies credentials
3. Mouseion spawns a Mailbox for the new mailbox.
4. Every sync cycle, Mouseion pings each Mailbox.
5. Each mailbox performs the following steps:
   - Fetch configs:
     - M = maximum number of messages to hold
     - X = maximum number of messages to sync
   - Fetch indices:
     - N = newest index on server
     - I = oldest index locally
     - J = newest index locally
   - If the mailbox does not have all historical messages
   	 - If the mailbox has less than M messages
  	   - Lookbehind in large pages until M is reached OR all synced
   - If the mailbox has local messages
     - Sync the flags/existence of last X local messages
   - If J < N
     - If N - J > X
       - fetch the latest X messages looking behind from N
     - Else
       - fetch J:N
   - Dump all changes into a Queue and begin Pipeline
   - Pipeline:
     - Custodian
     - Threading
     - Board Rules
     - Contacts
     - Attachments