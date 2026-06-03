/* ================= NAVIGATION ================= */
function goToSignup() {
  window.location.href = "signup.html";
}

function goToLogin() {
  window.location.href = "index.html";
}

/* ================= STORAGE HELPERS ================= */
const STORAGE_KEYS = {
  users: "users",
  currentUser: "currentUser",
  isLoggedIn: "isLoggedIn",
  userEmail: "userEmail",
  savedEmails: "savedEmails",
  semesters: "semesters"
};

const API_BASE_URL = "http://localhost:3000";
let todos = [];
let currentDate = new Date();

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function getUsers() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.users), []);
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function getSavedEmails() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.savedEmails), []);
}

function saveRememberedEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  const emails = getSavedEmails().filter(entry => entry !== normalizedEmail);
  emails.unshift(normalizedEmail);
  localStorage.setItem(STORAGE_KEYS.savedEmails, JSON.stringify(emails.slice(0, 50)));
}

function populateSavedEmails() {
  const datalist = document.getElementById("savedEmails");
  if (!datalist) return;

  const savedEmails = getSavedEmails();
  datalist.innerHTML = "";

  savedEmails.forEach(email => {
    const option = document.createElement("option");
    option.value = email;
    datalist.appendChild(option);
  });
}

function todoStorageKey() {
  const currentUser = normalizeEmail(localStorage.getItem(STORAGE_KEYS.currentUser));
  return currentUser ? `todos_${currentUser}` : "todos";
}

function semesterStorageKey() {
  const currentUser = normalizeEmail(localStorage.getItem(STORAGE_KEYS.currentUser));
  return currentUser ? `${STORAGE_KEYS.semesters}_${currentUser}` : STORAGE_KEYS.semesters;
}

function createDefaultCourse(index) {
  return {
    id: `${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
    title: `Course ${index + 1}`,
    credits: "",
    points: ""
  };
}

function createSemesterBox(index = 0) {
  return {
    id: `semester_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: `Semester ${index + 1}`,
    courses: Array.from({ length: 5 }, (_, courseIndex) => createDefaultCourse(courseIndex))
  };
}

function getSemesters() {
  const semesters = safeParse(localStorage.getItem(semesterStorageKey()), []);
  if (Array.isArray(semesters) && semesters.length > 0) {
    return semesters;
  }

  const defaultSemester = createSemesterBox(0);
  localStorage.setItem(semesterStorageKey(), JSON.stringify([defaultSemester]));
  return [defaultSemester];
}

function saveSemesters(semesters) {
  localStorage.setItem(semesterStorageKey(), JSON.stringify(semesters));
}

function calculateSPIValue(courses) {
  let totalCredits = 0;
  let weightedPoints = 0;

  courses.forEach(course => {
    const credits = Number(course.credits);
    const points = Number(course.points);

    if (Number.isFinite(credits) && credits > 0 && Number.isFinite(points) && points >= 0 && points <= 10) {
      totalCredits += credits;
      weightedPoints += credits * points;
    }
  });

  return {
    spi: totalCredits > 0 ? weightedPoints / totalCredits : 0,
    totalCredits
  };
}

function openCPITracker() {
  window.location.href = "cpi.html";
}

function getSemesterIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("semester");
}

function openSPIPage(semesterId) {
  window.location.href = `spi.html?semester=${encodeURIComponent(semesterId)}`;
}

function addSemesterBox() {
  const semesters = getSemesters();
  semesters.push(createSemesterBox(semesters.length));
  saveSemesters(semesters);
  renderSemesterBoxes();
}

