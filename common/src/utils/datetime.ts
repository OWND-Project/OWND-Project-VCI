export function getCurrentUTCDate(): Date {
  return new Date(); // UTCで現在の日時を取得
}

export function addSeconds(date: Date, secondsToAdd: number): Date {
  const newDate = new Date(date);
  newDate.setUTCSeconds(date.getUTCSeconds() + secondsToAdd);
  return newDate;
}

export function formatDateTimeForDisplay(date: Date): string {
  const year = date.getUTCFullYear().toString().slice(-2);
  const month = ("0" + (date.getUTCMonth() + 1)).slice(-2);
  const day = ("0" + date.getUTCDate()).slice(-2);
  const hours = ("0" + date.getUTCHours()).slice(-2);
  const minutes = ("0" + date.getUTCMinutes()).slice(-2);
  const seconds = ("0" + date.getUTCSeconds()).slice(-2);

  return year + month + day + hours + minutes + seconds + "Z";
}
