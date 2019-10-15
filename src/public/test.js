const { remote } = require('electron')
const { Mailbox } = remote.require('./app.js')

new Notification('Anuze!', {
    body: 'My anus is great!',
    image: 'https://pbs.twimg.com/media/BG48ENgCEAAIDl9.jpg',
    icon: 'https://pbs.twimg.com/media/BG48ENgCEAAIDl9.jpg',
    badge: 'https://pbs.twimg.com/media/BG48ENgCEAAIDl9.jpg'
})