To add a new method:

1. Define the method wherever you need
2. Create a method on the Mousion engine (`server.js`) that takes in whatever you need and calls it
3. YOU'RE DONE ON BACKEND! Do not worry about adding it to the process handler at the bottom of `server.js` as that is deprecated and should only ever be used if you for some reason need the main process to control the mailbox (should never happen). You will of course need a binding for it on the frontend process via sockpuppet WS.