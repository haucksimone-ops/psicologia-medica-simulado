// ==========================================================================
// SIMULADOR DE PSICOLOGIA MÉDICA I - LÓGICA DE APLICAÇÃO
// ==========================================================================

// --- State Variables ---
let selectedThemes = [];
let questionCount = 3;
let activeQuestions = [];
let currentQuestionIndex = 0;
let studentAnswers = {}; // Map of questionId -> answer text

// --- UTF-8 Safe Base64 Decoding ---
function decodeB64(str) {
  try {
    return decodeURIComponent(
      atob(str)
        .split('')
        .map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
  } catch (e) {
    console.error("Erro ao decodificar Base64:", e);
    return "Erro de carregamento do texto.";
  }
}

// --- UTF-8 Safe Base64 Encoding (For Admin tool) ---
function encodeB64(str) {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
  } catch (e) {
    console.error("Erro ao codificar para Base64:", e);
    return "";
  }
}

// --- Navigation ---
function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.remove('active');
  });
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
    window.scrollTo(0, 0);
  }
}

// --- Initial Setup & Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  // Theme selection checkbox cards interaction
  const cards = document.querySelectorAll(".theme-checkbox-card");
  cards.forEach(card => {
    const checkbox = card.querySelector('input[type="checkbox"]');
    
    // Sync UI with state if pre-checked
    if (checkbox.checked) {
      card.classList.add("selected");
    }

    card.addEventListener("click", (e) => {
      // Prevent double trigger if clicking the checkbox input directly
      if (e.target.type !== "checkbox") {
        checkbox.checked = !checkbox.checked;
      }
      
      if (checkbox.checked) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
      updateThemesList();
    });
  });

  // Handle count selection
  const countRadios = document.querySelectorAll('input[name="qcount"]');
  countRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      questionCount = radio.value === "all" ? "all" : parseInt(radio.value, 10);
    });
  });

  // Recovery of previous active session from localStorage (if any)
  recoveryLocalSession();
});

// --- Theme Listing helper ---
function updateThemesList() {
  selectedThemes = [];
  document.querySelectorAll('input[name="theme"]:checked').forEach(checkbox => {
    selectedThemes.push(checkbox.value);
  });
}

// --- LocalStorage Session Recovery ---
function recoveryLocalSession() {
  const savedSession = localStorage.getItem("med8005_session");
  if (savedSession) {
    try {
      const sessionData = JSON.parse(savedSession);
      // Verify if active questions exist in the stored session
      if (sessionData.activeQuestions && sessionData.activeQuestions.length > 0) {
        activeQuestions = sessionData.activeQuestions;
        currentQuestionIndex = sessionData.currentQuestionIndex || 0;
        studentAnswers = sessionData.studentAnswers || {};
        
        // Show restore offer banner on home screen
        const restoreBanner = document.getElementById("restore-session-banner");
        if (restoreBanner) {
          restoreBanner.style.display = "block";
        }
      }
    } catch (e) {
      console.error("Erro ao recuperar sessão anterior:", e);
    }
  }
}

// --- Restore Session ---
function restoreSession() {
  document.getElementById("restore-session-banner").style.display = "none";
  loadQuizInterface();
}

// --- Dismiss Session ---
function dismissSession() {
  document.getElementById("restore-session-banner").style.display = "none";
  localStorage.removeItem("med8005_session");
  studentAnswers = {};
  activeQuestions = [];
}

// --- Save Session Helper ---
function saveLocalSession() {
  const sessionData = {
    activeQuestions,
    currentQuestionIndex,
    studentAnswers
  };
  localStorage.setItem("med8005_session", JSON.stringify(sessionData));
}

// --- Generate / Start Simulator ---
function generateQuiz() {
  updateThemesList();
  
  // Filtering questions by theme
  let pool = [];
  if (selectedThemes.length === 0) {
    // If no theme is checked, use all themes
    pool = [...QUESTION_BANK];
  } else {
    pool = QUESTION_BANK.filter(q => selectedThemes.includes(q.theme));
  }

  if (pool.length === 0) {
    alert("Nenhuma questão disponível para os temas selecionados. Por favor, adicione mais temas.");
    return;
  }

  // Determine size of draw
  let size = questionCount === "all" ? pool.length : Math.min(questionCount, pool.length);

  // Shuffle & Draw
  const shuffled = pool.sort(() => 0.5 - Math.random());
  activeQuestions = shuffled.slice(0, size);
  currentQuestionIndex = 0;
  studentAnswers = {}; // Clear old answers for new quiz
  
  saveLocalSession();
  loadQuizInterface();
}

