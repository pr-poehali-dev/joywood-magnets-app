export const GET_REGISTRATIONS_URL = "https://functions.poehali.dev/bc5f0fde-e8e9-4666-9cdb-b19f49b506fe";
export const ADD_CLIENT_URL = "https://functions.poehali.dev/16cf02a4-2bbe-4378-9c28-f8ad3393c028";
export const GIVE_MAGNET_URL = "https://functions.poehali.dev/05adfa61-68b9-4eb5-95d0-a48462122ff3";

export interface Registration {
  id: number;
  name: string;
  phone: string;
  channel: string;
  ozon_order_code: string | null;
  created_at: string;
  registered: boolean;
  total_amount: number;
}

export interface ClientMagnet {
  id: number;
  breed: string;
  stars: number;
  category: string;
  given_at: string;
  order_id?: number | null;
}

export interface ClientOrder {
  id: number;
  order_code: string;
  amount: number;
  channel: string;
  status: string;
  created_at: string;
}

export const formatPhone = (value: string) => {
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

export const starBg: Record<number, string> = {
  1: "bg-amber-50 border-amber-200",
  2: "bg-orange-50 border-orange-300",
  3: "bg-red-50 border-red-300",
};