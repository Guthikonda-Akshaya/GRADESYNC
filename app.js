const STORAGE_KEYS = {
  users: "users",
  currentUser: "currentUser",
  isLoggedIn: "isLoggedIn",
  pendingEmail: "pendingAuthEmail",
  passwordMode: "passwordMode",
  rememberedEmail: "rememberedEmail",
  legacyTodos: "todos"
};

const PASSWORD_MODES = {
  signup: "signup",
  reset: "reset"
};

const DEMO_OTP = "1234";
let currentDate = new Date();
let todos = [];

function pagePath() {
  return window.location.pathname.toLowerCase();
}

function isDashboardPage() {
  return pagePath().includes("dashboard.html");
}

function normalizeEmail(value = "") {
  return value.trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function getUsers() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.users), []);
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function clearPendingAuth() {
  localStorage.removeItem(STORAGE_KEYS.pendingEmail);
  localStorage.removeItem(STORAGE_KEYS.passwordMode);
}

function setMessage(id, message, type = "error") {
  const target = document.getElementById(id);

  if (!target) {
    if (message) {
      alert(message);
    }
    return;
  }

  target.textContent = message;
  target.className = `form-message${message ? ` ${type}` : ""}`;
}

function goToLogin() {
  clearPendingAuth();
  window.location.href = "index.html";
}

function goToSignup() {
  clearPendingAuth();
  localStorage.setItem(STORAGE_KEYS.passwordMode, PASSWORD_MODES.signup);
  window.location.href = "signup.html";
}

function goToForgotPassword(event) {
  if (event) {
    event.preventDefault();
  }

  const loginEmailInput = document.getElementById("loginEmail");
  let email = normalizeEmail(loginEmailInput ? loginEmailInput.value : "");

  if (!email) {
    email = normalizeEmail(
      window.prompt("Enter the email address for your GradeSync account.", "") || ""
    );
  }

  if (!email) {
    setMessage("loginMessage", "Enter your registered email first, then try again.");
    return;
  }

  if (!isValidEmail(email)) {
    setMessage("loginMessage", "Enter a valid email address before resetting the password.");
    return;
  }

  const userExists = getUsers().some(user => user.email === email);

  if (!userExists) {
    setMessage("loginMessage", "No account was found for that email.");
    return;
  }

  localStorage.setItem(STORAGE_KEYS.pendingEmail, email);
  localStorage.setItem(STORAGE_KEYS.passwordMode, PASSWORD_MODES.reset);
  window.location.href = "password.html";
}

function sendOTP() {
  const emailInput = document.getElementById("email");
  const otpInput = document.getElementById("otp");
  const email = normalizeEmail(emailInput ? emailInput.value : "");

  if (!email) {
    setMessage("signupMessage", "Enter your email first.");
    return;
  }

  if (!isValidEmail(email)) {
    setMessage("signupMessage", "Enter a valid email address.");
    return;
  }

  const userExists = getUsers().some(user => user.email === email);

  if (userExists) {
    setMessage("signupMessage", "That email already has an account. Use login or reset password.");
    return;
  }

  localStorage.setItem(STORAGE_KEYS.pendingEmail, email);
  localStorage.setItem(STORAGE_KEYS.passwordMode, PASSWORD_MODES.signup);
  setMessage("signupMessage", `Demo OTP sent to ${email}. Use ${DEMO_OTP} to continue.`, "success");

  if (otpInput) {
    otpInput.focus();
  }
}

function resendOTP() {
  const emailInput = document.getElementById("email");
  const email = normalizeEmail(emailInput ? emailInput.value : "");

  if (!email || !isValidEmail(email)) {
    setMessage("signupMessage", "Enter a valid email before resending the OTP.");
    return;
  }

  localStorage.setItem(STORAGE_KEYS.pendingEmail, email);
  localStorage.setItem(STORAGE_KEYS.passwordMode, PASSWORD_MODES.signup);
  setMessage("signupMessage", `OTP resent to ${email}. Use ${DEMO_OTP} to verify.`, "success");
}

function verifyOTP() {
  const emailInput = document.getElementById("email");
  const otpInput = document.getElementById("otp");
  const email = normalizeEmail(emailInput ? emailInput.value : "");
  const otp = otpInput ? otpInput.value.trim() : "";
  const pendingEmail = normalizeEmail(localStorage.getItem(STORAGE_KEYS.pendingEmail) || "");

  if (!email || !otp) {
    setMessage("signupMessage", "Enter both your email and the OTP.");
    return;
  }

  if (!pendingEmail || email !== pendingEmail) {
    setMessage("signupMessage", "If you change the email, send OTP again for that email before verifying.");
    return;
  }

  if (otp !== DEMO_OTP) {
    setMessage("signupMessage", "Incorrect OTP. For this demo, use 1234.");
    return;
  }

  localStorage.setItem(STORAGE_KEYS.passwordMode, PASSWORD_MODES.signup);
  window.location.href = "password.html";
}