// --- Quiz Interface Loader ---
function loadQuizInterface() {
  if (activeQuestions.length === 0) {
    showPage("setup");
    return;
  }

  // Load current question details
  const q = activeQuestions[currentQuestionIndex];
  
  // Decrypt content on-demand
  const scenarioText = decodeB64(q.scenario);
  
  // Fill DOM elements
  document.getElementById("q-theme").innerText = q.theme;
  document.getElementById("q-title").innerText = q.title;
  document.getElementById("q-scenario").innerText = scenarioText;
  
  // Fill response textarea
  const textarea = document.getElementById("q-textarea");
  textarea.value = studentAnswers[q.id] || "";
  
  // Update progress elements
  document.getElementById("nav-current").innerText = currentQuestionIndex + 1;
  document.getElementById("nav-total").innerText = activeQuestions.length;
  
  const fillPercent = ((currentQuestionIndex + 1) / activeQuestions.length) * 100;
  document.getElementById("progress-fill").style.width = `${fillPercent}%`;
  
  // Reset Rubric display
  const rubricPanel = document.getElementById("rubric-panel");
  rubricPanel.style.display = "none";
  document.getElementById("rubric-text").innerText = "";
  document.getElementById("btn-show-rubric").style.display = "inline-flex";

  // Disable/enable nav buttons
  document.getElementById("btn-prev").disabled = currentQuestionIndex === 0;
  
  // Change next button to "Concluir" if on last question
  const nextBtn = document.getElementById("btn-next");
  if (currentQuestionIndex === activeQuestions.length - 1) {
    nextBtn.innerHTML = `<span>Concluir</span> <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  } else {
    nextBtn.innerHTML = `<span>Próxima</span> <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  showPage("simulator");
  textarea.focus();
}

// --- Typing / Auto-saving handler ---
function handleAnswerInput(val) {
  const q = activeQuestions[currentQuestionIndex];
  studentAnswers[q.id] = val;
  saveLocalSession();
  
  // Visual save indicator
  const statusEl = document.getElementById("save-status");
  statusEl.innerHTML = `<span style="color: var(--color-success);">✍️ Digitando... Rascunho salvo localmente.</span>`;
  
  // Debounce visual indicator clearance
  clearTimeout(window.saveTimer);
  window.saveTimer = setTimeout(() => {
    statusEl.innerHTML = `<span>💾 Rascunho salvo com sucesso no navegador.</span>`;
  }, 1000);
}

// --- Navigation controls inside Quiz ---
function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    saveLocalSession();
    loadQuizInterface();
  }
}

function nextQuestion() {
  if (currentQuestionIndex < activeQuestions.length - 1) {
    currentQuestionIndex++;
    saveLocalSession();
    loadQuizInterface();
  } else {
    // Complete quiz
    finishQuiz();
  }
}

// --- Show Rubric ---
function revealRubric() {
  const q = activeQuestions[currentQuestionIndex];
  const rubricText = decodeB64(q.rubric);
  
  const rubricPanel = document.getElementById("rubric-panel");
  const rubricContent = document.getElementById("rubric-text");
  
  rubricContent.innerText = rubricText;
  rubricPanel.style.display = "block";
  document.getElementById("btn-show-rubric").style.display = "none";
  
  // Smooth scroll to rubric
  rubricPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// --- Finish / Review screen ---
function finishQuiz() {
  const container = document.getElementById("review-container");
  container.innerHTML = ""; // Clear previous
  
  activeQuestions.forEach((q, idx) => {
    const answer = studentAnswers[q.id] || "";
    const decodedScenario = decodeB64(q.scenario);
    const decodedRubric = decodeB64(q.rubric);
    
    const item = document.createElement("div");
    item.className = "review-item";
    item.innerHTML = `
      <div class="review-question-header">
        <span class="scenario-theme-tag">${q.theme}</span>
        <h4 class="review-question-title">Questão ${idx + 1}: ${q.title}</h4>
      </div>
      <div class="scenario-paper" style="padding: 12px 18px; margin-bottom: 12px; font-size: 0.88rem;">
        <p>${decodedScenario}</p>
      </div>
      <h5 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 4px; color: var(--color-sage-dark);">Sua Resposta:</h5>
      <div class="review-answer-box">
        ${answer.trim() ? answer.replace(/\n/g, '<br>') : '<span class="review-empty-answer">Nenhuma resposta fornecida.</span>'}
      </div>
      <div class="rubric-panel" style="display:block; margin-top: 10px; padding: 12px 18px; background-color: var(--color-terracotta-light); border: 1px dashed var(--color-terracotta);">
        <div class="rubric-title" style="font-size: 0.95rem; color: var(--color-terracotta-dark);">
          📋 Gabarito de Autoavaliação / Critérios Esperados:
        </div>
        <p class="rubric-text" style="font-size: 0.82rem; margin-top: 5px;">${decodedRubric}</p>
      </div>
    `;
    container.appendChild(item);
  });
  
  showPage("review");
}

// --- Export Results as PDF ---
function printResults() {
  window.print();
}

// --- Restart Simulator ---
function restartQuiz() {
  if (confirm("Deseja realmente iniciar um novo simulado? Suas respostas atuais serão arquivadas.")) {
    dismissSession();
    showPage("setup");
  }
}

// --- Admin Section toggles ---
function toggleAdminPanel() {
  const panel = document.getElementById("admin-panel");
  if (panel.style.display === "none" || !panel.style.display) {
    panel.style.display = "block";
    panel.scrollIntoView({ behavior: 'smooth' });
  } else {
    panel.style.display = "none";
  }
}

// --- Admin base64 generator tool ---
function generateObfuscatedCode() {
  const scenarioInput = document.getElementById("admin-scenario").value;
  const rubricInput = document.getElementById("admin-rubric").value;
  const themeInput = document.getElementById("admin-theme").value;
  const titleInput = document.getElementById("admin-title-q").value;
  
  if (!scenarioInput || !rubricInput || !themeInput || !titleInput) {
    alert("Por favor, preencha todos os campos do formulário antes de codificar.");
    return;
  }
  
  const b64Scenario = encodeB64(scenarioInput);
  const b64Rubric = encodeB64(rubricInput);
  
  const jsonOutput = {
    id: 99, // Placeholder
    theme: themeInput.trim(),
    title: titleInput.trim(),
    scenario: b64Scenario,
    rubric: b64Rubric
  };
  
  const outputBox = document.getElementById("admin-output");
  outputBox.innerText = JSON.stringify(jsonOutput, null, 2) + ",";
  
  document.getElementById("admin-output-container").style.display = "block";
}
