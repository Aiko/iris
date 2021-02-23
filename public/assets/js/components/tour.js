const tour = new Shepherd.Tour({
  defaultStepOptions: {
    classes: 'shadow-md bg-purple-dark',
    scrollTo: true,
    useModalOverlay: true
  }
});

tour.addStep({
  id: 'step1',
  text: 'This is your inbox, all your emails are sorted as <b>Priority</b> and <b>Other</b>',
  attachTo: {
    element: '.inbox',
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
  id: 'step2',
  text: 'This step 2',
  attachTo: {
    element: '.example-css-selector',
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


tour.start();