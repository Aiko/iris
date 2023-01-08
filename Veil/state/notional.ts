const EMAILS = [
	{
		sender: 'John Smith',
		date: '1:23 PM',
		subject: 'Client Deck',
		preview: 'It would be great to get time to review the client deck. Does 3:30PM work for you?',
		attachments: ['deck.pdf'],
		bcc: true,
		tracker: true,
		threadCount: 2,
		event: true,
		mid: '0'
	},
	{
		sender: 'Jane Doe',
		date: '1:23 PM',
		subject: 'Project Status',
		preview: 'I have attached the latest project status. Let me know if you have any questions',
		attachments: [],
		bcc: false,
		tracker: true,
		threadCount: 4,
		event: false,
		mid: '1'
	},
	{
		sender: 'Charlie',
		date: '1:23 PM',
		subject: 'Cat Food',
		preview: 'Hey, could you pick up a can of cat food on your way back? Im feeling sleepy.',
		attachments: [],
		bcc: true,
		tracker: false,
		threadCount: 1,
		event: false,
		mid: '2'
	},
	{
		sender: 'Bob Johnson',
		date: '2:34 PM',
		subject: 'H2 Planning Session',
		preview: 'I have attached the agenda for the planning session. Please let me know if you have any questions',
		attachments: ['agenda.pdf'],
		bcc: false,
		tracker: false,
		threadCount: 1,
		event: true,
		mid: '3'
	},
	{
		sender: 'Alice Williams',
		date: '3:45 PM',
		subject: 'Project Update',
		preview: 'I wanted to provide an update on the project we discussed last week. Can we schedule a call for Monday at 9AM?',
		attachments: ['update.pdf'],
		bcc: false,
		tracker: true,
		event: false,
		threadCount: 2,
		mid: '4'
	},
]

export const resolveEmail = (mid: string) => EMAILS.find(({ mid: id }) => id === mid)

export const INBOX = {
	name: 'Inbox',
	slug: 'INBOX',
	emails: [{mid: '0',}]
}
const BOARDS = [
	{ name: 'To-Do', slug: '[Aiko]/To-Do', emails: [{mid: '1'}, {mid: '2',}, {mid: '3'}] },
	{ name: 'In Progress', slug: '[Aiko]/In Progress',  emails: [{mid: '4',}] },
	{ name: 'Done', slug: '[Aiko]/Done', emails: [] }
]

export const boards = BOARDS.map(({ slug }) => ({ slug, }))
export const resolveBoard = (slug: string) => BOARDS.find(({ slug: id }) => id === slug)