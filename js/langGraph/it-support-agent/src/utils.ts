export function getUserFromEmail(email: string) {
    const [_, domain] = email.split("@");
  
    return domailToId[domain];
  }
  
  const domailToId: Record<string, string> = {
    "meta.com": "1",
    "instagram.com": "3",
    "mc-donalds.com": "1231",
  };