function renderSemesterBoxes() {
  const grid = document.getElementById("semesterGrid");
  if (!grid) return;

  const semesters = getSemesters();
  grid.innerHTML = "";

  semesters.forEach((semester, index) => {
    const stats = calculateSPIValue(semester.courses);
    const card = document.createElement("article");
    card.className = "semester-card";
    card.addEventListener("click", event => {
      if (event.target.closest(".semester-select")) return;
      openSPIPage(semester.id);
    });

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "semester-select";
    checkbox.dataset.semesterId = semester.id;

    const topRow = document.createElement("div");
    topRow.className = "semester-card-top";

    const titleBlock = document.createElement("div");
    titleBlock.innerHTML = `
      <span class="tracker-label">Semester Box</span>
      <h3>${semester.name || `Semester ${index + 1}`}</h3>
    `;

    const statsBlock = document.createElement("div");
    statsBlock.className = "semester-spi-chip";
    statsBlock.textContent = `SPI ${stats.spi.toFixed(2)}`;

    topRow.appendChild(titleBlock);
    topRow.appendChild(statsBlock);

    const meta = document.createElement("p");
    meta.className = "semester-meta";
    meta.textContent = `${semester.courses.length} courses saved • ${stats.totalCredits} credits counted`;

    const selector = document.createElement("label");
    selector.className = "semester-selector-row";
    selector.appendChild(checkbox);
    selector.append(" Select for CPI");

    card.appendChild(topRow);
    card.appendChild(meta);
    card.appendChild(selector);
    grid.appendChild(card);
  });

  const addCard = document.createElement("button");
  addCard.type = "button";
  addCard.className = "semester-add-card";
  addCard.innerHTML = "<span>+</span><strong>Add Semester Box</strong>";
  addCard.addEventListener("click", addSemesterBox);
  grid.appendChild(addCard);

  const selectAllToggle = document.getElementById("selectAllSemesters");
  if (selectAllToggle) {
    selectAllToggle.checked = false;
  }
}

function calculateCPI() {
  const semesters = getSemesters();
  const selectAll = document.getElementById("selectAllSemesters");
  const selectedIds = selectAll && selectAll.checked
    ? semesters.map(semester => semester.id)
    : Array.from(document.querySelectorAll(".semester-select:checked")).map(input => input.dataset.semesterId);

  const selectedSemesters = semesters.filter(semester => selectedIds.includes(semester.id));
  const cpiValue = document.getElementById("cpiValue");
  const cpiMeta = document.getElementById("cpiMeta");

  if (!cpiValue || !cpiMeta) return;

  if (selectedSemesters.length === 0) {
    cpiValue.textContent = "0.00";
    cpiMeta.textContent = "Select at least one semester box to calculate CPI.";
    return;
  }

  let totalCredits = 0;
  let weightedSpi = 0;

  selectedSemesters.forEach(semester => {
    const stats = calculateSPIValue(semester.courses);
    if (stats.totalCredits > 0) {
      totalCredits += stats.totalCredits;
      weightedSpi += stats.spi * stats.totalCredits;
    }
  });

  const cpi = totalCredits > 0 ? weightedSpi / totalCredits : 0;
  cpiValue.textContent = cpi.toFixed(2);
  cpiMeta.textContent = `${selectedSemesters.length} box${selectedSemesters.length > 1 ? "es" : ""} included • ${totalCredits} total credits`;
}

function toggleSelectAllSemesters() {
  const selectAll = document.getElementById("selectAllSemesters");
  if (!selectAll) return;

  document.querySelectorAll(".semester-select").forEach(input => {
    input.checked = selectAll.checked;
  });
}

function getActiveSemester() {
  const semesterId = getSemesterIdFromUrl();
  const semesters = getSemesters();
  return semesters.find(semester => semester.id === semesterId) || semesters[0];
}

function updateSemester(semesterId, updater) {
  const semesters = getSemesters().map(semester => {
    if (semester.id !== semesterId) return semester;
    return updater(semester);
  });

  saveSemesters(semesters);
  return semesters.find(semester => semester.id === semesterId);
}

function addSemesterCourse() {
  const semester = getActiveSemester();
  if (!semester) return;

  updateSemester(semester.id, current => ({
    ...current,
    courses: [...current.courses, createDefaultCourse(current.courses.length)]
  }));

  renderSPITable();
}

function deleteSemesterCourse(courseId) {
  const semester = getActiveSemester();
  if (!semester) return;

  updateSemester(semester.id, current => ({
    ...current,
    courses: current.courses.filter(course => course.id !== courseId)
  }));

  renderSPITable();
}

function updateSemesterCourse(courseId, field, value) {
  const semester = getActiveSemester();
  if (!semester) return;

  updateSemester(semester.id, current => ({
    ...current,
    courses: current.courses.map(course =>
      course.id === courseId ? { ...course, [field]: value } : course
    )
  }));

  updateSPISummary();
}

