document.addEventListener("DOMContentLoaded", () => {
  let gameEnded = false;

  const gameGrid = document.getElementById("game-grid");
  const rows = gameGrid.getElementsByClassName("grid");
  let currentRow = 0;
  let currentCol = 0;

  const MAX_COLS = 5;
  const MAX_ROWS = 6;
  const keys = "QWERTYUIOPASDFGHJKLZXCVBNM";

  const classes = {
    base: [
      "text-white",
      "font-[Mitr]",
      "cursor-pointer",
      "font-semibold",
      "rounded-md",
      "opacity-100",
    ],
    button: [
      "p-2",
      "text-white",
      "w-10",
      "h-10",
      "bg-slate-600",
      "rounded",
      "font-semibold",
      "font-[Mitr]",
      "last:w-fit",
    ],
    correct: ["bg-lime-500", "border-lime-500"],
    present: ["bg-yellow-500", "border-yellow-500"],
    used: ["bg-slate-900", "border-slate-900", "bg-opacity-30"],
    incorrect: ["bg-slate-500", "border-slate-500"],
    active: ["bg-transparent", "border-slate-500"],
    focus: ["border-white"],
  };

  function applyClass(element, type) {
    element.classList.remove(...Object.values(classes).flat());
    element.classList.add(...classes.base, ...classes[type]);
  }

  const keyboard = document.getElementById("keyboard");
  const keyboardButtons = document.getElementById("keyboard-buttons");

  function createKeyboardButton(text, key) {
    const button = document.createElement("button");
    button.textContent = text;
    button.dataset.key = key;
    button.classList.add(...classes.button);
    keyboardButtons.appendChild(button);
  }

  const updatedKeys = [...keys].slice(0, 19)
    .concat(["BACKSPACE"])
    .concat([...keys].slice(19))
    .concat(["ENTER"]);

  updatedKeys.forEach((key) => {
    createKeyboardButton(key === "BACKSPACE" ? "←" : key, key);
  });

  function updateFocus() {
    Array.from(rows[currentRow].children).forEach((cell, index) => {
      applyClass(
        cell,
        index === currentCol ? "focus" : "active",
      );
    });
  }

  function handleBackspace() {
    const cell = rows[currentRow].children[currentCol];
    if (cell.textContent !== "") {
      cell.textContent = "";
    }
    if (currentCol > 0) {
      currentCol--;
    }
    updateFocus();
  }

  async function handleEnter() {
    const word = Array.from(rows[currentRow].children).map((cell) =>
      cell.textContent.trim()
    ).join("");
    if (!isValidWord(word)) {
      shakeRow(currentRow);
      return;
    }
    await Promise.all(
      chosen.map((chosenWord) => flipCells(currentRow, chosenWord)),
    );

    if (chosen.includes(word)) {
      gameEnded = true;
      await fetchModal();
    } else if (currentRow + 1 < MAX_ROWS) {
      currentRow++;
      currentCol = 0;
      updateFocus();
    }
  }

  let wordSet = new Set();

  fetch("./wordlist").then((res) => res.text())
    .then((data) => {
      wordSet = new Set(
        data.split("\n").map((word) => word.trim().toUpperCase()),
      );
    });

  const isValidWord = (word) => wordSet.has(word.toUpperCase());

  const params = new URLSearchParams(globalThis.location.search);
  const q = params.get("q") ?? 1;

  async function fetchWord() {
    const res = await fetch("/word");
    const word = await res.text();
    return word;
  }

  const chosen = [];

  async function startGame() {
    for (let i = 0; i < q; i++) {
      chosen.push(await fetchWord());
    }
  }

  function shakeRow(rowIndex) {
    Array.from(rows[rowIndex].children).forEach((cell) => {
      cell.classList.add("animate-bounce");
      setTimeout(() => {
        cell.classList.remove("animate-bounce");
      }, 500);
    });
  }

  function flipCells(rowIndex, chosenWord) {
    const row = rows[rowIndex].children;
    const wordArray = Array.from(row).map((cell) => cell.textContent.trim());

    const flipPromises = wordArray.map((letter, index) => {
      const cell = row[index];
      const keyboardKey = keyboard.querySelector(
        `[data-key="${letter}"]`,
      );

      return new Promise((resolve) => {
        setTimeout(() => {
          if (chosenWord[index] === letter) {
            applyClass(cell, "correct");
            applyClass(
              keyboardKey,
              "correct",
            );
          } else if (
            chosenWord.includes(letter)
          ) {
            applyClass(cell, "present");
            if (
              !keyboardKey.classList
                .contains(
                  "bg-lime-500",
                )
            ) {
              applyClass(
                keyboardKey,
                "present",
              );
            }
          } else {
            applyClass(cell, "incorrect");
            applyClass(keyboardKey, "used");
          }
          resolve();
        }, index * 450);
      });
    });

    return Promise.all(flipPromises);
  }

  function selectCell(rowIndex, colIndex) {
    currentRow = rowIndex;
    currentCol = colIndex;
    updateFocus();
  }

  function write(value) {
    if (gameEnded) return;
    if (value === "BACKSPACE") return handleBackspace();
    if (value === "ENTER") return handleEnter();

    if (keys.includes(value) && currentCol < MAX_COLS) {
      const cell = rows[currentRow].children[currentCol];
      cell.textContent = value;
      if (currentCol + 1 < MAX_COLS) currentCol++;
    }

    updateFocus();
  }

  Array.from(rows).forEach((row) => {
    row.addEventListener("click", write);
  });

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey) {
      if (
        keys.includes(event.key.toUpperCase()) ||
        ["BACKSPACE", "ENTER"].includes(
          event.key.toUpperCase(),
        )
      ) {
        return;
      }
    }
    const key = event.key.toUpperCase();
    if (
      keys.includes(key) ||
      ["BACKSPACE", "ENTER"].includes(key)
    ) write(key);
  });

  keyboard.addEventListener("click", (event) => {
    const key = event.target.dataset.key;
    if (key) write(key);
  });

  Array.from(rows).forEach((row, rowIndex) => {
    row.addEventListener("click", (event) => {
      const cellIndex = Array.from(row.children).indexOf(
        event.target,
      );
      if (cellIndex !== -1) selectCell(rowIndex, cellIndex);
    });
  });

  updateFocus();
  startGame();

  async function fetchModal() {
    const res = await fetch("./modal.html");
    const modal = await res.text();

    const modalElement = document.getElementById("modal");
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = modal;

    modalElement.appendChild(tempDiv.firstElementChild);

    let word = "";
    const row = rows[currentRow].children;

    for (let i = 0; i < row.length; i++) {
      word += row[i].textContent.trim();
    }

    const resultMessage = document.getElementById(
      "game-result-message",
    );
    const attemptsText = document.getElementById("attempts-text");
    const revealedWord = document.getElementById("revealed-word");

    if (gameEnded) {
      if (chosen.includes(word)) {
        resultMessage.textContent = "Great job! You guessed the word.";
        attemptsText.textContent = `You solved it in ${
          currentRow + 1
        } attempts. Well done!`;
        revealedWord.innerHTML =
          `<span class="text-gray-500 font-semibold">The word was: </span><span id="actual-word" class="font-semibold">${word}</span>`;
        revealedWord.classList.add(
          "text-2xl",
          "font-bold",
        );
      } else {
        resultMessage.textContent = "Game Over! Better luck next time!";
        attemptsText.textContent =
          `You reached the max attempts (${MAX_ROWS}). Keep practicing!`;
        revealedWord.textContent = word;
        revealedWord.classList.add(
          "text-6xl",
          "font-extrabold",
          "text-red-500",
        );
      }
    }
  }
});