function initializePasswordPage() {
  const title = document.getElementById("passwordTitle");
  const subtitle = document.getElementById("passwordSubtitle");
  const emailChip = document.getElementById("passwordEmail");
  const actionButton = document.getElementById("passwordAction");
  const backButton = document.getElementById("passwordBack");

  if (!title || !subtitle || !emailChip || !actionButton || !backButton) {
    return;
  }

  const email = normalizeEmail(localStorage.getItem(STORAGE_KEYS.pendingEmail) || "");
  const mode = localStorage.getItem(STORAGE_KEYS.passwordMode) || PASSWORD_MODES.signup;

  if (!email) {
    setMessage("passwordMessage", "Start from Sign Up or Forgot Password first.");
    window.setTimeout(() => {
      window.location.href = mode === PASSWORD_MODES.reset ? "index.html" : "signup.html";
    }, 1200);
    return;
  }

  emailChip.textContent = email;

  if (mode === PASSWORD_MODES.reset) {
    title.textContent = "Create a new password";
    subtitle.textContent = "Reset the password for your existing GradeSync account.";
    actionButton.textContent = "Update Password";
    backButton.textContent = "Back to Login";
  } else {
    title.textContent = "Set your password";
    subtitle.textContent = "Create a secure password for your GradeSync account.";
    actionButton.textContent = "Create Account";
    backButton.textContent = "Back";
  }
}

function goBackFromPassword() {
  const mode = localStorage.getItem(STORAGE_KEYS.passwordMode) || PASSWORD_MODES.signup;
  window.location.href = mode === PASSWORD_MODES.reset ? "index.html" : "signup.html";
}

function savePassword() {
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const password = passwordInput ? passwordInput.value.trim() : "";
  const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : "";
  const email = normalizeEmail(localStorage.getItem(STORAGE_KEYS.pendingEmail) || "");
  const mode = localStorage.getItem(STORAGE_KEYS.passwordMode) || PASSWORD_MODES.signup;

  if (!email) {
    setMessage("passwordMessage", "No email is attached to this step. Start again from login or signup.");
    return;
  }

  if (!password || !confirmPassword) {
    setMessage("passwordMessage", "Fill in both password fields.");
    return;
  }

  if (password.length < 6) {
    setMessage("passwordMessage", "Use at least 6 characters for the password.");
    return;
  }

  if (password !== confirmPassword) {
    setMessage("passwordMessage", "Passwords do not match.");
    return;
  }

  const users = getUsers();
  const existingIndex = users.findIndex(user => user.email === email);

  if (mode === PASSWORD_MODES.reset) {
    if (existingIndex === -1) {
      setMessage("passwordMessage", "That account does not exist yet.");
      return;
    }

    users[existingIndex].password = password;
  } else {
    if (existingIndex !== -1) {
      setMessage("passwordMessage", "That email already exists. Login or reset the password instead.");
      return;
    }

    users.push({ email, password });
  }

  saveUsers(users);
  clearPendingAuth();
  localStorage.setItem(STORAGE_KEYS.isLoggedIn, "true");
  localStorage.setItem(STORAGE_KEYS.currentUser, email);
  localStorage.setItem(STORAGE_KEYS.rememberedEmail, email);
  window.location.href = "dashboard.html";
}

function loginUser() {
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const rememberMe = document.getElementById("rememberMe");
  const email = normalizeEmail(emailInput ? emailInput.value : "");
  const password = passwordInput ? passwordInput.value : "";

  if (!email || !password) {
    setMessage("loginMessage", "Fill in both email and password.");
    return;
  }

  const users = getUsers();
  const user = users.find(entry => entry.email === email);

  if (!user) {
    setMessage("loginMessage", "No account was found for that email.");
    return;
  }

  if (user.password !== password) {
    setMessage("loginMessage", "Incorrect password.");
    return;
  }

  localStorage.setItem(STORAGE_KEYS.isLoggedIn, "true");
  localStorage.setItem(STORAGE_KEYS.currentUser, email);

  if (rememberMe && rememberMe.checked) {
    localStorage.setItem(STORAGE_KEYS.rememberedEmail, email);
  } else {
    localStorage.removeItem(STORAGE_KEYS.rememberedEmail);
  }

  clearPendingAuth();
  window.location.href = "dashboard.html";
}

function initializeLoginPage() {
  const emailInput = document.getElementById("loginEmail");
  const rememberMe = document.getElementById("rememberMe");
  const rememberedEmail = normalizeEmail(localStorage.getItem(STORAGE_KEYS.rememberedEmail) || "");

  if (!emailInput) {
    return;
  }

  if (rememberedEmail) {
    emailInput.value = rememberedEmail;

    if (rememberMe) {
      rememberMe.checked = true;
    }
  }
}

function checkAuth() {
  if (localStorage.getItem(STORAGE_KEYS.isLoggedIn) !== "true") {
    window.location.href = "index.html";
  }
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.isLoggedIn);
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  window.location.href = "index.html";
}

