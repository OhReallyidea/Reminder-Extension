document.addEventListener("DOMContentLoaded", init);


/* =========================================
   DOM
========================================= */

const $ = (id) => document.getElementById(id);

const customerName = $("customerName");
const customerPhone = $("customerPhone");
const followUpDate = $("followUpDate");
const followUpTime = $("followUpTime");
const followUpNote = $("followUpNote");

const saveBtn = $("saveBtn");

const reminderList = $("reminderList");

const clearBtn = $("clearBtn");

const searchInput = $("searchInput");
const clearSearch = $("clearSearch");
const priorityFilter = $("priorityFilter");

const reminderCount = $("reminderCount");
const totalReminders = $("totalReminders");

const todayCount = $("todayCount");
const hotCount = $("hotCount");
const overdueCount = $("overdueCount");

const emptyState = $("emptyState");

const reminderAlert = $("reminderAlert");
const alertCustomerName = $("alertCustomerName");
const alertReminderText = $("alertReminderText");
const closeAlertBtn = $("closeAlertBtn");


let allReminders = [];


/* =========================================
   INITIALIZE
========================================= */

function init() {

  const today = new Date();

  followUpDate.value =
    formatDateInput(today);

  followUpTime.value = "09:00";


  // Today's date
  const formattedToday =
    today.toLocaleDateString([], {
      weekday: "short",
      day: "numeric",
      month: "short"
    });

  $("todayDate").textContent =
    `Today's Follow-Ups · ${formattedToday}`;


  saveBtn.addEventListener(
    "click",
    addReminder
  );


  clearBtn.addEventListener(
    "click",
    clearAll
  );


  searchInput.addEventListener(
    "input",
    render
  );


  priorityFilter.addEventListener(
    "change",
    render
  );


  clearSearch.addEventListener(
    "click",
    () => {
      searchInput.value = "";
      render();
      searchInput.focus();
    }
  );


  closeAlertBtn.addEventListener(
    "click",
    () => {
      reminderAlert.classList.add("hidden");
    }
  );


  reminderList.addEventListener(
    "click",
    handleReminderAction
  );


  loadReminders();


  // Refresh statuses while popup is open
  setInterval(() => {
    render();
  }, 30000);
}


/* =========================================
   DATE HELPERS
========================================= */

