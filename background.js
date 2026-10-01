/* =========================================
   SALES FOLLOW-UP REMINDER
   BACKGROUND SERVICE WORKER
========================================= */


/* =========================================
   GET REMINDER TIME
========================================= */

function getDueAt(reminder) {

  if (reminder.dueAt) {
    return Number(reminder.dueAt);
  }

  return new Date(
    `${reminder.date}T${reminder.time || "09:00"}:00`
  ).getTime();
}


/* =========================================
   ALARM NAME
========================================= */

function getAlarmName(id) {
  return `merchant-reminder-${id}`;
}


/* =========================================
   SCHEDULE ONE REMINDER
========================================= */

async function scheduleReminder(reminder) {

  if (
    !reminder ||
    reminder.completed
  ) {
    return;
  }

  const dueAt =
    getDueAt(reminder);

  if (!Number.isFinite(dueAt)) {
    return;
  }


  /*
    Don't schedule reminders
    that are already overdue.
  */

  if (dueAt <= Date.now()) {
    return;
  }


  await chrome.alarms.create(
    getAlarmName(reminder.id),
    {
      when: dueAt
    }
  );
}


/* =========================================
   SCHEDULE ALL REMINDERS
========================================= */

async function scheduleAllReminders() {

  const result =
    await chrome.storage.local.get(
      "reminders"
    );

  const reminders =
    result.reminders || [];


  for (
    const reminder
    of reminders
  ) {

    await scheduleReminder(
      reminder
    );
  }
}


/* =========================================
   SHOW NOTIFICATION
========================================= */

async function showNotification(
  reminder
) {

  const priority =
    reminder.priority || "Warm";


  let priorityIcon = "🟠";


  if (priority === "Hot") {
    priorityIcon = "🔥";
  }

  if (priority === "Cold") {
    priorityIcon = "🔵";
  }


  const title =
    `🔔 Follow-Up Due: ${reminder.name}`;


  const message =
    `${priorityIcon} ${priority} priority\n`
    +
    `📱 ${reminder.phone || "No phone number"}`
    +
    (
      reminder.note
        ? `\n📝 ${reminder.note}`
        : ""
    );


  try {

    await chrome.notifications.create(
      `merchant-${reminder.id}`,
      {
        type: "basic",

        iconUrl: "icon128.png",

        title,

        message,

        contextMessage:
          "Sales Follow-Up Reminder",

        priority: 2,

        requireInteraction: true
      }
    );

  }

  catch (error) {

    console.error(
      "Notification failed:",
      error
    );
  }
}


/* =========================================
   OPEN ALERT WINDOW
========================================= */

async function openAlertWindow(
  reminder
) {

  const url =
    chrome.runtime.getURL(
      `alert.html?id=${encodeURIComponent(
        reminder.id
      )}`
    );


  try {

    await chrome.windows.create({

      url,

      type: "popup",

      width: 430,

      height: 570,

      focused: true

    });

  }

  catch (error) {

    console.error(
      "Could not open alert window:",
      error
    );

  }
}


/* =========================================
   REMINDER TRIGGER
========================================= */

async function triggerReminder(
  reminder
) {

  if (
    !reminder ||
    reminder.completed ||
    reminder.notified
  ) {
    return;
  }


  /*
    Mark as notified BEFORE opening
    the alert to prevent duplicates.
  */

  const result =
    await chrome.storage.local.get(
      "reminders"
    );


  const reminders =
    result.reminders || [];


  const target =
    reminders.find(
      r =>
        Number(r.id) ===
        Number(reminder.id)
    );


  if (!target) {
    return;
  }


  target.notified = true;


  await chrome.storage.local.set({
    reminders
  });


  /* Chrome notification */

  await showNotification(
    target
  );


  /* Sound + visual alert */

  await openAlertWindow(
    target
  );
}


/* =========================================
   ALARM EVENT
========================================= */

chrome.alarms.onAlarm.addListener(
  async (alarm) => {

    if (
      !alarm.name.startsWith(
        "merchant-reminder-"
      )
    ) {
      return;
    }


    const id =
      alarm.name.replace(
        "merchant-reminder-",
        ""
      );


    const result =
      await chrome.storage.local.get(
        "reminders"
      );


    const reminders =
      result.reminders || [];


    const reminder =
      reminders.find(
        r =>
          String(r.id) ===
          String(id)
      );


    if (!reminder) {
      return;
    }


    await triggerReminder(
      reminder
    );
  }
);


/* =========================================
   INSTALL
========================================= */

chrome.runtime.onInstalled.addListener(
  async () => {

    await scheduleAllReminders();

  }
);


/* =========================================
   CHROME STARTUP
========================================= */

chrome.runtime.onStartup.addListener(
  async () => {

    await scheduleAllReminders();

  }
);


/* =========================================
   STORAGE CHANGES
========================================= */

chrome.storage.onChanged.addListener(
  async (changes, area) => {

    if (
      area !== "local"
      ||
      !changes.reminders
    ) {
      return;
    }


    const oldReminders =
      changes.reminders.oldValue || [];


    const newReminders =
      changes.reminders.newValue || [];


    /*
      Cancel alarms belonging to
      deleted/completed reminders.
    */

    for (
      const oldReminder
      of oldReminders
    ) {

      const stillExists =
        newReminders.some(
          reminder =>
            Number(reminder.id) ===
            Number(oldReminder.id)
        );


      if (
        !stillExists
        ||
        newReminders.find(
          r =>
            Number(r.id) ===
            Number(oldReminder.id)
        )?.completed
      ) {

        await chrome.alarms.clear(
          getAlarmName(
            oldReminder.id
          )
        );
      }
    }


    /*
      Schedule new reminders.
    */

    for (
      const reminder
      of newReminders
    ) {

      if (
        reminder.completed
      ) {
        continue;
      }


      /*
        Re-create the alarm so
        snoozed reminders are updated.
      */

      await chrome.alarms.clear(
        getAlarmName(
          reminder.id
        )
      );


      await scheduleReminder(
        reminder
      );
    }
  }
);


/* =========================================
   NOTIFICATION CLICK
========================================= */

chrome.notifications.onClicked.addListener(
  async notificationId => {

    if (
      !notificationId.startsWith(
        "merchant-"
      )
    ) {
      return;
    }


    const id =
      notificationId.replace(
        "merchant-",
        ""
      );


    const url =
      chrome.runtime.getURL(
        `alert.html?id=${encodeURIComponent(
          id
        )}`
      );


    try {

      await chrome.windows.create({

        url,

        type: "popup",

        width: 430,

        height: 570,

        focused: true

      });

    }

    catch (error) {

      console.error(
        "Unable to open reminder:",
        error
      );
    }
  }
);
