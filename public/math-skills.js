// =========================================================
// Adaptive Math Assessment Engine — Skill Registry
// =========================================================
// Each skill provides:
//   grade   : 'K' | '1' | '2' | '3' | '4' | '5'
//   name    : display name
//   intro   : multi-line teacher explanation shown on first encounter
//   generate(): returns { question, options, answerIndex, explain }
//               explain is a per-question step-by-step solution shown
//               when the player gets that specific question wrong.
// =========================================================

const MATH = {
  rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  distractors(target, count, min, max) {
    const out = [];
    const tried = new Set([target]);
    let safety = 60;
    while (out.length < count && safety-- > 0) {
      const offset = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
      let cand = target + offset;
      if (cand < min || cand > max || tried.has(cand)) cand = MATH.rand(min, max);
      if (!tried.has(cand)) { tried.add(cand); out.push(cand); }
    }
    while (out.length < count) {
      const cand = MATH.rand(min, max);
      if (!tried.has(cand)) { tried.add(cand); out.push(cand); }
      else if (tried.size > max - min + 1) break;
    }
    return out;
  },
  mc(answer, distractorPool) {
    const all = MATH.shuffle([answer, ...distractorPool]).map(String);
    return { options: all, answerIndex: all.indexOf(String(answer)) };
  },
  countUp(from, by, steps) {
    const list = [];
    for (let i = 1; i <= steps; i++) list.push(from + i * by);
    return list.join(', ');
  }
};

const NAMES = ['Emma', 'Liam', 'Ava', 'Noah', 'Mia', 'Ben', 'Zoe', 'Kai'];
const ITEMS_ADD = [['apples', '🍎'], ['stickers', '⭐'], ['cars', '🚗'], ['cookies', '🍪'], ['blocks', '🧱']];
const ITEMS_SUB = [['cookies', '🍪'], ['balloons', '🎈'], ['marbles', '🔵'], ['crackers', '🟫']];
const pick = arr => arr[MATH.rand(0, arr.length - 1)];

