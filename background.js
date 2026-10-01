const CHECK_ALARM =
  "merchant-reminder-check";


function getDueAt(reminder) {

  if (reminder.dueAt) {
    return Number(reminder.dueAt);
  }


  return new Date(
    `${reminder.date}T${reminder.time || "09:00"}:00`
  ).getTime();
}


/* =========================================
   START
========================================= */

function startReminderChecker() {

  chrome.alarms.create(
    CHECK_ALARM,
    {
      periodInMinutes: 1
    }
  );


  checkDueReminders();
}


/* =========================================
   CHECK REMINDERS
========================================= */

async function checkDueReminders() {

  const result =
    await chrome.storage.local.get(
      "reminders"
    );


  const reminders =
    result.reminders || [];


  const now =
    Date.now();


  let changed = false;


  for (
    const reminder
    of reminders
  ) {

    if (
      reminder.completed
      ||
      reminder.notified
    ) {
      continue;
    }


    const dueAt =
      getDueAt(reminder);


    if (dueAt > now) {
      continue;
    }


    try {

      await chrome.notifications.create(
        `merchant-${reminder.id}`,
        {
          type: "basic",

          iconUrl: "icon128.png",

          title:
            `🔔 Follow-Up Due: ${reminder.name}`,

          message:
            `${reminder.phone}`
            +
            (
              reminder.note
                ? `\n${reminder.note}`
                : ""
            ),

          contextMessage:
            `${reminder.priority || "Warm"} priority merchant`,

          priority: 2,

          requireInteraction: true
        }
      );


      reminder.notified =
        true;


      changed = true;

    }

    catch (error) {

      console.error(
        "Notification error:",
        error
      );
    }
  }


  if (changed) {

    await chrome.storage.local.set({
      reminders
    });
  }
}


/* =========================================
   CHROME EVENTS
========================================= */

chrome.runtime.onInstalled.addListener(
  startReminderChecker
);


chrome.runtime.onStartup.addListener(
  startReminderChecker
);


chrome.alarms.onAlarm.addListener(
  alarm => {

    if (
      alarm.name ===
      CHECK_ALARM
    ) {

      checkDueReminders();
    }
  }
);


/* =========================================
   STORAGE CHANGES
========================================= */

chrome.storage.onChanged.addListener(
  (changes, area) => {

    if (
      area === "local"
      &&
      changes.reminders
    ) {

      checkDueReminders();
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


    try {

      if (
        chrome.action.openPopup
      ) {

        await chrome.action.openPopup();

        return;
      }

    }

    catch (error) {

      console.log(
        "Could not open popup:",
        error
      );
    }


    chrome.tabs.create({
      url:
        chrome.runtime.getURL(
          "popup.html"
        )
    });
  }
);
