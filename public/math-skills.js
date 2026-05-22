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
  }

};

// Order matters for grade progression.
const GRADE_ORDER = ['K', '1', '2', '3', '4', '5'];

function MATH_skillsForGrade(grade) {
  return Object.entries(MATH_SKILLS).filter(([, s]) => s.grade === grade).map(([id]) => id);
}

function MATH_allMastered(progress, grade) {
  const ids = MATH_skillsForGrade(grade);
  if (!ids.length) return false;
  return ids.every(id => progress[id] && progress[id].mastered);
}
