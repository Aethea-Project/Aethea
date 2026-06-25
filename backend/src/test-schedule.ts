import { isFutureCairoDay } from './utils/timezoneHelper.js';

function simulate() {
  const timezoneOffset = -180; // Cairo is UTC+3 -> offset is -180
  const weeksAhead = 1;
  const doctorNow = new Date(); // assume now is 2026-06-12T14:35:00.000Z
  if (timezoneOffset !== undefined) {
    doctorNow.setMinutes(doctorNow.getMinutes() - timezoneOffset); // this makes it local time (e.g. 17:35:00)
  }
  const doctorYear = doctorNow.getUTCFullYear();
  const doctorMonth = doctorNow.getUTCMonth();
  const doctorDay = doctorNow.getUTCDate();

  const startDate = new Date(Date.UTC(doctorYear, doctorMonth, doctorDay, 0, 0, 0, 0));
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + weeksAhead * 7);

  console.log('doctorNow:', doctorNow.toISOString());
  console.log('startDate:', startDate.toISOString());
  console.log('endDate:', endDate.toISOString());

  const currentDate = new Date(startDate);
  const now = new Date();
  while (currentDate <= endDate) {
    const scheduleDate = new Date(currentDate);
    
    // Construct UTC startAt and endAt based on template/exception local time and timezoneOffset
    const startAt = new Date(currentDate);
    // Assume template is 09:00 to 17:00
    const startLocalMins = 9 * 60 + 0;
    const startUtcMins = startLocalMins + (timezoneOffset ?? 0);
    startAt.setMinutes(startAt.getMinutes() + startUtcMins);

    const endAt = new Date(currentDate);
    const endLocalMins = 17 * 60 + 0;
    const endUtcMins = endLocalMins + (timezoneOffset ?? 0);
    endAt.setMinutes(endAt.getMinutes() + endUtcMins);

    const isFuture = isFutureCairoDay(startAt, now);
    console.log(`currentDate: ${currentDate.toISOString()} | startAt: ${startAt.toISOString()} | isFuture: ${isFuture}`);

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
}

simulate();