function formatDisplayName(email) {
  const base = email.split("@")[0] || "Student";
  return base
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function renderCurrentUser() {
  const target = document.getElementById("currentUserName");

  if (!target) {
    return;
  }

  const email = normalizeEmail(localStorage.getItem(STORAGE_KEYS.currentUser) || "");
  target.textContent = email ? formatDisplayName(email) : "Student";
}

function todoStorageKey() {
  const currentUser = normalizeEmail(localStorage.getItem(STORAGE_KEYS.currentUser) || "");
  return currentUser ? `todos_${currentUser}` : STORAGE_KEYS.legacyTodos;
}

function loadTodos() {
  const currentTodos = safeParse(localStorage.getItem(todoStorageKey()), null);
  const fallbackTodos = safeParse(localStorage.getItem(STORAGE_KEYS.legacyTodos), []);
  todos = Array.isArray(currentTodos) ? currentTodos : fallbackTodos;
}

function saveTodos() {
  localStorage.setItem(todoStorageKey(), JSON.stringify(todos));
}

function cleanOldTodos() {
  const now = Date.now();
  todos = todos.filter(todo => {
    if (!todo.completed) {
      return true;
    }

    return now - todo.time < 86400000;
  });
}

function addTodo() {
  const input = document.getElementById("todoInput");

  if (!input) {
    return;
  }

  const text = input.value.trim();

  if (!text) {
    input.focus();
    return;
  }

  todos.unshift({
    id: Date.now(),
    text,
    completed: false,
    time: null
  });

  input.value = "";
  input.focus();
  saveAndRenderTodos();
}

function toggleTodo(id) {
  todos = todos.map(todo => {
    if (todo.id === id) {
      const completed = !todo.completed;
      return {
        ...todo,
        completed,
        time: completed ? Date.now() : null
      };
    }

    return todo;
  });

  saveOnlyTodos();
}

function deleteTodo(id) {
  todos = todos.filter(todo => todo.id !== id);
  saveAndRenderTodos();
}

function editTodo(id) {
  const newText = window.prompt("Edit your task:");

  if (!newText || !newText.trim()) {
    return;
  }

  todos = todos.map(todo =>
    todo.id === id ? { ...todo, text: newText.trim() } : todo
  );

  saveAndRenderTodos();
}

function saveOnlyTodos() {
  cleanOldTodos();
  saveTodos();
}

function saveAndRenderTodos() {
  cleanOldTodos();
  saveTodos();
  renderTodos();
}

function buildEmptyTodoState() {
  const empty = document.createElement("li");
  empty.className = "empty-state";
  empty.textContent = "No tasks yet. Add one and keep your day in sync.";
  return empty;
}

function renderTodos() {
  const list = document.getElementById("todoList");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  if (todos.length === 0) {
    list.appendChild(buildEmptyTodoState());
    return;
  }

  todos.forEach(todo => {
    const item = document.createElement("li");
    item.className = `todo-item${todo.completed ? " completed" : ""}`;

    const label = document.createElement("label");
    label.className = "custom-checkbox";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.addEventListener("change", () => {
      toggleTodo(todo.id);
      item.classList.toggle("completed");
    });

    const checkmark = document.createElement("span");
    checkmark.className = "checkmark";

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;
    text.addEventListener("dblclick", () => editTodo(todo.id));

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.type = "button";
    deleteButton.textContent = "x";
    deleteButton.setAttribute("aria-label", "Delete task");
    deleteButton.addEventListener("click", () => deleteTodo(todo.id));

    label.appendChild(checkbox);
    label.appendChild(checkmark);
    item.appendChild(label);
    item.appendChild(text);
    item.appendChild(deleteButton);
    list.appendChild(item);
  });
}

function renderCalendar() {
  const monthYear = document.getElementById("monthYear");
  const datesContainer = document.getElementById("calendarDates");

  if (!monthYear || !datesContainer) {
    return;
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  monthYear.textContent = `${monthNames[month]} ${year}`;
  datesContainer.innerHTML = "";

  const start = firstDay === 0 ? 6 : firstDay - 1;
  const today = new Date();
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < start; i += 1) {
    const spacer = document.createElement("div");
    spacer.className = "date-spacer";
    fragment.appendChild(spacer);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const cell = document.createElement("div");
    const isToday =
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();

    cell.className = `date${isToday ? " today" : ""}`;
    cell.textContent = day;
    fragment.appendChild(cell);
  }

  datesContainer.appendChild(fragment);
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

function initializeDashboard() {
  if (!isDashboardPage()) {
    return;
  }

  checkAuth();
  renderCurrentUser();
  loadTodos();
  renderTodos();
  renderCalendar();

  const todoInput = document.getElementById("todoInput");
  if (todoInput) {
    todoInput.addEventListener("keypress", event => {
      if (event.key === "Enter") {
        addTodo();
      }
    });

    todoInput.focus();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeLoginPage();
  initializePasswordPage();
  initializeDashboard();
});
