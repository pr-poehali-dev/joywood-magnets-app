export const ADD_CLIENT_URL =
  "https://functions.poehali.dev/16cf02a4-2bbe-4378-9c28-f8ad3393c028";
export const GET_REGISTRATIONS_URL =
  "https://functions.poehali.dev/bc5f0fde-e8e9-4666-9cdb-b19f49b506fe";

export interface ClientOption {
  id: number;
  name: string;
  phone: string;
  channel: string;
}

export interface OrderRecord {
  id: number;
  order_code: string;
  amount: number;
  channel: string;
  status: string;
  created_at: string;
  registration_id: number;
  client_name: string;
  client_phone: string;
}
