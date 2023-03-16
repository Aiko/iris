<script>
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

export default {
  components: {
    FullCalendar // make the <FullCalendar> tag available
  },
  data() {
    return {
      calendarOptions: {
        plugins: [dayGridPlugin, interactionPlugin],
        initialView: 'dayGridMonth'
      }
    }
  }
}
</script>
<template>
  <FullCalendar :options="calendarOptions" />
</template>

<style>
.fc-button-primary {
  background-color: var(--secondary-background-color) !important;
  border: 1px solid var(--secondary-background-color) !important;
  color: var(--primary-color) !important;
  padding: 2px 5px !important;
  border-radius: var(--primary-border-radius) !important;
  font-size: var(--btn-font-size) !important;
  font-weight: var(--btn-font-weight) !important;
  white-space: nowrap !important;
  transition: .2s !important;
  display: inline-block !important;
  text-align: center !important;
  height: 30px;
  text-transform: capitalize !important;
  outline: none !important;
}

.fc-button-primary:hover {
  background-color: transparent !important;
  border: 1px solid var(--primary-color) !important;
  transition: .2s !important;
  outline: none !important;
}

.fc .fc-toolbar.fc-header-toolbar {
  padding: 10px 20px 0 20px;
}

.fc .fc-daygrid-day-number,
.fc .fc-col-header-cell-cushion {
  color: var(--primary-font-color) !important;
}

.fc thead,
.fc tr {
  border: none !important;
}

:root {
  --fc-small-font-size: .85em !important;
  --fc-page-bg-color: var(--primary-background-color) !important;
  --fc-neutral-bg-color: hsla(0, 0%, 82%, .3);
  --fc-neutral-text-color: grey;
  --fc-border-color: var(--primary-background-color) !important;
  --fc-button-text-color: #fff;
  --fc-button-bg-color: #2c3e50;
  --fc-button-border-color: #2c3e50;
  --fc-button-hover-bg-color: #1e2b37;
  --fc-button-hover-border-color: #1a252f;
  --fc-button-active-bg-color: #1a252f;
  --fc-button-active-border-color: #151e27;
  --fc-event-bg-color: #3788d8;
  --fc-event-border-color: #3788d8;
  --fc-event-text-color: #fff;
  --fc-event-selected-overlay-color: rgba(0, 0, 0, .25);
  --fc-more-link-bg-color: #d0d0d0;
  --fc-more-link-text-color: inherit;
  --fc-event-resizer-thickness: 8px;
  --fc-event-resizer-dot-total-width: 8px;
  --fc-event-resizer-dot-border-width: 1px;
  --fc-non-business-color: hsla(0, 0%, 84%, .3);
  --fc-bg-event-color: var(--primary-color) !important;
  --fc-bg-event-opacity: 0.3;
  --fc-highlight-color: rgba(188, 232, 241, .3);
  --fc-today-bg-color: var(--primary-color) !important;
  --fc-now-indicator-color: red;
}
</style>