/* ================= NAVIGATION ================= */
function goToSignup() {
  localStorage.setItem(STORAGE_KEYS.authMode, AUTH_MODES.signup);
  localStorage.removeItem(STORAGE_KEYS.authNotice);
  localStorage.removeItem(STORAGE_KEYS.userEmail);
  window.location.href = "signup.html";
}

function goToLogin() {
  localStorage.removeItem(STORAGE_KEYS.authNotice);
  window.location.href = "index.html";
}

/* ================= STORAGE HELPERS ================= */
const STORAGE_KEYS = {
  users: "users",
  currentUser: "currentUser",
  isLoggedIn: "isLoggedIn",
  userEmail: "userEmail",
  authMode: "authMode",
  authNotice: "authNotice",
  savedEmails: "savedEmails",
  semesters: "semesters",
  courses: "courses",
  deadlines: "deadlines"
};

const API_BASE_URL = window.location.origin.startsWith("http")
  ? window.location.origin
  : "http://localhost:3000";
const AUTH_MODES = {
  signup: "signup",
  reset: "reset"
};
const DEMO_ACCOUNT = {
  email: "demo@gradesync.com",
  password: "demo123"
};
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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setMessage(id, message, type = "error") {
  const element = document.getElementById(id);
  if (!element) return;

  element.textContent = message || "";
  element.className = `form-message${message ? ` ${type}` : ""}`;
}

