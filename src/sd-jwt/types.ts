export type xIdResponse = {
  last_name: string;
  first_name: string;
  previous_name: string;
  year: string;
  month: string;
  date: string;
  prefecture: string;
  city: string;
  address: string;
  sub_char_common_name: string;
  sub_char_previous_name: string;
  sub_char_address: string;
  gender: string;
  verified_at: number;
};

export type MynaInfoCredential = {
  last_name: string;
  first_name: string;
  previous_name: string;
  year: string;
  month: string;
  date: string;
  prefecture: string;
  city: string;
  address: string;
  sub_char_common_name: string;
  sub_char_previous_name: string;
  sub_char_address: string;
  gender: string;
  verified_at: string;
  is_older_than_13: boolean;
  is_older_than_18: boolean;
  is_older_than_20: boolean;
};
