/**
 * Circuits & Signals — the study material.
 *
 * Each chapter carries a goal, the material itself, how the exercise
 * will be checked and what the learner can do afterwards. The Code Lab
 * uses the same shape, so the two courses feel like one course.
 *
 * Every chapter is plain data, so it can be tested and rendered without
 * a browser.
 */

export const CIRCUITS_COURSE = {
  id: 'circuits-signals',
  title: 'Circuits & Signals',
  tagline: 'Work out what a circuit does before you ever solder it.',
  chapters: [
    {
      id: 'voltage-current-resistance',
      title: 'Voltage, current and resistance',
      goal: 'Learn the three quantities every circuit is built from, and use Ohm’s law to predict what a resistor will do.',
      material: [
        {
          title: 'The three quantities',
          body: 'Voltage is the push that drives charge around a loop, measured in volts (V). Current is the flow of charge, measured in amperes (A). Resistance is how much the circuit resists that flow, measured in ohms (Ω).\n\nA useful picture: voltage is water pressure, current is the flow rate, and resistance is how narrow the pipe is. Pressures do not add up unless you follow the pipe. Currents do split at a junction and join again further on.',
          code: 'V = I × R\nI = V / R\nP = V × I'
        },
        {
          title: 'Ohm’s law',
          body: 'For a resistor at a steady temperature, the voltage across it is proportional to the current through it. The constant of proportionality is the resistance.\n\nWork in any two of V, I and R and you get the third. This is the first calculation you will make for almost any circuit.',
          code: '// A 1 kΩ resistor across a 5 V supply\nconst v = 5;\nconst r = 1000;\nconst i = v / r;   // 0.005 A = 5 mA\nconst p = v * i;   // 0.025 W'
        },
        {
          title: 'Why a resistor needs a rating',
          body: 'Every resistor turns some of the electrical energy into heat. The power is P = V × I, and a resistor that dissipates more than its rating gets hot and fails.\n\nA common rule of thumb is to keep a resistor below half its rating for a design that has to run for years.',
          code: 'const watts = (v * v) / r;\nconst rating = watts * 2;   // headroom'
        },
        {
          title: 'Choosing a resistor to limit current',
          body: 'Put a resistor in series with an LED and the resistor sets the current. Without it the LED would draw whatever it likes until it dies.\n\nThe calculation is simple: (supply − forward drop) ÷ wanted current = resistance.',
          code: 'const supply = 9;\nconst drop = 2.0;\nconst wanted = 0.01;   // 10 mA\nconst r = (supply - drop) / wanted;   // 700 Ω'
        }
      ],
      exam: 'You are asked for a single number: a current, a resistance or a power. Your answer is checked against the worked value.',
      outcome: 'You can size a resistor for a given current, and you know why a resistor has a wattage rating.'
    },
    {
      id: 'kirchhoffs-laws',
      title: 'Kirchhoff’s laws',
      goal: 'Solve a network with more than two parts by applying the two rules that every circuit obeys.',
      material: [
        {
          title: 'Current in, current out',
          body: 'Kirchhoff’s current law (KCL) says charge does not pile up at a junction. So the sum of the currents flowing into a node equals the sum flowing out of it.\n\nThis is bookkeeping. You use it to write one equation per unknown branch current.',
          code: '// A node where 1 A comes in and splits\nI_in  = I_a + I_b;\n// 1 A = 0.6 A + 0.4 A'
        },
        {
          title: 'Around the loop',
          body: 'Kirchhoff’s voltage law (KVL) says energy is conserved. Go around any closed loop and the rises and falls of potential cancel out: the algebraic sum of the voltages is zero.\n\nSign convention: a rise is positive when you go from − to +, a fall is negative.',
          code: '// One loop: a source and two resistors\n+V_source - I*R1 - I*R2 = 0'
        },
        {
          title: 'Series and parallel',
          body: 'In series, the same current flows through every part, and the resistances add. In parallel, every part has the same voltage across it, and the conductances add.\n\nMost real circuits are a mix, and you simplify the mix first before you write the equations.',
          code: 'R_series = R1 + R2;\nR_parallel = (R1 * R2) / (R1 + R2);\n// 1 kΩ and 1 kΩ in parallel → 500 Ω'
        },
        {
          title: 'Why nodal analysis is worth learning',
          body: 'Rather than solving loops of equations, pick a node as the reference (usually ground) and write one KCL equation per remaining node. A computer can solve those very quickly, which is exactly what the simulator on this page does.',
          code: '// Node 1: (V1 - V2)/R1 + (V1 - V3)/R3 = 0'
        }
      ],
      exam: 'You are asked for a number that comes from combining resistances, or from a solved node voltage.',
      outcome: 'You can simplify a network and set up the equations a solver needs.'
    },
    {
      id: 'voltage-divider',
      title: 'The voltage divider',
      goal: 'Use two resistors to take a fraction of a supply, and design a divider for a target output.',
      material: [
        {
          title: 'The formula',
          body: 'Two resistors in series across a supply divide the voltage between them. The output taken across the bottom resistor is:\n\nVout = Vin × R2 / (R1 + R2)\n\nThe output depends on the ratio of the two resistors, not on their absolute size.',
          code: 'const vin = 10;\nconst r1 = 10000;\nconst r2 = 10000;\nconst vout = vin * (r2 / (r1 + r2));   // 5 V'
        },
        {
          title: 'Designing one backwards',
          body: 'You often know the output you want rather than the resistors. Then pick R1, and work out R2:\n\nR2 = R1 × Vout / (Vin − Vout)\n\nChoose R1 small enough that the divider does not load the supply, and large enough that it does not waste much current.',
          code: 'const vin = 12, vout = 3;\nconst r1 = 12000;\nconst r2 = r1 * (vout / (vin - vout));   // 4000 Ω'
        },
        {
          title: 'The loading problem',
          body: 'A divider is only correct while the output is not connected to anything that draws current. Attach a load and the bottom resistor is no longer the only path to ground, so the output sags.\n\nA buffer (an op-amp follower, or a transistor) fixes this by taking almost no current.',
          code: '// The loaded divider output is lower than the ideal one.'
        }
      ],
      exam: 'You are asked for the output voltage of a divider, or for the resistance that gives a target output.',
      outcome: 'You can design a divider and you know when you need to buffer it.'
    },
    {
      id: 'capacitors-rc',
      title: 'Capacitors and the RC circuit',
      goal: 'Understand why a capacitor charges and discharges gradually, and use the time constant to predict how fast.',
      material: [
        {
          title: 'What a capacitor does',
          body: 'A capacitor stores charge on two plates. Push charge onto one plate and an equal and opposite charge appears on the other. The voltage across it is q/C, so more charge means a higher voltage.\n\nBecause current is the flow of charge, the current into a capacitor is C dV/dt. A capacitor resists a change in voltage.',
          code: 'Q = C × V\nI = C × dV/dt'
        },
        {
          title: 'The time constant',
          body: 'Charge a capacitor through a resistor from a source. The voltage across it rises towards the source along an exponential curve with time constant:\n\nτ = R × C\n\nAfter one time constant it has reached 63.2% of the way. After five it is within 1% of the final value.',
          code: 'const tau = r * c;\nconst afterOneTau = 1 - Math.exp(-1);   // 0.632'
        },
        {
          title: 'Discharging',
          body: 'Take the source away and the capacitor discharges through the resistor along the same curve, heading for zero. After one time constant it is down to 36.8% of where it started.',
          code: 'const remaining = Math.exp(-1);   // 0.368'
        },
        {
          title: 'Choosing a time constant',
          body: 'A time constant of 10 ms means the circuit settles in about 50 ms (five time constants). Pick τ so that the settling time matches what the circuit has to do.',
          code: '// Settling time ≈ 5τ\nconst settleMs = 5 * r * c * 1000;'
        }
      ],
      exam: 'You are asked for a time constant, or for a voltage after a given number of time constants.',
      outcome: 'You can say how long a circuit takes to settle, and why it does not settle instantly.'
    },
    {
      id: 'inductors-rl',
      title: 'Inductors and the RL circuit',
      goal: 'See why a current takes time to build, and how an inductor stores energy in a magnetic field.',
      material: [
        {
          title: 'What an inductor does',
          body: 'An inductor stores energy in the magnetic field around a coil. The voltage across it opposes any change in the current through it:\n\nV = L dI/dt\n\nAn inductor resists a change in current, where a capacitor resists a change in voltage.',
          code: 'V = L × dI/dt'
        },
        {
          title: 'The time constant',
          body: 'Grow a current through an inductor and a resistor. The current rises towards its final value with time constant:\n\nτ = L / R\n\nThe current lags behind the voltage, which is the opposite of a capacitor.',
          code: 'const tau = l / r;\nconst afterOneTau = 1 - Math.exp(-1);   // 0.632 of the final current'
        },
        {
          title: 'Where the energy goes',
          body: 'The energy in the field is ½LI². When the current is broken the inductor pushes that energy back into the circuit, and the voltage across it spikes — sometimes to a dangerous level.\n\nA diode across the coil (a flyback diode) gives that energy a safe path.',
          code: 'E = 0.5 * L * I * I;'
        }
      ],
      exam: 'You are asked for a time constant, a current after some time, or the stored energy.',
      outcome: 'You know why switch-mode circuits need flyback diodes and snubbers.'
    },
    {
      id: 'rlc-resonance',
      title: 'RLC, resonance and filters',
      goal: 'Build a filter from real components and find the frequency where it changes character.',
      material: [
        {
          title: 'What a filter does',
          body: 'A low-pass filter passes slow signals and blocks fast ones. A high-pass filter does the opposite. Both are made from a resistor and a capacitor, with the corner set by their product.\n\nThe cutoff frequency is where the output has fallen to 1/√2 of the input, which is about −3 dB.',
          code: 'const fc = 1 / (2 * Math.PI * R * C);'
        },
        {
          title: 'The transfer function',
          body: 'For a simple RC low-pass, the output divided by the input is 1/(1 + jωRC). The magnitude falls at 20 dB per decade once you are past the corner.\n\nThat gentle, predictable slope is why RC filters are used for smoothing and for anti-aliasing.',
          code: '// |H| at a frequency\nconst mag = 1 / Math.sqrt(1 + Math.pow(2 * Math.PI * f * R * C, 2));'
        },
        {
          title: 'Resonance',
          body: 'Add an inductor to the capacitor and you get a resonant circuit. At the resonant frequency the inductor and capacitor cancel each other, and the impedance is at its largest for a parallel pair, or its smallest for a series pair.\n\nThis is how a radio picks one station out of many, and how an LC tank rings.',
          code: 'const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));'
        },
        {
          title: 'Damping and Q',
          body: 'A real coil has resistance, and that resistance decides how sharply the circuit resonates. The quality factor Q measures that sharpness: a high Q rings for many cycles, a low Q dies out quickly.',
          code: 'const Q = (1 / R) * Math.sqrt(L / C);'
        }
      ],
      exam: 'You are asked for a cutoff frequency, a resonant frequency or a quality factor.',
      outcome: 'You can design a filter for a bandwidth and explain why a radio can separate stations.'
    },
    {
      id: 'diodes-rectification',
      title: 'Diodes and rectification',
      goal: 'Turn an alternating signal into a steady one, and know what a diode does to the signal.',
      material: [
        {
          title: 'One-way current',
          body: 'A diode conducts in the forward direction and blocks in reverse. The forward voltage is not a fixed number: it depends on the current, roughly 0.7 V for silicon at a few milliamps.\n\nThe full relationship is the diode equation, which has an exponential term that gets steep near the turn-on point.',
          code: '// I = Is × (exp(V / (n × Vt)) − 1)'
        },
        {
          title: 'Half-wave and full-wave',
          body: 'One diode gives half-wave rectification: the negative half of the waveform is thrown away. A bridge of four diodes (or a centre-tapped pair) gives full-wave, which keeps twice as much of the signal and gives a hum at twice the supply frequency.',
          code: 'const averageHalf = Vpeak / Math.PI;\nconst averageFull  = 2 * Vpeak / Math.PI;'
        },
        {
          title: 'Smoothing',
          body: 'A capacitor across the output smooths the waveform. The ripple that is left is roughly the change in voltage during one cycle divided by the load current.\n\nMore capacitance means less ripple, but a larger inrush current at switch-on.',
          code: 'const ripple = Iload / (f * C);'
        },
        {
          title: 'Reverse bias',
          body: 'In reverse bias a diode blocks, but only until the reverse voltage exceeds its breakdown. Then it avalanches and may be destroyed. This is why a diode has a maximum reverse voltage, and why zener diodes are used deliberately at their breakdown point.',
          code: '// Keep V_reverse below the breakdown rating.'
        }
      ],
      exam: 'You are asked for a smoothed output voltage, a ripple figure, or the average of a rectified waveform.',
      outcome: 'You know how a linear power supply works and what limits it.'
    },
    {
      id: 'leds-and-light',
      title: 'LEDs and light',
      goal: 'Drive an LED correctly and understand the trade-off between brightness, current and efficiency.',
      material: [
        {
          title: 'The forward voltage',
          body: 'An LED lights when it is forward biased past its forward voltage, which depends on the colour: about 1.8 V for red, 2.0 V for yellow and green, 2.2 V for blue, and 3.0 V for white.\n\nThe forward voltage is not the same as the LED’s working voltage. The LED works at whatever voltage the current asks for; you set the current.',
          code: 'const colours = { red: 1.8, yellow: 2.0, green: 2.0, blue: 2.2, white: 3.0 };'
        },
        {
          title: 'The limiting resistor',
          body: 'An LED will take as much current as the supply can give. A resistor in series sets the current:\n\nR = (Vsupply − Vforward) / I\n\nThis is a current-limiting resistor, and it is not optional.',
          code: 'const r = (supply - forward) / current;'
        },
        {
          title: 'Brightness and efficiency',
          body: 'Brightness follows the current, not the voltage. Efficiency follows the colour: a modern white LED converts more of the power into light than an old incandescent bulb, and green is easier to make efficient than blue because blue needs a phosphor to become white.\n\nThat is why white LEDs are bright but green ones are dimmer at the same power.',
          code: '// Luminous efficiency in lumens per watt.'
        },
        {
          title: 'Driving more current',
          body: 'A microcontroller pin can only source a few milliamps. To drive a brighter LED you use a transistor with a base resistor, so the pin drives the base and the transistor carries the LED current.',
          code: 'const baseR = (logicHigh - 0.7) / baseCurrent;'
        }
      ],
      exam: 'You are asked for a limiting resistor, or for the current through a given circuit.',
      outcome: 'You can pick a resistor that keeps an LED safe and bright enough.'
    },
    {
      id: 'digital-logic',
      title: 'Digital logic and gates',
      goal: 'Read a truth table, predict a gate’s output, and use De Morgan’s theorem to simplify.',
      material: [
        {
          title: 'The three gates you need',
          body: 'AND is high only when every input is high. OR is high when any input is high. NOT inverts one input. Everything else is built from these.\n\nThe AND symbol’s flat back and rounded front is the historical origin of the name.',
          code: 'AND(a, b) = a · b\nOR(a, b)  = a + b\nNOT(a)     = a̅'
        },
        {
          title: 'NAND and NOR are universal',
          body: 'NAND and NOR are called universal gates, because any logic function can be built from either one alone. That is why CMOS chips are mostly NAND and NOR.\n\nA NOT from NAND is a NAND with its two inputs tied together.',
          code: 'NOT(a) = NAND(a, a)'
        },
        {
          title: 'De Morgan’s theorem',
          body: 'De Morgan says that inverting the whole expression is the same as inverting each input and swapping AND for OR:\n\nNOT(a AND b) = NOT(a) OR NOT(b)\nNOT(a OR b)  = NOT(a) AND NOT(b)\n\nIt is the tool for pushing a bubble through a gate.',
          code: '// A bubble on the output of AND equals bubbles on both inputs and an OR.'
        },
        {
          title: 'Logic levels',
          body: 'A "1" is a voltage range, not a single number. TTL says a high is above 2.0 V and a low below 0.8 V; CMOS thresholds differ per supply. The gap between the two is the noise margin — the room for interference before a bit is misread.\n\nMixing TTL and CMOS logic is a classic source of trouble.',
          code: '// TTL:  low < 0.8 V, high > 2.0 V'
        }
      ],
      exam: 'You are asked for the output of a gate for a given set of inputs, or for the truth table of a gate.',
      outcome: 'You can predict any gate’s output and simplify a boolean expression.'
    },
    {
      id: 'combinational-design',
      title: 'Combinational design',
      goal: 'Build adders, multiplexers and decoders out of gates, and reason about a design before you build it.',
      material: [
        {
          title: 'The half adder',
          body: 'A half adder adds two bits. The sum is the XOR of the inputs, and the carry is the AND. Two gates, four input combinations, one useful piece of arithmetic.',
          code: 'sum   = a XOR b;\ncarry = a AND b;'
        },
        {
          title: 'The full adder',
          body: 'A full adder adds two bits plus a carry in, and produces a sum and a carry out. It is two half adders and one OR gate.\n\nThis is how real adders are built: in chunks, with the carry rippling from one chunk to the next.',
          code: 's1 = a XOR b;\nc1 = a AND b;\ns2 = s1 XOR cin;\nc2 = s1 AND cin;\ncout = c1 OR c2;'
        },
        {
          title: 'Multiplexers and demultiplexers',
          body: 'A multiplexer picks one of several inputs and puts it on one output, using a set of select lines. A demultiplexer does the opposite, sending one input to one of several outputs.\n\nTogether they let one set of wires carry what would otherwise need many.',
          code: '// A 4-to-1 mux needs 2 select lines.'
        },
        {
          title: 'Practical concerns',
          body: 'Delay is the time for a change to travel through the gates. It limits how fast a clock can run. Fan-out is how many inputs a gate can drive before its voltage sags too far.\n\nA Karnaugh map turns a truth table into the simplest sum-of-products expression by grouping the 1s.',
          code: '// Groups of 2, 4, 8 … give simpler terms.'
        }
      ],
      exam: 'You are asked for a sum and a carry for a set of inputs, or for the number of select lines a multiplexer needs.',
      outcome: 'You can design an adder and can count the select lines a multiplexer needs.'
    },
    {
      id: 'sequential-logic',
      title: 'Sequential logic',
      goal: 'Understand circuits that remember: latches, flip-flops, counters and the clock.',
      material: [
        {
          title: 'Feedback',
          body: 'Combinational logic depends only on its inputs right now. Sequential logic depends on what happened before, which it gets by feeding an output back into an input.\n\nThat feedback is what makes a latch a latch. It has two stable states, so it holds a bit.',
          code: '// A latch holds its state until something forces it to change.'
        },
        {
          title: 'The SR latch',
          body: 'An SR latch is a pair of cross-coupled NOR gates. Set makes Q high, Reset makes Q low, and both high is the forbidden state — the NAND version uses both low instead.\n\nThe common way out is to make set and reset never both active, which is what the clock does.',
          code: 'S = 1, R = 0  →  Q = 1\nS = 0, R = 1  →  Q = 0\nS = 0, R = 0  →  hold'
        },
        {
          title: 'The D flip-flop',
          body: 'A D flip-flop captures the data input on the rising edge of the clock and holds it until the next edge. The D stands for data and it removes the forbidden state entirely, which is why almost every design uses it.\n\nIt is the building block of every register, counter and processor state.',
          code: 'if (risingEdge) Q <= D;'
        },
        {
          title: 'Counters and the clock',
          body: 'Chain flip-flops together and feed the last one back to the first and you have a counter. The clock is the heartbeat: everything synchronous happens on its edge.\n\nAsynchronous designs let each stage change on its own, which is fast but makes the output briefly invalid while the bits settle.',
          code: '// A 4-bit counter wraps every 16 clocks.'
        }
      ],
      exam: 'You are asked for the output of a latch or flip-flop after a sequence of inputs, or for the output of a counter.',
      outcome: 'You can reason about a circuit that remembers, and you know why the clock edge matters.'
    },
    {
      id: 'signals-in-the-real-world',
      title: 'Signals in the real world',
      goal: 'See what happens to a signal once it leaves the ideal world: noise, bandwidth, impedance and sampling.',
      material: [
        {
          title: 'Noise is always there',
          body: 'A real signal arrives with interference on top of it. Sources include mains hum, switching noise from nearby circuits, and reflections on long traces.\n\nThe usual defences are filtering, shielding, keeping ground returns short, and not running a signal next to a switching node.',
          code: '// A ground plane gives the return current a short path.'
        },
        {
          title: 'Bandwidth',
          body: 'Bandwidth is the range of frequencies a circuit carries. A wire has bandwidth because it loses the high frequencies first, and a long cable can turn a fast edge into a slow one.\n\nRise time and bandwidth are linked: a faster edge needs more bandwidth to carry it.',
          code: '// Higher bandwidth → shorter rise time.'
        },
        {
          title: 'Impedance',
          body: 'Impedance is resistance plus reactance, and it is what a signal sees. When two circuits meet, the higher impedance wins, so the load must be much higher impedance than the source or the level shifts.\n\nTransmission lines are matched to their characteristic impedance, usually 50 or 75 ohms.',
          code: 'const z0 = 50;   // ohms'
        },
        {
          title: 'Sampling',
          body: 'Sampling a signal means taking its value at regular intervals. The sampling theorem says you must sample at least twice the highest frequency you care about, or the high frequencies come back as false low ones — aliasing.\n\nAn anti-aliasing filter before the converter is the only real defence, because by the time you have sampled, the damage is done.',
          code: 'const fs = 2 * fmax;   // Nyquist'
        },
        {
          title: 'Where the real tools fit',
          body: 'This course gives you the reasoning. The open-source tools give you the bench: EEcircuit runs SPICE in the browser, OpenCircuits and DigitalJS simulate digital logic, aeCAD and Fluxa draw schematics and boards, and EDAV opens an IC layout.\n\nUse them to check a real design, not to replace understanding it.',
          code: null
        }
      ],
      exam: 'You are asked for a number — a sampling rate, a bandwidth, a noise margin — or for a written explanation of a choice.',
      outcome: 'You can reason about a real design and reach for the right open-source tool to check it.'
    }
  ]
};

/**
 * The chapter bank, keyed by chapter title.
 *
 * The exercises name a chapter, and this is where the material for that
 * chapter lives. A chapter with no material is a bug, and the tests
 * prove there are none.
 */
export const CHAPTERS = Object.fromEntries(
  CIRCUITS_COURSE.chapters.map(chapter => [chapter.title, chapter])
);

/**
 * Look a chapter up by title.
 */
export function findChapter(title) {
  return CHAPTERS[title] || null;
}

/**
 * The chapters that have no exercise pointing at them.
 *
 * The tests use this to prove the course and the material agree.
 */
export function orphanChapters(exercises) {
  const used = new Set((exercises || []).map(exercise => exercise?.chapter));
  return CIRCUITS_COURSE.chapters
    .map(chapter => chapter.title)
    .filter(title => !used.has(title));
}
