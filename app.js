const STORAGE_KEY = "daylight-tasks";

const form = document.querySelector("#taskForm");
const input = document.querySelector("#taskInput");
const prioritySelect = document.querySelector("#taskPriority");
const taskList = document.querySelector("#taskList");
const emptyTasks = document.querySelector("#emptyTasks");
const filterButtons = document.querySelectorAll(".filter-button");

let filterMode = "all";
let tasks = loadTasks();

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved)
      ? saved
          .filter((task) => task && typeof task.text === "string")
          .map((task) => ({
            id: task.id || `${Date.now()}-${Math.random()}`,
            text: task.text,
            done: Boolean(task.done),
            priority: task.priority || "normal",
          }))
      : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function renderTasks() {
  taskList.replaceChildren();

  const visibleTasks = tasks.filter((task) => {
    if (filterMode === "open") return !task.done;
    if (filterMode === "done") return task.done;
    return true;
  });

  const completedCount = tasks.filter((task) => task.done).length;
  document.querySelector("#taskProgress").textContent =
    `${completedCount} of ${tasks.length}`;
  document.querySelector("#taskSummary").textContent =
    `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} · ${completedCount} done`;

  emptyTasks.hidden = visibleTasks.length > 0;
  emptyTasks.textContent = tasks.length === 0
    ? "Your list is clear. Add one small thing to begin."
    : "No tasks in this filter.";

  for (const task of visibleTasks) {
    const item = document.createElement("li");
    item.className = `task-item${task.done ? " done" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", `Complete: ${task.text}`);

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const priority = document.createElement("span");
    priority.className = `priority-badge priority-${task.priority}`;
    priority.textContent = task.priority;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete: ${task.text}`);

    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      saveTasks();
      renderTasks();
    });

    deleteButton.addEventListener("click", () => {
      tasks = tasks.filter((savedTask) => savedTask.id !== task.id);
      saveTasks();
      renderTasks();
    });

    item.append(checkbox, text, priority, deleteButton);
    taskList.append(item);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  tasks.push({
    id: `${Date.now()}-${Math.random()}`,
    text,
    done: false,
    priority: prioritySelect.value,
  });

  saveTasks();
  renderTasks();
  input.value = "";
  input.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterMode = button.dataset.filter;

    filterButtons.forEach((filterButton) => {
      filterButton.classList.toggle("active", filterButton === button);
    });

    renderTasks();
  });
});

document.querySelector("#clearCompleted").addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.done);
  saveTasks();
  renderTasks();
});

document.querySelector("#todayDate").textContent =
  new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

renderTasks();

const date = new Date();
const todayKey = [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0"),
].join("-");

// Habits: save today's checkmarks
const habitStorageKey = `daylight-habits-${todayKey}`;
const habitInputs = document.querySelectorAll("[data-habit]");
let savedHabits = {};

try {
  savedHabits = JSON.parse(localStorage.getItem(habitStorageKey) || "{}");
} catch {
  savedHabits = {};
}

function updateHabitProgress() {
  const completed = [...habitInputs].filter((habit) => habit.checked).length;
  document.querySelector("#habitProgress").textContent =
    `${completed} of ${habitInputs.length}`;
  document.querySelector("#habitBadge").textContent =
    `${completed} / ${habitInputs.length}`;
}

habitInputs.forEach((habit) => {
  habit.checked = Boolean(savedHabits[habit.dataset.habit]);
  habit.closest("li").classList.toggle("habit-done", habit.checked);

  habit.addEventListener("change", () => {
    savedHabits[habit.dataset.habit] = habit.checked;
    localStorage.setItem(habitStorageKey, JSON.stringify(savedHabits));
    habit.closest("li").classList.toggle("habit-done", habit.checked);
    updateHabitProgress();
  });
});

updateHabitProgress();

// Focus timer: count a completed 25-minute session
const timerDisplay = document.querySelector("#timerDisplay");
const startTimerButton = document.querySelector("#startTimer");
const resetTimerButton = document.querySelector("#resetTimer");
const focusStorageKey = `daylight-focus-${todayKey}`;
let focusMinutes = Number(localStorage.getItem(focusStorageKey)) || 0;
let secondsRemaining = 25 * 60;
let timerInterval = null;

function showTimer() {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  timerDisplay.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function showFocusMinutes() {
  document.querySelector("#focusTotal").textContent = `${focusMinutes} min`;
}

startTimerButton.addEventListener("click", () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    startTimerButton.textContent = "Resume focus";
    return;
  }

  startTimerButton.textContent = "Pause";
  timerInterval = setInterval(() => {
    secondsRemaining -= 1;
    showTimer();

    if (secondsRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      secondsRemaining = 0;
      focusMinutes += 25;
      localStorage.setItem(focusStorageKey, String(focusMinutes));
      showTimer();
      showFocusMinutes();
      startTimerButton.textContent = "Start focus";
    }
  }, 1000);
});

resetTimerButton.addEventListener("click", () => {
  clearInterval(timerInterval);
  timerInterval = null;
  secondsRemaining = 25 * 60;
  startTimerButton.textContent = "Start focus";
  showTimer();
});

showTimer();
showFocusMinutes();

// Daily note: save a separate note for each day
const noteStorageKey = `daylight-note-${todayKey}`;
const dailyNote = document.querySelector("#dailyNote");
const noteStatus = document.querySelector("#noteStatus");

dailyNote.value = localStorage.getItem(noteStorageKey) || "";

dailyNote.addEventListener("input", () => {
  localStorage.setItem(noteStorageKey, dailyNote.value);
  noteStatus.textContent = "Saved just now";
});