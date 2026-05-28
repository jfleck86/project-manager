// Effort sizing — numeric values hidden from users, UI shows S/M/L only
export const EFFORT_OPTS  = ["S", "M", "L"];
export const EFFORT_LABEL = { S: "Small", M: "Medium", L: "Large" };
export const EFFORT_HOURS  = { S: 1, M: 4, L: 8 };  // hours per task
export const WEEKLY_HOURS  = 40;                      // standard capacity per person per week
export const HOURS_LIGHT   = 20;                      // 0–20h = Light
export const HOURS_MEDIUM  = 40;                      // 20–40h = Medium  (>40 = Heavy)
export const EFFORT_VAL    = { S: 1, M: 4, L: 8 };  // now mirrors EFFORT_HOURS