function setButtonBusy(button, isBusy, busyLabel) {
  if (!button) return;

  if (isBusy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyLabel;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

function getUsers() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.users), []);
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function seedDemoAccount() {
  const users = getUsers();
  const demoIndex = users.findIndex(user => user.email === DEMO_ACCOUNT.email);

  if (demoIndex === -1) {
    users.push({ ...DEMO_ACCOUNT });
  } else {
    users[demoIndex].password = DEMO_ACCOUNT.password;
  }

  saveUsers(users);
  saveRememberedEmail(DEMO_ACCOUNT.email);
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

function courseStorageKey() {
  const currentUser = normalizeEmail(localStorage.getItem(STORAGE_KEYS.currentUser));
  return currentUser ? `${STORAGE_KEYS.courses}_${currentUser}` : STORAGE_KEYS.courses;
}

function deadlineStorageKey() {
  const currentUser = normalizeEmail(localStorage.getItem(STORAGE_KEYS.currentUser));
  return currentUser ? `${STORAGE_KEYS.deadlines}_${currentUser}` : STORAGE_KEYS.deadlines;
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

/* ================= COURSE TRACKER ================= */
function getCourses() {
  const courses = safeParse(localStorage.getItem(courseStorageKey()), []);
  return Array.isArray(courses) ? courses : [];
}

function saveCourses(courses) {
  localStorage.setItem(courseStorageKey(), JSON.stringify(courses));
}

function createCourse(name) {
  return {
    id: `course_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name,
    components: []
  };
}

function createComponent() {
  return {
    id: `component_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: "Assignment",
    weight: "",
    totalMarks: "",
    scoredMarks: ""
  };
}

function calculateCourseStats(course) {
  let totalWeight = 0;
  let weightedScore = 0;

  course.components.forEach(component => {
    const weight = Number(component.weight);
    const totalMarks = Number(component.totalMarks);
    const scoredMarks = Number(component.scoredMarks);

    if (Number.isFinite(weight) && weight > 0) {
      totalWeight += weight;
    }

    if (
      Number.isFinite(weight) && weight > 0 &&
      Number.isFinite(totalMarks) && totalMarks > 0 &&
      Number.isFinite(scoredMarks) && scoredMarks >= 0
    ) {
      const cappedScore = Math.min(scoredMarks, totalMarks);
      weightedScore += (cappedScore / totalMarks) * weight;
    }
  });

  return {
    totalWeight,
    weightedScore,
    isComplete: Math.abs(totalWeight - 100) < 0.01
  };
}

function addCourse() {
  const input = document.getElementById("courseNameInput");
  if (!input) return;

  const name = input.value.trim();
  if (!name) {
    input.focus();
    return;
  }

  const courses = getCourses();
  courses.unshift(createCourse(name));
  saveCourses(courses);
  input.value = "";
  renderCourseTracker();
}

function deleteCourse(courseId) {
  saveCourses(getCourses().filter(course => course.id !== courseId));
  renderCourseTracker();
}

function addCourseComponent(courseId) {
  const courses = getCourses().map(course => {
    if (course.id !== courseId) return course;
    return {
      ...course,
      components: [...course.components, createComponent()]
    };
  });

  saveCourses(courses);
  renderCourseTracker();
}

function updateCourseComponent(courseId, componentId, field, value) {
  const courses = getCourses().map(course => {
    if (course.id !== courseId) return course;

    return {
      ...course,
      components: course.components.map(component =>
        component.id === componentId ? { ...component, [field]: value } : component
      )
    };
  });

  saveCourses(courses);
  renderCourseTracker();
}

function deleteCourseComponent(courseId, componentId) {
  const courses = getCourses().map(course => {
    if (course.id !== courseId) return course;

    return {
      ...course,
      components: course.components.filter(component => component.id !== componentId)
    };
  });

  saveCourses(courses);
  renderCourseTracker();
}

function renderCourseTracker() {
  const list = document.getElementById("courseList");
  const summary = document.getElementById("courseSummaryCount");
  const average = document.getElementById("overallCourseAverage");

  if (!list) return;

  const courses = getCourses();
  const completeScores = courses
    .map(calculateCourseStats)
    .filter(stats => stats.isComplete);

  if (summary) {
    summary.textContent = `${courses.length} Active`;
  }

  if (average) {
    const score = completeScores.length
      ? completeScores.reduce((total, stats) => total + stats.weightedScore, 0) / completeScores.length
      : 0;
    average.textContent = `${score.toFixed(1)}%`;
  }

  list.innerHTML = "";

  if (courses.length === 0) {
    list.innerHTML = `<div class="empty-state">No courses yet. Add a course, then add mark breakdown rows until the weight reaches 100%.</div>`;
    return;
  }

  courses.forEach(course => {
    const stats = calculateCourseStats(course);
    const card = document.createElement("article");
    card.className = "course-breakdown-card";

    const statusClass = stats.isComplete ? "weight-good" : "weight-warning";
    const statusText = stats.isComplete ? "Weight complete" : `Weight total ${stats.totalWeight || 0}%`;

    card.innerHTML = `
      <div class="course-card-top">
        <div>
          <h3>${course.name}</h3>
          <p class="${statusClass}">${statusText}</p>
        </div>
        <div class="course-score">${stats.weightedScore.toFixed(1)}%</div>
      </div>

      <div class="component-summary">
        <span>Percentage weights must add up to 100.</span>
        <button type="button" class="mini-delete-btn" data-delete-course="${course.id}">Delete Course</button>
      </div>

      <div class="component-list" data-component-list="${course.id}"></div>
      <button type="button" class="component-add-btn" data-add-component="${course.id}">Add Breakdown</button>
    `;

    const componentList = card.querySelector("[data-component-list]");
    course.components.forEach(component => {
      const componentRow = document.createElement("div");
      componentRow.className = "component-row";

      const totalMarks = Number(component.totalMarks);
      const scoredMarks = Number(component.scoredMarks);
      const rowPercent = Number.isFinite(totalMarks) && totalMarks > 0 && Number.isFinite(scoredMarks)
        ? Math.min(scoredMarks, totalMarks) / totalMarks * 100
        : 0;

      componentRow.innerHTML = `
        <select data-course-id="${course.id}" data-component-id="${component.id}" data-field="type">
          ${["Assignment", "Quiz", "Mid Sem", "End Sem", "Lab", "Project", "Other"].map(option =>
            `<option value="${option}"${component.type === option ? " selected" : ""}>${option}</option>`
          ).join("")}
        </select>
        <input type="number" min="0" max="100" step="0.1" placeholder="Weight %" value="${component.weight}" data-course-id="${course.id}" data-component-id="${component.id}" data-field="weight">
        <input type="number" min="0" step="0.1" placeholder="Total marks" value="${component.totalMarks}" data-course-id="${course.id}" data-component-id="${component.id}" data-field="totalMarks">
        <input type="number" min="0" step="0.1" placeholder="Scored" value="${component.scoredMarks}" data-course-id="${course.id}" data-component-id="${component.id}" data-field="scoredMarks">
        <div class="component-result">${rowPercent.toFixed(1)}%</div>
        <button type="button" class="mini-delete-btn" data-delete-component="${component.id}" data-course-id="${course.id}">Remove</button>
      `;

      componentList.appendChild(componentRow);
    });

    list.appendChild(card);
  });

  list.querySelectorAll("[data-add-component]").forEach(button => {
    button.addEventListener("click", event => addCourseComponent(event.target.dataset.addComponent));
  });

  list.querySelectorAll("[data-delete-course]").forEach(button => {
    button.addEventListener("click", event => deleteCourse(event.target.dataset.deleteCourse));
  });

  list.querySelectorAll("[data-delete-component]").forEach(button => {
    button.addEventListener("click", event => {
      deleteCourseComponent(event.target.dataset.courseId, event.target.dataset.deleteComponent);
    });
  });

  list.querySelectorAll("[data-field]").forEach(input => {
    input.addEventListener("change", event => {
      const { courseId, componentId, field } = event.target.dataset;
      updateCourseComponent(courseId, componentId, field, event.target.value);
    });
  });
}

/* ================= DEADLINE TRACKER ================= */
function getDeadlines() {
  const deadlines = safeParse(localStorage.getItem(deadlineStorageKey()), []);
  return Array.isArray(deadlines) ? deadlines : [];
}

function saveDeadlines(deadlines) {
  localStorage.setItem(deadlineStorageKey(), JSON.stringify(deadlines));
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function makeDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDeadline() {
  const titleInput = document.getElementById("deadlineTitleInput");
  const dateInput = document.getElementById("deadlineDateInput");
  if (!titleInput || !dateInput) return;

  const title = titleInput.value.trim();
  const date = dateInput.value;

  if (!title || !date) {
    if (!title) titleInput.focus();
    else dateInput.focus();
    return;
  }

  const deadlines = getDeadlines();
  deadlines.push({
    id: `deadline_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    title,
    date
  });

  saveDeadlines(deadlines);
  titleInput.value = "";
  dateInput.value = "";
  renderDeadlineTracker();
  renderCalendar();
}

function deleteDeadline(deadlineId) {
  saveDeadlines(getDeadlines().filter(deadline => deadline.id !== deadlineId));
  renderDeadlineTracker();
  renderCalendar();
}

function formatDeadlineDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getUpcomingDeadlines() {
  const today = todayDateKey();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekKey = nextWeek.toISOString().slice(0, 10);

  return getDeadlines()
    .filter(deadline => deadline.date >= today && deadline.date <= nextWeekKey)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function renderDeadlineTracker() {
  const list = document.getElementById("deadlineList");
  const alerts = document.getElementById("deadlineAlerts");
  const summary = document.getElementById("deadlineSummaryCount");

  if (!list) return;

  const deadlines = getDeadlines().sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = getUpcomingDeadlines();

  if (summary) {
    summary.textContent = `${upcoming.length} Due Soon`;
  }

  if (alerts) {
    alerts.innerHTML = "";

    if (upcoming.length === 0) {
      alerts.innerHTML = `<div class="empty-state">No upcoming deadlines in the next 7 days.</div>`;
    } else {
      upcoming.forEach(deadline => {
        const alert = document.createElement("div");
        alert.className = "deadline-alert";
        alert.textContent = `${deadline.title} is due on ${formatDeadlineDate(deadline.date)}.`;
        alerts.appendChild(alert);
      });
    }
  }

  list.innerHTML = "";

  if (deadlines.length === 0) {
    list.innerHTML = `<li class="empty-state">Add a deadline to turn that calendar date red.</li>`;
    return;
  }

  deadlines.forEach(deadline => {
    const item = document.createElement("li");
    item.className = "deadline-item";
    item.innerHTML = `
      <div>
        <strong>${deadline.title}</strong>
        <time datetime="${deadline.date}">${formatDeadlineDate(deadline.date)}</time>
      </div>
      <button type="button" class="mini-delete-btn" data-delete-deadline="${deadline.id}">Remove</button>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll("[data-delete-deadline]").forEach(button => {
    button.addEventListener("click", event => deleteDeadline(event.target.dataset.deleteDeadline));
  });
}

/* ================= OTP SYSTEM ================= */
async function sendOTP() {
  const emailInput = document.getElementById("email");
  const button = document.querySelector("button[onclick='sendOTP()']");
  const normalizedEmail = normalizeEmail(emailInput ? emailInput.value : "");

  if (!normalizedEmail) {
    setMessage("signupMessage", "Enter your email first.");
    return;
  }

  if (!isValidEmail(normalizedEmail)) {
    setMessage("signupMessage", "Enter a valid email address.");
    return;
  }

  const authMode = localStorage.getItem(STORAGE_KEYS.authMode) || AUTH_MODES.signup;
  const userExists = getUsers().some(user => user.email === normalizedEmail);

  if (authMode === AUTH_MODES.signup && userExists) {
    setMessage("signupMessage", "That email already has an account. Login or use forgot password.");
    return;
  }

  if (authMode === AUTH_MODES.reset && !userExists) {
    setMessage("signupMessage", "No account was found for that email.");
    return;
  }

  try {
    setButtonBusy(button, true, "Sending...");
    setMessage("signupMessage", "Sending OTP...", "success");

    const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: normalizedEmail })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage("signupMessage", data.message || "Unable to send OTP.");
      return;
    }

    localStorage.setItem(STORAGE_KEYS.userEmail, normalizedEmail);
    localStorage.setItem(STORAGE_KEYS.authMode, authMode);

    const otpNote = data.devOtp ? ` Use ${data.devOtp}.` : "";
    const purpose = authMode === AUTH_MODES.reset ? "Reset OTP" : "OTP";
    setMessage("signupMessage", `${purpose} sent to ${normalizedEmail}.${otpNote}`, "success");
  } catch (error) {
    setMessage("signupMessage", "Could not connect to the OTP server. Run npm start first.");
  } finally {
    setButtonBusy(button, false);
  }
}

function resendOTP() {
  sendOTP();
}

async function verifyOTP() {
  const otpInput = document.getElementById("otp");
  const email = normalizeEmail(localStorage.getItem(STORAGE_KEYS.userEmail));
  const otp = otpInput ? otpInput.value.trim() : "";

  if (!email) {
    setMessage("signupMessage", "Send OTP first.");
    return;
  }

  if (!otp) {
    setMessage("signupMessage", "Enter the OTP.");
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
        otp
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage("signupMessage", data.message || "Wrong OTP");
      return;
    }

    setMessage("signupMessage", "Verified successfully. Opening password setup...", "success");
    window.location.href = "password.html";
  } catch (error) {
    setMessage("signupMessage", "Could not connect to the OTP server. Run npm start first.");
  }
}

async function startPasswordReset() {
  const emailInput = document.getElementById("loginEmail");
  const email = normalizeEmail(emailInput ? emailInput.value : "");

  if (!email) {
    setMessage("loginMessage", "Enter your registered email first, then tap forgot password.");
    return;
  }

  if (!isValidEmail(email)) {
    setMessage("loginMessage", "Enter a valid email address.");
    return;
  }

  if (!getUsers().some(user => user.email === email)) {
    setMessage("loginMessage", "No account was found for that email.");
    return;
  }

  try {
    setMessage("loginMessage", "Sending reset OTP...", "success");

    const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage("loginMessage", data.message || "Unable to send reset OTP.");
      return;
    }

    localStorage.setItem(STORAGE_KEYS.userEmail, email);
    localStorage.setItem(STORAGE_KEYS.authMode, AUTH_MODES.reset);
    saveRememberedEmail(email);
    const otpNote = data.devOtp ? ` Use ${data.devOtp}.` : "";
    localStorage.setItem(STORAGE_KEYS.authNotice, `Reset OTP sent to ${email}.${otpNote}`);
    window.location.href = "signup.html";
  } catch (error) {
    setMessage("loginMessage", "Could not connect to the OTP server. Run npm start first.");
  }
}

