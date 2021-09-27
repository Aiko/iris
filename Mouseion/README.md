# Notes

TODO: documentation

## Needs

Registry needs nothing
IMAP Config needs nothing
Lumberjack needs nothing
Metadata Storage needs nothing
Post Office Proxy needs Lumberjack
Pantheon Proxy needs Lumberjack
Folders needs Lumberjack, Courier
Custodian needs Lumberjack, Folders
Contacts needs Lumberjack, Pantheon, Folders,
                IMAP Config
Seamstress needs Lumberjack, Pantheon, Custodian,
                  Post Office, Folders, IMAP Config, Contacts
Cypher needs Lumberjack,
              Seamstress,
              Pantheon,
              Custodian,
              Folders,
              Metadata Storage
Board Rules need Lumberjack,
                  Metadata Storage,
                  Pantheon,
                  Folders,
                  Cypher
Resolver needs Lumberjack,
                Pantheon,
                Custodian,
                Post Office,
                Folders
Tailor needs Lumberjack, Pantheon,
              Custodian, Post Office,
              Folders, IMAP Config,
              Contacts, Board RUles, Cypher
Link needs Lumberjack,
            Tailor,
            Pantheon,
            Custodian,
            Folders,
            Metadata Storage
Sync needs Lumberjack,
            Metadata Storage,
            Pantheon,
            Custodian,
            Post Office,
            Tailor,
            Folders