function formatDateInput(date) {

  const year = date.getFullYear();

  const month =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(date.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getDueAt(reminder) {

  if (reminder.dueAt) {
    return Number(reminder.dueAt);
  }


  return new Date(
    `${reminder.date}T${reminder.time || "09:00"}:00`
  ).getTime();
}


/* =========================================
   LOAD
========================================= */

function loadReminders() {

  chrome.storage.local.get(
    ["reminders"],
    (result) => {

      allReminders =
        result.reminders || [];

      render();

      showDueAlert();
    }
  );
}


/* =========================================
   ADD REMINDER
========================================= */

function addReminder() {

  const name =
    customerName.value.trim();

  const phone =
    customerPhone.value.trim();

  const date =
    followUpDate.value;

  const time =
    followUpTime.value;

  const note =
    followUpNote.value.trim();


  const priority =
    document.querySelector(
      'input[name="priority"]:checked'
    )?.value || "Warm";


  if (!name || !phone || !date || !time) {

    alert(
      "Please fill in the merchant name, phone, date and time."
    );

    return;
  }


  const dueAt =
    new Date(
      `${date}T${time}:00`
    ).getTime();


  if (!Number.isFinite(dueAt)) {

    alert(
      "Please enter a valid date and time."
    );

    return;
  }


  if (dueAt <= Date.now()) {

    alert(
      "Please choose a future reminder time."
    );

    return;
  }


  const reminder = {

    id: Date.now(),

    name,

    phone,

    date,

    time,

    note,

    priority,

    dueAt,

    completed: false,

    notified: false,

    createdAt:
      new Date().toISOString()

  };


  allReminders.push(reminder);


  saveReminders(() => {

    customerName.value = "";
    customerPhone.value = "";
    followUpNote.value = "";

    followUpDate.value =
      formatDateInput(new Date());

    followUpTime.value =
      "09:00";

    // Reset priority
    document.querySelector(
      'input[name="priority"][value="Hot"]'
    ).checked = true;

    render();

  });
}


/* =========================================
   SAVE
========================================= */

function saveReminders(callback) {

  chrome.storage.local.set(
    {
      reminders: allReminders
    },
    () => {

      if (
        chrome.runtime.lastError
      ) {

        console.error(
          chrome.runtime.lastError
        );

        alert(
          "Unable to save reminder."
        );

        return;
      }

      callback();
    }
  );
}


/* =========================================
   RENDER
========================================= */

function render() {

  let reminders =
    allReminders.filter(
      reminder =>
        !reminder.completed
    );


  /* Search */

  const search =
    searchInput.value
      .trim()
      .toLowerCase();


  if (search) {

    reminders =
      reminders.filter(
        reminder =>

          reminder.name
            .toLowerCase()
            .includes(search)

          ||

          reminder.phone
            .toLowerCase()
            .includes(search)

          ||

          (reminder.note || "")
            .toLowerCase()
            .includes(search)
      );
  }


  /* Priority */

  const priority =
    priorityFilter.value;


  if (priority !== "all") {

    reminders =
      reminders.filter(
        reminder =>
          reminder.priority === priority
      );
  }


  /* Sort */

  reminders.sort(
    (a, b) =>
      getDueAt(a) -
      getDueAt(b)
  );


  /* Dashboard */

  updateDashboard();


  /* Count */

  totalReminders.textContent =
    reminders.length;


  /* Empty state */

  if (!reminders.length) {

    reminderList.innerHTML = "";

    emptyState.style.display =
      "flex";

    return;

  }


  emptyState.style.display =
    "none";


  reminderList.innerHTML =
    reminders.map(
      createReminderCard
    ).join("");
}


/* =========================================
   DASHBOARD
========================================= */

function updateDashboard() {

  const active =
    allReminders.filter(
      r => !r.completed
    );


  const now =
    new Date();


  const today =
    formatDateInput(now);


  const todayReminders =
    active.filter(
      reminder =>
        reminder.date === today
    );


  const hot =
    active.filter(
      reminder =>
        reminder.priority === "Hot"
    );


  const overdue =
    active.filter(
      reminder =>
        getDueAt(reminder) < Date.now()
    );


  todayCount.textContent =
    todayReminders.length;


  hotCount.textContent =
    hot.length;


  overdueCount.textContent =
    overdue.length;


  reminderCount.textContent =
    overdue.length;
}


/* =========================================
   CARD
========================================= */

function createReminderCard(reminder) {

  const dueAt =
    getDueAt(reminder);


  const now =
    Date.now();


  let statusText =
    "Upcoming";

  let statusClass =
    "upcoming";

  let cardClass =
    "";


  if (dueAt < now) {

    statusText =
      "Overdue";

    statusClass =
      "overdue";

    cardClass =
      "overdue";

  }

  else if (
    reminder.date ===
    formatDateInput(new Date())
  ) {

    if (dueAt <= now + 15 * 60000) {

      statusText =
        "Due Soon";

      statusClass =
        "due";

      cardClass =
        "due";

    } else {

      statusText =
        "Today";

      statusClass =
        "today";
    }
  }


  const priority =
    reminder.priority || "Warm";


  const priorityClass =
    priority.toLowerCase();


  return `

    <article
      class="reminder-item
             priority-${priorityClass}
             ${cardClass}"
      data-id="${reminder.id}"
    >

      <div class="reminder-icon">
        🏪
      </div>


      <div class="info">

        <div class="merchant-top">

          <span class="name">
            ${escapeHtml(reminder.name)}
          </span>

          <span
            class="priority-badge ${priorityClass}">
            ${priority}
          </span>

        </div>


        <span class="phone">
          📱 ${escapeHtml(reminder.phone)}
        </span>


        <div>

          <span class="date">
            📅 ${escapeHtml(
              formatDate(dueAt)
            )}
          </span>

          <span
            class="reminder-status ${statusClass}">
            ${statusText}
          </span>

        </div>


        ${
          reminder.note
            ? `
              <span class="note">
                📝 ${escapeHtml(
                  reminder.note
                )}
              </span>
            `
            : ""
        }


        <div class="reminder-actions">

          <button
            class="action-btn call-btn"
            data-action="call"
            data-id="${reminder.id}">
            📞 Call
          </button>


          <button
            class="action-btn whatsapp-btn"
            data-action="whatsapp"
            data-id="${reminder.id}">
            💬 WhatsApp
          </button>


          <button
            class="action-btn complete-btn"
            data-action="complete"
            data-id="${reminder.id}">
            ✓ Done
          </button>


          <button
            class="action-btn snooze-btn"
            data-action="snooze"
            data-id="${reminder.id}">
            💤 15m
          </button>


          <button
            class="delete-btn"
            data-action="delete"
            data-id="${reminder.id}">
            ×
          </button>

        </div>

      </div>

    </article>

  `;
}


/* =========================================
   ACTIONS
========================================= */

function handleReminderAction(event) {

  const button =
    event.target.closest(
      "[data-action]"
    );


  if (!button) return;


  const id =
    Number(button.dataset.id);


  const action =
    button.dataset.action;


  const reminder =
    allReminders.find(
      r => Number(r.id) === id
    );


  if (!reminder) return;


  /* CALL */

  if (action === "call") {

    window.location.href =
      `tel:${reminder.phone}`;

    return;
  }


  /* WHATSAPP */

  if (action === "whatsapp") {

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

    return;
  }


  /* COMPLETE */

  if (action === "complete") {

    reminder.completed =
      true;

    saveReminders(
      render
    );

    return;
  }


  /* SNOOZE */

  if (action === "snooze") {

    const newDue =
      new Date(
        Date.now()
        +
        15 * 60 * 1000
      );


    reminder.dueAt =
      newDue.getTime();


    reminder.date =
      formatDateInput(newDue);


    reminder.time =
      `${String(
        newDue.getHours()
      ).padStart(2, "0")}:${String(
        newDue.getMinutes()
      ).padStart(2, "0")}`;


    reminder.notified =
      false;


    saveReminders(
      render
    );

    return;
  }


  /* DELETE */

  if (action === "delete") {

    if (
      !confirm(
        `Delete ${reminder.name}'s reminder?`
      )
    ) {
      return;
    }


    allReminders =
      allReminders.filter(
        r =>
          Number(r.id) !== id
      );


    saveReminders(
      render
    );
  }
}


/* =========================================
   DUE ALERT
========================================= */

function showDueAlert() {

  const due =
    allReminders
      .filter(
        r =>
          !r.completed
          &&
          getDueAt(r) <= Date.now()
      )
      .sort(
        (a, b) =>
          getDueAt(a) -
          getDueAt(b)
      );


  if (!due.length) {

    reminderAlert.classList.add(
      "hidden"
    );

    return;
  }


  const reminder =
    due[0];


  alertCustomerName.textContent =
    reminder.name;


  alertReminderText.textContent =
    `${reminder.phone} · `
    +
    (
      reminder.note
      ||
      "Follow-up is due now."
    );


  reminderAlert.classList.remove(
    "hidden"
  );
}


/* =========================================
   CLEAR ALL
========================================= */

function clearAll() {

  if (
    !confirm(
      "Delete all follow-ups?"
    )
  ) {
    return;
  }


  allReminders = [];


  saveReminders(
    render
  );
}


/* =========================================
   FORMAT DATE
========================================= */

function formatDate(timestamp) {

  const date =
    new Date(timestamp);


  const today =
    formatDateInput(
      new Date()
    );


  const tomorrow =
    new Date();


  tomorrow.setDate(
    tomorrow.getDate() + 1
  );


  const datePart =
    formatDateInput(date);


  const time =
    date.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit"
      }
    );


  if (datePart === today) {

    return `Today, ${time}`;
  }


  if (
    datePart ===
    formatDateInput(tomorrow)
  ) {

    return `Tomorrow, ${time}`;
  }


  return date.toLocaleString(
    [],
    {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit"
    }
  );
}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(value = "") {

  const div =
    document.createElement(
      "div"
    );


  div.textContent =
    value;


  return div.innerHTML;
}
