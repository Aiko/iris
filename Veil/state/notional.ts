const EMAILS = [
	{
		sender: 'Mark Lippe',
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
		sender: 'Isabelle Saviane',
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
		sender: 'Charlie Battac',
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
		sender: 'Andrea Mesa',
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
		sender: 'Alice Cheifetz',
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
	{
		sender: 'Lucien Cholet',
		date: 'Yesterday',
		subject: 'Deck',
		preview: 'Thank you for considering us for your tax and accounting needs. We will get started on your taxes once you sign this document and pay the included deposit.',
		attachments: ['contract.pdf'],
		bcc: false,
		tracker: true,
		event: false,
		threadCount: 2,
		mid: '5'
	},
	{
		sender: 'Ana Bissor',
		date: 'Yesterday',
		subject: 'Relocation',
		preview: 'I just wanted to let you know that our offices have moved. We are no longer located in Tower One. If you have any questions regarding the move, please do not hesitate to contact me.',
		attachments: [],
		bcc: false,
		tracker: false,
		event: false,
		threadCount: 2,
		mid: '6'
	},
	{
		sender: 'Mark Jimenez',
		date: 'Yesterday',
		subject: 'Deck',
		preview: 'As promised, I have attached the deck I mentioned in our last conversation. Would you be available to meet up this week to go over it? I would be happy to answer any questions you might have.',
		attachments: ['deck.pdf'],
		bcc: false,
		tracker: true,
		event: false,
		threadCount: 2,
		mid: '7'
	},
	{
		sender: 'Booking.com',
		date: 'Thursday',
		subject: 'Your trip to Paris',
		preview: 'You are all set for your trip to Paris! This email has all the details of your check-in. Contact support if you have any questions.',
		attachments: [],
		bcc: false,
		tracker: true,
		event: false,
		threadCount: 1,
		mid: '8'
	},
	{
		sender: 'Terrance Evans',
		date: 'Thursday',
		subject: 'Investor meeting',
		preview: 'Here is the Zoom meeting for next week. Let me know if this works for you. I can also invite Paul if needed.',
		attachments: [],
		bcc: false,
		tracker: true,
		event: true,
		threadCount: 2,
		mid: '9'
	},
	{
		sender: 'Airbnb',
		date: 'Wednesday',
		subject: 'Reservation confirmed for Paris',
		preview: 'Your reservation is confirmed. You’re going to Paris! We will send you the exact address in 48 hours and add it to your itinerary.',
		attachments: [],
		bcc: false,
		tracker: true,
		event: false,
		threadCount: 1,
		mid: '10'
	},
	{
		sender: 'Mike Lanson via Asana',
		date: 'Monday',
		subject: 'Assigned to You: Profit & Loss Statement',
		preview: 'The task: Profit & Loss Statement for 18mo runway has been assigned to you. Open Asana to view it.',
		attachments: [],
		bcc: false,
		tracker: true,
		event: false,
		threadCount: 1,
		mid: '11'
	},
	{
		sender: 'Revolut Business',
		date: 'Monday',
		subject: 'Your confirmation code from Revolut Business',
		preview: 'Enter the code below online or in the Revolut Business app: 887465',
		attachments: [],
		bcc: false,
		tracker: true,
		event: false,
		threadCount: 1,
		mid: '12'
	},
	{
		sender: 'Marie Calixte',
		date: 'Monday',
		subject: 'Follow-up',
		preview: 'Quick follow-up. What is the easiest way for you to find a time to chat?',
		attachments: [],
		bcc: false,
		tracker: true,
		event: false,
		threadCount: 4,
		mid: '13'
	},
	{
		sender: 'EasyJet',
		date: 'Monday',
		subject: 'It’s nearly time to fly to Paris',
		preview: 'It’s almost time to fly to Paris and we can’t wait to welcome you on board. To get your journey off to a great start, here’s everything you need to know.',
		attachments: ['update.pdf'],
		bcc: false,
		tracker: false,
		event: false,
		threadCount: 1,
		mid: '14'
	},
]

export const resolveEmail = (mid: string) => EMAILS.find(({ mid: id }) => id === mid)

export const INBOX = {
	name: 'Inbox',
	slug: 'INBOX',
	emails: [{ mid: '0', }, { mid: '9', }, { mid: '11', }, { mid: '12', }, { mid: '13', }, { mid: '14', }]
}
const BOARDS = [
	{ name: 'To-Do', slug: '[Aiko]/To-Do', emails: [{ mid: '1' }, { mid: '2', }, { mid: '3' }] },
	{ name: 'In Progress', slug: '[Aiko]/In Progress', emails: [{ mid: '4', }, { mid: '5', }] },
	{ name: 'Travel', slug: '[Aiko]/Travel', emails: [{ mid: '8', }, { mid: '10', },] },
	{ name: 'Done', slug: '[Aiko]/Done', emails: [{ mid: '6', }, { mid: '7', }] }
]

export const boards = BOARDS.map(({ slug }) => ({ slug, }))
export const resolveBoard = (slug: string) => BOARDS.find(({ slug: id }) => id === slug)