import * as Freighter from "@stellar/freighter-api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export async function requestAuthChallenge(address: string): Promise<{ challengeXdr: string }> {
  const res = await fetch(`${API_BASE}/auth/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to request challenge");
  }
  return res.json();
}

export async function verifyAuthChallenge(
  address: string,
  signedXdr: string
): Promise<{ token: string }> {
  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, signedXdr }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Invalid signature");
  }
  return res.json();
}

export async function signChallengeWithTimeout(
  challengeXdr: string,
  signFn?: (xdr: string) => Promise<string | null>,
  timeoutMs = 60000
): Promise<string> {
  const signer = signFn || ((xdr: string) => Freighter.signTransaction(xdr));

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Challenge expired — please try again"));
    }, timeoutMs);

    signer(challengeXdr)
      .then((signed) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (!signed) {
          reject(new Error("Connection cancelled"));
        } else {
          resolve(signed);
        }
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const msg = err?.message?.toLowerCase() || "";
        if (
          msg.includes("cancel") ||
          msg.includes("decline") ||
          msg.includes("user rejected") ||
          msg.includes("reject")
        ) {
          reject(new Error("Connection cancelled"));
        } else {
          reject(err);
        }
      });
  });
}