/* ================= PASSWORD SAVE ================= */
function savePassword() {
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const password = passwordInput ? passwordInput.value : "";
  const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";
  const email = normalizeEmail(localStorage.getItem(STORAGE_KEYS.userEmail));
  const mode = localStorage.getItem(STORAGE_KEYS.authMode) || AUTH_MODES.signup;

  if (!email) {
    setMessage("passwordMessage", "Start from signup or forgot password first.");
    return;
  }

  if (!password || !confirmPassword) {
    setMessage("passwordMessage", "Fill in both password fields.");
    return;
  }

  if (password.length < 6) {
    setMessage("passwordMessage", "Use at least 6 characters.");
    return;
  }

  if (password !== confirmPassword) {
    setMessage("passwordMessage", "Passwords do not match.");
    return;
  }

  const users = getUsers();
  const existingIndex = users.findIndex(user => user.email === email);

  if (mode === AUTH_MODES.reset) {
    if (existingIndex === -1) {
      setMessage("passwordMessage", "That account does not exist anymore.");
      return;
    }

    users[existingIndex].password = password;
  } else {
    if (existingIndex !== -1) {
      setMessage("passwordMessage", "That account already exists. Login or reset the password.");
      return;
    }

    users.push({ email, password });
  }

  saveUsers(users);

  localStorage.setItem(STORAGE_KEYS.isLoggedIn, "true");
  localStorage.setItem(STORAGE_KEYS.currentUser, email);
  saveRememberedEmail(email);
  localStorage.removeItem(STORAGE_KEYS.authMode);
  localStorage.removeItem(STORAGE_KEYS.authNotice);

  window.location.href = "dashboard.html";
}

