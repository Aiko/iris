const runTour = () => {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      classes: 'shadow-md bg-purple-dark',
      scrollTo: true
    }
  });

  tour.addStep({
    id: 'step1',
    text: 'This is your inbox, all your emails are sorted as <b>Priority</b> and <b>Other</b> based on importance.',
    attachTo: {
      element: '.inbox',
      on: 'right'
    },

    classes: 'example-step-extra-class',
    buttons: [
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });

  tour.addStep({
    id: 'step2',
    text: 'You can switch between <b>Priority</b> and <b>Other</b> here.',
    attachTo: {
      element: '.board-header',
      on: 'bottom'
    },
    classes: 'example-step-extra-class',
    buttons: [
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });


  tour.addStep({
    id: 'step3',
    text: 'Aiko Mail is organized in boards. You can add boards here, such as <b>New Clients</b> or <b>Receipts</b>',
    attachTo: {
      element: '.add-board',
      on: 'right'
    },
    classes: 'example-step-extra-class',
    buttons: [
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });

    tour.addStep({
    id: 'step4',
    text: 'This is an AI-summarized version of your email.',
    attachTo: {
      element: '.email',
      on: 'right'
    },
    classes: 'example-step-extra-class',
    buttons: [
      {
        text: 'Next',
        action: tour.next
      }
    ]
    });
  
      tour.addStep({
    id: 'step5',
    text: 'Quick actions are automatically detected and added to emails to save you time.',
    attachTo: {
      element: '.email-footer',
      on: 'bottom'
    },
    classes: 'example-step-extra-class',
    buttons: [
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });

    tour.addStep({
    id: 'step6',
      text: 'Click here to compose your first email using Aiko Mail!',
    attachTo: {
      element: '.sbtn',
      on: 'bottom'
    },
          classes: 'last-tour'
    });

  tour.start();
}