/**
 * packages/fixtures/src/messages.ts
 * Synthetic M-Pesa texts based on common public patterns.
 * Replace with 3 to 5 redacted real messages from sellers when available.
 * These are not copies of anyone's SMS.
 */
export interface SampleMessage {
  id: string;
  label: string;
  text: string;
}

export const SYNTHETIC_MPESA_MESSAGES: SampleMessage[] = [
  {
    id: "p2p-received",
    label: "Person to person, Ksh, masked nothing",
    text: "UKC1AAAAAA Confirmed. You have received Ksh2,500.00 from MARY WANJIKU 0712345678 on 12/11/26 at 2:15 PM. New M-PESA balance is Ksh5,000.00.",
  },
  {
    id: "kes-word",
    label: "KES instead of Ksh",
    text: "UKC2BBBBBB Confirmed. KES 800 received from JOHN DOE 0712345678 on 3/10/2026 at 10:00 AM. New M-PESA balance is KES 1,200.00.",
  },
  {
    id: "masked-phone",
    label: "Masked phone",
    text: "UKC3CCCCCC Confirmed. You have received Ksh1,200.00 from JANE W. 0712***678 on 12/11/26 at 2:15 PM. New M-PESA balance is Ksh4,000.00.",
  },
  {
    id: "24h-time",
    label: "24-hour clock",
    text: "UKC4DDDDDD Confirmed. You have received Ksh450.00 from PETER OCHIENG 254712345678 on 12/11/2026 at 14:02. New M-PESA balance is Ksh900.00.",
  },
  {
    id: "lowercase",
    label: "Lowercase currency",
    text: "UKC5EEEEEE Confirmed. You have received ksh 700 from ALICE AOKO 0712345678 on 1/11/26 at 6:45 PM. New M-PESA balance is ksh 1,500.00.",
  },
  {
    id: "buy-goods",
    label: "Buy goods till, no sender name",
    text: "UKC6FFFFFF Confirmed. Ksh3,500.00 paid to GREEN THREADS on 12/11/26 at 4:00 PM. New M-PESA balance is Ksh8,000.00.",
  },
  {
    id: "locked",
    label: "LOCKED balance",
    text: "UKC7GGGGGG Confirmed. You have received Ksh1,000.00 from SAMUEL KIPTOO 0712345678 on 15/11/26 at 8:30 AM. New M-PESA balance is Ksh2,000.00 LOCKED",
  },
  {
    id: "tight-spacing",
    label: "Missing spaces around the amount",
    text: "UKC8HHHHHH Confirmed.Ksh99.00 received from BO KE 0700111222 on 2/2/26 at 1:01 PM. New M-PESA balance is Ksh100.00.",
  },
  {
    id: "footer",
    label: "Extra footer after the balance",
    text: "UJ91IIIIII Confirmed. You have received Ksh2,500.00 from MARY WANJIKU 0712345678 on 12/11/26 at 2:15 PM. New M-PESA balance is Ksh10,000.00. Thank you for using M-PESA.",
  },
  {
    id: "available-balance",
    label: "Available balance wording",
    text: "UKA1JJJJJJ Confirmed. You have received Ksh1,500 from FATUMA HASSAN 0712***222 on 1/11/26 at 7:00 AM. Available balance is Ksh4,000.",
  },
  {
    id: "seconds",
    label: "Time with seconds",
    text: "UKC0KKKKKK Confirmed. You have received Ksh12,000.00 from JAMES MWANGI 0712345678 on 12/11/26 at 2:02:11 PM. New M-PESA balance is Ksh20,000.00.",
  },
  {
    id: "paybill-style",
    label: "Received from, international prefix",
    text: "UKB1LLLLLL Confirmed. Ksh1,500 received from GRACE NJERI 254712***678 on 1/2/26 at 9:05 AM. New M-PESA balance is Ksh3,000.00.",
  },
];