/* ================= LOGIN ================= */
function loginUser() {
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const email = normalizeEmail(emailInput ? emailInput.value : "");
  const password = passwordInput ? passwordInput.value : "";

  if (!email || !password) {
    setMessage("loginMessage", "Fill in both email and password.");
    return;
  }

  if (!isValidEmail(email)) {
    setMessage("loginMessage", "Enter a valid email address.");
    return;
  }

  if (email === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password) {
    loginDemoUser();
    return;
  }

  const users = getUsers();
  const user = users.find(entry => entry.email === email);

  if (!user) {
    setMessage("loginMessage", "No account found. Create an account first.");
    return;
  }

  if (user.password !== password) {
    setMessage("loginMessage", "Incorrect password.");
    return;
  }

  localStorage.setItem(STORAGE_KEYS.isLoggedIn, "true");
  localStorage.setItem(STORAGE_KEYS.currentUser, email);
  saveRememberedEmail(email);
  setMessage("loginMessage", "Login successful. Opening dashboard...", "success");

  window.location.href = "dashboard.html";
}

function loginDemoUser() {
  seedDemoAccount();
  localStorage.setItem(STORAGE_KEYS.isLoggedIn, "true");
  localStorage.setItem(STORAGE_KEYS.currentUser, DEMO_ACCOUNT.email);
  saveRememberedEmail(DEMO_ACCOUNT.email);
  setMessage("loginMessage", "Demo login successful. Opening dashboard...", "success");
  window.location.href = "dashboard.html";
}

