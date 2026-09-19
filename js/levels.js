(function () {
  const LEVELS = [];
  for (let id = 1; id <= 30; id++) {
    const t = (id - 1) / 29;
    const rows = id <= 10 ? 3 : 4;
    LEVELS.push({
      id: id,
      rows: rows,
      cols: rows,
      duration: Math.round(50 - t * 20),
      target: Math.round(8 + t * 55),
      upTime: Math.round(1700 - t * 1000),
      minI: Math.round(1500 - t * 1050),
      maxI: Math.round(2400 - t * 1400),
      goldChance: 0.05 + t * 0.1,
      goldValue: Math.round(15 + t * 35),
      maxUp: Math.round(1 + t * 2)
    });
  }
  window.LEVELS = LEVELS;
  window.getLevel = function (n) {
    const i = Math.min(Math.max(n, 1), 30) - 1;
    return LEVELS[i];
  };
})();