const MATH_SKILLS = {

  // ============================================================
  // KINDERGARTEN
  // ============================================================
  'k-count-objects': {
    grade: 'K', name: 'Counting Objects',
    intro:
      `Counting tells us how many things we have.\n\n` +
      `Point to each item one at a time and say a number, starting at 1.\n` +
      `The LAST number you say is the total.\n\n` +
      `Example: 🍎🍎🍎 → "1, 2, 3" → 3 apples.`,
    generate() {
      const n = MATH.rand(1, 10);
      const e = ['🍎', '⭐', '🐠', '🪙', '🎈', '🐶', '🌸'][MATH.rand(0, 6)];
      return {
        question: `How many ${e}?\n${e.repeat(n)}`,
        explain: `Touch each ${e} and count: ${Array.from({length: n}, (_, i) => i + 1).join(', ')}.\nThere are ${n} ${e}.`,
        ...MATH.mc(n, MATH.distractors(n, 3, Math.max(0, n - 3), n + 3))
      };
    }
  },

  'k-count-forward': {
    grade: 'K', name: 'Count Forward',
    intro:
      `Numbers go in order: 1, 2, 3, 4, 5...\n\n` +
      `"After" means the very next number.\n` +
      `After 3 comes 4. After 7 comes 8.\n\n` +
      `Tip: think of the number, then say the next one out loud.`,
    generate() {
      const s = MATH.rand(1, 19);
      const ans = s + 1;
      return {
        question: `What number comes after ${s}?`,
        explain: `Start at ${s} and add 1 more → ${s} + 1 = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, Math.max(0, ans - 3), ans + 3))
      };
    }
  },

  'k-count-backward': {
    grade: 'K', name: 'Count Backward',
    intro:
      `Counting back means going DOWN: 10, 9, 8, 7...\n\n` +
      `"Before" means the number that comes one earlier.\n` +
      `Before 5 is 4. Before 10 is 9.\n\n` +
      `Tip: take the number and subtract 1.`,
    generate() {
      const s = MATH.rand(2, 20);
      const ans = s - 1;
      return {
        question: `What number comes before ${s}?`,
        explain: `Take ${s} and subtract 1 → ${s} - 1 = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, Math.max(0, ans - 3), ans + 3))
      };
    }
  },

  'k-compare-numbers': {
    grade: 'K', name: 'Comparing Numbers',
    intro:
      `When we compare two numbers we ask: which is bigger?\n\n` +
      `Numbers further to the right when counting (1, 2, 3...) are bigger.\n` +
      `9 is bigger than 4 because 9 comes later when you count.\n\n` +
      `Trick: picture two stacks — the taller stack is the bigger number.`,
    generate() {
      let a = MATH.rand(1, 10), b = MATH.rand(1, 10);
      while (b === a) b = MATH.rand(1, 10);
      const big = Math.max(a, b);
      const opts = [String(a), String(b), 'They are equal'];
      return {
        question: `Which is bigger: ${a} or ${b}?`,
        explain: `Count up: ${big} comes later than ${a + b - big}, so ${big} is bigger.`,
        options: opts,
        answerIndex: opts.indexOf(String(big))
      };
    }
  },

  'k-compare-symbol': {
    grade: 'K', name: 'Greater / Less Than',
    intro:
      `Three symbols compare numbers:\n` +
      `   >   means "greater than" (left is bigger)\n` +
      `   <   means "less than"    (left is smaller)\n` +
      `   =   means "equal"        (same number)\n\n` +
      `Trick: the open mouth of >  or  <  always eats the BIGGER number.\n` +
      `Example: 7 > 3  (mouth eats the 7).`,
    generate() {
      const a = MATH.rand(1, 10), b = MATH.rand(1, 10);
      const sym = a > b ? '>' : a < b ? '<' : '=';
      return {
        question: `${a} ___ ${b}`,
        explain: `${a} is ${a > b ? 'bigger than' : a < b ? 'less than' : 'equal to'} ${b}, so the symbol is "${sym}".`,
        options: ['>', '<', '='],
        answerIndex: ['>', '<', '='].indexOf(sym)
      };
    }
  },

  'k-add-within-5': {
    grade: 'K', name: 'Addition within 5',
    intro:
      `Addition puts two groups together to make a bigger group.\n\n` +
      `"2 + 3" means: start with 2, then count 3 more.\n` +
      `Use your fingers!  ✋ Hold up 2 fingers, then 3 more = 5.\n\n` +
      `The "+" symbol means add.  "=" means the same as.`,
    generate() {
      const a = MATH.rand(0, 4);
      const b = MATH.rand(0, 5 - a);
      const ans = a + b;
      return {
        question: `${a} + ${b} = ?`,
        explain: `Start with ${a}. Now count ${b} more${b > 0 ? `: ${Array.from({length: b}, (_, i) => a + i + 1).join(', ')}` : ''}.\nSo ${a} + ${b} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 6))
      };
    }
  },

  'k-add-within-10': {
    grade: 'K', name: 'Addition within 10',
    intro:
      `Now we add bigger numbers — totals up to 10.\n\n` +
      `Strategy: start with the bigger number and count up.\n` +
      `"4 + 5" → start at 5, count 4 more → 6, 7, 8, 9.\n\n` +
      `Ten frames (a 2×5 box) help — fill the boxes to see the answer.`,
    generate() {
      const a = MATH.rand(1, 9);
      const b = MATH.rand(1, 10 - a);
      const ans = a + b;
      const big = Math.max(a, b), sm = Math.min(a, b);
      return {
        question: `${a} + ${b} = ?`,
        explain: `Start at the bigger number ${big}. Count up ${sm}: ${Array.from({length: sm}, (_, i) => big + i + 1).join(', ')}.\nSo ${a} + ${b} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 12))
      };
    }
  },

  'k-sub-within-5': {
    grade: 'K', name: 'Subtraction within 5',
    intro:
      `Subtraction takes away.  "5 - 2" means: start with 5 things, take 2 away.\n\n` +
      `Try drawing dots: ●●●●●  Now cross out 2 → ●●●❌❌  → 3 left.\n\n` +
      `The "-" symbol means subtract or take away.`,
    generate() {
      const a = MATH.rand(1, 5);
      const b = MATH.rand(0, a);
      const ans = a - b;
      return {
        question: `${a} - ${b} = ?`,
        explain: `Draw ${a} dots. Cross out ${b} of them. ${ans} dots are left.\nSo ${a} - ${b} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 6))
      };
    }
  },

  'k-sub-within-10': {
    grade: 'K', name: 'Subtraction within 10',
    intro:
      `Subtraction within 10 — take away from groups up to 10.\n\n` +
      `Strategy: count BACKWARD from the first number.\n` +
      `"9 - 4" → start at 9, count back 4: 8, 7, 6, 5.\n\n` +
      `Fingers work great here too!`,
    generate() {
      const a = MATH.rand(2, 10);
      const b = MATH.rand(0, a);
      const ans = a - b;
      return {
        question: `${a} - ${b} = ?`,
        explain: `Start at ${a} and count back ${b}: ${Array.from({length: b}, (_, i) => a - i - 1).join(', ') || '(no steps back)'}.\nSo ${a} - ${b} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 12))
      };
    }
  },

  'k-make-10': {
    grade: 'K', name: 'Make 10',
    intro:
      `Making 10 is a SUPER POWER for math.\n\n` +
      `We ask: what plus this number gets us to 10?\n` +
      `Pairs that make 10:  1+9, 2+8, 3+7, 4+6, 5+5\n\n` +
      `Trick: use both hands. Hold up the number on one hand. The fingers DOWN are how many you need to make 10.`,
    generate() {
      const a = MATH.rand(1, 9);
      const ans = 10 - a;
      return {
        question: `${a} + ___ = 10`,
        explain: `Ten fingers total. ${a} are up, so ${ans} are down.\n${a} + ${ans} = 10.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 12))
      };
    }
  },

  'k-decompose': {
    grade: 'K', name: 'Number Bonds',
    intro:
      `Numbers can be broken into smaller parts. We call this a "number bond."\n\n` +
      `Example: 5 can be 1+4, 2+3, or 5+0.  All make 5!\n\n` +
      `If you know one part and the whole, the other part = whole - part.\n` +
      `7 = 3 + ?  →  7 - 3 = 4.  So the missing part is 4.`,
    generate() {
      const total = MATH.rand(3, 10);
      const part = MATH.rand(1, total - 1);
      const ans = total - part;
      return {
        question: `${total} = ${part} + ___`,
        explain: `Whole = ${total}. One part = ${part}. Missing part = ${total} - ${part} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, total + 2))
      };
    }
  },

  'k-word-add': {
    grade: 'K', name: 'Word Problems: Add',
    intro:
      `Word problems use words instead of just numbers.\n\n` +
      `Look for clue words like "more", "altogether", "in all".\n` +
      `Those mean ADD.\n\n` +
      `Steps:\n 1) Find the two numbers.\n 2) Add them.\n 3) Check the units (apples, cars, etc).`,
    generate() {
      const n = pick(NAMES);
      const [item] = pick(ITEMS_ADD);
      const a = MATH.rand(1, 6);
      const b = MATH.rand(1, 10 - a);
      const ans = a + b;
      return {
        question: `${n} has ${a} ${item}. ${n} gets ${b} more. How many ${item} now?`,
        explain: `"more" tells us to add.\n${a} + ${b} = ${ans} ${item}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 12))
      };
    }
  },

  'k-word-sub': {
    grade: 'K', name: 'Word Problems: Subtract',
    intro:
      `When word problems say "left", "gave away", "ate", "lost" → SUBTRACT.\n\n` +
      `Steps:\n 1) Find the starting number.\n 2) Find the amount taken away.\n 3) Subtract.\n\n` +
      `Tip: it usually means the answer is SMALLER than what you started with.`,
    generate() {
      const n = pick(NAMES);
      const [item] = pick(ITEMS_SUB);
      const a = MATH.rand(3, 10);
      const b = MATH.rand(1, a);
      const ans = a - b;
      return {
        question: `${n} has ${a} ${item}. ${b} are gone. How many ${item} left?`,
        explain: `"gone" tells us to subtract.\n${a} - ${b} = ${ans} ${item} left.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 12))
      };
    }
  },

  'k-shapes': {
    grade: 'K', name: 'Shapes',
    intro:
      `Shapes have SIDES (straight edges) and CORNERS.\n\n` +
      `🔺 Triangle: 3 sides\n` +
      `🟦 Square: 4 sides (all the same length)\n` +
      `⬟ Pentagon: 5 sides\n` +
      `⬡ Hexagon: 6 sides\n` +
      `⚪ Circle: 0 sides (it's a smooth curve)`,
    generate() {
      const shapes = [
        { name: 'triangle', sides: 3, emoji: '🔺' },
        { name: 'square', sides: 4, emoji: '🟦' },
        { name: 'pentagon', sides: 5, emoji: '⬟' },
        { name: 'hexagon', sides: 6, emoji: '⬡' },
        { name: 'circle', sides: 0, emoji: '⚪' }
      ];
      const s = shapes[MATH.rand(0, shapes.length - 1)];
      const opts = MATH.shuffle([0, 3, 4, 5, 6]).slice(0, 4);
      if (!opts.includes(s.sides)) opts[0] = s.sides;
      const finalOpts = MATH.shuffle(opts).map(String);
      return {
        question: `How many sides does a ${s.name} ${s.emoji} have?`,
        explain: `A ${s.name} ${s.emoji} has ${s.sides} side${s.sides === 1 ? '' : 's'}.`,
        options: finalOpts,
        answerIndex: finalOpts.indexOf(String(s.sides))
      };
    }
  },

  'k-patterns': {
    grade: 'K', name: 'Patterns',
    intro:
      `A pattern repeats! Look at what comes before to predict what comes next.\n\n` +
      `🔴🔵🔴🔵🔴___\n` +
      `The pattern is red, blue, red, blue. After red comes BLUE.\n\n` +
      `Steps:\n 1) Find the repeating unit.\n 2) Find the last item.\n 3) Predict the next.`,
    generate() {
      const pairs = [['🔴', '🔵'], ['⭐', '🌙'], ['🍎', '🍌'], ['🐶', '🐱'], ['🟥', '🟩']];
      const [a, b] = pairs[MATH.rand(0, pairs.length - 1)];
      const seq = a + b + a + b + a;
      const opts = MATH.shuffle([a, b, '⬛', '❓']);
      return {
        question: `What comes next?\n${seq} ___`,
        explain: `The pattern is ${a}${b} repeating. After ${a} comes ${b}.`,
        options: opts,
        answerIndex: opts.indexOf(b)
      };
    }
  },

  // ============================================================
  // GRADE 1
  // ============================================================
  '1-add-within-20': {
    grade: '1', name: 'Addition within 20',
    intro:
      `Grade 1: add numbers with answers up to 20.\n\n` +
      `Trick — "make a 10, then add the rest":\n` +
      `   8 + 5 = 8 + 2 + 3 = 10 + 3 = 13\n\n` +
      `Break up the second number to fill up to 10 first.`,
    generate() {
      const a = MATH.rand(5, 12);
      const b = MATH.rand(5, 20 - a);
      const ans = a + b;
      const toTen = 10 - a;
      const rest = b - toTen;
      return {
        question: `${a} + ${b} = ?`,
        explain: toTen >= 0 && rest >= 0
          ? `Make 10 first: ${a} + ${toTen} = 10. Then add the rest: 10 + ${rest} = ${ans}.`
          : `Count up from ${a}: add ${b} → ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 25))
      };
    }
  },

  '1-sub-within-20': {
    grade: '1', name: 'Subtraction within 20',
    intro:
      `Subtract bigger numbers — answers stay 0 to 20.\n\n` +
      `Trick — "back through 10":\n` +
      `   14 - 6 = 14 - 4 - 2 = 10 - 2 = 8\n\n` +
      `Break the subtraction to land on 10 first, then take the rest.`,
    generate() {
      const a = MATH.rand(11, 20);
      const b = MATH.rand(2, 9);
      const ans = a - b;
      const toTen = a - 10;
      const rest = b - toTen;
      return {
        question: `${a} - ${b} = ?`,
        explain: toTen >= 0 && rest >= 0
          ? `Subtract to 10 first: ${a} - ${toTen} = 10. Then subtract the rest: 10 - ${rest} = ${ans}.`
          : `Count back from ${a} by ${b} → ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 22))
      };
    }
  },

  '1-place-value': {
    grade: '1', name: 'Place Value (Tens & Ones)',
    intro:
      `Every 2-digit number has TENS and ONES.\n\n` +
      `47 has 4 tens (= 40) and 7 ones.   4 tens + 7 ones = 47.\n\n` +
      `The LEFT digit is tens. The RIGHT digit is ones.\n` +
      `Tip: 4 tens means 4 groups of 10.`,
    generate() {
      const n = MATH.rand(11, 99);
      const tens = Math.floor(n / 10);
      const ones = n % 10;
      const askTens = Math.random() > 0.5;
      const ans = askTens ? tens : ones;
      return {
        question: `In the number ${n}, how many ${askTens ? 'tens' : 'ones'}?`,
        explain: `${n} = ${tens} tens + ${ones} ones. There ${ans === 1 ? 'is' : 'are'} ${ans} ${askTens ? 'tens' : 'ones'}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 10))
      };
    }
  },

  '1-compare-2digit': {
    grade: '1', name: 'Comparing 2-Digit Numbers',
    intro:
      `To compare 2-digit numbers, look at TENS first.\n\n` +
      `34 vs 43: tens are 3 and 4. 4 is bigger, so 43 > 34.\n\n` +
      `If tens are the same, then compare ones.\n` +
      `47 vs 42: tens both 4, ones are 7 and 2. So 47 > 42.`,
    generate() {
      const a = MATH.rand(10, 99);
      let b = MATH.rand(10, 99);
      while (b === a) b = MATH.rand(10, 99);
      const sym = a > b ? '>' : '<';
      const ta = Math.floor(a / 10), tb = Math.floor(b / 10);
      const reason = ta === tb
        ? `Tens are equal (${ta}). Compare ones: ${a % 10} vs ${b % 10}.`
        : `Tens: ${ta} vs ${tb}. ${Math.max(ta, tb)} is bigger.`;
      return {
        question: `${a} ___ ${b}`,
        explain: `${reason}\nSo ${a} ${sym} ${b}.`,
        options: ['>', '<', '='],
        answerIndex: ['>', '<', '='].indexOf(sym)
      };
    }
  },

  '1-skip-count-2': {
    grade: '1', name: 'Skip Count by 2s',
    intro:
      `Skip counting means we count by jumps instead of by 1.\n\n` +
      `By 2s: 2, 4, 6, 8, 10, 12, 14...   (add 2 each time)\n\n` +
      `Pattern: every number is EVEN (ends in 0, 2, 4, 6, 8).`,
    generate() {
      const start = MATH.rand(1, 8) * 2;
      const ans = start + 2;
      return {
        question: `Skip count by 2s: ${start - 4}, ${start - 2}, ${start}, ___?`,
        explain: `Add 2 each time. ${start} + 2 = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 25))
      };
    }
  },

  '1-skip-count-5': {
    grade: '1', name: 'Skip Count by 5s',
    intro:
      `Count by 5s: 5, 10, 15, 20, 25, 30...   (add 5 each time)\n\n` +
      `Pattern: every number ends in 0 or 5.\n` +
      `Why useful? Counting nickels, telling time on a clock, finger groups.`,
    generate() {
      const start = MATH.rand(1, 9) * 5;
      const ans = start + 5;
      return {
        question: `Skip count by 5s: ${start - 10}, ${start - 5}, ${start}, ___?`,
        explain: `Add 5 each time. ${start} + 5 = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 60))
      };
    }
  },

  '1-skip-count-10': {
    grade: '1', name: 'Skip Count by 10s',
    intro:
      `Count by 10s: 10, 20, 30, 40, 50...   (add 10 each time)\n\n` +
      `Pattern: only the TENS digit changes. Ones digit stays 0.\n` +
      `Why useful? Counting dimes (10 cents each).`,
    generate() {
      const start = MATH.rand(1, 8) * 10;
      const ans = start + 10;
      return {
        question: `Skip count by 10s: ${start - 20}, ${start - 10}, ${start}, ___?`,
        explain: `Add 10 each time. ${start} + 10 = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 110))
      };
    }
  },

  '1-add-10': {
    grade: '1', name: 'Add 10 to a Number',
    intro:
      `Adding 10 is FAST: just bump the tens digit by 1.\n\n` +
      `23 + 10 = 33.   The ones stays the same. The tens goes up by 1.\n` +
      `47 + 10 = 57.\n\n` +
      `Why? Adding 10 is the same as adding one more group of ten.`,
    generate() {
      const n = MATH.rand(10, 80);
      const ans = n + 10;
      return {
        question: `${n} + 10 = ?`,
        explain: `Bump the tens digit by 1. ${n} → ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 100))
      };
    }
  },

  '1-fact-family': {
    grade: '1', name: 'Fact Families',
    intro:
      `Three numbers can make a FACT FAMILY of 4 facts.\n\n` +
      `Example using 3, 4, 7:\n` +
      `   3 + 4 = 7\n` +
      `   4 + 3 = 7\n` +
      `   7 - 3 = 4\n` +
      `   7 - 4 = 3\n\n` +
      `Tip: if you know the addition fact, you also know the subtraction fact!`,
    generate() {
      const a = MATH.rand(2, 9);
      const b = MATH.rand(2, 9);
      const total = a + b;
      const ans = b;
      return {
        question: `If ${a} + ${b} = ${total}, then ${total} - ${a} = ?`,
        explain: `${a} and ${b} make ${total}. Take ${a} away → the other part ${b} is left.\n${total} - ${a} = ${b}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 12))
      };
    }
  },

  '1-time-hour': {
    grade: '1', name: 'Time to the Hour',
    intro:
      `A clock has TWO hands:\n` +
      `   Short hand = HOUR\n` +
      `   Long hand  = MINUTE\n\n` +
      `When the long minute hand points to 12, it's exactly ___ o'clock.\n` +
      `The hour is whatever number the short hand points to.\n\n` +
      `If short hand is on 3, long hand on 12 → 3:00 (three o'clock).`,
    generate() {
      const h = MATH.rand(1, 12);
      const ans = h;
      return {
        question: `The hour hand points at ${h} and the minute hand points at 12. What time is it?`,
        explain: `Long hand on 12 means o'clock. Hour hand on ${h} → ${h}:00.`,
        options: [`${h}:00`, `${(h % 12) + 1}:00`, `${h}:30`, `12:${h}0`],
        answerIndex: 0
      };
    }
  },

  '1-money-coins': {
    grade: '1', name: 'Counting Coins',
    intro:
      `Coin values:\n` +
      `   🟠 Penny  = 1¢\n` +
      `   ⚪ Nickel = 5¢\n` +
      `   🪙 Dime   = 10¢\n` +
      `   🔘 Quarter= 25¢\n\n` +
      `Add up the values to find the total in cents.`,
    generate() {
      const nick = MATH.rand(0, 3);
      const pen = MATH.rand(1, 8);
      const ans = nick * 5 + pen;
      return {
        question: `You have ${nick} nickel${nick === 1 ? '' : 's'} and ${pen} penn${pen === 1 ? 'y' : 'ies'}. How many cents?`,
        explain: `${nick} × 5¢ = ${nick * 5}¢.  Plus ${pen}¢ = ${ans}¢.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 50))
      };
    }
  },

  // ============================================================
  // GRADE 2
  // ============================================================
  '2-add-2digit': {
    grade: '2', name: 'Adding 2-Digit Numbers',
    intro:
      `Stack 2-digit numbers and add the ONES column first, then TENS.\n\n` +
      `   2 7\n` +
      ` + 3 8\n` +
      ` ----\n` +
      `Ones: 7 + 8 = 15 → write 5, carry the 1 to the tens.\n` +
      `Tens: 1 + 2 + 3 = 6 → 6 5.`,
    generate() {
      const a = MATH.rand(13, 79);
      const b = MATH.rand(13, 79);
      const ans = a + b;
      const ones = (a % 10) + (b % 10);
      const carry = Math.floor(ones / 10);
      const tens = Math.floor(a / 10) + Math.floor(b / 10) + carry;
      return {
        question: `${a} + ${b} = ?`,
        explain: carry
          ? `Ones: ${a % 10} + ${b % 10} = ${ones}. Write ${ones % 10}, carry ${carry}.\nTens: ${Math.floor(a / 10)} + ${Math.floor(b / 10)} + ${carry} = ${tens}.\nAnswer: ${ans}.`
          : `Ones: ${a % 10} + ${b % 10} = ${ones}.\nTens: ${Math.floor(a / 10)} + ${Math.floor(b / 10)} = ${tens}.\nAnswer: ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 200))
      };
    }
  },

  '2-sub-2digit': {
    grade: '2', name: 'Subtracting 2-Digit Numbers',
    intro:
      `Stack and subtract ONES first, then TENS.\n\n` +
      `If the top ones digit is too small, BORROW 1 ten from the next column.\n\n` +
      `   5 2          4 12\n` +
      ` - 2 8   →    - 2  8\n` +
      ` ----         -----\n` +
      `Ones: 12 - 8 = 4.   Tens: 4 - 2 = 2 → 24.`,
    generate() {
      const a = MATH.rand(30, 99);
      const b = MATH.rand(11, a - 5);
      const ans = a - b;
      const needBorrow = (a % 10) < (b % 10);
      return {
        question: `${a} - ${b} = ?`,
        explain: needBorrow
          ? `Ones: ${a % 10} < ${b % 10}, borrow 1 ten. Now ones: ${a % 10 + 10} - ${b % 10} = ${a % 10 + 10 - (b % 10)}.\nTens: ${Math.floor(a / 10) - 1} - ${Math.floor(b / 10)} = ${Math.floor(a / 10) - 1 - Math.floor(b / 10)}.\nAnswer: ${ans}.`
          : `Ones: ${a % 10} - ${b % 10} = ${(a % 10) - (b % 10)}.\nTens: ${Math.floor(a / 10)} - ${Math.floor(b / 10)} = ${Math.floor(a / 10) - Math.floor(b / 10)}.\nAnswer: ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 100))
      };
    }
  },

  '2-place-value-hundreds': {
    grade: '2', name: 'Place Value: Hundreds',
    intro:
      `3-digit numbers have HUNDREDS, TENS, ONES.\n\n` +
      `425 → 4 hundreds + 2 tens + 5 ones = 400 + 20 + 5.\n\n` +
      `The LEFT digit is hundreds, MIDDLE is tens, RIGHT is ones.`,
    generate() {
      const h = MATH.rand(1, 9), t = MATH.rand(0, 9), o = MATH.rand(0, 9);
      const n = h * 100 + t * 10 + o;
      const askWhich = ['hundreds', 'tens', 'ones'][MATH.rand(0, 2)];
      const ans = askWhich === 'hundreds' ? h : askWhich === 'tens' ? t : o;
      return {
        question: `In the number ${n}, how many ${askWhich}?`,
        explain: `${n} = ${h} hundreds + ${t} tens + ${o} ones. There are ${ans} ${askWhich}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 10))
      };
    }
  },

  '2-even-odd': {
    grade: '2', name: 'Even or Odd',
    intro:
      `A number is EVEN if you can split it into two equal groups.\n` +
      `A number is ODD if you cannot — one is always left over.\n\n` +
      `Trick: look at the LAST digit.\n` +
      `   Ends in 0, 2, 4, 6, 8 → EVEN.\n` +
      `   Ends in 1, 3, 5, 7, 9 → ODD.`,
    generate() {
      const n = MATH.rand(10, 99);
      const ans = n % 2 === 0 ? 'Even' : 'Odd';
      return {
        question: `Is ${n} even or odd?`,
        explain: `Last digit is ${n % 10}. ${[0, 2, 4, 6, 8].includes(n % 10) ? 'Even digit → number is Even.' : 'Odd digit → number is Odd.'}`,
        options: ['Even', 'Odd'],
        answerIndex: ['Even', 'Odd'].indexOf(ans)
      };
    }
  },

  '2-repeated-add': {
    grade: '2', name: 'Repeated Addition',
    intro:
      `Adding the same number over and over is the same as MULTIPLYING.\n\n` +
      `3 + 3 + 3 + 3 = 12.   Four threes makes 12.\n` +
      `We can also write this as 4 × 3 = 12.\n\n` +
      `This is the bridge from adding to multiplying.`,
    generate() {
      const a = MATH.rand(2, 5);
      const b = MATH.rand(2, 5);
      const ans = a * b;
      const seq = Array(b).fill(a).join(' + ');
      return {
        question: `${seq} = ?`,
        explain: `${b} groups of ${a}.\nAdd: ${seq} = ${ans}.\n(Same as ${b} × ${a} = ${ans}.)`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 30))
      };
    }
  },

  '2-time-half-hour': {
    grade: '2', name: 'Time to Half-Hour',
    intro:
      `When the minute hand points to 6, it's HALF past the hour (:30).\n\n` +
      `Hour hand on 4, minute hand on 6 → 4:30 (four-thirty).\n\n` +
      `The hour hand is between the hours when it's half past.`,
    generate() {
      const h = MATH.rand(1, 12);
      const half = Math.random() > 0.5;
      const minute = half ? '6' : '12';
      const min = half ? '30' : '00';
      return {
        question: `The hour hand is just past ${h} and the minute hand is on ${minute}. What time is it?`,
        explain: `Minute hand on ${minute} means :${min}. Hour hand just past ${h} → ${h}:${min}.`,
        options: [`${h}:${min}`, `${h}:${min === '00' ? '30' : '00'}`, `${(h % 12) + 1}:${min}`, `12:${min}`],
        answerIndex: 0
      };
    }
  },

  '2-money-mix': {
    grade: '2', name: 'Mixed Coins',
    intro:
      `When counting mixed coins, start with the BIGGEST values.\n\n` +
      `Quarters (25¢), then dimes (10¢), then nickels (5¢), then pennies (1¢).\n\n` +
      `2 quarters + 1 dime + 3 pennies = 50 + 10 + 3 = 63¢.`,
    generate() {
      const q = MATH.rand(1, 3), d = MATH.rand(0, 3), p = MATH.rand(1, 6);
      const ans = q * 25 + d * 10 + p;
      return {
        question: `${q} quarter${q === 1 ? '' : 's'} + ${d} dime${d === 1 ? '' : 's'} + ${p} penn${p === 1 ? 'y' : 'ies'} = ?¢`,
        explain: `${q}×25 = ${q * 25}. ${d}×10 = ${d * 10}. ${p}×1 = ${p}.\nTotal: ${ans}¢.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 120))
      };
    }
  },

  '2-arrays': {
    grade: '2', name: 'Arrays (Rows × Columns)',
    intro:
      `An ARRAY is a rectangle of objects in rows and columns.\n\n` +
      `🟦🟦🟦🟦\n🟦🟦🟦🟦\n🟦🟦🟦🟦\n3 rows × 4 columns = 12 squares.\n\n` +
      `Rows × columns = total.`,
    generate() {
      const r = MATH.rand(2, 5), c = MATH.rand(2, 5);
      const ans = r * c;
      return {
        question: `An array has ${r} rows and ${c} columns. How many total?`,
        explain: `${r} × ${c} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 30))
      };
    }
  },

  // ============================================================
  // GRADE 3
  // ============================================================
  '3-mult-basic': {
    grade: '3', name: 'Multiplication (×2-5)',
    intro:
      `Multiplication is fast repeated addition.\n\n` +
      `4 × 3 = "four groups of three" = 3 + 3 + 3 + 3 = 12.\n\n` +
      `Memorize multiplication facts — they're the building blocks of math!\n` +
      `Start with ×2 (double it) and ×5 (count by 5s).`,
    generate() {
      const a = MATH.rand(2, 5), b = MATH.rand(2, 9);
      const ans = a * b;
      return {
        question: `${a} × ${b} = ?`,
        explain: `${a} groups of ${b}: ${Array(a).fill(b).join(' + ')} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 50))
      };
    }
  },

  '3-mult-tables': {
    grade: '3', name: 'Times Tables (up to 10×10)',
    intro:
      `Times tables = the multiplication facts from 1×1 up to 10×10.\n\n` +
      `Useful tricks:\n` +
      ` • ×0 = always 0\n` +
      ` • ×1 = same number\n` +
      ` • ×5: count by 5s\n` +
      ` • ×9: digits add to 9 (9×4=36 → 3+6=9)\n` +
      ` • ×10: stick a 0 on the end`,
    generate() {
      const a = MATH.rand(2, 10), b = MATH.rand(2, 10);
      const ans = a * b;
      return {
        question: `${a} × ${b} = ?`,
        explain: `${a} × ${b} = ${ans}.${b === 10 ? ' (×10 → add a zero.)' : ''}${b === 9 ? ' (×9 → digits sum to 9.)' : ''}`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 110))
      };
    }
  },

  '3-div-basic': {
    grade: '3', name: 'Division',
    intro:
      `Division shares a number into equal groups.\n\n` +
      `12 ÷ 3 = "12 split into 3 equal groups" = 4 per group.\n\n` +
      `Division is the OPPOSITE of multiplication.\n` +
      `If 3 × 4 = 12, then 12 ÷ 3 = 4 AND 12 ÷ 4 = 3.`,
    generate() {
      const b = MATH.rand(2, 10), q = MATH.rand(2, 10);
      const a = b * q;
      return {
        question: `${a} ÷ ${b} = ?`,
        explain: `What times ${b} makes ${a}? ${q}. So ${a} ÷ ${b} = ${q}.`,
        ...MATH.mc(q, MATH.distractors(q, 3, 0, 12))
      };
    }
  },

  '3-fractions-intro': {
    grade: '3', name: 'Fractions: Parts of a Whole',
    intro:
      `A fraction has TWO numbers:\n\n` +
      `   numerator     ← parts you have\n` +
      `   ----------\n` +
      `   denominator   ← total equal parts\n\n` +
      `3/4 means 3 out of 4 equal parts.\n\n` +
      `Pizza cut into 4 slices, you eat 3 → you ate 3/4 of the pizza.`,
    generate() {
      const total = MATH.rand(3, 8);
      const shaded = MATH.rand(1, total - 1);
      const ans = `${shaded}/${total}`;
      const opts = [`${shaded}/${total}`, `${total}/${shaded}`, `${shaded - 1}/${total}`, `${shaded + 1}/${total}`].slice(0, 4);
      const finalOpts = MATH.shuffle(opts);
      return {
        question: `A shape is split into ${total} equal parts. ${shaded} are shaded. What fraction is shaded?`,
        explain: `${shaded} parts shaded out of ${total} → ${shaded}/${total}.`,
        options: finalOpts,
        answerIndex: finalOpts.indexOf(ans)
      };
    }
  },

  '3-perimeter': {
    grade: '3', name: 'Perimeter',
    intro:
      `Perimeter is the distance AROUND a shape.\n\n` +
      `Add up all the side lengths.\n\n` +
      `A rectangle with sides 5 and 3: perimeter = 5 + 3 + 5 + 3 = 16.\n` +
      `Or use: P = 2 × (length + width).`,
    generate() {
      const l = MATH.rand(3, 12), w = MATH.rand(3, 12);
      const ans = 2 * (l + w);
      return {
        question: `Rectangle with length ${l} and width ${w}. Perimeter = ?`,
        explain: `P = 2 × (${l} + ${w}) = 2 × ${l + w} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 60))
      };
    }
  },

  '3-area-rect': {
    grade: '3', name: 'Area of a Rectangle',
    intro:
      `Area is the space INSIDE a shape, measured in square units.\n\n` +
      `For a rectangle: Area = length × width.\n\n` +
      `Sides 4 and 5 → area = 4 × 5 = 20 square units.\n` +
      `Picture it as 4 rows of 5 little squares — that's 20 squares.`,
    generate() {
      const l = MATH.rand(2, 12), w = MATH.rand(2, 12);
      const ans = l * w;
      return {
        question: `Rectangle ${l} × ${w}. Area = ?`,
        explain: `Area = length × width = ${l} × ${w} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 150))
      };
    }
  },

  '3-round-10': {
    grade: '3', name: 'Round to Nearest 10',
    intro:
      `Rounding makes numbers easier to work with.\n\n` +
      `To round to the nearest 10, look at the ONES digit:\n` +
      ` • 0-4 → round DOWN\n` +
      ` • 5-9 → round UP\n\n` +
      `47 → ones is 7 → round UP → 50.\n` +
      `23 → ones is 3 → round DOWN → 20.`,
    generate() {
      const n = MATH.rand(11, 99);
      const ones = n % 10;
      const ans = ones >= 5 ? n - ones + 10 : n - ones;
      return {
        question: `Round ${n} to the nearest 10.`,
        explain: `Ones digit is ${ones}, so round ${ones >= 5 ? 'UP' : 'DOWN'} → ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans / 10, 3, 0, 11).map(x => x * 10))
      };
    }
  },

  // ============================================================
  // GRADE 4
  // ============================================================
  '4-mult-multi-digit': {
    grade: '4', name: 'Multi-Digit Multiplication',
    intro:
      `Break a 2-digit number into TENS and ONES, then multiply each part.\n\n` +
      `23 × 4 = (20 × 4) + (3 × 4) = 80 + 12 = 92.\n\n` +
      `This is the "distributive property" — easier than stacking, faster than guessing.`,
    generate() {
      const a = MATH.rand(11, 49), b = MATH.rand(2, 9);
      const ans = a * b;
      const tens = Math.floor(a / 10) * 10;
      const ones = a % 10;
      return {
        question: `${a} × ${b} = ?`,
        explain: `(${tens} × ${b}) + (${ones} × ${b}) = ${tens * b} + ${ones * b} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  '4-long-div': {
    grade: '4', name: 'Long Division',
    intro:
      `Long division shares a big number into equal groups.\n\n` +
      `156 ÷ 4:\n` +
      ` 1) 4 goes into 15  → 3 times (3 × 4 = 12). 15 - 12 = 3.\n` +
      ` 2) Bring down the 6 → 36.\n` +
      ` 3) 4 goes into 36 → 9 times. 9 × 4 = 36. 0 left.\n` +
      `Answer: 39 with no remainder.`,
    generate() {
      const b = MATH.rand(2, 9), q = MATH.rand(11, 99);
      const a = b * q;
      return {
        question: `${a} ÷ ${b} = ?`,
        explain: `What × ${b} = ${a}?  ${q} × ${b} = ${a}.  So the quotient is ${q}.`,
        ...MATH.mc(q, MATH.distractors(q, 3, 0, q * 2))
      };
    }
  },

  '4-fractions-same-denom': {
    grade: '4', name: 'Add Fractions (Same Denominator)',
    intro:
      `When the bottom number (denominator) is the SAME, just add the tops (numerators).\n\n` +
      `1/4 + 2/4 = (1+2)/4 = 3/4.\n\n` +
      `Why? Each piece is the same size, so you're just counting pieces.\n` +
      `Keep the denominator. Add the numerators.`,
    generate() {
      const d = MATH.rand(3, 9);
      const a = MATH.rand(1, d - 2);
      const b = MATH.rand(1, d - a);
      const ans = `${a + b}/${d}`;
      return {
        question: `${a}/${d} + ${b}/${d} = ?`,
        explain: `Same denominator (${d}). Add tops: ${a} + ${b} = ${a + b}. Answer: ${ans}.`,
        options: MATH.shuffle([ans, `${a + b}/${d * 2}`, `${a + b + 1}/${d}`, `${a}/${d + b}`]),
        get answerIndex() { return this.options.indexOf(ans); }
      };
    }
  },

  '4-decimals-tenths': {
    grade: '4', name: 'Decimals: Tenths',
    intro:
      `A decimal like 0.7 means 7 tenths.\n\n` +
      `0.7 = 7/10.\n` +
      `0.3 = 3/10.\n\n` +
      `The first digit after the decimal point is the TENTHS place.`,
    generate() {
      const n = MATH.rand(1, 9);
      const dec = `0.${n}`;
      const ans = `${n}/10`;
      return {
        question: `Write ${dec} as a fraction.`,
        explain: `${dec} = ${n} tenths = ${n}/10.`,
        options: MATH.shuffle([`${n}/10`, `${n}/100`, `10/${n}`, `${n}/1`]),
        get answerIndex() { return this.options.indexOf(ans); }
      };
    }
  },

  '4-factors': {
    grade: '4', name: 'Factors',
    intro:
      `Factors of a number are values that divide it evenly.\n\n` +
      `Factors of 12: 1, 2, 3, 4, 6, 12.\n\n` +
      `Test: does X go into 12 evenly?  If yes, X is a factor.\n` +
      `12 ÷ 5 = 2 remainder 2 → 5 is NOT a factor.`,
    generate() {
      const n = [12, 18, 20, 24, 16, 30][MATH.rand(0, 5)];
      const factors = [];
      for (let i = 1; i <= n; i++) if (n % i === 0) factors.push(i);
      const correct = factors[MATH.rand(0, factors.length - 1)];
      const wrong = [n + 1, n - 1, correct + 2, 7].filter(x => x !== correct && (x === 7 ? n % 7 !== 0 : !factors.includes(x)));
      const opts = MATH.shuffle([correct, ...wrong.slice(0, 3)]).map(String);
      return {
        question: `Which of these is a factor of ${n}?`,
        explain: `${n} ÷ ${correct} = ${n / correct} (no remainder). So ${correct} is a factor.`,
        options: opts,
        answerIndex: opts.indexOf(String(correct))
      };
    }
  },

  '4-prime-composite': {
    grade: '4', name: 'Prime or Composite',
    intro:
      `A PRIME number has exactly 2 factors: 1 and itself.\n` +
      `A COMPOSITE number has more than 2 factors.\n\n` +
      `Primes under 20: 2, 3, 5, 7, 11, 13, 17, 19.\n` +
      `1 is neither — it only has 1 factor.\n\n` +
      `Test: does anything besides 1 and the number divide evenly? If yes → composite.`,
    generate() {
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
      const composites = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25];
      const isPrime = Math.random() > 0.5;
      const n = isPrime ? primes[MATH.rand(0, primes.length - 1)] : composites[MATH.rand(0, composites.length - 1)];
      const ans = isPrime ? 'Prime' : 'Composite';
      return {
        question: `Is ${n} prime or composite?`,
        explain: isPrime
          ? `${n} only divides evenly by 1 and ${n}. So it's prime.`
          : `${n} has factors besides 1 and ${n} (e.g. ${composites.includes(n) ? '2 or 3' : ''}). So it's composite.`,
        options: ['Prime', 'Composite'],
        answerIndex: ['Prime', 'Composite'].indexOf(ans)
      };
    }
  },

  // ============================================================
  // GRADE 5
  // ============================================================
  '5-add-fractions-diff': {
    grade: '5', name: 'Add Fractions (Different Denominators)',
    intro:
      `To add fractions with DIFFERENT denominators, find a COMMON denominator first.\n\n` +
      `1/2 + 1/3:\n` +
      ` Common denominator = 6.\n` +
      ` 1/2 = 3/6.   1/3 = 2/6.\n` +
      ` 3/6 + 2/6 = 5/6.\n\n` +
      `Multiply each fraction's top and bottom by what makes the denominator match.`,
    generate() {
      const pairs = [[2, 3, 6], [2, 4, 4], [3, 6, 6], [2, 5, 10], [3, 4, 12]];
      const [d1, d2, lcm] = pairs[MATH.rand(0, pairs.length - 1)];
      const a = MATH.rand(1, d1 - 1);
      const b = MATH.rand(1, d2 - 1);
      const na = a * (lcm / d1), nb = b * (lcm / d2);
      const sum = na + nb;
      const ans = `${sum}/${lcm}`;
      return {
        question: `${a}/${d1} + ${b}/${d2} = ?`,
        explain: `Common denominator ${lcm}. ${a}/${d1} = ${na}/${lcm}. ${b}/${d2} = ${nb}/${lcm}.\n${na}/${lcm} + ${nb}/${lcm} = ${ans}.`,
        options: MATH.shuffle([ans, `${a + b}/${d1 + d2}`, `${sum}/${lcm * 2}`, `${na + nb + 1}/${lcm}`]),
        get answerIndex() { return this.options.indexOf(ans); }
      };
    }
  },

  '5-mult-fractions': {
    grade: '5', name: 'Multiplying Fractions',
    intro:
      `Multiplying fractions is the EASIEST fraction operation:\n\n` +
      `   top × top  /  bottom × bottom\n\n` +
      `Example: 1/2 × 1/3 = (1×1)/(2×3) = 1/6.\n\n` +
      `No common denominator needed!`,
    generate() {
      const a = MATH.rand(1, 4), d1 = MATH.rand(a + 1, 6);
      const b = MATH.rand(1, 4), d2 = MATH.rand(b + 1, 6);
      const num = a * b, den = d1 * d2;
      const ans = `${num}/${den}`;
      return {
        question: `${a}/${d1} × ${b}/${d2} = ?`,
        explain: `Tops: ${a} × ${b} = ${num}.  Bottoms: ${d1} × ${d2} = ${den}.\nAnswer: ${ans}.`,
        options: MATH.shuffle([ans, `${num + 1}/${den}`, `${a + b}/${d1 + d2}`, `${num}/${den - 1}`]),
        get answerIndex() { return this.options.indexOf(ans); }
      };
    }
  },

  '5-decimal-mult': {
    grade: '5', name: 'Multiplying Decimals',
    intro:
      `Multiply decimals like whole numbers, then count decimal places.\n\n` +
      `0.5 × 0.4:\n` +
      ` Step 1: 5 × 4 = 20.\n` +
      ` Step 2: Count decimal places in BOTH numbers: 1 + 1 = 2.\n` +
      ` Step 3: Move the decimal 2 places left from 20.00 → 0.20.\n\n` +
      `Answer: 0.20 (or 0.2).`,
    generate() {
      const a = MATH.rand(2, 9), b = MATH.rand(2, 9);
      const numAns = a * b;
      const ans = (numAns / 100).toFixed(2);
      return {
        question: `0.${a} × 0.${b} = ?`,
        explain: `${a} × ${b} = ${numAns}. Decimal places: 1+1 = 2. Move the dot 2 left → ${ans}.`,
        options: MATH.shuffle([ans, (numAns / 10).toFixed(1), (numAns).toString(), (numAns / 1000).toFixed(3)]),
        get answerIndex() { return this.options.indexOf(ans); }
      };
    }
  },

  '5-order-of-ops': {
    grade: '5', name: 'Order of Operations',
    intro:
      `PEMDAS — the order to solve math expressions:\n` +
      ` P — Parentheses ( )\n` +
      ` E — Exponents x²\n` +
      ` MD — Multiply / Divide (left to right)\n` +
      ` AS — Add / Subtract (left to right)\n\n` +
      `Example: 3 + 4 × 2.   Do × first → 3 + 8 = 11.   NOT 14.`,
    generate() {
      const a = MATH.rand(2, 9), b = MATH.rand(2, 6), c = MATH.rand(2, 6);
      const ops = ['+', '-'][MATH.rand(0, 1)];
      const muls = b * c;
      const ans = ops === '+' ? a + muls : a - muls;
      return {
        question: `${a} ${ops} ${b} × ${c} = ?`,
        explain: `Do × first: ${b} × ${c} = ${muls}.\nThen: ${a} ${ops} ${muls} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, ans - 10, ans + 15))
      };
    }
  },

  '5-volume': {
    grade: '5', name: 'Volume of a Box',
    intro:
      `Volume is how much SPACE is inside a 3D shape.\n\n` +
      `For a rectangular box (cube/prism):\n` +
      `   Volume = length × width × height.\n\n` +
      `Box 2×3×4 has volume = 24 cubic units.\n` +
      `Picture stacking 24 unit cubes inside.`,
    generate() {
      const l = MATH.rand(2, 8), w = MATH.rand(2, 8), h = MATH.rand(2, 8);
      const ans = l * w * h;
      return {
        question: `Box ${l} × ${w} × ${h}. Volume = ?`,
        explain: `V = ${l} × ${w} × ${h} = ${l * w} × ${h} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  '5-exponents': {
    grade: '5', name: 'Exponents',
    intro:
      `An exponent is a SHORTCUT for repeated multiplication.\n\n` +
      `2³ = 2 × 2 × 2 = 8.\n` +
      `The small number (exponent) tells you HOW MANY times to multiply.\n` +
      `The big number (base) is what you multiply.\n\n` +
      `Special: anything to the power 1 is itself; anything to the power 0 is 1.`,
    generate() {
      const base = MATH.rand(2, 5);
      const exp = MATH.rand(2, 4);
      let ans = 1;
      for (let i = 0; i < exp; i++) ans *= base;
      return {
        question: `${base}^${exp} = ?`,
        explain: `${base}^${exp} = ${Array(exp).fill(base).join(' × ')} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  // ============================================================
  // GRADE 6
  // ============================================================
  '6-ratios': {
    grade: '6', name: 'Ratios',
    intro:
      `A RATIO compares two quantities.\n` +
      `4 dogs to 6 cats is written 4:6.\n\n` +
      `Simplify by dividing both numbers by their greatest common factor.\n` +
      `4:6 → divide by 2 → 2:3.`,
    generate() {
      const k = MATH.rand(2, 5);
      const a = MATH.rand(2, 5), b = MATH.rand(2, 5);
      const A = a * k, B = b * k;
      const ans = `${a}:${b}`;
      const opts = MATH.shuffle([`${a}:${b}`, `${A}:${B}`, `${b}:${a}`, `${a + 1}:${b}`]);
      return {
        question: `Simplify the ratio ${A} : ${B}.`,
        explain: `Both ${A} and ${B} divide by ${k}. ${A}/${k}=${a}, ${B}/${k}=${b}. So ${A}:${B} = ${a}:${b}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  '6-percent-of': {
    grade: '6', name: 'Percent of a Number',
    intro:
      `"Percent" means "per hundred". 25% = 25/100 = 0.25.\n\n` +
      `To find a percent of a number, MULTIPLY.\n` +
      `25% of 80 → 0.25 × 80 = 20.\n\n` +
      `Tricks: 10% is the number ÷ 10. 50% is ÷ 2. 25% is ÷ 4.`,
    generate() {
      const pct = [10, 20, 25, 50, 75][MATH.rand(0, 4)];
      const n = MATH.rand(2, 10) * 10;
      const ans = Math.round(pct * n / 100);
      return {
        question: `${pct}% of ${n} = ?`,
        explain: `${pct}% = ${pct}/100 = ${pct/100}.  ${pct/100} × ${n} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, n))
      };
    }
  },

  '6-int-add': {
    grade: '6', name: 'Adding Integers',
    intro:
      `Integers include negative numbers. On a number line, negatives are LEFT of 0.\n\n` +
      `Same signs → add and keep the sign.    −5 + −3 = −8.\n` +
      `Different signs → subtract and keep the sign of the BIGGER number.\n` +
      `   −7 + 3 = −4   (since 7 > 3 and 7 is negative).`,
    generate() {
      const a = MATH.rand(-10, 10), b = MATH.rand(-10, 10);
      const ans = a + b;
      return {
        question: `${a} + ${b < 0 ? `(${b})` : b} = ?`,
        explain: `Number line: start at ${a}, move ${b > 0 ? `right ${b}` : `left ${Math.abs(b)}`} → ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, ans - 5, ans + 5))
      };
    }
  },

  '6-int-sub': {
    grade: '6', name: 'Subtracting Integers',
    intro:
      `Subtraction = ADD the OPPOSITE.\n\n` +
      `   4 − (−2)   becomes   4 + 2 = 6.\n` +
      `   −5 − 3     becomes   −5 + (−3) = −8.\n\n` +
      `Trick: change minus-a-negative into plus-a-positive.`,
    generate() {
      const a = MATH.rand(-10, 10), b = MATH.rand(-10, 10);
      const ans = a - b;
      return {
        question: `${a} − ${b < 0 ? `(${b})` : b} = ?`,
        explain: `Add the opposite: ${a} − (${b}) = ${a} + (${-b}) = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, ans - 6, ans + 6))
      };
    }
  },

  '6-gcf': {
    grade: '6', name: 'Greatest Common Factor',
    intro:
      `The GCF of two numbers is the biggest number that divides BOTH evenly.\n\n` +
      `GCF(12, 18):\n` +
      ` Factors of 12 = 1, 2, 3, 4, 6, 12\n` +
      ` Factors of 18 = 1, 2, 3, 6, 9, 18\n` +
      ` Largest shared = 6.\n\n` +
      `Useful for simplifying fractions and ratios.`,
    generate() {
      const pairs = [[12, 18, 6], [8, 12, 4], [15, 20, 5], [16, 24, 8], [9, 12, 3], [20, 30, 10]];
      const [a, b, ans] = pairs[MATH.rand(0, pairs.length - 1)];
      return {
        question: `GCF of ${a} and ${b} = ?`,
        explain: `Both ${a} and ${b} divide evenly by ${ans}, and nothing larger does. GCF = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 1, Math.max(a, b)))
      };
    }
  },

  '6-eval-expr': {
    grade: '6', name: 'Evaluating Expressions',
    intro:
      `Algebra uses LETTERS that stand for numbers.\n` +
      `If we tell you what the letter equals, just SUBSTITUTE it in.\n\n` +
      `Evaluate 4x + 2 when x = 3:\n` +
      `   4(3) + 2 = 12 + 2 = 14.`,
    generate() {
      const x = MATH.rand(2, 9);
      const c1 = MATH.rand(2, 6), c2 = MATH.rand(1, 9);
      const ans = c1 * x + c2;
      return {
        question: `If x = ${x}, then ${c1}x + ${c2} = ?`,
        explain: `${c1}x = ${c1} × ${x} = ${c1 * x}.\nThen ${c1 * x} + ${c2} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, ans - 10, ans + 10))
      };
    }
  },

  '6-coord-quadrant': {
    grade: '6', name: 'Coordinate Plane Quadrants',
    intro:
      `The coordinate plane has 4 QUADRANTS, numbered I-IV counterclockwise.\n\n` +
      `   II  |  I       Quadrant signs (x, y):\n` +
      `  -----+-----        I:  (+, +)    II: (−, +)\n` +
      `   III | IV         III: (−, −)    IV: (+, −)\n\n` +
      `A point (3, −2) has positive x and negative y → Quadrant IV.`,
    generate() {
      const x = MATH.rand(1, 9) * (Math.random() > 0.5 ? 1 : -1);
      const y = MATH.rand(1, 9) * (Math.random() > 0.5 ? 1 : -1);
      const q = x > 0 && y > 0 ? 'I' : x < 0 && y > 0 ? 'II' : x < 0 && y < 0 ? 'III' : 'IV';
      return {
        question: `Which quadrant contains (${x}, ${y})?`,
        explain: `x = ${x} (${x > 0 ? '+' : '−'}), y = ${y} (${y > 0 ? '+' : '−'}). That matches Quadrant ${q}.`,
        options: ['I', 'II', 'III', 'IV'],
        answerIndex: ['I', 'II', 'III', 'IV'].indexOf(q)
      };
    }
  },

  // ============================================================
  // GRADE 7
  // ============================================================
  '7-proportions': {
    grade: '7', name: 'Solving Proportions',
    intro:
      `A proportion says two ratios are equal.\n` +
      `   a/b = c/d\n\n` +
      `To find an unknown, CROSS-MULTIPLY:\n` +
      `   3/4 = x/12  →  3 × 12 = 4x  →  36 = 4x  →  x = 9.`,
    generate() {
      const a = MATH.rand(2, 6), denomR = MATH.rand(2, 5);
      const b = a * denomR;
      const x = MATH.rand(2, 5);
      const d = b * x / a;
      const ans = a * x;
      return {
        question: `If ${a}/${b} = x/${d}, x = ?`,
        explain: `Cross-multiply: ${a} × ${d} = ${b} × x → ${a*d} = ${b}x → x = ${a*d}/${b} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  '7-percent-change': {
    grade: '7', name: 'Percent Change',
    intro:
      `% change = (new − old) / old × 100.\n\n` +
      `50 → 60: change = 10, 10/50 = 0.2 = 20% INCREASE.\n` +
      `60 → 45: drop of 15, 15/60 = 25% DECREASE.`,
    generate() {
      const old = MATH.rand(2, 10) * 10;
      const pct = [10, 20, 25, 50][MATH.rand(0, 3)];
      const increase = Math.random() > 0.5;
      const change = old * pct / 100;
      const neu = increase ? old + change : old - change;
      return {
        question: `A value changes from ${old} to ${neu}. What is the % change?`,
        explain: `Change = ${Math.abs(neu - old)}.  ${Math.abs(neu - old)}/${old} = ${pct/100} = ${pct}% (${increase ? 'increase' : 'decrease'}).`,
        options: [`${pct}%`, `${pct + 10}%`, `${Math.max(5, pct - 10)}%`, `${old}%`].map((v, i, a) => a.indexOf(v) === i ? v : v + '!').slice(0, 4),
        get answerIndex() { return this.options.indexOf(`${pct}%`); }
      };
    }
  },

  '7-int-mult': {
    grade: '7', name: 'Multiplying Integers',
    intro:
      `Sign rules for multiplying:\n` +
      `   (+)(+) = +    (−)(−) = +\n` +
      `   (+)(−) = −    (−)(+) = −\n\n` +
      `Same signs → positive. Different signs → negative.\n` +
      `(−4) × 5 = −20.   (−4) × (−5) = +20.`,
    generate() {
      const a = MATH.rand(-8, 8) || 1;
      const b = MATH.rand(-8, 8) || 1;
      const ans = a * b;
      return {
        question: `(${a}) × (${b}) = ?`,
        explain: `Signs: ${(a < 0) === (b < 0) ? 'same → positive' : 'different → negative'}.\n${Math.abs(a)} × ${Math.abs(b)} = ${Math.abs(ans)}. Final: ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, ans - 10, ans + 10))
      };
    }
  },

  '7-int-div': {
    grade: '7', name: 'Dividing Integers',
    intro:
      `Same sign rules as multiplication:\n` +
      `   Same signs → positive.   Different signs → negative.\n\n` +
      `(−18) ÷ (−3) = +6.   18 ÷ (−3) = −6.`,
    generate() {
      const b = MATH.rand(-8, 8) || 2;
      const q = MATH.rand(-7, 7) || 1;
      const a = b * q;
      return {
        question: `(${a}) ÷ (${b}) = ?`,
        explain: `Signs: ${(a < 0) === (b < 0) ? 'same → positive' : 'different → negative'}.\n${Math.abs(a)} ÷ ${Math.abs(b)} = ${Math.abs(q)}. Final: ${q}.`,
        ...MATH.mc(q, MATH.distractors(q, 3, q - 5, q + 5))
      };
    }
  },

  '7-two-step-eq': {
    grade: '7', name: 'Two-Step Equations',
    intro:
      `Undo operations in REVERSE order — undo addition/subtraction first, then multiplication/division.\n\n` +
      `2x + 3 = 11:\n` +
      ` Step 1: subtract 3 from both sides: 2x = 8.\n` +
      ` Step 2: divide both sides by 2: x = 4.\n` +
      ` Check: 2(4) + 3 = 11 ✓`,
    generate() {
      const a = MATH.rand(2, 6);
      const b = MATH.rand(1, 9);
      const x = MATH.rand(2, 9);
      const eq = a * x + b;
      return {
        question: `Solve: ${a}x + ${b} = ${eq}.  x = ?`,
        explain: `Subtract ${b}: ${a}x = ${eq - b}.\nDivide by ${a}: x = ${(eq - b)}/${a} = ${x}.`,
        ...MATH.mc(x, MATH.distractors(x, 3, 0, x * 2 + 2))
      };
    }
  },

  '7-probability': {
    grade: '7', name: 'Basic Probability',
    intro:
      `Probability = number of favorable outcomes / total outcomes.\n\n` +
      `Standard die has 6 sides. P(rolling a 4) = 1/6.\n` +
      `P(rolling an even number) = 3/6 = 1/2.\n\n` +
      `Always between 0 (impossible) and 1 (certain).`,
    generate() {
      const scenarios = [
        { q: 'rolling a 6', fav: 1 },
        { q: 'rolling an even number', fav: 3 },
        { q: 'rolling greater than 4', fav: 2 },
        { q: 'rolling less than 3', fav: 2 }
      ];
      const sc = scenarios[MATH.rand(0, scenarios.length - 1)];
      const ans = `${sc.fav}/6`;
      const opts = MATH.shuffle([ans, `6/${sc.fav}`, `${sc.fav + 1}/6`, `${sc.fav}/12`]);
      return {
        question: `On a 6-sided die, P(${sc.q}) = ?`,
        explain: `${sc.fav} favorable outcome${sc.fav === 1 ? '' : 's'} out of 6 total. P = ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  '7-circle-area': {
    grade: '7', name: 'Area of a Circle',
    intro:
      `Area of a circle = π × r².  Use π ≈ 3.14.\n\n` +
      `r = 3:  A = 3.14 × 3² = 3.14 × 9 ≈ 28.26.\n\n` +
      `r is the RADIUS — from center to edge. Diameter = 2r.`,
    generate() {
      const r = MATH.rand(2, 8);
      const ans = +(3.14 * r * r).toFixed(2);
      const opts = MATH.shuffle([String(ans), String(+(2*3.14*r).toFixed(2)), String(+(3.14*r).toFixed(2)), String(r*r)]);
      return {
        question: `Area of a circle with radius ${r}? (use π ≈ 3.14)`,
        explain: `A = π × r² = 3.14 × ${r}² = 3.14 × ${r*r} = ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(String(ans))
      };
    }
  },

  '7-circumference': {
    grade: '7', name: 'Circumference',
    intro:
      `Circumference = distance AROUND a circle.\n` +
      `   C = 2 × π × r    (or π × diameter).\n\n` +
      `r = 4:  C = 2 × 3.14 × 4 = 25.12.`,
    generate() {
      const r = MATH.rand(2, 9);
      const ans = +(2 * 3.14 * r).toFixed(2);
      const opts = MATH.shuffle([String(ans), String(+(3.14*r*r).toFixed(2)), String(+(3.14*r).toFixed(2)), String(2 * r)]);
      return {
        question: `Circumference of a circle with radius ${r}? (use π ≈ 3.14)`,
        explain: `C = 2πr = 2 × 3.14 × ${r} = ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(String(ans))
      };
    }
  },

  // ============================================================
  // GRADE 8
  // ============================================================
  '8-pythagorean': {
    grade: '8', name: 'Pythagorean Theorem',
    intro:
      `In a right triangle, the longest side (hypotenuse, opposite the right angle) is c.\n` +
      `The other two are legs, a and b.\n\n` +
      `   a² + b² = c²\n\n` +
      `Legs 3 and 4: c² = 9 + 16 = 25, so c = 5.`,
    generate() {
      const triples = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15]];
      const [a, b, c] = triples[MATH.rand(0, triples.length - 1)];
      return {
        question: `Right triangle with legs ${a} and ${b}. What is the hypotenuse?`,
        explain: `c² = ${a}² + ${b}² = ${a*a} + ${b*b} = ${a*a + b*b}.\nc = √${a*a + b*b} = ${c}.`,
        ...MATH.mc(c, MATH.distractors(c, 3, 0, c * 2))
      };
    }
  },

  '8-square-roots': {
    grade: '8', name: 'Square Roots',
    intro:
      `√n means "what number times itself = n?"\n\n` +
      `√64 = 8 because 8 × 8 = 64.\n` +
      `√81 = 9.  √100 = 10.\n\n` +
      `Memorize perfect squares: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144.`,
    generate() {
      const n = MATH.rand(2, 12);
      return {
        question: `√${n * n} = ?`,
        explain: `${n} × ${n} = ${n * n}, so √${n*n} = ${n}.`,
        ...MATH.mc(n, MATH.distractors(n, 3, 0, n * 2 + 2))
      };
    }
  },

  '8-exponent-laws': {
    grade: '8', name: 'Exponent Laws',
    intro:
      `Two key rules:\n` +
      `  MULTIPLY same base → ADD exponents:  x^a · x^b = x^(a+b)\n` +
      `  DIVIDE same base   → SUBTRACT:        x^a / x^b = x^(a−b)\n\n` +
      `x³ · x² = x^(3+2) = x⁵.   x⁵ / x² = x³.`,
    generate() {
      const base = MATH.rand(2, 4);
      const a = MATH.rand(2, 5), b = MATH.rand(1, 4);
      const ans = a + b;
      return {
        question: `Simplify ${base}^${a} × ${base}^${b}. (Give the exponent.)`,
        explain: `Same base → add exponents: ${a} + ${b} = ${ans}. Result: ${base}^${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  '8-scientific-notation': {
    grade: '8', name: 'Scientific Notation',
    intro:
      `Scientific notation: a × 10ⁿ, where 1 ≤ a < 10.\n\n` +
      `35,000 = 3.5 × 10⁴.   The exponent counts the decimal-shift places.\n` +
      `0.0042 = 4.2 × 10⁻³.`,
    generate() {
      const a = MATH.rand(1, 9);
      const n = MATH.rand(2, 5);
      const value = a * Math.pow(10, n);
      const ans = `${a} × 10^${n}`;
      const opts = MATH.shuffle([ans, `${a} × 10^${n-1}`, `${a*10} × 10^${n-1}`, `${a} × 10^${n+1}`]);
      return {
        question: `Write ${value.toLocaleString()} in scientific notation.`,
        explain: `Move the decimal ${n} places left → ${a}.0 × 10^${n} = ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  '8-slope-from-points': {
    grade: '8', name: 'Slope from Two Points',
    intro:
      `Slope (m) measures steepness: rise / run.\n\n` +
      `For (x₁, y₁) and (x₂, y₂):  m = (y₂ − y₁) / (x₂ − x₁)\n\n` +
      `(1, 2) and (3, 8): m = (8−2)/(3−1) = 6/2 = 3.`,
    generate() {
      const x1 = MATH.rand(-3, 3), y1 = MATH.rand(-3, 3);
      const dx = MATH.rand(1, 4);
      const m = MATH.rand(1, 4) * (Math.random() > 0.5 ? 1 : -1);
      const x2 = x1 + dx;
      const y2 = y1 + m * dx;
      return {
        question: `Slope through (${x1}, ${y1}) and (${x2}, ${y2}) = ?`,
        explain: `m = (${y2} − ${y1}) / (${x2} − ${x1}) = ${y2-y1}/${dx} = ${m}.`,
        ...MATH.mc(m, MATH.distractors(m, 3, m - 5, m + 5))
      };
    }
  },

  '8-function-eval': {
    grade: '8', name: 'Evaluating Functions',
    intro:
      `Functions are rules. f(x) means "plug x into the rule".\n\n` +
      `f(x) = 2x + 3.\n` +
      `f(4) = 2(4) + 3 = 11.\n` +
      `f(0) = 2(0) + 3 = 3.`,
    generate() {
      const a = MATH.rand(2, 5), b = MATH.rand(1, 9);
      const x = MATH.rand(-3, 5);
      const ans = a * x + b;
      return {
        question: `f(x) = ${a}x + ${b}. Find f(${x}).`,
        explain: `f(${x}) = ${a}(${x}) + ${b} = ${a*x} + ${b} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, ans - 8, ans + 8))
      };
    }
  },

  '8-system-substitution': {
    grade: '8', name: 'Systems by Substitution',
    intro:
      `A system has two equations and two unknowns.\n\n` +
      `Solve one equation for a variable, then SUBSTITUTE into the other.\n\n` +
      `   y = 2x       and   x + y = 9.\n` +
      `Substitute: x + 2x = 9  →  3x = 9  →  x = 3, y = 6.`,
    generate() {
      const x = MATH.rand(1, 6);
      const k = MATH.rand(2, 4);
      const y = k * x;
      const sum = x + y;
      return {
        question: `Solve:  y = ${k}x,  x + y = ${sum}.  x = ?`,
        explain: `Substitute y = ${k}x: x + ${k}x = ${sum} → ${k+1}x = ${sum} → x = ${x}.`,
        ...MATH.mc(x, MATH.distractors(x, 3, 0, x * 2 + 2))
      };
    }
  },

  // ============================================================
  // ALGEBRA 1
  // ============================================================
  'alg1-solve-linear': {
    grade: 'Algebra 1', name: 'Solving Linear Equations',
    intro:
      `Goal: isolate x.  Whatever you do to one side, do to the other.\n\n` +
      `3x − 7 = 14:\n` +
      ` Add 7:    3x = 21.\n` +
      ` Divide 3: x = 7.\n` +
      ` Check: 3(7) − 7 = 14 ✓`,
    generate() {
      const a = MATH.rand(2, 6), b = MATH.rand(1, 9);
      const x = MATH.rand(2, 9);
      const eq = a * x - b;
      return {
        question: `Solve ${a}x − ${b} = ${eq}.  x = ?`,
        explain: `Add ${b}: ${a}x = ${eq + b}.\nDivide by ${a}: x = ${x}.`,
        ...MATH.mc(x, MATH.distractors(x, 3, 0, x * 2 + 2))
      };
    }
  },

  'alg1-slope-intercept': {
    grade: 'Algebra 1', name: 'Slope-Intercept Form',
    intro:
      `y = mx + b is slope-intercept form.\n` +
      `   m = slope (steepness).\n` +
      `   b = y-intercept (where line crosses the y-axis).\n\n` +
      `y = 2x + 3:  slope 2, y-intercept 3. Crosses y at (0, 3); rises 2 for every 1 right.`,
    generate() {
      const m = MATH.rand(-4, 4) || 2;
      const b = MATH.rand(-5, 5);
      const x = MATH.rand(-3, 4);
      const ans = m * x + b;
      const bSign = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`;
      return {
        question: `Line y = ${m}x ${bSign}. Find y when x = ${x}.`,
        explain: `y = ${m}(${x}) ${bSign} = ${m*x} ${bSign} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, ans - 8, ans + 8))
      };
    }
  },

  'alg1-foil': {
    grade: 'Algebra 1', name: 'FOIL (Multiplying Binomials)',
    intro:
      `FOIL = First, Outer, Inner, Last.\n\n` +
      `(x + 2)(x + 3):\n` +
      ` F: x · x = x²\n` +
      ` O: x · 3 = 3x\n` +
      ` I: 2 · x = 2x\n` +
      ` L: 2 · 3 = 6\n` +
      `Sum: x² + 5x + 6.`,
    generate() {
      const a = MATH.rand(1, 6), b = MATH.rand(1, 6);
      const ans = `x² + ${a+b}x + ${a*b}`;
      const opts = MATH.shuffle([ans, `x² + ${a*b}x + ${a+b}`, `x² + ${a+b}x + ${a+b}`, `x² − ${a+b}x + ${a*b}`]);
      return {
        question: `Expand (x + ${a})(x + ${b}).`,
        explain: `F: x²\nO + I: ${a}x + ${b}x = ${a+b}x\nL: ${a} × ${b} = ${a*b}\n→ ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  'alg1-factor-trinomial': {
    grade: 'Algebra 1', name: 'Factoring Trinomials',
    intro:
      `To factor x² + bx + c, find two numbers that:\n` +
      `   MULTIPLY to c\n` +
      `   ADD to b\n\n` +
      `x² + 5x + 6:  need ×=6, +=5  →  2 and 3.\n` +
      `→ (x + 2)(x + 3).`,
    generate() {
      const a = MATH.rand(1, 6), b = MATH.rand(1, 6);
      const sum = a + b, prod = a * b;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const ans = `(x + ${lo})(x + ${hi})`;
      const opts = MATH.shuffle([ans, `(x + ${sum})(x + ${prod})`, `(x − ${lo})(x − ${hi})`, `(x + ${lo+1})(x + ${hi+1})`]);
      return {
        question: `Factor x² + ${sum}x + ${prod}.`,
        explain: `Two numbers ×=${prod}, +=${sum}: ${lo} and ${hi}.\n→ ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  'alg1-quadratic-formula': {
    grade: 'Algebra 1', name: 'Quadratic Formula',
    intro:
      `For ax² + bx + c = 0:\n` +
      `   x = (−b ± √(b² − 4ac)) / (2a)\n\n` +
      `Discriminant b² − 4ac tells solution count:\n` +
      `   > 0 : 2 real solutions\n` +
      `   = 0 : 1 solution\n` +
      `   < 0 : no real solutions.`,
    generate() {
      const r1 = MATH.rand(1, 5), r2 = MATH.rand(1, 5);
      const b = -(r1 + r2), c = r1 * r2;
      const small = Math.min(r1, r2);
      const disc = b*b - 4*c;
      const root = Math.sqrt(disc);
      const bSign = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`;
      return {
        question: `Solve x² ${bSign}x + ${c} = 0. (Give the smaller solution.)`,
        explain: `Discriminant: (${b})² − 4(1)(${c}) = ${disc}. √${disc} = ${root}.\nx = (${-b} ± ${root})/2 → x = ${r1} or ${r2}. Smaller: ${small}.`,
        ...MATH.mc(small, MATH.distractors(small, 3, 0, 10))
      };
    }
  },

  'alg1-inequality': {
    grade: 'Algebra 1', name: 'Solving Inequalities',
    intro:
      `Solve like an equation, BUT: when you multiply or divide by a NEGATIVE, FLIP the inequality.\n\n` +
      `−2x < 8.\n` +
      `Divide by −2 AND flip: x > −4.`,
    generate() {
      const a = MATH.rand(2, 5);
      const x = MATH.rand(1, 6);
      const rhs = a * (x + 1);
      const ans = `x < ${x + 1}`;
      const opts = MATH.shuffle([ans, `x > ${x+1}`, `x < ${x}`, `x ≤ ${x+1}`]);
      return {
        question: `Solve ${a}x < ${rhs}. Which is correct?`,
        explain: `Divide both sides by ${a}: x < ${rhs}/${a} = ${x + 1}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  // ============================================================
  // GEOMETRY
  // ============================================================
  'geo-angle-sum-triangle': {
    grade: 'Geometry', name: 'Triangle Angle Sum',
    intro:
      `The three angles of ANY triangle sum to 180°.\n\n` +
      `Two angles given → subtract their sum from 180° for the third.\n` +
      `60° + 70° = 130°. Third = 180° − 130° = 50°.`,
    generate() {
      const a = MATH.rand(20, 80);
      const b = MATH.rand(20, 170 - a);
      const ans = 180 - a - b;
      return {
        question: `Two angles of a triangle are ${a}° and ${b}°. The third?`,
        explain: `${a} + ${b} = ${a + b}. 180 − ${a + b} = ${ans}°.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 10, 170))
      };
    }
  },

  'geo-supplementary': {
    grade: 'Geometry', name: 'Supplementary Angles',
    intro:
      `Two angles are SUPPLEMENTARY if they sum to 180°.\n` +
      `Think of a straight line — angles on a straight line add to 180°.\n\n` +
      `If one angle is 130°, its supplement is 50°.`,
    generate() {
      const a = MATH.rand(20, 160);
      const ans = 180 - a;
      return {
        question: `What is the supplement of a ${a}° angle?`,
        explain: `180 − ${a} = ${ans}°.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 10, 170))
      };
    }
  },

  'geo-area-triangle': {
    grade: 'Geometry', name: 'Area of a Triangle',
    intro:
      `Area of a triangle = ½ × base × height.\n\n` +
      `Base 8, height 5:  ½ × 8 × 5 = 20.`,
    generate() {
      const b = MATH.rand(3, 12) * 2;
      const h = MATH.rand(3, 12);
      const ans = (b * h) / 2;
      return {
        question: `Triangle with base ${b} and height ${h}. Area = ?`,
        explain: `A = ½ × ${b} × ${h} = ½ × ${b*h} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  'geo-similar-triangles': {
    grade: 'Geometry', name: 'Similar Triangles',
    intro:
      `Similar triangles have the SAME shape but different sizes. Corresponding sides are in proportion.\n\n` +
      `If a 3-4-5 triangle is similar to one with first side 6,\n` +
      `the scale factor is 6/3 = 2, so the others are 8 and 10.`,
    generate() {
      const base = MATH.rand(2, 4);
      const factor = MATH.rand(2, 4);
      const big = base * factor;
      const otherSmall = MATH.rand(2, 6);
      const ans = otherSmall * factor;
      return {
        question: `Two similar triangles. Small one has sides ${base} and ${otherSmall}. The big one has corresponding sides ${big} and ?`,
        explain: `Scale factor = ${big}/${base} = ${factor}. Missing side = ${otherSmall} × ${factor} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  'geo-volume-cylinder': {
    grade: 'Geometry', name: 'Volume of a Cylinder',
    intro:
      `Cylinder: stack of circles. Volume = base area × height.\n\n` +
      `V = π × r² × h\n\n` +
      `r = 3, h = 5:  V = 3.14 × 9 × 5 = 141.3.`,
    generate() {
      const r = MATH.rand(2, 6);
      const h = MATH.rand(2, 8);
      const ans = +(3.14 * r * r * h).toFixed(2);
      const opts = MATH.shuffle([String(ans), String(+(3.14*r*h).toFixed(2)), String(+(3.14*r*r).toFixed(2)), String(r*r*h)]);
      return {
        question: `Cylinder radius ${r}, height ${h}. Volume? (π ≈ 3.14)`,
        explain: `V = πr²h = 3.14 × ${r}² × ${h} = 3.14 × ${r*r} × ${h} = ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(String(ans))
      };
    }
  },

  'geo-distance-formula': {
    grade: 'Geometry', name: 'Distance Formula',
    intro:
      `Distance between (x₁, y₁) and (x₂, y₂):\n` +
      `   d = √((x₂−x₁)² + (y₂−y₁)²)\n\n` +
      `It's the Pythagorean theorem in coordinates.\n` +
      `(0,0) to (3,4): d = √(9+16) = √25 = 5.`,
    generate() {
      const triples = [[3, 4, 5], [6, 8, 10], [5, 12, 13]];
      const [dx, dy, d] = triples[MATH.rand(0, triples.length - 1)];
      const x1 = MATH.rand(-3, 3), y1 = MATH.rand(-3, 3);
      return {
        question: `Distance from (${x1}, ${y1}) to (${x1 + dx}, ${y1 + dy})?`,
        explain: `Δx = ${dx}, Δy = ${dy}.\nd = √(${dx}² + ${dy}²) = √(${dx*dx} + ${dy*dy}) = √${dx*dx + dy*dy} = ${d}.`,
        ...MATH.mc(d, MATH.distractors(d, 3, 0, d * 2))
      };
    }
  },

  // ============================================================
  // ALGEBRA 2
  // ============================================================
  'alg2-function-composition': {
    grade: 'Algebra 2', name: 'Function Composition',
    intro:
      `(f ∘ g)(x) means f(g(x)) — do g first, then plug result into f.\n\n` +
      `f(x) = 2x + 1, g(x) = x²:\n` +
      `(f ∘ g)(3) = f(g(3)) = f(9) = 2(9) + 1 = 19.`,
    generate() {
      const a = MATH.rand(2, 4), b = MATH.rand(1, 5);
      const x = MATH.rand(1, 4);
      const g = x * x;
      const ans = a * g + b;
      return {
        question: `f(x) = ${a}x + ${b}, g(x) = x². Find f(g(${x})).`,
        explain: `g(${x}) = ${x}² = ${g}.\nThen f(${g}) = ${a}(${g}) + ${b} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, ans - 10, ans + 10))
      };
    }
  },

  'alg2-log-eval': {
    grade: 'Algebra 2', name: 'Evaluating Logarithms',
    intro:
      `log_b(n) asks: "b to what power gives n?"\n\n` +
      `log₂(8) = 3 because 2³ = 8.\n` +
      `log₁₀(100) = 2.\n` +
      `log_b(1) = 0 always.`,
    generate() {
      const base = [2, 3, 5, 10][MATH.rand(0, 3)];
      const exp = MATH.rand(2, 4);
      const arg = Math.pow(base, exp);
      return {
        question: `log${base === 10 ? '' : '_' + base}(${arg}) = ?`,
        explain: `${arg} = ${base}^${exp}.\nlog${base === 10 ? '' : '_' + base}(${base}^${exp}) = ${exp}.`,
        ...MATH.mc(exp, MATH.distractors(exp, 3, 0, exp * 2 + 2))
      };
    }
  },

  'alg2-exp-growth': {
    grade: 'Algebra 2', name: 'Exponential Growth',
    intro:
      `Exponential growth:  y = a · b^x   where b > 1.\n\n` +
      `Start at 100, double each year. After 3 years:\n` +
      `   y = 100 · 2³ = 100 · 8 = 800.`,
    generate() {
      const a = MATH.rand(2, 6);
      const b = MATH.rand(2, 3);
      const x = MATH.rand(1, 4);
      const ans = a * Math.pow(b, x);
      return {
        question: `y = ${a} · ${b}^x. Find y when x = ${x}.`,
        explain: `${b}^${x} = ${Math.pow(b, x)}. Then ${a} × ${Math.pow(b, x)} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  'alg2-complete-square': {
    grade: 'Algebra 2', name: 'Completing the Square',
    intro:
      `For x² + bx, add (b/2)² to make a perfect square.\n\n` +
      `x² + 6x:  half of 6 is 3, 3² = 9. So x² + 6x + 9 = (x + 3)².\n\n` +
      `Useful for solving quadratics that don't factor cleanly.`,
    generate() {
      const half = MATH.rand(2, 6);
      const b = 2 * half;
      const ans = half * half;
      return {
        question: `Complete the square: x² + ${b}x + ___. What goes in the blank?`,
        explain: `Half of ${b} is ${half}. ${half}² = ${ans}.\nSo x² + ${b}x + ${ans} = (x + ${half})².`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2 + 4))
      };
    }
  },

  'alg2-rational-eval': {
    grade: 'Algebra 2', name: 'Rational Expressions',
    intro:
      `A rational expression is a fraction with polynomials.\n\n` +
      `Simplify by FACTORING and canceling matching factors:\n` +
      `   (x² − 4) / (x − 2)\n` +
      ` = ((x − 2)(x + 2)) / (x − 2)\n` +
      ` = x + 2.`,
    generate() {
      const a = MATH.rand(2, 6);
      const x = MATH.rand(a + 1, a + 5);
      const ans = x + a;
      return {
        question: `Simplify (x² − ${a*a}) / (x − ${a}), then evaluate at x = ${x}.`,
        explain: `x² − ${a*a} = (x − ${a})(x + ${a}). Cancel (x − ${a}) → x + ${a}.\nAt x = ${x}: ${x} + ${a} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  // ============================================================
  // PRE-CALCULUS
  // ============================================================
  'pc-unit-circle': {
    grade: 'Pre-Calculus', name: 'Unit Circle',
    intro:
      `Unit circle: radius 1, centered at the origin.\n\n` +
      `Key angles and (cos, sin):\n` +
      `   0°: (1, 0)\n` +
      `  30°: (√3/2, 1/2)\n` +
      `  45°: (√2/2, √2/2)\n` +
      `  60°: (1/2, √3/2)\n` +
      `  90°: (0, 1)\n\n` +
      `cos = x-coordinate. sin = y-coordinate.`,
    generate() {
      const angles = [
        { deg: 0, sin: '0', cos: '1' },
        { deg: 30, sin: '1/2', cos: '√3/2' },
        { deg: 45, sin: '√2/2', cos: '√2/2' },
        { deg: 60, sin: '√3/2', cos: '1/2' },
        { deg: 90, sin: '1', cos: '0' }
      ];
      const a = angles[MATH.rand(0, angles.length - 1)];
      const askSin = Math.random() > 0.5;
      const ans = askSin ? a.sin : a.cos;
      const pool = ['0', '1/2', '√2/2', '√3/2', '1'].filter(o => o !== ans);
      const opts = MATH.shuffle([ans, ...pool.slice(0, 3)]);
      return {
        question: `${askSin ? 'sin' : 'cos'}(${a.deg}°) = ?`,
        explain: `At ${a.deg}° on the unit circle: (cos, sin) = (${a.cos}, ${a.sin}). ${askSin ? 'sin = y' : 'cos = x'} = ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  'pc-trig-ratios': {
    grade: 'Pre-Calculus', name: 'SOH-CAH-TOA',
    intro:
      `In a right triangle:\n` +
      `   SOH:  sin θ = Opposite / Hypotenuse\n` +
      `   CAH:  cos θ = Adjacent / Hypotenuse\n` +
      `   TOA:  tan θ = Opposite / Adjacent`,
    generate() {
      const triples = [[3, 4, 5], [6, 8, 10], [5, 12, 13]];
      const [opp, adj, hyp] = triples[MATH.rand(0, triples.length - 1)];
      const ratio = ['sin', 'cos', 'tan'][MATH.rand(0, 2)];
      const ans = ratio === 'sin' ? `${opp}/${hyp}` : ratio === 'cos' ? `${adj}/${hyp}` : `${opp}/${adj}`;
      const opts = MATH.shuffle([`${opp}/${hyp}`, `${adj}/${hyp}`, `${opp}/${adj}`, `${hyp}/${opp}`]);
      return {
        question: `Right triangle, opposite ${opp}, adjacent ${adj}, hypotenuse ${hyp}.  ${ratio}(θ) = ?`,
        explain: `${ratio === 'sin' ? 'SOH: opposite/hypotenuse' : ratio === 'cos' ? 'CAH: adjacent/hypotenuse' : 'TOA: opposite/adjacent'} = ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  'pc-arith-sequence': {
    grade: 'Pre-Calculus', name: 'Arithmetic Sequences',
    intro:
      `Arithmetic sequence ADDS a common difference (d) each step.\n` +
      `2, 5, 8, 11, ...  d = 3.\n\n` +
      `nth term:  aₙ = a₁ + (n − 1) · d.\n` +
      `10th term: 2 + 9·3 = 29.`,
    generate() {
      const a1 = MATH.rand(1, 9);
      const d = MATH.rand(2, 6);
      const n = MATH.rand(5, 10);
      const ans = a1 + (n - 1) * d;
      return {
        question: `First term ${a1}, common difference ${d}. Find the ${n}th term.`,
        explain: `aₙ = ${a1} + (${n} − 1) × ${d} = ${a1} + ${(n-1)*d} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  'pc-geom-sequence': {
    grade: 'Pre-Calculus', name: 'Geometric Sequences',
    intro:
      `Geometric sequence MULTIPLIES by a common ratio (r) each step.\n\n` +
      `2, 6, 18, 54, ...  r = 3.\n\n` +
      `nth term:  aₙ = a₁ · r^(n−1).`,
    generate() {
      const a1 = MATH.rand(1, 4);
      const r = MATH.rand(2, 3);
      const n = MATH.rand(3, 5);
      const ans = a1 * Math.pow(r, n - 1);
      return {
        question: `First term ${a1}, common ratio ${r}. Find the ${n}th term.`,
        explain: `aₙ = ${a1} · ${r}^${n - 1} = ${a1} × ${Math.pow(r, n - 1)} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  'pc-log-props': {
    grade: 'Pre-Calculus', name: 'Log Properties',
    intro:
      `Three big log rules:\n` +
      `   log(ab)  = log a + log b   (product → sum)\n` +
      `   log(a/b) = log a − log b   (quotient → difference)\n` +
      `   log(aⁿ)  = n · log a       (power → coefficient)\n\n` +
      `Example: log(8) = log(2³) = 3·log(2).`,
    generate() {
      const base = 2;
      const n = MATH.rand(2, 5);
      const arg = Math.pow(base, n);
      return {
        question: `Using log(aⁿ) = n·log(a), simplify log_${base}(${arg}).`,
        explain: `${arg} = ${base}^${n}.  log_${base}(${base}^${n}) = ${n} · log_${base}(${base}) = ${n} · 1 = ${n}.`,
        ...MATH.mc(n, MATH.distractors(n, 3, 0, n * 2 + 2))
      };
    }
  },

  // ============================================================
  // GRADE 1 — additional prerequisites
  // ============================================================
  '1-add-three': {
    grade: '1', name: 'Adding Three Numbers',
    intro:
      `Add three numbers by combining step by step.\n\n` +
      `Trick: pair the two that make 10 first.\n` +
      `   3 + 7 + 5  →  (3 + 7) + 5  =  10 + 5  =  15.`,
    generate() {
      const a = MATH.rand(1, 6), b = MATH.rand(1, 6), c = MATH.rand(1, 6);
      const ans = a + b + c;
      return {
        question: `${a} + ${b} + ${c} = ?`,
        explain: `${a} + ${b} = ${a + b}. Then ${a + b} + ${c} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 20))
      };
    }
  },

  '1-compare-length': {
    grade: '1', name: 'Comparing Length',
    intro:
      `Comparing lengths: more units = longer.\n\n` +
      `A pencil that is 5 cubes long is longer than a crayon that is 3 cubes long.\n\n` +
      `Look at the numbers — bigger means longer.`,
    generate() {
      const pairs = [['rope', 'string'], ['pencil', 'crayon'], ['snake', 'worm']];
      const [aN, bN] = pairs[MATH.rand(0, pairs.length - 1)];
      const a = MATH.rand(3, 12);
      let b = MATH.rand(3, 12);
      while (b === a) b = MATH.rand(3, 12);
      const longer = a > b ? aN : bN;
      return {
        question: `A ${aN} is ${a} cubes long. A ${bN} is ${b} cubes long. Which is longer?`,
        explain: `${Math.max(a, b)} > ${Math.min(a, b)}, so the ${longer} is longer.`,
        options: [aN, bN, 'Same length'],
        answerIndex: a > b ? 0 : 1
      };
    }
  },

  '1-halves-fourths': {
    grade: '1', name: 'Halves and Fourths',
    intro:
      `HALF: split into 2 equal pieces.\n` +
      `FOURTH (quarter): split into 4 equal pieces.\n\n` +
      `Half of 8 = 4.  A quarter of 8 = 2.\n` +
      `Half → ÷2.  Quarter → ÷4.`,
    generate() {
      const half = Math.random() > 0.5;
      const total = (half ? 2 : 4) * MATH.rand(2, 5);
      const ans = half ? total / 2 : total / 4;
      return {
        question: `What is ${half ? 'half' : 'one fourth'} of ${total}?`,
        explain: `${total} ÷ ${half ? 2 : 4} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, total))
      };
    }
  },

  // ============================================================
  // GRADE 2 — additional prerequisites
  // ============================================================
  '2-add-3digit': {
    grade: '2', name: 'Adding 3-Digit Numbers',
    intro:
      `Stack 3-digit numbers and add column by column from the RIGHT.\n\n` +
      `   2 3 4\n` +
      ` + 1 4 2\n` +
      ` ------\n` +
      `Ones: 4+2=6. Tens: 3+4=7. Hundreds: 2+1=3. → 376.`,
    generate() {
      // No-carry generator
      for (let attempt = 0; attempt < 20; attempt++) {
        const aH = MATH.rand(1, 4), aT = MATH.rand(0, 4), aO = MATH.rand(0, 4);
        const bH = MATH.rand(1, 9 - aH), bT = MATH.rand(0, 9 - aT), bO = MATH.rand(0, 9 - aO);
        const a = aH*100 + aT*10 + aO;
        const b = bH*100 + bT*10 + bO;
        const ans = a + b;
        if (ans < 1000 && b >= 100) {
          return {
            question: `${a} + ${b} = ?`,
            explain: `Ones: ${aO}+${bO}=${aO+bO}. Tens: ${aT}+${bT}=${aT+bT}. Hundreds: ${aH}+${bH}=${aH+bH}.\nAnswer: ${ans}.`,
            ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 999))
          };
        }
      }
      // Fallback simple
      const a = 234, b = 142, ans = 376;
      return {
        question: `${a} + ${b} = ?`,
        explain: `Column by column → ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 999))
      };
    }
  },

  '2-sub-3digit': {
    grade: '2', name: 'Subtracting 3-Digit Numbers',
    intro:
      `Subtract column by column from the RIGHT. Borrow when the top digit is smaller.\n\n` +
      `   4 5 6\n` +
      ` − 1 2 3\n` +
      ` ------\n` +
      `Ones: 6−3=3. Tens: 5−2=3. Hundreds: 4−1=3. → 333.`,
    generate() {
      // No-borrow generator
      for (let attempt = 0; attempt < 20; attempt++) {
        const aH = MATH.rand(3, 9), aT = MATH.rand(2, 9), aO = MATH.rand(2, 9);
        const bH = MATH.rand(1, aH - 1), bT = MATH.rand(0, aT), bO = MATH.rand(0, aO);
        const a = aH*100 + aT*10 + aO;
        const b = bH*100 + bT*10 + bO;
        if (b >= 100 && a - b > 0) {
          const ans = a - b;
          return {
            question: `${a} − ${b} = ?`,
            explain: `Ones: ${aO}−${bO}=${aO-bO}. Tens: ${aT}−${bT}=${aT-bT}. Hundreds: ${aH}−${bH}=${aH-bH}.\nAnswer: ${ans}.`,
            ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 999))
          };
        }
      }
      const a = 456, b = 123, ans = 333;
      return {
        question: `${a} − ${b} = ?`,
        explain: `Column by column → ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 999))
      };
    }
  },

  '2-time-5min': {
    grade: '2', name: 'Time to 5 Minutes',
    intro:
      `On a clock, each NUMBER is 5 minutes apart.\n\n` +
      `   12 → :00\n` +
      `   1  → :05\n` +
      `   2  → :10\n` +
      `   3  → :15\n` +
      `Minute hand on 5 means 25 minutes past the hour.`,
    generate() {
      const h = MATH.rand(1, 12);
      const numPos = MATH.rand(1, 11);
      const mins = numPos * 5;
      const minStr = mins.toString().padStart(2, '0');
      const ans = `${h}:${minStr}`;
      const wrongMins = ((numPos + 1) % 12) * 5;
      const opts = MATH.shuffle([ans, `${h}:${(mins + 5).toString().padStart(2, '0')}`, `${numPos}:${minStr}`, `${h}:${wrongMins.toString().padStart(2,'0')}`]);
      return {
        question: `Hour hand just past ${h}, minute hand on ${numPos}. What time?`,
        explain: `Minute hand on ${numPos} → ${numPos} × 5 = ${mins} min. → ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  '2-bar-graph': {
    grade: '2', name: 'Reading Bar Graphs',
    intro:
      `A bar graph shows counts as bars. The top of each bar = how many.\n\n` +
      `TOTAL: add all bar heights.\n` +
      `DIFFERENCE: subtract two heights.`,
    generate() {
      const cats = ['🐶', '🐱', '🐰', '🐢'];
      const counts = cats.map(() => MATH.rand(2, 9));
      const total = counts.reduce((s, x) => s + x, 0);
      return {
        question: `Pets in class:\n${cats.map((c, i) => `${c} ${counts[i]}`).join('   ')}\nHow many pets total?`,
        explain: `${counts.join(' + ')} = ${total}.`,
        ...MATH.mc(total, MATH.distractors(total, 3, 0, 40))
      };
    }
  },

  // ============================================================
  // GRADE 3 — additional prerequisites
  // ============================================================
  '3-mult-by-tens': {
    grade: '3', name: 'Multiply by Multiples of 10',
    intro:
      `To multiply by 10, 20, 30...: multiply the small parts, then stick a 0 on the end.\n\n` +
      `4 × 30 = (4 × 3) × 10 = 12 × 10 = 120.`,
    generate() {
      const a = MATH.rand(2, 9), t = MATH.rand(2, 9);
      const ans = a * t * 10;
      return {
        question: `${a} × ${t}0 = ?`,
        explain: `${a} × ${t} = ${a * t}. Add a 0 → ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  '3-equiv-fractions': {
    grade: '3', name: 'Equivalent Fractions',
    intro:
      `Two fractions are EQUIVALENT if they're the same amount, just in different "slice sizes".\n\n` +
      `1/2 = 2/4 = 3/6 — all equal.\n\n` +
      `Multiply BOTH top and bottom by the same number to find an equivalent.\n` +
      `   1/2 × (3/3) = 3/6.`,
    generate() {
      const num = MATH.rand(1, 4);
      const den = num + MATH.rand(1, 4);
      const mult = MATH.rand(2, 5);
      const newDen = den * mult;
      const ans = num * mult;
      return {
        question: `${num}/${den} = ?/${newDen}`,
        explain: `${den} × ${mult} = ${newDen}. Multiply top by ${mult}: ${num} × ${mult} = ${ans}.\n→ ${ans}/${newDen}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, newDen))
      };
    }
  },

  '3-compare-fractions': {
    grade: '3', name: 'Comparing Fractions',
    intro:
      `Cross-multiply trick: a/b vs c/d.\n` +
      `Compare a·d with b·c.\n\n` +
      `2/3 vs 3/5:  2×5=10,  3×3=9.  10 > 9, so 2/3 > 3/5.`,
    generate() {
      const pairs = [[1,2,2,3], [2,3,3,5], [1,3,2,5], [3,4,5,8], [2,5,3,7]];
      const [a, b, c, d] = pairs[MATH.rand(0, pairs.length - 1)];
      const ad = a * d, bc = b * c;
      const sym = ad > bc ? '>' : ad < bc ? '<' : '=';
      return {
        question: `${a}/${b} ___ ${c}/${d}`,
        explain: `Cross multiply: ${a}×${d}=${ad}, ${b}×${c}=${bc}. ${ad} ${sym} ${bc}, so ${a}/${b} ${sym} ${c}/${d}.`,
        options: ['>', '<', '='],
        answerIndex: ['>', '<', '='].indexOf(sym)
      };
    }
  },

  '3-elapsed-time': {
    grade: '3', name: 'Elapsed Time',
    intro:
      `Elapsed time = minutes between two clocks.\n\n` +
      `From 3:15 to 4:45:\n` +
      ` 3:15 → 4:15 = 60 minutes\n` +
      ` 4:15 → 4:45 = 30 minutes\n` +
      `Total = 90 minutes.`,
    generate() {
      const startH = MATH.rand(1, 6);
      const startM = MATH.rand(0, 11) * 5;
      const elapsed = MATH.rand(15, 90);
      const endTotal = startH * 60 + startM + elapsed;
      let endH = Math.floor(endTotal / 60) % 12; if (endH === 0) endH = 12;
      const endM = endTotal % 60;
      return {
        question: `From ${startH}:${startM.toString().padStart(2,'0')} to ${endH}:${endM.toString().padStart(2,'0')}, how many minutes?`,
        explain: `Count up from ${startH}:${startM.toString().padStart(2,'0')} to ${endH}:${endM.toString().padStart(2,'0')} = ${elapsed} minutes.`,
        ...MATH.mc(elapsed, MATH.distractors(elapsed, 3, 5, 120))
      };
    }
  },

  '3-area-tiles': {
    grade: '3', name: 'Area by Counting Squares',
    intro:
      `Area = number of square UNITS that fit inside.\n\n` +
      `A 4 × 3 rectangle has 4 columns × 3 rows = 12 squares.\n\n` +
      `For rectangles: rows × columns = area.`,
    generate() {
      const r = MATH.rand(2, 6), c = MATH.rand(2, 6);
      const ans = r * c;
      return {
        question: `Rectangle has ${r} rows and ${c} columns of unit squares. Area = ?`,
        explain: `${r} × ${c} = ${ans} square units.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 50))
      };
    }
  },

  // ============================================================
  // GRADE 4 — additional prerequisites
  // ============================================================
  '4-multi-sub': {
    grade: '4', name: 'Multi-Digit Subtraction',
    intro:
      `Stack and subtract right-to-left, borrowing across columns when needed.\n\n` +
      `   7 4 6        Ones: 6−9 can't, borrow.\n` +
      ` − 2 8 9        4 → 3, ones: 16−9=7.\n` +
      `Continue across.`,
    generate() {
      const a = MATH.rand(500, 999);
      const b = MATH.rand(100, a - 50);
      const ans = a - b;
      return {
        question: `${a} − ${b} = ?`,
        explain: `Subtract column-by-column, borrowing as needed → ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 999))
      };
    }
  },

  '4-div-remainder': {
    grade: '4', name: 'Division with Remainders',
    intro:
      `Division doesn't always divide evenly. The leftover = REMAINDER.\n\n` +
      `17 ÷ 5:\n` +
      `  5 × 3 = 15. 17 − 15 = 2.\n` +
      `  Answer: 3 r 2.`,
    generate() {
      const divisor = MATH.rand(3, 9);
      const quotient = MATH.rand(3, 9);
      const remainder = MATH.rand(1, divisor - 1);
      const dividend = divisor * quotient + remainder;
      const ans = `${quotient} r ${remainder}`;
      const opts = MATH.shuffle([ans, `${quotient + 1} r ${remainder}`, `${quotient} r ${remainder + 1}`, `${quotient - 1} r ${remainder}`]);
      return {
        question: `${dividend} ÷ ${divisor} = ?`,
        explain: `${divisor} × ${quotient} = ${divisor * quotient}. ${dividend} − ${divisor * quotient} = ${remainder}.\n→ ${quotient} r ${remainder}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  '4-compare-decimals': {
    grade: '4', name: 'Comparing Decimals',
    intro:
      `Compare decimals digit-by-digit from left.\n\n` +
      `0.45 vs 0.5:  Tenths place: 4 < 5. So 0.45 < 0.5.\n\n` +
      `Trick: add zeros to match length: 0.45 vs 0.50.`,
    generate() {
      // Force clearly different values
      const a = MATH.rand(1, 9) / 10;
      const b = MATH.rand(10, 99) / 100;
      if (Math.abs(a - b) < 0.05) return MATH_SKILLS['4-compare-decimals'].generate();
      const sym = a > b ? '>' : '<';
      return {
        question: `${a} ___ ${b}`,
        explain: `Compare digit by digit. ${a} ${sym} ${b}.`,
        options: ['>', '<', '='],
        answerIndex: ['>', '<', '='].indexOf(sym)
      };
    }
  },

  '4-frac-times-whole': {
    grade: '4', name: 'Fraction × Whole Number',
    intro:
      `Multiply a fraction by a whole number: multiply the top by the whole, keep the bottom.\n\n` +
      `1/3 × 6 = 6/3 = 2.\n\n` +
      `Then simplify if you can.`,
    generate() {
      const den = MATH.rand(2, 5);
      const whole = den * MATH.rand(2, 5);
      const num = MATH.rand(1, den - 1);
      const ans = (num * whole) / den;
      return {
        question: `${num}/${den} × ${whole} = ?`,
        explain: `${num} × ${whole} = ${num * whole}. ${num * whole}/${den} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2 + 4))
      };
    }
  },

  // ============================================================
  // GRADE 5 — additional prerequisites
  // ============================================================
  '5-sub-fractions-diff': {
    grade: '5', name: 'Subtract Fractions (Different Denominators)',
    intro:
      `Same as adding — find a common denominator, then subtract the tops.\n\n` +
      `1/2 − 1/3:  Common bottom = 6.  1/2 = 3/6,  1/3 = 2/6.\n` +
      `3/6 − 2/6 = 1/6.`,
    generate() {
      const pairs = [[2, 3, 6], [2, 4, 4], [3, 6, 6], [2, 5, 10]];
      const [d1, d2, lcm] = pairs[MATH.rand(0, pairs.length - 1)];
      const a = MATH.rand(1, d1 - 1);
      const b = MATH.rand(1, d2 - 1);
      let na = a * (lcm / d1), nb = b * (lcm / d2);
      if (na <= nb) { const t = na; na = nb; nb = t; }
      const diff = na - nb;
      const ans = `${diff}/${lcm}`;
      const opts = MATH.shuffle([ans, `${na + nb}/${lcm}`, `${diff}/${lcm * 2}`, `${diff + 1}/${lcm}`]);
      return {
        question: `${na}/${lcm} − ${nb}/${lcm} = ?`,
        explain: `Tops: ${na} − ${nb} = ${diff}. Keep ${lcm}. → ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  '5-div-fractions': {
    grade: '5', name: 'Dividing Fractions',
    intro:
      `Divide fractions = MULTIPLY by the RECIPROCAL (flip the second).\n\n` +
      `1/2 ÷ 1/4:  Keep, Change, Flip → 1/2 × 4/1 = 4/2 = 2.\n\n` +
      `"Keep the first, change ÷ to ×, flip the second."`,
    generate() {
      const n1 = MATH.rand(1, 4), d1 = n1 + MATH.rand(1, 3);
      const n2 = MATH.rand(1, 3), d2 = n2 + MATH.rand(1, 3);
      const num = n1 * d2, den = d1 * n2;
      const ans = `${num}/${den}`;
      const opts = MATH.shuffle([ans, `${den}/${num}`, `${num + 1}/${den}`, `${n1 * n2}/${d1 * d2}`]);
      return {
        question: `${n1}/${d1} ÷ ${n2}/${d2} = ?`,
        explain: `Flip: ${n1}/${d1} × ${d2}/${n2} = (${n1}×${d2})/(${d1}×${n2}) = ${num}/${den}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  '5-mixed-improper': {
    grade: '5', name: 'Mixed Numbers ↔ Improper Fractions',
    intro:
      `Mixed number: whole + fraction, like 3 1/2.\n` +
      `Improper fraction: top ≥ bottom, like 7/2.\n\n` +
      `MIXED → IMPROPER:  (whole × bottom) + top, all over bottom.\n` +
      `3 1/2 → (3·2 + 1)/2 = 7/2.`,
    generate() {
      const whole = MATH.rand(2, 5);
      const num = MATH.rand(1, 4);
      const den = num + MATH.rand(1, 4);
      const top = whole * den + num;
      const ans = `${top}/${den}`;
      const opts = MATH.shuffle([ans, `${top - 1}/${den}`, `${whole + num}/${den}`, `${top}/${den + 1}`]);
      return {
        question: `Write ${whole} ${num}/${den} as an improper fraction.`,
        explain: `${whole} × ${den} + ${num} = ${whole * den} + ${num} = ${top}. Keep ${den}.\n→ ${top}/${den}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  '5-powers-10': {
    grade: '5', name: 'Powers of 10',
    intro:
      `Powers of 10 are easy — count the zeros!\n\n` +
      `   10¹ = 10\n   10² = 100\n   10³ = 1,000\n   10⁴ = 10,000`,
    generate() {
      const n = MATH.rand(2, 6);
      const ans = Math.pow(10, n);
      return {
        question: `10^${n} = ?`,
        explain: `Write 1 followed by ${n} zeros → ${ans.toLocaleString()}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 10))
      };
    }
  },

  '5-sub-decimals': {
    grade: '5', name: 'Subtracting Decimals',
    intro:
      `Line up the decimal points, then subtract column by column.\n\n` +
      `   5.6\n − 2.3\n ----\n   3.3`,
    generate() {
      const a = MATH.rand(40, 99) / 10;
      const b = MATH.rand(10, Math.floor(a * 10) - 5) / 10;
      const ans = +(a - b).toFixed(1);
      const opts = MATH.shuffle([String(ans), String(+(a + b).toFixed(1)), String(+(ans + 0.1).toFixed(1)), String(+(ans - 0.1).toFixed(1))]);
      return {
        question: `${a} − ${b} = ?`,
        explain: `Line up decimals. ${a} − ${b} = ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(String(ans))
      };
    }
  },

  // ============================================================
  // GRADE 6 — additional prerequisites
  // ============================================================
  '6-ratio-tables': {
    grade: '6', name: 'Ratio Tables',
    intro:
      `In a ratio table, multiply BOTH numbers by the same factor.\n\n` +
      `   3 : 4\n   6 : 8     (×2)\n   9 : 12    (×3)\n   12: 16    (×4).`,
    generate() {
      const a = MATH.rand(2, 5), b = MATH.rand(2, 5);
      const k = MATH.rand(2, 5);
      const ans = a * k;
      return {
        question: `If ${a} : ${b} = ? : ${b * k}, what is ?`,
        explain: `${b} × ${k} = ${b * k}, so multiply ${a} by ${k}: ${a} × ${k} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2 + 5))
      };
    }
  },

  '6-stats-mmr': {
    grade: '6', name: 'Median & Range',
    intro:
      `MEDIAN: the middle value when numbers are sorted.\n` +
      `RANGE: biggest − smallest.\n\n` +
      `For 4, 2, 7, 1, 9 → sort to 1, 2, 4, 7, 9.\n` +
      `Median = 4 (middle).  Range = 9 − 1 = 8.`,
    generate() {
      const nums = [];
      for (let i = 0; i < 5; i++) nums.push(MATH.rand(2, 15));
      const sorted = [...nums].sort((a, b) => a - b);
      const askMedian = Math.random() > 0.5;
      const ans = askMedian ? sorted[2] : sorted[4] - sorted[0];
      return {
        question: `Find the ${askMedian ? 'median' : 'range'} of: ${nums.join(', ')}.`,
        explain: askMedian
          ? `Sort: ${sorted.join(', ')}. Middle = ${sorted[2]}.`
          : `Sort: ${sorted.join(', ')}. ${sorted[4]} − ${sorted[0]} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, 20))
      };
    }
  },

  '6-inequality-solve': {
    grade: '6', name: 'One-Step Inequalities',
    intro:
      `Solve like an equation — keep the inequality sign as-is for add/subtract.\n\n` +
      `x + 3 > 7:\n  Subtract 3 from both sides: x > 4.`,
    generate() {
      const a = MATH.rand(2, 9);
      const r = MATH.rand(3, 10);
      const rhs = a + r;
      const ans = `x > ${r}`;
      const opts = MATH.shuffle([ans, `x < ${r}`, `x > ${r + a}`, `x = ${r}`]);
      return {
        question: `Solve x + ${a} > ${rhs}.`,
        explain: `Subtract ${a} from both sides: x > ${rhs - a} = ${r}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  '6-surface-area': {
    grade: '6', name: 'Surface Area of a Box',
    intro:
      `Surface area = total area of all 6 faces of a rectangular box.\n\n` +
      `   SA = 2(lw + lh + wh)\n\n` +
      `Box 3×4×5:  SA = 2(12 + 15 + 20) = 2(47) = 94.`,
    generate() {
      const l = MATH.rand(2, 6), w = MATH.rand(2, 6), h = MATH.rand(2, 6);
      const ans = 2 * (l * w + l * h + w * h);
      return {
        question: `Box ${l}×${w}×${h}. Surface area = ?`,
        explain: `SA = 2(${l}·${w} + ${l}·${h} + ${w}·${h}) = 2(${l*w + l*h + w*h}) = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  // ============================================================
  // GRADE 7 — additional prerequisites
  // ============================================================
  '7-distributive': {
    grade: '7', name: 'Distributive Property',
    intro:
      `a(b + c) = a·b + a·c.\n\n` +
      `Multiply the outside number by EACH term inside.\n` +
      `   3(x + 4) = 3·x + 3·4 = 3x + 12.`,
    generate() {
      const a = MATH.rand(2, 6), b = MATH.rand(1, 9);
      const ans = `${a}x + ${a * b}`;
      const opts = MATH.shuffle([ans, `${a}x + ${b}`, `x + ${a + b}`, `${a + b}x`]);
      return {
        question: `Expand ${a}(x + ${b}).`,
        explain: `${a}·x = ${a}x.\n${a}·${b} = ${a * b}.\n→ ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  '7-combine-terms': {
    grade: '7', name: 'Combining Like Terms',
    intro:
      `LIKE TERMS have the same variable part. Combine by adding the coefficients.\n\n` +
      `3x + 5 + 2x:\n` +
      `  Like x terms: 3x + 2x = 5x.\n` +
      `  Constant: 5.\n` +
      `  → 5x + 5.`,
    generate() {
      const a = MATH.rand(2, 6), b = MATH.rand(1, 8), c = MATH.rand(2, 6);
      const ans = `${a + c}x + ${b}`;
      const opts = MATH.shuffle([ans, `${a + b + c}x`, `${a * c}x + ${b}`, `${a + c}x · ${b}`]);
      return {
        question: `Simplify ${a}x + ${b} + ${c}x.`,
        explain: `Combine x terms: ${a}x + ${c}x = ${a + c}x. Keep constant ${b}.\n→ ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  '7-tax-tip': {
    grade: '7', name: 'Tax / Tip / Discount',
    intro:
      `Tax and tip ADD to the price. Discount SUBTRACTS.\n\n` +
      `15% tip on $40:  0.15 × 40 = 6.  Total = 40 + 6 = $46.\n` +
      `20% off $50:  0.20 × 50 = 10.  Total = 50 − 10 = $40.`,
    generate() {
      const price = MATH.rand(2, 10) * 10;
      const pct = [10, 15, 20, 25][MATH.rand(0, 3)];
      const change = price * pct / 100;
      const isTax = Math.random() > 0.5;
      const ans = isTax ? price + change : price - change;
      return {
        question: `$${price} item with ${pct}% ${isTax ? 'tax added' : 'discount'}. Final price?`,
        explain: `${pct}% of ${price} = ${change}. ${isTax ? `${price} + ${change}` : `${price} − ${change}`} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, price * 2))
      };
    }
  },

  '7-volume-prism': {
    grade: '7', name: 'Volume of a Rectangular Prism',
    intro:
      `Volume = length × width × height.\n\n` +
      `Box 3×4×5: V = 60 cubic units.`,
    generate() {
      const l = MATH.rand(2, 8), w = MATH.rand(2, 8), h = MATH.rand(2, 8);
      const ans = l * w * h;
      return {
        question: `Volume of a ${l} × ${w} × ${h} box?`,
        explain: `V = ${l} × ${w} × ${h} = ${l * w} × ${h} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans * 2))
      };
    }
  },

  // ============================================================
  // GRADE 8 — additional prerequisites
  // ============================================================
  '8-cube-root': {
    grade: '8', name: 'Cube Roots',
    intro:
      `∛n asks: "what number times itself three times gives n?"\n\n` +
      `∛27 = 3 because 3 × 3 × 3 = 27.\n` +
      `∛64 = 4.   ∛125 = 5.   ∛1000 = 10.`,
    generate() {
      const n = MATH.rand(2, 8);
      const cube = n * n * n;
      return {
        question: `∛${cube} = ?`,
        explain: `${n} × ${n} × ${n} = ${cube}, so ∛${cube} = ${n}.`,
        ...MATH.mc(n, MATH.distractors(n, 3, 0, n * 2 + 2))
      };
    }
  },

  '8-linear-from-table': {
    grade: '8', name: 'Slope from a Table',
    intro:
      `If x and y are in a linear pattern:\n\n` +
      `   slope = Δy / Δx\n\n` +
      `Pick any two rows, find Δy and Δx, divide.`,
    generate() {
      const slope = MATH.rand(1, 5);
      const b = MATH.rand(0, 5);
      const xs = [1, 2, 3, 4];
      const ys = xs.map(x => slope * x + b);
      return {
        question: `Table — x: ${xs.join(', ')};  y: ${ys.join(', ')}.  Slope?`,
        explain: `Δy = ${ys[1] - ys[0]} per Δx = 1, so slope = ${slope}.`,
        ...MATH.mc(slope, MATH.distractors(slope, 3, 0, 10))
      };
    }
  },

  '8-translate-point': {
    grade: '8', name: 'Translating a Point',
    intro:
      `Translations slide a point. Add to x to go right (subtract for left), add to y for up (subtract for down).\n\n` +
      `(3, 4) translated +2 right, −1 down → (5, 3).`,
    generate() {
      const x = MATH.rand(-3, 5), y = MATH.rand(-3, 5);
      const dx = MATH.rand(-4, 4) || 1;
      const dy = MATH.rand(-4, 4) || 1;
      const ax = x + dx, ay = y + dy;
      const ans = `(${ax}, ${ay})`;
      const opts = MATH.shuffle([ans, `(${ax}, ${y})`, `(${x}, ${ay})`, `(${ax + 1}, ${ay - 1})`]);
      return {
        question: `Translate (${x}, ${y}) by (${dx}, ${dy}).`,
        explain: `x: ${x} + ${dx} = ${ax}.  y: ${y} + ${dy} = ${ay}.\n→ ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  // ============================================================
  // ALGEBRA 1 — additional prerequisites
  // ============================================================
  'alg1-linear-inequality': {
    grade: 'Algebra 1', name: 'Linear Inequalities',
    intro:
      `Solve like an equation. When you multiply/divide both sides by a NEGATIVE, FLIP the sign.\n\n` +
      `3x + 2 > 11:\n  Subtract 2: 3x > 9.\n  Divide by 3 (positive — don't flip): x > 3.`,
    generate() {
      const a = MATH.rand(2, 5);
      const x = MATH.rand(2, 8);
      const b = MATH.rand(1, 9);
      const rhs = a * x + b;
      const ans = `x > ${x}`;
      const opts = MATH.shuffle([ans, `x < ${x}`, `x > ${x + 1}`, `x = ${x}`]);
      return {
        question: `Solve ${a}x + ${b} > ${rhs}.`,
        explain: `Subtract ${b}: ${a}x > ${rhs - b}.\nDivide by ${a}: x > ${x}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  'alg1-elimination': {
    grade: 'Algebra 1', name: 'Systems by Elimination',
    intro:
      `Add or subtract the equations to make one variable cancel.\n\n` +
      `   x + y = 7\n   x − y = 1   (add — y cancels)\n   2x = 8 → x = 4.  y = 3.`,
    generate() {
      const x = MATH.rand(2, 8);
      const y = MATH.rand(1, 7);
      const sum = x + y;
      const diff = x - y;
      return {
        question: `Solve:  x + y = ${sum},  x − y = ${diff}.  x = ?`,
        explain: `Add the two equations: 2x = ${sum + diff} → x = ${x}.`,
        ...MATH.mc(x, MATH.distractors(x, 3, 0, x * 2 + 3))
      };
    }
  },

  'alg1-poly-add': {
    grade: 'Algebra 1', name: 'Adding Polynomials',
    intro:
      `Combine LIKE TERMS — same variable, same exponent.\n\n` +
      `(2x² + 3x) + (x² + 4x) = (2+1)x² + (3+4)x = 3x² + 7x.`,
    generate() {
      const a = MATH.rand(1, 5), b = MATH.rand(1, 5);
      const c = MATH.rand(1, 5), d = MATH.rand(1, 5);
      const ans = `${a + c}x² + ${b + d}x`;
      const opts = MATH.shuffle([ans, `${a + b}x² + ${c + d}x`, `${a + b + c + d}x²`, `${a + c}x² + ${b * d}x`]);
      return {
        question: `(${a}x² + ${b}x) + (${c}x² + ${d}x) = ?`,
        explain: `x² terms: ${a} + ${c} = ${a + c}.\nx terms: ${b} + ${d} = ${b + d}.\n→ ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  'alg1-abs-eq': {
    grade: 'Algebra 1', name: 'Absolute Value Equations',
    intro:
      `|x| = distance from zero — always ≥ 0.\n\n` +
      `|x − 3| = 5 means x − 3 = 5 OR x − 3 = −5.\n` +
      `Solving each: x = 8 OR x = −2.\n\n` +
      `Absolute value equations usually have TWO solutions.`,
    generate() {
      const a = MATH.rand(1, 6);
      const k = MATH.rand(2, 8);
      const ans = a + k;
      return {
        question: `|x − ${a}| = ${k}.  Find the larger solution.`,
        explain: `Two cases:\n  x − ${a} = ${k}  → x = ${a + k}.\n  x − ${a} = −${k} → x = ${a - k}.\nLarger: ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans + 6))
      };
    }
  },

  'alg1-rate-change': {
    grade: 'Algebra 1', name: 'Rate of Change',
    intro:
      `Rate of change = how y changes per unit of x — same as slope.\n\n` +
      `60 miles in 2 hours → 30 mph.`,
    generate() {
      const rate = MATH.rand(2, 8);
      const t = MATH.rand(2, 6);
      const dist = rate * t;
      return {
        question: `A car drove ${dist} miles in ${t} hours. Rate (mph)?`,
        explain: `${dist} ÷ ${t} = ${rate} mph.`,
        ...MATH.mc(rate, MATH.distractors(rate, 3, 0, rate * 2 + 3))
      };
    }
  },

  // ============================================================
  // GEOMETRY — additional prerequisites
  // ============================================================
  'geo-triangle-congruence': {
    grade: 'Geometry', name: 'Triangle Congruence Shortcuts',
    intro:
      `Two triangles are CONGRUENT when they're identical. Five shortcuts to prove it:\n\n` +
      `   SSS — all 3 sides equal\n` +
      `   SAS — 2 sides + included angle\n` +
      `   ASA — 2 angles + included side\n` +
      `   AAS — 2 angles + non-included side\n` +
      `   HL  — right triangles, hypotenuse + a leg`,
    generate() {
      const scenarios = [
        { d: 'All three pairs of sides match', a: 'SSS' },
        { d: 'Two sides and the angle BETWEEN them match', a: 'SAS' },
        { d: 'Two angles and the side BETWEEN them match', a: 'ASA' },
        { d: 'Two angles and a non-included side match', a: 'AAS' }
      ];
      const s = scenarios[MATH.rand(0, scenarios.length - 1)];
      return {
        question: `${s.d}. Which congruence shortcut applies?`,
        explain: `${s.d} → ${s.a}.`,
        options: ['SSS', 'SAS', 'ASA', 'AAS'],
        answerIndex: ['SSS', 'SAS', 'ASA', 'AAS'].indexOf(s.a)
      };
    }
  },

  'geo-special-right': {
    grade: 'Geometry', name: 'Special Right Triangles',
    intro:
      `Two famous right triangles:\n\n` +
      `   45-45-90:  legs are EQUAL,  hyp = leg·√2.\n` +
      `   30-60-90:  short = x,  long = x·√3,  hyp = 2x.\n\n` +
      `Memorize these — they appear in trig, geometry, and beyond.`,
    generate() {
      const leg = MATH.rand(2, 6);
      const ans = `${leg}√2`;
      const opts = MATH.shuffle([ans, `${leg}√3`, `${leg * 2}`, `${leg + 2}`]);
      return {
        question: `45-45-90 triangle with leg = ${leg}. Hypotenuse?`,
        explain: `hyp = leg · √2 = ${leg}√2.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  'geo-trig-find-side': {
    grade: 'Geometry', name: 'Trig: Find a Missing Side',
    intro:
      `Know an angle + a side → use SOH-CAH-TOA to find another side.\n\n` +
      `30°, hyp = 10, find opposite:\n` +
      `   sin 30° = opp / 10  →  opp = 10·sin 30° = 10·(1/2) = 5.`,
    generate() {
      const angle = 30;  // sin = 1/2
      const hyp = MATH.rand(4, 12) * 2;
      const ans = hyp / 2;
      return {
        question: `Right triangle, angle ${angle}°, hypotenuse ${hyp}. Opposite side?`,
        explain: `sin ${angle}° = opp/hyp = 1/2.  opp = ${hyp} × 1/2 = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, hyp))
      };
    }
  },

  // ============================================================
  // ALGEBRA 2 — additional prerequisites
  // ============================================================
  'alg2-inverse-function': {
    grade: 'Algebra 2', name: 'Inverse Functions',
    intro:
      `An inverse UNDOES a function. To find f⁻¹(x):\n\n` +
      `  1) Write y = f(x).\n  2) Swap x and y.\n  3) Solve for y.\n\n` +
      `f(x) = 2x + 3:  x = 2y + 3 → y = (x − 3)/2 → f⁻¹(x) = (x − 3)/2.`,
    generate() {
      const a = MATH.rand(2, 5);
      const b = MATH.rand(1, 9);
      const yIn = MATH.rand(1, 6);
      const xIn = a * yIn + b;
      return {
        question: `If f(x) = ${a}x + ${b}, what is f⁻¹(${xIn})?`,
        explain: `f⁻¹(x) = (x − ${b})/${a}.\nAt x = ${xIn}: (${xIn} − ${b})/${a} = ${xIn - b}/${a} = ${yIn}.`,
        ...MATH.mc(yIn, MATH.distractors(yIn, 3, 0, yIn * 2 + 3))
      };
    }
  },

  'alg2-factor-theorem': {
    grade: 'Algebra 2', name: 'Factor Theorem',
    intro:
      `If (x − c) is a factor of p(x), then p(c) = 0.\n\n` +
      `Plug c into p. If you get 0, (x − c) is a factor.\n` +
      `This is the basis of synthetic division.`,
    generate() {
      const c = MATH.rand(1, 5);
      const other = MATH.rand(1, 5);
      const s = c + other, p = c * other;
      return {
        question: `If p(x) = x² − ${s}x + ${p}, what is p(${c})?`,
        explain: `p(${c}) = ${c}² − ${s}·${c} + ${p} = ${c*c} − ${s*c} + ${p} = 0.\n(So x − ${c} is a factor.)`,
        ...MATH.mc(0, MATH.distractors(0, 3, -5, 10))
      };
    }
  },

  'alg2-quadratic-complex': {
    grade: 'Algebra 2', name: 'Quadratics: Complex Roots',
    intro:
      `When the discriminant b² − 4ac is NEGATIVE, real solutions don't exist — but COMPLEX ones do.\n\n` +
      `√(−1) = i (imaginary unit).\n` +
      `x² + 1 = 0 → x² = −1 → x = ±i.`,
    generate() {
      const n = MATH.rand(1, 9);
      const ans = `±i√${n}`;
      const opts = MATH.shuffle([ans, `±${n}`, `±i${n}`, `±√${n}`]);
      return {
        question: `Solve x² + ${n} = 0.  x = ?`,
        explain: `x² = −${n}. x = ±√(−${n}) = ±i√${n}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  // ============================================================
  // PRE-CALCULUS — additional prerequisites
  // ============================================================
  'pc-pyth-identity': {
    grade: 'Pre-Calculus', name: 'Pythagorean Identity',
    intro:
      `For any angle θ:\n\n` +
      `   sin²θ + cos²θ = 1\n\n` +
      `Know one → solve for the other.\n` +
      `sin θ = 3/5 → cos²θ = 1 − 9/25 = 16/25 → cos θ = 4/5 (Q1).`,
    generate() {
      const sets = [
        { sT: 3, sB: 5, cT: 4, cB: 5 },
        { sT: 5, sB: 13, cT: 12, cB: 13 },
        { sT: 8, sB: 17, cT: 15, cB: 17 }
      ];
      const s = sets[MATH.rand(0, sets.length - 1)];
      const ans = `${s.cT}/${s.cB}`;
      const opts = MATH.shuffle([ans, `${s.sT}/${s.sB}`, `${s.cB}/${s.cT}`, `1/${s.sB}`]);
      return {
        question: `If sin θ = ${s.sT}/${s.sB} (θ in Q1), find cos θ.`,
        explain: `sin² + cos² = 1.  (${s.sT}/${s.sB})² = ${s.sT*s.sT}/${s.sB*s.sB}.\ncos² = ${s.cT*s.cT}/${s.cB*s.cB}.  cos = ${s.cT}/${s.cB}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  },

  'pc-limits-basic': {
    grade: 'Pre-Calculus', name: 'Limits (Direct Substitution)',
    intro:
      `lim x→a f(x) asks: "what does f(x) approach as x → a?"\n\n` +
      `For polynomials, just plug in:\n` +
      `   lim x→2 (x² + 1) = 2² + 1 = 5.\n\n` +
      `Trickier limits (0/0, ∞) need other tools, but most are direct substitution.`,
    generate() {
      const a = MATH.rand(1, 4);
      const c = MATH.rand(1, 9);
      const ans = a * a + c;
      return {
        question: `lim x→${a} (x² + ${c}) = ?`,
        explain: `Plug in x = ${a}: ${a}² + ${c} = ${a*a} + ${c} = ${ans}.`,
        ...MATH.mc(ans, MATH.distractors(ans, 3, 0, ans + 8))
      };
    }
  },

  'pc-polar-to-rect': {
    grade: 'Pre-Calculus', name: 'Polar → Rectangular',
    intro:
      `Polar (r, θ) → Rectangular (x, y):\n\n` +
      `   x = r·cos θ\n   y = r·sin θ\n\n` +
      `(4, 60°): x = 4·(1/2) = 2.  y = 4·(√3/2) = 2√3.`,
    generate() {
      const sets = [
        { deg: 0, c: 1, s: 0 },
        { deg: 90, c: 0, s: 1 },
        { deg: 180, c: -1, s: 0 },
        { deg: 270, c: 0, s: -1 }
      ];
      const a = sets[MATH.rand(0, sets.length - 1)];
      const r = MATH.rand(2, 8);
      const x = r * a.c, y = r * a.s;
      const ans = `(${x}, ${y})`;
      const opts = MATH.shuffle([ans, `(${y}, ${x})`, `(${-x}, ${y})`, `(${r}, 0)`]);
      return {
        question: `Convert polar (${r}, ${a.deg}°) to rectangular.`,
        explain: `x = ${r}·cos ${a.deg}° = ${r}·(${a.c}) = ${x}.\ny = ${r}·sin ${a.deg}° = ${r}·(${a.s}) = ${y}.\n→ ${ans}.`,
        options: opts,
        answerIndex: opts.indexOf(ans)
      };
    }
  }

};

// Order matters for grade progression.
const GRADE_ORDER = ['K', '1', '2', '3', '4', '5', '6', '7', '8', 'Algebra 1', 'Geometry', 'Algebra 2', 'Pre-Calculus'];

// Quick placement test — escalating in difficulty, one anchor per grade
// rung. The student's starting grade is the highest GRADE_ORDER position
// they answer correctly. If they miss everything they start at K; if they
// ace it they start at the top.
const PLACEMENT_TEST = [
  'k-add-within-10',       // K   — early arithmetic
  '1-add-within-20',       // 1   — make-10 strategy
  '2-add-2digit',          // 2   — regrouping
  '3-mult-tables',         // 3   — multiplication facts
  '4-mult-multi-digit',    // 4   — distributive multi-digit ×
  '5-add-fractions-diff',  // 5   — fraction add with LCD
  '6-percent-of',          // 6   — percent of a number
  '7-two-step-eq',         // 7   — multi-step linear equation
  '8-pythagorean',         // 8   — Pythagorean theorem
  'alg1-foil',             // A1  — binomial expansion
  'geo-distance-formula',  // GEO — coordinate distance
  'alg2-log-eval'          // A2  — log evaluation
];

// Display-friendly label for a grade string (used in modal titles).
function MATH_gradeLabel(grade) {
  return /^(K|\d+)$/.test(grade) ? `Grade ${grade}` : grade;
}

function MATH_skillsForGrade(grade) {
  return Object.entries(MATH_SKILLS).filter(([, s]) => s.grade === grade).map(([id]) => id);
}

function MATH_allMastered(progress, grade) {
  const ids = MATH_skillsForGrade(grade);
  if (!ids.length) return false;
  return ids.every(id => progress[id] && progress[id].mastered);
}
