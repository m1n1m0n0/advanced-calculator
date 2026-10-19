// ---------- State ----------
let justCalculated = false;   // true right after "=" or a scientific result
let hasError = false;         // true while an error message is shown
let memory = 0;
let history = [];

const display = document.getElementById('display');
const historyList = document.getElementById('historyList');
const OPERATORS = ['+', '-', '*', '/', '^'];

// ---------- Error handling ----------
function showError(message) {
  display.value = message;
  display.classList.add('error');
  hasError = true;
  justCalculated = false;
}

// Called at the start of every key press: error clears automatically.
function clearErrorIfAny() {
  if (hasError) {
    display.value = '0';
    display.classList.remove('error');
    hasError = false;
    justCalculated = false;
  }
}

// ---------- Core (class functions) ----------
function clearDisplay() {
  clearErrorIfAny();
  display.value = '0';
  justCalculated = false;
}

function addValue(value) {
  clearErrorIfAny();
  const isOp = OPERATORS.includes(value);
  if (justCalculated && !isOp) display.value = '0';   // start new number after a result
  justCalculated = false;

  if (display.value === '0' && !isOp && value !== '.') {
    display.value = value;
    return;
  }
  if (display.value === '0' && value === '-') { display.value = '-'; return; }   // allow a leading minus
  const last = display.value.slice(-1);
  if (isOp && OPERATORS.includes(last)) {              // replace repeated operator
    display.value = display.value.slice(0, -1) + value;
    return;
  }
  display.value += value;
}

function backspace() {
  clearErrorIfAny();
  display.value = display.value.length > 1 ? display.value.slice(0, -1) : '0';
}

// Safe expression evaluator (no eval): supports + - * / ^ and unary minus.
function evaluate(expr) {
  const tokens = expr.match(/\d*\.?\d+(?:e[+-]?\d+)?|[+\-*/^]/gi);
  if (!tokens) throw new Error('Invalid');
  const out = [], ops = [];
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  let prev = null;
  for (let t of tokens) {
    if (!OPERATORS.includes(t)) { out.push(parseFloat(t)); prev = 'num'; continue; }
    if (t === '-' && prev !== 'num') {                 // unary minus
      out.push(0); ops.push('u'); prev = 'op'; continue;
    }
    while (ops.length) {
      const top = ops[ops.length - 1];
      const tp = top === 'u' ? 1 : prec[top];
      if (tp > prec[t] || (tp === prec[t] && t !== '^')) out.push(ops.pop()); else break;
    }
    ops.push(t); prev = 'op';
  }
  while (ops.length) out.push(ops.pop());
  const st = [];
  for (const t of out) {
    if (typeof t === 'number') { st.push(t); continue; }
    const b = st.pop(), a = st.pop();
    if (a === undefined || b === undefined) throw new Error('Invalid');
    switch (t) {
      case '+': case 'u': st.push(t === 'u' ? a - b : a + b); break;
      case '-': st.push(a - b); break;
      case '*': st.push(a * b); break;
      case '/':
        if (b === 0) throw new Error('DIV0');
        st.push(a / b); break;
      case '^': st.push(Math.pow(a, b)); break;
    }
  }
  if (st.length !== 1) throw new Error('Invalid');
  return st[0];
}

function formatNumber(n) {
  return String(parseFloat(n.toPrecision(12)));
}

function checkResult(n) {
  if (Number.isNaN(n)) { showError('Invalid input'); return false; }
  if (!Number.isFinite(n)) { showError('Result too large'); return false; }
  return true;
}

function calculate() {
  clearErrorIfAny();
  const expression = display.value;
  if (OPERATORS.includes(expression.slice(-1))) return;   // incomplete expression
  try {
    const result = evaluate(expression);
    if (!checkResult(result)) return;
    const text = formatNumber(result);
    if (expression !== text) addHistory(expression, text);
    display.value = text;
    justCalculated = true;
  } catch (e) {
    showError(e.message === 'DIV0' ? 'Cannot divide by 0' : 'Invalid input');
  }
}

// ---------- Scientific operations ----------
function currentNumber() {
  // Works on the whole display value (after calculating if an expression is present).
  if (/[+*/^]|.-/.test(display.value)) { calculate(); if (hasError) return null; }
  return parseFloat(display.value);
}

function percentage() {
  clearErrorIfAny();
  const n = currentNumber();
  if (n === null) return;
  const r = n / 100;
  addHistory(n + '%', formatNumber(r));
  display.value = formatNumber(r);
  justCalculated = true;
}

function toggleSign() {
  clearErrorIfAny();
  const n = currentNumber();
  if (n === null || n === 0) return;
  display.value = formatNumber(-n);
  justCalculated = true;
}

function squareRoot() {
  clearErrorIfAny();
  const n = currentNumber();
  if (n === null) return;
  if (n < 0) { showError('Invalid input'); return; }
  const r = Math.sqrt(n);
  addHistory('√' + n, formatNumber(r));
  display.value = formatNumber(r);
  justCalculated = true;
}

function square() {
  clearErrorIfAny();
  const n = currentNumber();
  if (n === null) return;
  const r = n * n;
  if (!checkResult(r)) return;
  addHistory(n + '²', formatNumber(r));
  display.value = formatNumber(r);
  justCalculated = true;
}

// ---------- Memory (bonus) ----------
function memoryValue() {
  const n = currentNumber();
  return n === null ? null : n;
}
function memoryClear() { clearErrorIfAny(); memory = 0; }
function memoryRecall() {
  clearErrorIfAny();
  display.value = formatNumber(memory);
  justCalculated = true;
}
function memoryAdd() { clearErrorIfAny(); const n = memoryValue(); if (n !== null) memory += n; justCalculated = true; }
function memorySubtract() { clearErrorIfAny(); const n = memoryValue(); if (n !== null) memory -= n; justCalculated = true; }

// ---------- History log ----------
function addHistory(expression, result) {
  history.unshift({ expression, result });
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = '';
  if (history.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No calculations yet';
    historyList.appendChild(li);
    return;
  }
  history.forEach(item => {
    const li = document.createElement('li');
    const pretty = item.expression.replace(/\*/g, '×').replace(/\//g, '÷');
    li.textContent = pretty + ' = ' + item.result;
    li.title = 'Click to reload ' + item.result;
    li.onclick = () => {
      clearErrorIfAny();
      display.value = item.result;
      justCalculated = true;
    };
    historyList.appendChild(li);
  });
}

function clearHistory() {
  history = [];
  renderHistory();
}

// ---------- Theme (dark / light) ----------
function toggleTheme() {
  const dark = document.body.classList.toggle('dark');
  document.getElementById('themeToggle').textContent = dark ? 'Switch to Light' : 'Switch to Dark';
}

// ---------- Keyboard support ----------
document.addEventListener('keydown', function (event) {
  const key = event.key;
  if ('0123456789.+-*/^'.includes(key) && key.length === 1) addValue(key);
  else if (key === 'Enter' || key === '=') { event.preventDefault(); calculate(); }
  else if (key === 'Escape') clearDisplay();
  else if (key === 'Backspace') backspace();
  else if (key === '%') percentage();
});

renderHistory();

if (typeof module !== 'undefined') module.exports = { evaluate };