function updateSPISummary() {
  const semester = getActiveSemester();
  if (!semester) return;

  const stats = calculateSPIValue(semester.courses);
  const spiValue = document.getElementById("spiValue");
  const spiCredits = document.getElementById("spiCredits");

  if (spiValue) {
    spiValue.textContent = stats.spi.toFixed(2);
  }

  if (spiCredits) {
    spiCredits.textContent = String(stats.totalCredits);
  }
}

function renderSPITable() {
  const semester = getActiveSemester();
  const tableBody = document.getElementById("spiTableBody");
  const title = document.getElementById("spiPageTitle");

  if (!semester || !tableBody) return;

  if (title) {
    title.textContent = `${semester.name} SPI`;
  }

  tableBody.innerHTML = "";

  semester.courses.forEach(course => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><input type="text" class="table-input" value="${course.title}" data-course-id="${course.id}" data-field="title"></td>
      <td><input type="number" class="table-input" min="0" step="1" value="${course.credits}" data-course-id="${course.id}" data-field="credits"></td>
      <td><input type="number" class="table-input" min="0" max="10" step="1" value="${course.points}" data-course-id="${course.id}" data-field="points"></td>
      <td><button type="button" class="table-delete-btn" data-delete-course="${course.id}">Remove</button></td>
    `;

    tableBody.appendChild(row);
  });

  tableBody.querySelectorAll(".table-input").forEach(input => {
    input.addEventListener("input", event => {
      const { courseId, field } = event.target.dataset;
      let value = event.target.value;

      if (field === "points") {
        const numericValue = Number(value);
        if (value !== "" && (numericValue < 0 || numericValue > 10)) {
          return;
        }
      }

      updateSemesterCourse(courseId, field, value);
    });
  });

  tableBody.querySelectorAll("[data-delete-course]").forEach(button => {
    button.addEventListener("click", event => {
      deleteSemesterCourse(event.target.dataset.deleteCourse);
    });
  });

  updateSPISummary();
}

/* ================= OTP SYSTEM ================= */
async function sendOTP() {
  const emailInput = document.getElementById("email");

  if (!emailInput || emailInput.value.trim() === "") {
    alert("Enter email first");
    return;
  }

  const normalizedEmail = normalizeEmail(emailInput.value);

  try {
    const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: normalizedEmail })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Unable to send OTP.");
      return;
    }

    localStorage.setItem(STORAGE_KEYS.userEmail, normalizedEmail);
    alert(`OTP sent to ${normalizedEmail}`);
  } catch (error) {
    alert("Could not connect to the OTP server. Start the backend first.");
  }
}

function resendOTP() {
  sendOTP();
}

async function verifyOTP() {
  const otpInput = document.getElementById("otp");
  const email = normalizeEmail(localStorage.getItem(STORAGE_KEYS.userEmail));

  if (!otpInput || !email) {
    alert("Send OTP first.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        otp: otpInput.value.trim()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Wrong OTP");
      return;
    }

    alert("Verified successfully");
    window.location.href = "password.html";
  } catch (error) {
    alert("Could not connect to the OTP server. Start the backend first.");
  }
}

/* ================= PASSWORD SAVE ================= */
function savePassword() {
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password === "" || confirmPassword === "") {
    alert("Fill all fields");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  const email = normalizeEmail(localStorage.getItem(STORAGE_KEYS.userEmail));
  const users = getUsers();
  const userExists = users.find(user => user.email === email);

  if (userExists) {
    alert("User already exists.");
    return;
  }

  users.push({ email, password });
  saveUsers(users);

  localStorage.setItem(STORAGE_KEYS.isLoggedIn, "true");
  localStorage.setItem(STORAGE_KEYS.currentUser, email);
  saveRememberedEmail(email);

  window.location.href = "dashboard.html";
}

/* ================= LOGIN ================= */
function loginUser() {
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const email = normalizeEmail(emailInput ? emailInput.value : "");
  const password = passwordInput ? passwordInput.value.trim() : "";

  if (email === "" || password === "") {
    alert("Fill all fields");
    return;
  }

  const users = getUsers();
  const user = users.find(entry => entry.email === email);

  if (!user) {
    alert("No account found");
    return;
  }

  if (user.password !== password) {
    alert("Incorrect password");
    return;
  }

  localStorage.setItem(STORAGE_KEYS.isLoggedIn, "true");
  localStorage.setItem(STORAGE_KEYS.currentUser, email);
  saveRememberedEmail(email);

  window.location.href = "dashboard.html";
}

/* ================= AUTH ================= */
function checkAuth() {
  const isLoggedIn = localStorage.getItem(STORAGE_KEYS.isLoggedIn);

  if (isLoggedIn !== "true") {
    window.location.href = "index.html";
  }
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.isLoggedIn);
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  window.location.href = "index.html";
}

/* ================= TODO SYSTEM ================= */
function cleanOldTodos() {
  const now = Date.now();

  todos = todos.filter(todo => {
    if (!todo.completed) return true;
    return now - todo.time < 86400000;
  });
}

function saveOnly() {
  cleanOldTodos();
  localStorage.setItem(todoStorageKey(), JSON.stringify(todos));
}

function saveAndRender() {
  cleanOldTodos();
  localStorage.setItem(todoStorageKey(), JSON.stringify(todos));
  renderTodos();
}

function addTodo() {
  const input = document.getElementById("todoInput");
  if (!input) return;

  const text = input.value.trim();
  if (text === "") return;

  todos.unshift({
    id: Date.now(),
    text,
    completed: false,
    time: null
  });

  input.value = "";
  input.focus();
  saveAndRender();
}

function toggleTodo(id) {
  todos = todos.map(todo => {
    if (todo.id === id) {
      const newStatus = !todo.completed;
      return {
        ...todo,
        completed: newStatus,
        time: newStatus ? Date.now() : null
      };
    }

    return todo;
  });

  saveOnly();
}

function deleteTodo(id) {
  todos = todos.filter(todo => todo.id !== id);
  saveAndRender();
}

function editTodo(id) {
  const newText = prompt("Edit your task:");
  if (!newText || !newText.trim()) return;

  todos = todos.map(todo =>
    todo.id === id ? { ...todo, text: newText.trim() } : todo
  );

  saveAndRender();
}

function renderTodos() {
  const list = document.getElementById("todoList");
  if (!list) return;

  list.innerHTML = "";

  todos.forEach(todo => {
    const li = document.createElement("li");
    li.className = `todo-item${todo.completed ? " completed" : ""}`;

    const label = document.createElement("label");
    label.className = "custom-checkbox";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.addEventListener("change", () => {
      toggleTodo(todo.id);
      li.classList.toggle("completed");
    });

    const checkmark = document.createElement("span");
    checkmark.className = "checkmark";
    label.appendChild(checkbox);
    label.appendChild(checkmark);

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;
    text.addEventListener("dblclick", () => editTodo(todo.id));

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "x";
    del.addEventListener("click", () => deleteTodo(todo.id));

    li.appendChild(label);
    li.appendChild(text);
    li.appendChild(del);
    list.appendChild(li);
  });
}

/* ================= CALENDAR ================= */
function renderCalendar() {
  const monthYear = document.getElementById("monthYear");
  const datesContainer = document.getElementById("calendarDates");

  if (!monthYear || !datesContainer) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  monthYear.innerText = `${monthNames[month]} ${year}`;
  datesContainer.innerHTML = "";

  const start = firstDay === 0 ? 6 : firstDay - 1;
  const today = new Date();

  for (let i = 0; i < start; i += 1) {
    datesContainer.innerHTML += "<div></div>";
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const isToday =
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();

    datesContainer.innerHTML += `
      <div class="date ${isToday ? "today" : ""}">
        ${day}
      </div>
    `;
  }
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

/* ================= INITIAL LOAD ================= */
document.addEventListener("DOMContentLoaded", () => {
  populateSavedEmails();

  if (window.location.pathname.includes("dashboard.html")) {
    checkAuth();
  }

  todos = safeParse(localStorage.getItem(todoStorageKey()), []);

  const input = document.getElementById("todoInput");
  if (input) {
    input.addEventListener("keypress", event => {
      if (event.key === "Enter") addTodo();
    });
    input.focus();
  }

  renderTodos();
  renderCalendar();

  if (window.location.pathname.includes("cpi.html")) {
    renderSemesterBoxes();

    const selectAll = document.getElementById("selectAllSemesters");
    if (selectAll) {
      selectAll.addEventListener("change", toggleSelectAllSemesters);
    }
  }

  if (window.location.pathname.includes("spi.html")) {
    renderSPITable();
  }
});
