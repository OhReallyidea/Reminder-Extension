/* =========================================
   ALERT WINDOW
========================================= */

const params =
  new URLSearchParams(
    window.location.search
  );


const reminderId =
  Number(
    params.get("id")
  );


const merchantName =
  document.getElementById(
    "merchantName"
  );


const phone =
  document.getElementById(
    "phone"
  );


const priority =
  document.getElementById(
    "priority"
  );


const deadline =
  document.getElementById(
    "deadline"
  );


const note =
  document.getElementById(
    "note"
  );


const alertSound =
  document.getElementById(
    "alertSound"
  );


const callBtn =
  document.getElementById(
    "callBtn"
  );


const whatsappBtn =
  document.getElementById(
    "whatsappBtn"
  );


const doneBtn =
  document.getElementById(
    "doneBtn"
  );


const snoozeBtn =
  document.getElementById(
    "snoozeBtn"
  );


const closeBtn =
  document.getElementById(
    "closeBtn"
  );


let reminder;


/* =========================================
   LOAD REMINDER
========================================= */

async function loadReminder() {

  const result =
    await chrome.storage.local.get(
      "reminders"
    );


  const reminders =
    result.reminders || [];


  reminder =
    reminders.find(
      r =>
        Number(r.id) ===
        reminderId
    );


  if (!reminder) {

    document.body.innerHTML = `
      <div style="
        font-family: Arial;
        padding: 40px;
        text-align: center;
      ">
        <h2>Reminder not found</h2>
        <p>This reminder may have been completed.</p>
      </div>
    `;

    return;
  }


  displayReminder();


  playAlertSound();
}


/* =========================================
   DISPLAY
========================================= */

function displayReminder() {

  merchantName.textContent =
    reminder.name;


  phone.textContent =
    reminder.phone ||
    "No phone number";


  const selectedPriority =
    reminder.priority ||
    "Warm";


  let icon = "🟠";


  if (
    selectedPriority === "Hot"
  ) {
    icon = "🔥";
  }


  if (
    selectedPriority === "Cold"
  ) {
    icon = "🔵";
  }


  priority.textContent =
    `${icon} ${selectedPriority.toUpperCase()}`;


  deadline.textContent =
    formatDate(
      reminder.dueAt
    );


  note.textContent =
    reminder.note ||
    "Follow-up is due now.";
}


/* =========================================
   SOUND
========================================= */

function playAlertSound() {

  /*
    Try to play immediately.
  */

  alertSound.currentTime = 0;


  alertSound.play()
    .catch(() => {

      /*
        Some Chrome/OS configurations
        may block autoplay.

        Clicking anywhere in the alert
        will allow the sound to start.
      */

      document.addEventListener(
        "click",
        () => {

          alertSound.currentTime = 0;

          alertSound.play()
            .catch(() => {});

        },
        {
          once: true
        }
      );

    });
}


/* =========================================
   CALL
========================================= */

callBtn.addEventListener(
  "click",
  () => {

    window.location.href =
      `tel:${reminder.phone}`;

  }
);


/* =========================================
   WHATSAPP
========================================= */

whatsappBtn.addEventListener(
  "click",
  () => {

    const phone =
      reminder.phone
        .replace(/\D/g, "");


    const message =
      encodeURIComponent(
        `Hi ${reminder.name}, `
        +
        `just following up with you.`
      );


    window.open(
      `https://wa.me/${phone}?text=${message}`,
      "_blank"
    );

  }
);


/* =========================================
   COMPLETE
========================================= */

doneBtn.addEventListener(
  "click",
  async () => {

    const result =
      await chrome.storage.local.get(
        "reminders"
      );


    const reminders =
      result.reminders || [];


    const updated =
      reminders.filter(
        r =>
          Number(r.id) !==
          reminderId
      );


    await chrome.storage.local.set({
      reminders: updated
    });


    window.close();
  }
);


/* =========================================
   SNOOZE
========================================= */

snoozeBtn.addEventListener(
  "click",
  async () => {

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
          reminderId
      );


    if (!target) {
      window.close();
      return;
    }


    const newDue =
      new Date(
        Date.now()
        +
        15 * 60 * 1000
      );


    target.dueAt =
      newDue.getTime();


    target.date =
      formatDateInput(
        newDue
      );


    target.time =
      `${String(
        newDue.getHours()
      ).padStart(2, "0")}:${String(
        newDue.getMinutes()
      ).padStart(2, "0")}`;


    target.notified =
      false;


    await chrome.storage.local.set({
      reminders
    });


    window.close();
  }
);


/* =========================================
   CLOSE
========================================= */

closeBtn.addEventListener(
  "click",
  () => {

    window.close();

  }
);


/* =========================================
   FORMAT
========================================= */

function formatDate(timestamp) {

  const date =
    new Date(timestamp);


  return date.toLocaleString(
    [],
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit"
    }
  );
}


function formatDateInput(date) {

  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");


  const day =
    String(
      date.getDate()
    ).padStart(2, "0");


  return `${year}-${month}-${day}`;
}


/* =========================================
   START
========================================= */

loadReminder();
