export const API_URLS = {
  GET_REGISTRATIONS: "https://functions.poehali.dev/bc5f0fde-e8e9-4666-9cdb-b19f49b506fe",
  GIVE_MAGNET: "https://functions.poehali.dev/05adfa61-68b9-4eb5-95d0-a48462122ff3",
  ADD_CLIENT: "https://functions.poehali.dev/16cf02a4-2bbe-4378-9c28-f8ad3393c028",
  REGISTER: "https://functions.poehali.dev/40f9e8db-184c-407c-ace9-d0877ed306b9",
  LOOKUP: "https://functions.poehali.dev/58aabebd-4ca5-40ce-9188-288ec6f26ec4",
  ANALYTICS: "https://functions.poehali.dev/71f57402-757d-4729-b1a9-3fc46683f526",
  BREED_PHOTOS: "https://functions.poehali.dev/264a19bd-40c8-4203-a8cd-9f3709bedcee",
  BONUS_STOCK: "https://functions.poehali.dev/5cbee799-0fa3-44e1-8954-66474bf973b0",
  SETTINGS: "https://functions.poehali.dev/8d9bf70e-b9a7-466a-a2e0-7e510754dde1",
};

export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 1) return digits ? "+7" : "";
  const d = digits.startsWith("7") ? digits : "7" + digits;
  let result = "+7";
  if (d.length > 1) result += ` (${d.slice(1, 4)}`;
  if (d.length > 4) result += `) ${d.slice(4, 7)}`;
  if (d.length > 7) result += `-${d.slice(7, 9)}`;
  if (d.length > 9) result += `-${d.slice(9, 11)}`;
  return result;
};