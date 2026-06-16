/**
 * Test/demo mode. Enabled via NEXT_PUBLIC_TEST_MODE=true (inlined at build
 * time). When on, the app exposes demo affordances: simulate-location on the
 * onboarding screen and synthetic-document loaders on the intake screen, so we
 * can rehearse localized alerts and the translation pipeline without real
 * data or being physically present in a disaster area.
 */
export const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

/** Hardcoded, complex synthetic legalese for demoing the translator. */
export interface DemoDoc {
  key: string;
  label: string;
  docType: "emergency" | "general";
  text: string;
}

export const DEMO_DOCS: DemoDoc[] = [
  {
    key: "fema",
    label: "Load Demo FEMA Form",
    docType: "emergency",
    text: `FEDERAL EMERGENCY MANAGEMENT AGENCY (FEMA)
INDIVIDUALS AND HOUSEHOLDS PROGRAM (IHP) — DECLARATION DR-4729-TX
NOTICE OF ELIGIBILITY DETERMINATION AND CONDITIONAL AWARD

Applicant Registration ID: 99-XXXXXXXX. Pursuant to Section 408 of the Robert T. Stafford Disaster Relief and Emergency Assistance Act, 42 U.S.C. 5174, you have been determined PROVISIONALLY ELIGIBLE for Other Needs Assistance (ONA) and Transitional Sheltering Assistance (TSA).

REQUIRED ACTION: You must complete and return the enclosed Declaration and Release (FEMA Form FF-104-FY-21-111) and provide documentation of occupancy and ownership within THIRTY (30) CALENDAR DAYS of the date of this notice, or the conditional award in the amount of $3,412.00 shall be RESCINDED and subject to RECOUPMENT.

An appeal of any determination must be submitted in writing and postmarked within sixty (60) days. Funds disbursed for ineligible expenses are considered an improper payment and must be repaid to the United States Treasury.`,
  },
  {
    key: "eviction",
    label: "Load Demo Eviction",
    docType: "general",
    text: `SUPERIOR COURT OF THE STATE — UNLAWFUL DETAINER
THREE (3) DAY NOTICE TO PAY RENT OR QUIT

TO TENANT(S) AND ALL OTHERS IN POSSESSION: YOU ARE HEREBY NOTIFIED that rent is now due and payable on the premises herein described in the amount of ONE THOUSAND EIGHT HUNDRED FIFTY DOLLARS ($1,850.00), being the reasonable rental value for the period of the delinquency.

WITHIN THREE (3) DAYS after service of this notice, you are required to PAY said rent in full OR to deliver up possession of the premises, or legal proceedings will be instituted against you to recover possession, to declare the forfeiture of the lease or rental agreement, and to recover rents, damages, and costs of suit. Such proceedings could result in a judgment against you which may be reported to credit and tenant-screening bureaus.`,
  },
  {
    key: "medbill",
    label: "Load Demo Med Bill",
    docType: "general",
    text: `REGIONAL MEDICAL CENTER — ITEMIZED STATEMENT OF ACCOUNT
STATEMENT IS NOT A BILL FROM YOUR INSURER. PATIENT RESPONSIBILITY PORTION ENCLOSED.

CPT 99285 Emergency dept visit, high complexity .......... $2,140.00
CPT 71046 Radiologic exam, chest, 2 views ................ $   480.00
HCPCS J1885 Injection, ketorolac tromethamine ............ $   312.00
CPT 80053 Comprehensive metabolic panel .................. $   265.00
Facility Fee (Level IV) .................................. $ 1,975.00
Adjustments / Contractual write-off ...................... -$3,890.00
Insurance payments ....................................... -$   612.00
AMOUNT DUE FROM PATIENT .................................. $   670.00

Payment is due within 30 days. Accounts unpaid after 90 days may be referred to a third-party collection agency. You may request an itemized review and inquire about financial assistance / charity care eligibility.`,
  },
];