function setupPasswordPage() {
  const title = document.getElementById("passwordTitle");
  const subtitle = document.getElementById("passwordSubtitle");
  const emailChip = document.getElementById("passwordEmail");
  const action = document.getElementById("passwordAction");
  const email = normalizeEmail(localStorage.getItem(STORAGE_KEYS.userEmail));
  const mode = localStorage.getItem(STORAGE_KEYS.authMode) || AUTH_MODES.signup;

  if (!title || !subtitle) return;

  if (!email) {
    setMessage("passwordMessage", "Start from signup or forgot password first.");
    return;
  }

  if (emailChip) {
    emailChip.textContent = email;
    emailChip.style.display = "block";
  }

  if (mode === AUTH_MODES.reset) {
    title.textContent = "Create a new password";
    subtitle.textContent = "Reset the password for your GradeSync account.";
    if (action) action.textContent = "Update Password";
  }
}

function setupAuthForms() {
  const loginEmail = document.getElementById("loginEmail");
  const savedEmails = getSavedEmails();

  if (loginEmail && savedEmails.length > 0 && !loginEmail.value) {
    loginEmail.value = savedEmails[0];
  }

  const loginPassword = document.getElementById("loginPassword");
  if (loginEmail && loginPassword) {
    [loginEmail, loginPassword].forEach(input => {
      input.addEventListener("keydown", event => {
        if (event.key === "Enter") loginUser();
      });
    });
  }

  const signupEmail = document.getElementById("email");
  const otpInput = document.getElementById("otp");
  const authMode = localStorage.getItem(STORAGE_KEYS.authMode) || AUTH_MODES.signup;
  const pendingEmail = normalizeEmail(localStorage.getItem(STORAGE_KEYS.userEmail));
  const authNotice = localStorage.getItem(STORAGE_KEYS.authNotice);

  if (signupEmail && pendingEmail) {
    signupEmail.value = pendingEmail;
  }

  if (signupEmail && authMode === AUTH_MODES.reset) {
    const headerTitle = document.querySelector(".auth-card .card-header h2");
    const headerText = document.querySelector(".auth-card .card-header p");
    const introTag = document.querySelector(".page-tag");
    const introTitle = document.querySelector(".auth-intro h1");
    const introText = document.querySelector(".auth-intro p");

    if (headerTitle) headerTitle.textContent = "Verify reset OTP";
    if (headerText) headerText.textContent = "Enter the OTP sent for your password reset.";
    if (introTag) introTag.textContent = "Password Reset";
    if (introTitle) introTitle.textContent = "Reset your password and get back to your dashboard.";
    if (introText) introText.textContent = "Verify your email with an OTP, then create a fresh password for your GradeSync account.";
  }

  if (signupEmail && authNotice) {
    setMessage("signupMessage", authNotice, "success");
    localStorage.removeItem(STORAGE_KEYS.authNotice);
  }

  if (signupEmail && otpInput) {
    signupEmail.addEventListener("keydown", event => {
      if (event.key === "Enter") sendOTP();
    });
    otpInput.addEventListener("keydown", event => {
      if (event.key === "Enter") verifyOTP();
    });
  }

  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  if (password && confirmPassword) {
    [password, confirmPassword].forEach(input => {
      input.addEventListener("keydown", event => {
        if (event.key === "Enter") savePassword();
      });
    });
  }
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
  const deadlinesByDate = getDeadlines().reduce((map, deadline) => {
    if (!map[deadline.date]) {
      map[deadline.date] = [];
    }

    map[deadline.date].push(deadline.title);
    return map;
  }, {});

  for (let i = 0; i < start; i += 1) {
    datesContainer.innerHTML += "<div></div>";
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const dateKey = makeDateKey(year, month, day);
    const deadlineTitles = deadlinesByDate[dateKey] || [];
    const hasDeadline = deadlineTitles.length > 0;
    const isToday =
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();

    datesContainer.innerHTML += `
      <div class="date ${isToday ? "today" : ""} ${hasDeadline ? "deadline-day" : ""}" title="${hasDeadline ? deadlineTitles.join(", ") : ""}">
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
  seedDemoAccount();
  populateSavedEmails();
  setupAuthForms();
  setupPasswordPage();

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

  const courseNameInput = document.getElementById("courseNameInput");
  if (courseNameInput) {
    courseNameInput.addEventListener("keydown", event => {
      if (event.key === "Enter") addCourse();
    });
  }

  const deadlineTitleInput = document.getElementById("deadlineTitleInput");
  const deadlineDateInput = document.getElementById("deadlineDateInput");
  if (deadlineTitleInput && deadlineDateInput) {
    [deadlineTitleInput, deadlineDateInput].forEach(deadlineInput => {
      deadlineInput.addEventListener("keydown", event => {
        if (event.key === "Enter") addDeadline();
      });
    });
  }

  renderTodos();
  renderCourseTracker();
  renderDeadlineTracker();
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
