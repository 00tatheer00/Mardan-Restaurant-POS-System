const MAP: [RegExp, string][] = [
  [/kabab|kebab|seekh|chapli/i, "🍢"],
  [/bbq|tikka|chicken|grill/i, "🍗"],
  [/bread|naan|roti|paratha/i, "🫓"],
  [/rice|pulao|biryani/i, "🍚"],
  [/drink|juice|tea|chai|water|lassi/i, "🥤"],
  [/extra|salad|raita|side/i, "🥗"],
  [/sweet|dessert|kheer/i, "🍮"],
];

export const categoryEmoji = (name?: string) => MAP.find(([re]) => re.test(name ?? ""))?.[1] ?? "🍽️";
