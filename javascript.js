(function () {
  "use strict";

  /* ------------------------------------------------------------ */
  /* Game data                                                     */
  /* ------------------------------------------------------------ */
  // Single source of truth: each choice lists what it beats, and why.
  const CHOICES = {
    scissors: { beats: { paper: "cuts", lizard: "decapitates" }, pos: 0 },
    paper: { beats: { rock: "covers", spock: "disproves" }, pos: 1 },
    rock: { beats: { scissors: "crushes", lizard: "crushes" }, pos: 2 },
    lizard: { beats: { spock: "poisons", paper: "eats" }, pos: 3 },
    spock: { beats: { scissors: "smashes", rock: "vaporizes" }, pos: 4 },
  };
  const CHOICE_NAMES = Object.keys(CHOICES);

  /* ------------------------------------------------------------ */
  /* DOM refs                                                      */
  /* ------------------------------------------------------------ */
  const board = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const rulesButton = document.getElementById("rulesButton");
  const rulesOverlay = document.getElementById("rulesOverlay");
  const closeRules = document.getElementById("closeRules");
  const rulesList = document.getElementById("rulesList");

  let score = getStoredScore();
  let busy = false; // guards against double-clicks mid-animation

  scoreEl.textContent = score;

  /* ------------------------------------------------------------ */
  /* Score persistence                                             */
  /* ------------------------------------------------------------ */
  function getStoredScore() {
    try {
      const stored = localStorage.getItem("rpsls-score");
      return stored ? JSON.parse(stored) : 0;
    } catch (err) {
      return 0;
    }
  }

  function setScore(next) {
    score = next;
    scoreEl.textContent = score;
    scoreEl.classList.remove("bump");
    // restart the animation even if triggered twice in a row
    void scoreEl.offsetWidth;
    scoreEl.classList.add("bump");
    try {
      localStorage.setItem("rpsls-score", JSON.stringify(score));
    } catch (err) {
      /* storage unavailable — game still works, just won't persist */
    }
  }

  /* ------------------------------------------------------------ */
  /* Rendering: picker screen                                      */
  /* ------------------------------------------------------------ */
  function renderPicker() {
    busy = false;
    board.innerHTML = `
      <div class="picker">
        <svg class="picker-bg" viewBox="0 0 100 100">
          <path d="M50,14 L84.2,38.9 L71.2,79.1 L28.8,79.1 L15.8,38.9 Z"></path>
          <path d="M50,14 L71.2,79.1 M50,14 L28.8,79.1 M84.2,38.9 L28.8,79.1 M84.2,38.9 L15.8,38.9 M71.2,79.1 L15.8,38.9"></path>
        </svg>
        ${CHOICE_NAMES.map(
          (name) => `
          <button class="choice-btn" type="button" data-choice="${name}" data-pos="${CHOICES[name].pos}" aria-label="Choose ${name}">
            <img class="icon" src="/images/icon-${name}.svg" alt="">
          </button>`
        ).join("")}
      </div>
    `;
  }

  /* ------------------------------------------------------------ */
  /* Rendering: "thinking" screen (house choosing)                 */
  /* ------------------------------------------------------------ */
  function renderThinking(userChoice) {
    board.innerHTML = `
      <div class="reveal">
        <div class="reveal-header">
          <span>You picked</span>
          <span>The house picked</span>
        </div>
        <div class="reveal-row">
          <div class="reveal-side reveal-side--you">
            ${resultSlotMarkup(userChoice)}
          </div>
          <span></span>
          <div class="reveal-side reveal-side--house">
            <div class="thinking" aria-label="The house is choosing">
              <div class="dots"><span></span><span></span><span></span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ------------------------------------------------------------ */
  /* Rendering: final result screen                                */
  /* ------------------------------------------------------------ */
  function renderResult(userChoice, houseChoice, outcome) {
    const userWinnerClass = outcome === "win" ? "winner" : outcome === "lose" ? "loser" : "";
    const houseWinnerClass = outcome === "lose" ? "winner" : outcome === "win" ? "loser" : "";
    const message = outcome === "win" ? "You win" : outcome === "lose" ? "You lose" : "It's a tie";

    board.innerHTML = `
      <div class="reveal">
        <div class="reveal-header">
          <span>You picked</span>
          <span>The house picked</span>
        </div>
        <div class="reveal-row">
          <div class="reveal-side reveal-side--you">
            ${resultSlotMarkup(userChoice, userWinnerClass)}
          </div>
          <div class="outcome">
            <p class="outcome-text" data-result="${outcome}">${message}</p>
            <button class="play-again" type="button" id="playAgain">Play again</button>
          </div>
          <div class="reveal-side reveal-side--house">
            ${resultSlotMarkup(houseChoice, houseWinnerClass)}
          </div>
        </div>
      </div>
    `;

    document.getElementById("playAgain").addEventListener("click", renderPicker);
  }

  function resultSlotMarkup(choice, extraClass) {
    return `
      <div class="result-slot ${extraClass || ""}" data-choice="${choice}">
        <div class="puck">
          <img class="icon" src="/images/icon-${choice}.svg" alt="${choice}">
        </div>
      </div>
    `;
  }

  /* ------------------------------------------------------------ */
  /* Game logic                                                    */
  /* ------------------------------------------------------------ */
  function play(userChoice) {
    if (busy) return;
    busy = true;

    const houseChoice = CHOICE_NAMES[Math.floor(Math.random() * CHOICE_NAMES.length)];

    renderThinking(userChoice);

    setTimeout(function () {
      let outcome;
      if (userChoice === houseChoice) {
        outcome = "tie";
      } else if (CHOICES[userChoice].beats[houseChoice]) {
        outcome = "win";
      } else {
        outcome = "lose";
      }

      if (outcome === "win") {
        setScore(score + 1);
      }

      renderResult(userChoice, houseChoice, outcome);
      busy = false;
    }, 900);
  }

  // Event delegation: one listener handles every choice button,
  // including ones re-rendered after "play again".
  board.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-choice]");
    if (btn && board.contains(btn) && btn.tagName === "BUTTON") {
      play(btn.dataset.choice);
    }
  });

  /* ------------------------------------------------------------ */
  /* Rules modal                                                   */
  /* ------------------------------------------------------------ */
  function buildRulesList() {
    const rows = [];
    CHOICE_NAMES.forEach((name) => {
      Object.keys(CHOICES[name].beats).forEach((beaten) => {
        rows.push({ a: name, verb: CHOICES[name].beats[beaten], b: beaten });
      });
    });
    rulesList.innerHTML = rows
      .map(
        (r) => `
        <li>
          <span class="r-choice">${r.a}</span>
          <svg class="r-arrow"><use href="#icon-arrow"></use></svg>
          <span class="r-verb">${r.verb}</span>
          <svg class="r-arrow"><use href="#icon-arrow"></use></svg>
          <span class="r-choice">${r.b}</span>
        </li>`
      )
      .join("");
  }

  function openRules() {
    rulesOverlay.hidden = false;
    closeRules.focus();
    document.addEventListener("keydown", onRulesKeydown);
  }

  function hideRules() {
    rulesOverlay.hidden = true;
    document.removeEventListener("keydown", onRulesKeydown);
    rulesButton.focus();
  }

  function onRulesKeydown(event) {
    if (event.key === "Escape") hideRules();
  }

  rulesButton.addEventListener("click", openRules);
  closeRules.addEventListener("click", hideRules);
  rulesOverlay.addEventListener("click", function (event) {
    if (event.target === rulesOverlay) hideRules();
  });

  /* ------------------------------------------------------------ */
  /* Init                                                          */
  /* ------------------------------------------------------------ */
  buildRulesList();
  renderPicker();
})();