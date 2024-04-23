export { toError } from "../utils";

export const isExpired = (createdAt: Date, expiresIn: number) => {
  // todo GMTの文字列で受け取る方が良いかも
  // DateオブジェクトをUnix時間（ミリ秒）に変換し、有効期間（秒）を加算して、再びミリ秒に変換
  const expirationTime = Math.floor(createdAt.getTime() / 1000) + expiresIn;
  const currentTime = Math.floor(Date.now() / 1000);
  return expirationTime <= currentTime;
};
